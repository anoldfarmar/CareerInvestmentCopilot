import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Prisma } from '@prisma/client';
import { externalFetch } from '../common/http/external-http.client';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendJobsDto } from './dto/recommend-jobs.dto';

type SourceGroup = {
  name: string;
  domains: string[];
  keywords: string[];
};

type SourceTarget = {
  key: string;
  groupName: string;
  site: string;
  quota: number;
  extraKeywords?: string[];
};

type SearchQueryPlan = {
  groupName: string;
  sourceKey: string;
  query: string;
  quota: number;
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type Candidate = {
  title: string;
  url: string;
  summary: string;
  source: string;
  tier: string;
  tierReason: string;
  groupName: string;
  sourceKey: string;
  score: number;
};

const SOURCE_GROUPS: SourceGroup[] = [
  {
    name: 'campus',
    domains: [
      'site:shixiseng.com',
      'site:yingjiesheng.com',
      'site:xiaoyuan.zhaopin.com',
      'site:campus.51job.com',
      'site:campus.lagou.com',
      'site:nowcoder.com',
    ],
    keywords: ['实习', '校招', '应届生', '暑期实习', '日常实习'],
  },
  {
    name: 'general',
    domains: ['site:zhipin.com', 'site:zhaopin.com', 'site:51job.com', 'site:liepin.com', 'site:lagou.com'],
    keywords: ['招聘', '岗位', '职位', '实习'],
  },
  {
    name: 'company',
    domains: [
      'site:careers.tencent.com',
      'site:jobs.bytedance.com',
      'site:campus.alibaba.com',
      'site:talent.baidu.com',
      'site:hr.xiaomi.com',
      'site:campus.meituan.com',
      'site:campus.jd.com',
      'site:campus.163.com',
      'site:career.huawei.com',
      'site:zhaopin.kuaishou.cn',
    ],
    keywords: ['校园招聘', '社会招聘', '实习生招聘', '岗位'],
  },
];

const SOURCE_TARGETS: SourceTarget[] = [
  { key: 'company', groupName: 'company', site: 'COMPANY_DOMAINS', quota: 18, extraKeywords: ['官网招聘'] },
  { key: 'shixiseng', groupName: 'campus', site: 'site:shixiseng.com', quota: 12, extraKeywords: ['实习僧'] },
  { key: 'nowcoder', groupName: 'campus', site: 'site:nowcoder.com', quota: 10, extraKeywords: ['牛客'] },
  { key: 'yingjiesheng', groupName: 'campus', site: 'site:yingjiesheng.com', quota: 8, extraKeywords: ['应届生求职'] },
  { key: 'zhaopin_campus', groupName: 'campus', site: 'site:xiaoyuan.zhaopin.com', quota: 8, extraKeywords: ['智联校园'] },
  { key: 'job51_campus', groupName: 'campus', site: 'site:campus.51job.com', quota: 8, extraKeywords: ['前程无忧校园'] },
  { key: 'zhaopin', groupName: 'general', site: 'site:zhaopin.com', quota: 10, extraKeywords: ['智联招聘'] },
  { key: 'job51', groupName: 'general', site: 'site:51job.com', quota: 10, extraKeywords: ['前程无忧'] },
  { key: 'lagou', groupName: 'general', site: 'site:lagou.com', quota: 7, extraKeywords: ['拉勾'] },
  { key: 'liepin', groupName: 'general', site: 'site:liepin.com', quota: 7, extraKeywords: ['猎聘'] },
  { key: 'boss', groupName: 'general', site: 'site:zhipin.com', quota: 6, extraKeywords: ['BOSS直聘'] },
];

const ROLE_EXPANSIONS: Record<string, string[]> = {
  data: [
    '数据分析 实习',
    '商业分析 实习',
    '数据运营 实习',
    '数据产品 实习',
    '用户增长 数据分析 实习',
    'BI SQL Python 实习',
    '机器学习 数据分析 实习',
    '金融 数据分析 实习',
  ],
  ai: [
    '大模型 实习',
    'LLM 实习',
    'Agent 实习',
    'RAG 实习',
    'AI 应用开发 实习',
    'Prompt 工程 实习',
    'Python AI 实习',
    '大模型应用开发 实习',
  ],
};

const SOURCE_LABELS: Array<[RegExp, string]> = [
  [/shixiseng\.com/i, '实习僧'],
  [/nowcoder\.com/i, '牛客'],
  [/yingjiesheng\.com/i, '应届生求职网'],
  [/zhipin\.com/i, 'BOSS直聘'],
  [/zhaopin\.com|xiaoyuan\.zhaopin\.com/i, '智联招聘'],
  [/51job\.com|campus\.51job\.com/i, '前程无忧'],
  [/lagou\.com/i, '拉勾'],
  [/liepin\.com/i, '猎聘'],
  [/tencent|bytedance|alibaba|baidu|xiaomi|meituan|jd\.com|huawei|kuaishou|163\.com/i, '企业官网'],
];

@Injectable()
export class JobRecommendationService {
  private readonly logger = new Logger(JobRecommendationService.name);
  private cachedExpEnv?: Record<string, string>;

  constructor(private readonly prisma: PrismaService) {}

  async recommendJobs(userId: number, input: RecommendJobsDto) {
    const intent = await this.buildIntent(userId, input);
    const apiKey = this.getTavilyApiKey();
    const mode = input.mode ?? 'standard';
    const maxResults = input.maxResults ?? 18;
    const queryPlans = this.buildPlatformSearchQueries(intent, mode);
    const settled = await Promise.allSettled(
      queryPlans.map((plan) => this.searchTavilyOnce(apiKey, plan)),
    );
    const candidates = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    const recommendations = this.prepareResults(candidates, maxResults);

    return {
      generatedAt: new Date().toISOString(),
      intent,
      total: recommendations.length,
      recommendations: recommendations.map((item, index) => ({
        index: index + 1,
        title: item.title,
        url: item.url,
        summary: item.summary,
        source: item.source,
        tier: item.tier,
        tierReason: item.tierReason,
        groupName: item.groupName,
        sourceKey: item.sourceKey,
      })),
    };
  }

  private async buildIntent(userId: number, input: RecommendJobsDto) {
    const [profile, resume] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.resume.findFirst({
        where: { userId },
        orderBy: [{ finalizedAt: 'desc' }, { updatedAt: 'desc' }],
        select: {
          title: true,
          structuredContent: true,
          optimizedContent: true,
          finalizedContent: true,
          originalContent: true,
        },
      }),
    ]);

    const targetRoles = this.cleanItems(input.targetRoles);
    const cities = this.cleanItems(input.cities);
    const skills = this.cleanItems(input.skills);
    const profileDirections = this.readStringArray(profile?.targetDirections, profile?.targetDirection ? [profile.targetDirection] : []);
    const resumeText = this.clipText(
      [
        input.profile,
        profile?.customTargetDirection,
        resume?.title,
        this.flattenResumeText(resume?.finalizedContent ?? resume?.optimizedContent ?? resume?.structuredContent),
        resume?.originalContent,
      ]
        .filter(Boolean)
        .join('\n'),
      3000,
    );

    const inferredRoles = this.inferRoles([...profileDirections, resumeText]);
    const inferredSkills = this.inferSkills(resumeText);

    return {
      targetRoles: targetRoles.length ? targetRoles : inferredRoles,
      cities: cities.length ? cities : ['深圳', '广州', '上海', '北京', '远程'],
      skills: skills.length ? skills : inferredSkills,
      availability: input.availability?.trim() || (profile?.jobMode === 'junior' ? '校招 实习 可尽快到岗' : '实习 可尽快到岗'),
      profile: resumeText,
    };
  }

  private buildPlatformSearchQueries(
    intent: {
      targetRoles: string[];
      cities: string[];
      skills: string[];
      availability: string;
      profile: string;
    },
    mode: 'fast' | 'standard' | 'broad',
  ): SearchQueryPlan[] {
    const baseQuery = this.buildResumeSearchQuery(intent);
    const variants = this.buildQueryVariants(intent.targetRoles, intent.skills);
    const targets = this.selectedSourceTargets(mode);
    const plans: SearchQueryPlan[] = [];

    for (const target of targets) {
      const group = SOURCE_GROUPS.find((item) => item.name === target.groupName);
      const keywords = [...(group?.keywords ?? []), ...(target.extraKeywords ?? [])].join(' ');
      const siteQueries = target.site === 'COMPANY_DOMAINS' ? SOURCE_GROUPS.find((item) => item.name === 'company')?.domains ?? [] : [target.site];
      const sourceVariants = variants.slice(0, target.groupName === 'company' ? 2 : 3);

      for (const site of siteQueries) {
        for (const variant of sourceVariants) {
          plans.push({
            groupName: target.groupName,
            sourceKey: target.key,
            quota: target.quota,
            query: [site, variant, keywords, baseQuery].filter(Boolean).join(' '),
          });
        }
      }
    }

    return plans.slice(0, mode === 'fast' ? 18 : mode === 'standard' ? 32 : 52);
  }

  private buildResumeSearchQuery(intent: {
    targetRoles: string[];
    cities: string[];
    skills: string[];
    availability: string;
    profile: string;
  }) {
    const roleText = intent.targetRoles.slice(0, 4).join(' OR ');
    const cityText = intent.cities.slice(0, 5).join(' OR ');
    const skillText = intent.skills.slice(0, 8).join(' ');
    const profileText = this.clipText(intent.profile, 300);
    return [roleText, cityText, skillText, intent.availability, profileText].filter(Boolean).join(' ');
  }

  private buildQueryVariants(targetRoles: string[], skills: string[]) {
    const roles = targetRoles.length ? targetRoles : ['数据分析 实习', 'AI 应用开发 实习'];
    const skillText = skills.slice(0, 5).join(' ');
    const variants = new Set<string>();

    for (const role of roles.slice(0, 5)) {
      variants.add(`${role} ${skillText}`.trim());
      variants.add(`${role} 招聘 实习 校招`.trim());
      if (/(数据|分析|BI|SQL|Python)/i.test(role + skillText)) {
        ROLE_EXPANSIONS.data.forEach((item) => variants.add(`${item} ${skillText}`.trim()));
      }
      if (/(AI|大模型|LLM|Agent|RAG|Prompt|机器学习)/i.test(role + skillText)) {
        ROLE_EXPANSIONS.ai.forEach((item) => variants.add(`${item} ${skillText}`.trim()));
      }
    }

    return [...variants].slice(0, 12);
  }

  private selectedSourceTargets(mode: 'fast' | 'standard' | 'broad') {
    if (mode === 'fast') {
      return SOURCE_TARGETS.filter((item) =>
        ['company', 'shixiseng', 'nowcoder', 'zhaopin_campus', 'boss'].includes(item.key),
      );
    }

    if (mode === 'broad') {
      return SOURCE_TARGETS;
    }

    return SOURCE_TARGETS.filter((item) =>
      ['company', 'shixiseng', 'nowcoder', 'yingjiesheng', 'zhaopin_campus', 'job51_campus', 'zhaopin', 'job51'].includes(item.key),
    );
  }

  private async searchTavilyOnce(apiKey: string, plan: SearchQueryPlan): Promise<Candidate[]> {
    const response = await externalFetch('https://api.tavily.com/search', {
      serviceName: 'Tavily Job Search',
      timeoutMs: 15000,
      retries: 1,
      retryDelayMs: 500,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: plan.query,
        search_depth: 'basic',
        include_answer: false,
        max_results: Math.min(10, Math.max(3, Math.ceil(plan.quota / 2))),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.warn(`Tavily search failed: ${response.status} ${this.clipText(text, 200)}`);
      return [];
    }

    const payload = (await response.json()) as { results?: TavilyResult[] };
    return (payload.results ?? [])
      .filter((item) => item.title && item.url)
      .map((item) => {
        const title = item.title ?? '';
        const url = item.url ?? '';
        const summary = this.clipText(item.content ?? '', 280);
        const source = this.inferSource(url);
        const tier = this.classifyResult(title, summary, plan.groupName);

        return {
          title: this.clipText(title, 120),
          url,
          summary,
          source,
          tier: tier.tier,
          tierReason: tier.reason,
          groupName: plan.groupName,
          sourceKey: plan.sourceKey,
          score: item.score ?? 0,
        };
      });
  }

  private prepareResults(candidates: Candidate[], maxResults: number) {
    const deduped = new Map<string, Candidate>();

    for (const candidate of candidates) {
      const key = this.normalizeUrl(candidate.url);
      const current = deduped.get(key);
      if (!current || candidate.score > current.score) {
        deduped.set(key, candidate);
      }
    }

    const ranked = [...deduped.values()].sort((left, right) => {
      const tierDiff = this.tierWeight(right.tier) - this.tierWeight(left.tier);
      if (tierDiff !== 0) return tierDiff;
      return right.score - left.score;
    });

    return this.balanceByPlatform(ranked, maxResults);
  }

  private balanceByPlatform(candidates: Candidate[], maxResults: number) {
    const buckets = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      const key = candidate.sourceKey;
      buckets.set(key, [...(buckets.get(key) ?? []), candidate]);
    }

    const output: Candidate[] = [];
    const keys = [...buckets.keys()];
    while (output.length < maxResults && keys.length > 0) {
      let progressed = false;
      for (const key of keys) {
        const item = buckets.get(key)?.shift();
        if (item) {
          output.push(item);
          progressed = true;
          if (output.length >= maxResults) break;
        }
      }
      if (!progressed) break;
    }

    return output;
  }

  private classifyResult(title: string, summary: string, groupName: string) {
    const text = `${title} ${summary}`;
    const strong = /(数据分析|商业分析|数据产品|大模型|LLM|Agent|RAG|AI 应用|机器学习|算法|Python|SQL)/i.test(text);
    const campus = /(实习|校招|应届|校园招聘|暑期)/i.test(text);
    const company = groupName === 'company';

    if (strong && (campus || company)) {
      return { tier: '主投岗', reason: '岗位方向、技能关键词和招聘类型都较贴合当前求职画像。' };
    }
    if (strong || campus || company) {
      return { tier: '备选岗', reason: '具备部分方向或平台匹配度，可进一步查看 JD 细节。' };
    }
    return { tier: '观察岗', reason: '公开页面相关度较弱，建议只作为信息补充。' };
  }

  private inferRoles(texts: string[]) {
    const text = texts.join(' ');
    const roles: string[] = [];
    if (/(AI|大模型|LLM|Agent|RAG|Prompt|机器学习|深度学习)/i.test(text)) {
      roles.push('AI 应用开发实习', '大模型应用实习', 'Agent 评测实习');
    }
    if (/(数据|分析|SQL|BI|指标|DolphinDB|Python)/i.test(text)) {
      roles.push('数据分析实习', '商业分析实习', '数据产品实习');
    }
    if (/(前端|React|Vue|TypeScript)/i.test(text)) {
      roles.push('前端开发实习');
    }
    if (/(后端|Nest|Java|Go|服务端)/i.test(text)) {
      roles.push('后端开发实习');
    }
    return [...new Set(roles)].slice(0, 6).length ? [...new Set(roles)].slice(0, 6) : ['数据分析实习', 'AI 应用开发实习'];
  }

  private inferSkills(text: string) {
    const candidates = ['Python', 'SQL', 'React', 'TypeScript', 'Java', 'Go', 'LLM', 'Agent', 'RAG', 'Prompt', '机器学习', '数据分析', 'DolphinDB'];
    const skills = candidates.filter((skill) => new RegExp(skill, 'i').test(text));
    return skills.length ? skills.slice(0, 8) : ['Python', 'SQL', 'LLM', 'Agent'];
  }

  private inferSource(url: string) {
    const matched = SOURCE_LABELS.find(([pattern]) => pattern.test(url));
    return matched?.[1] ?? '公开网页';
  }

  private getTavilyApiKey() {
    const value = process.env.TAVILY_API_KEY ?? this.getExpEnv().TAVILY_API_KEY;
    if (!value) {
      throw new BadGatewayException('TAVILY_API_KEY 未配置，无法进行岗位推荐搜索');
    }
    return value;
  }

  private getExpEnv() {
    if (this.cachedExpEnv) return this.cachedExpEnv;

    const envPath = resolve(process.cwd(), 'exp/.env');
    try {
      const content = readFileSync(envPath, 'utf8');
      this.cachedExpEnv = Object.fromEntries(
        content
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#') && line.includes('='))
          .map((line) => {
            const index = line.indexOf('=');
            return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, '')];
          }),
      );
    } catch {
      this.cachedExpEnv = {};
    }
    return this.cachedExpEnv;
  }

  private cleanItems(value?: string[]) {
    return [...new Set((value ?? []).map((item) => item.trim()).filter(Boolean))];
  }

  private readStringArray(value: Prisma.JsonValue | null | undefined, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return items.length ? items : fallback;
  }

  private flattenResumeText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map((item) => this.flattenResumeText(item)).join('\n');
    if (typeof value === 'object') {
      return Object.values(value as Record<string, unknown>)
        .map((item) => this.flattenResumeText(item))
        .join('\n');
    }
    return '';
  }

  private normalizeUrl(url: string) {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.searchParams.sort();
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return url.trim().replace(/\/$/, '');
    }
  }

  private tierWeight(tier: string) {
    return tier === '主投岗' ? 3 : tier === '备选岗' ? 2 : 1;
  }

  private clipText(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }
}
