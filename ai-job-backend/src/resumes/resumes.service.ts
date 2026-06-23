import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { getPagination, paginatedResponse } from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { FinalizeResumeDto } from './dto/finalize-resume.dto';
import { SaveOptimizedResumeDto } from './dto/save-optimized-resume.dto';
import { SaveResumeDraftDto } from './dto/save-resume-draft.dto';
import { SaveStructuredResumeDto } from './dto/save-structured-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { DeepseekService } from './deepseek.service';
import { MineruService } from './mineru.service';
import {
  ResumePdfContent,
  ResumePdfService,
  ResumePdfTemplate,
} from './resume-pdf.service';

// 创建简历时允许前端提交的数据结构。
type CreateResumeData = {
  title: string;
  originalContent?: string;
};

type MatchMetric = {
  key: string;
  label: string;
  score: number;
  level: 'good' | 'warning' | 'danger';
  reason: string;
};

const JD_KEYWORD_DICTIONARY = [
  'react',
  'vue',
  'angular',
  'typescript',
  'javascript',
  'node.js',
  'nodejs',
  'nestjs',
  'next.js',
  'express',
  'prisma',
  'postgresql',
  'mysql',
  'redis',
  'docker',
  'kubernetes',
  'nginx',
  'aws',
  'oss',
  'minio',
  'python',
  'java',
  'go',
  'c++',
  'spring',
  'jwt',
  '微服务',
  '性能优化',
  '工程化',
  '组件化',
  '状态管理',
  '前端',
  '后端',
  '全栈',
  '数据分析',
  '机器学习',
  '深度学习',
  '大模型',
  'llm',
  'rag',
  'asr',
  'prompt',
  'langchain',
  '向量数据库',
  'weaviate',
  'milvus',
  '项目管理',
  '沟通',
  '协作',
  '用户增长',
  '数据埋点',
  'a/b测试',
  '安全',
  '鉴权',
];

const DEFAULT_RESUME_UPLOAD_DIR =
  process.env.RESUME_UPLOAD_DIR ??
  '/home/CareerInvestmentCopilot-main/ai-job-backend/public/resume';

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  // NestJS 会自动注入之前创建的数据库客户端。
  constructor(
    private readonly prisma: PrismaService,
    private readonly mineruService: MineruService,
    private readonly deepseekService: DeepseekService,
    private readonly resumePdfService: ResumePdfService,
  ) {}

  // 保存简历前，先确认所属用户真实存在。
  async create(userId: number, data: CreateResumeData) {
    return this.prisma.resume.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async uploadResumeFile(userId: number, file: Express.Multer.File, originalName: string) {
    const userDirName = `user-${userId}`;
    const uploadDir = join(DEFAULT_RESUME_UPLOAD_DIR, userDirName);
    await mkdir(uploadDir, { recursive: true });

    const storedName = this.buildStoredFileName(originalName);
    const filePath = join(uploadDir, storedName);
    await writeFile(filePath, file.buffer);

    const fileUrl = `/public/resume/${userDirName}/${storedName}`;
    const uploadKind = this.detectUploadKind(originalName, file);
    const markdownContent =
      uploadKind === 'markdown' ? file.buffer.toString('utf8') : '';
    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title: originalName,
        originalContent: markdownContent,
        originalFileName: originalName,
        originalFilePath: filePath,
        originalFileUrl: fileUrl,
        originalFileMime: file.mimetype,
        originalFileSize: file.size,
        parseStatus:
          uploadKind === 'markdown'
            ? 'done'
            : uploadKind === 'parseable'
              ? 'pending'
              : 'unsupported',
      },
    });

    if (uploadKind !== 'parseable') {
      return resume;
    }

    try {
      const task = await this.mineruService.submitFile(file, originalName);

      const updatedResume = await this.prisma.resume.update({
        where: { id: resume.id },
        data: {
          mineruTaskId: task.taskId,
          parseStatus: task.state,
        },
      });

      void this.completeParseTaskInBackground(resume.id, task.taskId);

      return updatedResume;
    } catch (error) {
      return this.prisma.resume.update({
        where: { id: resume.id },
        data: { parseStatus: 'failed' },
      });
    }
  }

  // 查询所有简历，并附带所属用户的基础信息。
  async findAll(userId: number, query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const [items, total] = await Promise.all([
      this.prisma.resume.findMany({
        where: { userId },
        orderBy: {
          createdAt: 'desc',
        },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.resume.count({ where: { userId } }),
    ]);

    return paginatedResponse(items, total, query);
  }

  // 根据主键查询一份完整简历。
  async findOne(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  // 修改指定简历，只更新前端实际提交的字段。
  async update(userId: number, id: number, data: UpdateResumeDto) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.update({
        where: { id },
        data: {
          title: data.title,
          originalContent: data.originalContent,
        },
      });
    } catch (error) {
      // P2025 表示数据库中找不到需要修改的简历。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 删除指定简历，并返回被删除的简历数据。
  async remove(userId: number, id: number) {
    const resume = await this.findOne(userId, id);
    try {
      const deleted = await this.prisma.resume.delete({
        where: { id },
      });

      if (resume.originalFilePath && existsSync(resume.originalFilePath)) {
        await unlink(resume.originalFilePath);
      }

      return deleted;
    } catch (error) {
      // P2025 表示数据库中找不到需要删除的简历。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  private buildStoredFileName(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    const baseName = originalName
      .slice(0, originalName.length - extension.length)
      .replace(/[^\p{L}\p{N}._-]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const safeBaseName = baseName || 'resume';

    return `${Date.now()}-${safeBaseName}${extension}`;
  }

  private detectUploadKind(originalName: string, file: Express.Multer.File) {
    const lower = originalName.toLowerCase();
    const head = file.buffer.subarray(0, 8).toString('latin1');
    const isPdf = head.startsWith('%PDF-');
    const isDocx = head.startsWith('PK\x03\x04') && lower.endsWith('.docx');
    const isMarkdown = lower.endsWith('.md') || lower.endsWith('.markdown');

    if (isPdf || isDocx) return 'parseable';
    if (isMarkdown) return 'markdown';
    return 'unsupported';
  }

  // 将上传文件交给 MinerU，并把异步任务 id 绑定到指定简历。
  async submitParseTask(
    userId: number,
    id: number,
    file: Express.Multer.File,
    filename: string,
  ) {
    await this.findOne(userId, id);

    const task = await this.mineruService.submitFile(file, filename);

    return this.prisma.resume.update({
      where: { id },
      data: {
        mineruTaskId: task.taskId,
        parseStatus: task.state,
      },
    });
  }

  // 查询 MinerU 任务状态，并将最新状态同步到数据库。
  // 完成后，自动把 Markdown 保存为简历原始文本。
  async syncParseTask(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.mineruTaskId) {
      throw new NotFoundException('该简历尚未提交解析任务');
    }

    const task = await this.mineruService.getTask(resume.mineruTaskId);
    this.logger.log(
      JSON.stringify({
        event: 'resume.parse.sync',
        resumeId: id,
        taskId: resume.mineruTaskId,
        state: task.state,
        hasMarkdown: Boolean(task.markdownContent),
      }),
    );

    return this.prisma.resume.update({
      where: { id },
      data: {
        parseStatus: task.state,
        // MinerU 完成解析后才返回 Markdown。处理中时保留原有内容。
        originalContent: task.markdownContent ?? undefined,
      },
    });
  }

  private async completeParseTaskInBackground(resumeId: number, taskId: string) {
    const maxAttempts = Number(process.env.MINERU_BACKGROUND_POLL_ATTEMPTS ?? 120);
    const intervalMs = Number(process.env.MINERU_BACKGROUND_POLL_INTERVAL_MS ?? 3000);

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      await this.sleep(intervalMs);

      try {
        const task = await this.mineruService.getTask(taskId);
        this.logger.log(
          JSON.stringify({
            event: 'resume.parse.background',
            resumeId,
            taskId,
            attempt,
            state: task.state,
            hasMarkdown: Boolean(task.markdownContent),
          }),
        );

        if (task.state === 'done') {
          await this.prisma.resume.update({
            where: { id: resumeId },
            data: {
              parseStatus: 'done',
              originalContent: task.markdownContent ?? undefined,
            },
          });
          return;
        }

        if (task.state === 'failed') {
          await this.prisma.resume.update({
            where: { id: resumeId },
            data: { parseStatus: 'failed' },
          });
          return;
        }
      } catch (error) {
        this.logger.warn(
          JSON.stringify({
            event: 'resume.parse.background.error',
            resumeId,
            taskId,
            attempt,
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    this.logger.warn(
      JSON.stringify({
        event: 'resume.parse.background.timeout',
        resumeId,
        taskId,
        attempts: maxAttempts,
      }),
    );
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 保存通过 DTO 校验的结构化简历。
  // 未来大模型输出 JSON 后，也必须经过同一套校验规则再调用这里。
  async saveStructuredContent(userId: number, id: number, data: SaveStructuredResumeDto) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.update({
        where: { id },
        data: {
          structuredContent: data as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 保存优化稿。它与 structuredContent 分开，便于前端做前后对比。
  // 未来大模型优化后的 JSON 也必须先经过同一个 DTO 校验。
  async saveOptimizedContent(userId: number, id: number, data: SaveOptimizedResumeDto) {
    const resume = await this.findOne(userId, id);
    try {
      const nextVersion = resume.optimizationVersion + 1;
      return await this.prisma.$transaction(async (tx) => {
        await tx.resumeVersion.create({
          data: {
            resumeId: id,
            version: nextVersion,
            label: `优化稿 v${nextVersion}`,
            source: 'manual_save',
            content: data as unknown as Prisma.InputJsonValue,
            notes: data.optimizationNotes as unknown as Prisma.InputJsonValue,
          },
        });

        await tx.resumeExport.updateMany({
          where: { resumeId: id, isStale: false },
          data: { isStale: true },
        });

        return tx.resume.update({
          where: { id },
          data: {
            optimizedContent: data as unknown as Prisma.InputJsonValue,
            draftContent: data as unknown as Prisma.InputJsonValue,
            optimizationVersion: nextVersion,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  async saveDraftContent(userId: number, id: number, data: SaveResumeDraftDto) {
    await this.findOne(userId, id);

    return this.prisma.resume.update({
      where: { id },
      data: {
        draftContent: data.content as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async finalizeResume(userId: number, id: number, data: FinalizeResumeDto) {
    const resume = await this.findOne(userId, id);
    const content =
      data.content ??
      (resume.draftContent as unknown as SaveOptimizedResumeDto | null) ??
      (resume.optimizedContent as unknown as SaveOptimizedResumeDto | null);

    if (!content) {
      throw new BadRequestException('暂无可定稿的优化稿，请先生成或保存优化稿');
    }

    const nextVersion = resume.optimizationVersion + 1;
    return this.prisma.$transaction(async (tx) => {
      await tx.resumeVersion.create({
        data: {
          resumeId: id,
          version: nextVersion,
          label: data.label?.trim() || `最终版 v${nextVersion}`,
          source: 'finalized',
          content: content as unknown as Prisma.InputJsonValue,
          notes: content.optimizationNotes as unknown as Prisma.InputJsonValue,
          isFinal: true,
        },
      });

      await tx.resumeExport.updateMany({
        where: { resumeId: id, isStale: false },
        data: { isStale: true },
      });

      return tx.resume.update({
        where: { id },
        data: {
          optimizedContent: content as unknown as Prisma.InputJsonValue,
          draftContent: content as unknown as Prisma.InputJsonValue,
          finalizedContent: content as unknown as Prisma.InputJsonValue,
          finalizedAt: new Date(),
          optimizationVersion: nextVersion,
        },
      });
    });
  }

  async findVersions(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.resumeVersion.findMany({
      where: { resumeId: id },
      orderBy: { version: 'desc' },
    });
  }

  // 使用 DeepSeek 将 MinerU Markdown 转为结构化 JSON，并保存进数据库。
  async structureWithAi(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.originalContent.trim()) {
      throw new BadRequestException('简历尚无 Markdown 内容，请先完成 MinerU 解析');
    }

    const lock = await this.prisma.resume.updateMany({
      where: {
        id,
        userId,
        structureStatus: { not: 'running' },
      },
      data: { structureStatus: 'running' },
    });

    if (lock.count === 0) {
      throw new ConflictException('简历结构化正在处理中，请稍后查看结果');
    }

    try {
      const structuredContent = await this.deepseekService.structureResume(
        resume.originalContent,
      );

      return await this.prisma.resume.update({
        where: { id },
        data: {
          structuredContent: structuredContent as Prisma.InputJsonValue,
          structureStatus: 'done',
        },
      });
    } catch (error) {
      await this.prisma.resume.update({
        where: { id },
        data: { structureStatus: 'failed' },
      });
      throw error;
    }
  }

  // 使用 DeepSeek 生成优化稿。JD 可选，结果与原始结构化简历分开保存。
  async optimizeWithAi(
    userId: number,
    id: number,
    jobDescription?: string,
    additionalInstruction?: string,
  ) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.structuredContent) {
      throw new BadRequestException('简历尚未结构化，请先调用结构化接口');
    }

    const currentOptimizedContent = resume.optimizedContent as
      | { optimizedResume?: unknown }
      | null;
    // 多轮优化时，优先基于用户当前看到或手动保存过的优化稿继续改。
    // 如果还没有优化稿，则从用户确认后的结构化简历开始。
    const optimizationBase =
      currentOptimizedContent?.optimizedResume ?? resume.structuredContent;

    const lock = await this.prisma.resume.updateMany({
      where: {
        id,
        userId,
        optimizeStatus: { not: 'running' },
      },
      data: { optimizeStatus: 'running' },
    });

    if (lock.count === 0) {
      throw new ConflictException('简历优化正在处理中，请稍后查看结果');
    }

    try {
      const optimizedContent = await this.deepseekService.optimizeResume(
        optimizationBase,
        jobDescription,
        additionalInstruction,
      );

      return await this.prisma.resume.update({
        where: { id },
        data: {
          optimizedContent: optimizedContent as unknown as Prisma.InputJsonValue,
          draftContent: optimizedContent as unknown as Prisma.InputJsonValue,
          optimizeStatus: 'done',
        },
      });
    } catch (error) {
      await this.prisma.resume.update({
        where: { id },
        data: { optimizeStatus: 'failed' },
      });
      throw error;
    }
  }

  async analyzeJdMatch(userId: number, id: number, jobDescription: string) {
    const resume = await this.findOne(userId, id);

    if (!resume.structuredContent) {
      throw new BadRequestException('请先完成简历结构化，再计算 JD 匹配度');
    }

    const optimizedContent = resume.optimizedContent as
      | { optimizedResume?: unknown }
      | null;
    const resumeContent = optimizedContent?.optimizedResume ?? resume.structuredContent;
    const resumeText = this.flattenResumeText(resumeContent);
    const jdKeywords = this.extractJdKeywords(jobDescription);

    if (jdKeywords.length === 0) {
      throw new BadRequestException('JD 中暂未识别到可用于匹配的关键词，请粘贴更完整的岗位要求');
    }

    const normalizedResume = this.normalizeText(resumeText);
    const matchedKeywords = jdKeywords.filter((keyword) =>
      normalizedResume.includes(this.normalizeText(keyword)),
    );
    const missingKeywords = jdKeywords.filter(
      (keyword) => !matchedKeywords.includes(keyword),
    );
    const keywordCoverage = Math.round(
      (matchedKeywords.length / jdKeywords.length) * 100,
    );
    const experienceEvidence = this.scoreExperienceEvidence(
      resumeText,
      matchedKeywords,
    );
    const quantification = this.scoreQuantification(resumeText);
    const structure = this.scoreResumeStructure(resumeContent);
    const totalScore = Math.round(
      keywordCoverage * 0.45 +
        experienceEvidence * 0.25 +
        quantification * 0.15 +
        structure * 0.15,
    );
    const metrics: MatchMetric[] = [
      this.toMetric(
        'keywordCoverage',
        '关键词覆盖',
        keywordCoverage,
        `JD 识别到 ${jdKeywords.length} 个关键词，简历命中 ${matchedKeywords.length} 个。`,
      ),
      this.toMetric(
        'experienceEvidence',
        '经历证据',
        experienceEvidence,
        '检查命中关键词是否出现在项目/工作经历等可证明能力的段落中。',
      ),
      this.toMetric(
        'quantification',
        '量化表达',
        quantification,
        '检查简历是否包含百分比、规模、耗时、并发、增长等量化结果。',
      ),
      this.toMetric(
        'structure',
        '简历完整度',
        structure,
        '检查基本信息、总结、技能、经历、项目和教育等模块是否完整。',
      ),
    ];
    const deductions = this.buildMatchDeductions(
      missingKeywords,
      keywordCoverage,
      experienceEvidence,
      quantification,
      structure,
    );

    const result = {
      resumeId: id,
      totalScore,
      summary:
        missingKeywords.length === 0
          ? '这份简历已覆盖当前 JD 的主要关键词，建议继续强化经历中的结果证据。'
          : `这份简历与 JD 有一定匹配度，但仍缺少 ${missingKeywords
              .slice(0, 5)
              .join('、')} 等关键词证据。`,
      jdKeywords,
      matchedKeywords,
      missingKeywords,
      metrics,
      deductions,
      suggestions: missingKeywords.slice(0, 8).map((keyword, index) => ({
        id: `missing-${index + 1}`,
        title: `补充「${keyword}」相关证据`,
        description:
          '如果你确实具备该能力，请优先放到项目经历或工作经历中，用“做了什么、怎么做、结果如何”的方式表达；不要只把关键词堆在技能栏。',
        keywords: [keyword],
        severity: index < 3 ? 'high' : 'medium',
      })),
    };

    await this.prisma.resume.update({
      where: { id },
      data: {
        jdMatchResult: result as unknown as Prisma.InputJsonValue,
      },
    });

    return result;
  }

  private flattenResumeText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.flattenResumeText(item)).join('\n');
    }
    if (typeof value === 'object') {
      return Object.values(value)
        .map((item) => this.flattenResumeText(item))
        .join('\n');
    }
    return '';
  }

  private normalizeText(text: string) {
    return text.toLowerCase().replace(/\s+/g, '');
  }

  private extractJdKeywords(jobDescription: string) {
    const normalizedJd = this.normalizeText(jobDescription);
    const dictionaryHits = JD_KEYWORD_DICTIONARY.filter((keyword) =>
      normalizedJd.includes(this.normalizeText(keyword)),
    );
    const englishHits =
      jobDescription.match(/[A-Za-z][A-Za-z0-9+#./-]{1,}/g) ?? [];
    const uniqueKeywords = [...dictionaryHits, ...englishHits]
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length >= 2);

    return Array.from(new Set(uniqueKeywords.map((keyword) => keyword.toLowerCase())))
      .slice(0, 40);
  }

  private scoreExperienceEvidence(resumeText: string, matchedKeywords: string[]) {
    if (matchedKeywords.length === 0) return 0;

    const evidenceText = this.normalizeText(resumeText);
    const evidenceHits = matchedKeywords.filter((keyword) =>
      evidenceText.includes(this.normalizeText(keyword)),
    ).length;

    return Math.min(100, Math.round((evidenceHits / matchedKeywords.length) * 100));
  }

  private scoreQuantification(resumeText: string) {
    const matches =
      resumeText.match(
        /(\d+%?|\d+\s*(人|万|千|次|秒|分钟|小时|天|个月|年)|提升|降低|增长|减少|转化|耗时|并发|qps|用户|规模|效率)/gi,
      ) ?? [];

    return Math.min(100, matches.length * 12);
  }

  private scoreResumeStructure(content: unknown) {
    const resume = content as {
      basicInfo?: unknown;
      summary?: unknown;
      skills?: unknown[];
      workExperiences?: unknown[];
      projects?: unknown[];
      educations?: unknown[];
    };
    const checks = [
      Boolean(resume.basicInfo),
      typeof resume.summary === 'string' && resume.summary.trim().length > 0,
      Array.isArray(resume.skills) && resume.skills.length > 0,
      Array.isArray(resume.workExperiences) && resume.workExperiences.length > 0,
      Array.isArray(resume.projects) && resume.projects.length > 0,
      Array.isArray(resume.educations) && resume.educations.length > 0,
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private toMetric(
    key: string,
    label: string,
    score: number,
    reason: string,
  ): MatchMetric {
    return {
      key,
      label,
      score,
      level: score >= 75 ? 'good' : score >= 50 ? 'warning' : 'danger',
      reason,
    };
  }

  private buildMatchDeductions(
    missingKeywords: string[],
    keywordCoverage: number,
    experienceEvidence: number,
    quantification: number,
    structure: number,
  ) {
    const deductions: string[] = [];

    if (keywordCoverage < 80) {
      deductions.push(
        `关键词覆盖不足：当前缺少 ${missingKeywords.slice(0, 6).join('、') || '部分岗位关键词'}。`,
      );
    }
    if (experienceEvidence < 70) {
      deductions.push('经历证据偏弱：关键词需要出现在项目/工作经历中，而不只是技能列表。');
    }
    if (quantification < 60) {
      deductions.push('量化表达不足：建议补充提升比例、用户规模、耗时、并发、转化等结果。');
    }
    if (structure < 80) {
      deductions.push('简历结构不完整：建议补齐个人总结、技能、项目/工作经历和教育经历。');
    }

    return deductions.length ? deductions : ['暂无明显扣分项，建议继续针对 JD 强化结果表达。'];
  }

  private readonly exportDir = join(process.cwd(), 'storage', 'resume-exports');

  // 导出 PDF 时优先使用最终优化稿；如果还没有优化稿，就使用结构化简历。
  private getOptimizedResumeContent(content: unknown) {
    return (content as { optimizedResume?: ResumePdfContent } | null)?.optimizedResume;
  }

  private async getExportSource(
    userId: number,
    id: number,
    versionId?: number,
  ): Promise<{
    title: string;
    content: ResumePdfContent;
    versionNumber: number;
    versionId?: number;
  }> {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (versionId) {
      const version = await this.prisma.resumeVersion.findFirst({
        where: { id: versionId, resumeId: id },
      });

      if (!version) {
        throw new NotFoundException('简历版本不存在');
      }

      const versionContent = this.getOptimizedResumeContent(version.content);
      this.resumePdfService.assertExportable(versionContent);

      return {
        title: resume.title,
        content: versionContent,
        versionNumber: version.version,
        versionId: version.id,
      };
    }

    const finalizedContent = this.getOptimizedResumeContent(resume.finalizedContent);
    const optimizedContent = this.getOptimizedResumeContent(resume.optimizedContent);
    const exportContent =
      finalizedContent ??
      optimizedContent ??
      (resume.structuredContent as ResumePdfContent | null);

    this.resumePdfService.assertExportable(exportContent);

    const versionNumber =
      resume.finalizedAt || resume.optimizedContent
        ? (resume.optimizationVersion ?? 0)
        : 0;

    return {
      title: resume.title,
      content: exportContent,
      versionNumber,
    };
  }

  async previewPdfHtml(
    userId: number,
    id: number,
    template: ResumePdfTemplate,
    versionId?: number,
  ) {
    const source = await this.getExportSource(userId, id, versionId);
    return this.resumePdfService.renderHtml(source.title, source.content, template);
  }

  async exportPdf(
    userId: number,
    id: number,
    template: ResumePdfTemplate,
    versionId?: number,
  ) {
    const source = await this.getExportSource(userId, id, versionId);
    const cachedExport = await this.prisma.resumeExport.findUnique({
      where: {
        resumeId_versionNumber_template: {
          resumeId: id,
          versionNumber: source.versionNumber,
          template,
        },
      },
    });

    if (cachedExport && existsSync(cachedExport.filePath)) {
      await this.prisma.resumeExport.update({
        where: { id: cachedExport.id },
        data: { downloadCount: { increment: 1 } },
      });
      return readFile(cachedExport.filePath);
    }

    const pdf = await this.resumePdfService.generatePdf(source.title, source.content, template);
    await mkdir(this.exportDir, { recursive: true });
    const filePath = join(this.exportDir, `resume-${id}-v${source.versionNumber}-${template}.pdf`);
    await writeFile(filePath, pdf);

    const version =
      source.versionId
        ? { id: source.versionId }
        : await this.prisma.resumeVersion.findUnique({
            where: {
              resumeId_version: {
                resumeId: id,
                version: source.versionNumber,
              },
            },
          });

    await this.prisma.resumeExport.upsert({
      where: {
        resumeId_versionNumber_template: {
          resumeId: id,
          versionNumber: source.versionNumber,
          template,
        },
      },
      update: {
        versionId: version?.id,
        filePath,
        isStale: false,
        downloadCount: { increment: 1 },
      },
      create: {
        resumeId: id,
        versionId: version?.id,
        versionNumber: source.versionNumber,
        template,
        filePath,
        downloadCount: 1,
      },
    });

    return pdf;
  }

  async findExports(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.resumeExport.findMany({
      where: { resumeId: id },
      include: {
        version: {
          select: {
            label: true,
            isFinal: true,
          },
        },
      },
      orderBy: { generatedAt: 'desc' },
    });
  }

  async removeExport(userId: number, resumeId: number, exportId: number) {
    await this.findOne(userId, resumeId);
    const record = await this.prisma.resumeExport.findFirst({
      where: { id: exportId, resumeId },
    });

    if (!record) {
      throw new NotFoundException('PDF 导出记录不存在');
    }

    if (existsSync(record.filePath)) {
      await unlink(record.filePath);
    }

    return this.prisma.resumeExport.delete({
      where: { id: exportId },
    });
  }
}
