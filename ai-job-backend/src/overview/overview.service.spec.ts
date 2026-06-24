import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { OverviewService } from './overview.service';

describe('OverviewService', () => {
  const prisma = {
    resume: {
      count: jest.fn(),
    },
    interviewSession: {
      count: jest.fn(),
    },
    reviewReport: {
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    userProfile: {
      findUnique: jest.fn(),
    },
    job: {
      groupBy: jest.fn(),
    },
    dailyActivity: {
      findMany: jest.fn(),
    },
  };

  const service = new OverviewService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('会聚合当前用户的首页统计数据', async () => {
    prisma.resume.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prisma.interviewSession.count.mockResolvedValue(4);
    prisma.reviewReport.count.mockResolvedValue(1);
    prisma.reviewReport.findFirst.mockResolvedValue({ title: '专业面试复盘报告' });
    prisma.userProfile.findUnique.mockResolvedValue({ jobMode: 'experienced' });

    prisma.job.groupBy.mockResolvedValue([
      { status: 'draft', _count: { status: 1 } },
      { status: 'applied', _count: { status: 2 } },
      { status: 'interviewing', _count: { status: 1 } },
      { status: 'offer', _count: { status: 1 } },
      { status: 'rejected', _count: { status: 1 } },
      { status: 'unknown', _count: { status: 99 } },
    ]);
    prisma.dailyActivity.findMany.mockResolvedValue([]);

    const result = await service.getOverview(10);

    expect(prisma.resume.count).toHaveBeenNthCalledWith(1, { where: { userId: 10 } });
    expect(prisma.resume.count).toHaveBeenNthCalledWith(2, {
      where: { userId: 10, optimizedContent: { not: Prisma.DbNull } },
    });
    expect(prisma.interviewSession.count).toHaveBeenCalledWith({ where: { userId: 10 } });
    expect(result.kpis).toEqual([
      { label: '已上传简历', value: 3, unit: '份' },
      { label: '已优化简历', value: 2, unit: '份' },
      { label: '模拟面试', value: 4, unit: '次' },
      { label: '复盘报告', value: 1, unit: '份' },
    ]);
    expect(result.recentReportTitle).toBe('专业面试复盘报告');
    expect(result.mode).toBe('社招求职模式');
    expect(result.pipeline).toEqual({
      applications: 5,
      interviews: 2,
      offers: 1,
    });
  });
});
