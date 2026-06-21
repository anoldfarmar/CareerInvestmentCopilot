import { externalFetch } from '../common/http/external-http.client';
import { PrismaService } from '../prisma/prisma.service';
import { JobRecommendationService } from './job-recommendation.service';

jest.mock('../common/http/external-http.client', () => ({
  externalFetch: jest.fn(),
}));

describe('JobRecommendationService', () => {
  const prisma = {
    userProfile: {
      findUnique: jest.fn(),
    },
    resume: {
      findFirst: jest.fn(),
    },
  };
  const service = new JobRecommendationService(prisma as unknown as PrismaService);
  const fetchMock = externalFetch as jest.MockedFunction<typeof externalFetch>;
  const originalApiKey = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TAVILY_API_KEY = 'test-key';
    prisma.userProfile.findUnique.mockResolvedValue(null);
    prisma.resume.findFirst.mockResolvedValue(null);
  });

  afterAll(() => {
    process.env.TAVILY_API_KEY = originalApiKey;
  });

  it('根据公开搜索结果返回去重和平衡后的岗位推荐', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            title: '腾讯 数据分析 实习生',
            url: 'https://careers.tencent.com/job/1?from=a',
            content: '负责 SQL Python 数据分析，支持业务指标。',
            score: 0.99,
          },
          {
            title: '数据分析 实习生',
            url: 'https://www.shixiseng.com/intern/1',
            content: '使用 SQL Python 做用户增长分析，可长期实习。',
            score: 0.9,
          },
          {
            title: '数据分析 实习生',
            url: 'https://www.shixiseng.com/intern/duplicated',
            content: '重复标题应按来源弱去重。',
            score: 0.8,
          },
          {
            title: 'AI 产品实习生',
            url: 'https://www.zhipin.com/job_detail/1',
            content: '跟进 AI Agent 需求分析。',
            score: 0.7,
          },
        ],
      }),
      text: async () => '',
    } as unknown as Response);

    const result = await service.recommendJobs(10, {
      targetRoles: ['数据分析实习'],
      cities: ['深圳'],
      skills: ['SQL', 'Python'],
      maxResults: 3,
      mode: 'fast',
    });

    expect(result.total).toBeLessThanOrEqual(3);
    expect(result.recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '腾讯招聘',
          tier: '冲刺岗',
        }),
        expect.objectContaining({
          source: '实习僧',
          tier: '主投岗',
        }),
      ]),
    );
    expect(result.sourceStats).toEqual(expect.objectContaining({ 腾讯招聘: 1, 实习僧: 1 }));
    expect(result.recommendations.filter((item) => item.source === '实习僧')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalled();
  });
});
