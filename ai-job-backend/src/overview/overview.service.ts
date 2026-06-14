import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: number) {
    const [resumeCount, optimizedResumeCount, interviewCount, reportCount, latestReport, profile] =
      await Promise.all([
        this.prisma.resume.count({ where: { userId } }),
        this.prisma.resume.count({
          where: {
            userId,
            optimizedContent: {
              not: Prisma.DbNull,
            },
          },
        }),
        this.prisma.interviewSession.count({ where: { userId } }),
        this.prisma.reviewReport.count({ where: { userId } }),
        this.prisma.reviewReport.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { title: true },
        }),
        this.prisma.userProfile.findUnique({
          where: { userId },
          select: { jobMode: true },
        }),
      ]);

    return {
      kpis: [
        { label: '已上传简历', value: resumeCount, unit: '份' },
        { label: '已优化简历', value: optimizedResumeCount, unit: '份' },
        { label: '模拟面试', value: interviewCount, unit: '次' },
        { label: '复盘报告', value: reportCount, unit: '份' },
      ],
      recentReportTitle: latestReport?.title ?? '暂无复盘报告',
      mode: this.toJobModeLabel(profile?.jobMode),
    };
  }

  private toJobModeLabel(jobMode?: string) {
    const labels: Record<string, string> = {
      student: '校招求职模式',
      experienced: '社招求职模式',
      career_change: '转行求职模式',
      freelancer: '自由职业模式',
    };

    return labels[jobMode ?? ''] ?? '求职准备模式';
  }
}
