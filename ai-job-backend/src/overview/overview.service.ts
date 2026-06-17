import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: number) {
    const [
      resumeCount,
      optimizedResumeCount,
      interviewCount,
      reportCount,
      latestReport,
      profile,
      jobStatusCounts,
      activityRows,
    ] =
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
        this.prisma.job.groupBy({
          by: ['status'],
          where: { userId },
          _count: { status: true },
        }),
        this.prisma.dailyActivity.findMany({
          where: {
            userId,
            date: {
              gte: this.startOfMonth(),
              lte: this.endOfMonth(),
            },
          },
          orderBy: { date: 'asc' },
        }),
      ]);

    const statusCounts = this.toStatusCounts(jobStatusCounts);
    const applicationCount =
      statusCounts.applied + statusCounts.interviewing + statusCounts.offer + statusCounts.rejected;
    const funnelInterviewCount = statusCounts.interviewing + statusCounts.offer;
    const activityCalendar = this.buildActivityCalendar(activityRows);
    const todayActivity =
      activityCalendar.find((item) => item.date === this.toDateKey(new Date())) ??
      {
        date: this.toDateKey(new Date()),
        day: new Date().getDate(),
        applicationCount: 0,
        audioUploadCount: 0,
        mockInterviewCount: 0,
        totalCount: 0,
        level: 0,
      };

    return {
      kpis: [
        { label: '已上传简历', value: resumeCount, unit: '份' },
        { label: '已优化简历', value: optimizedResumeCount, unit: '份' },
        { label: '模拟面试', value: interviewCount, unit: '次' },
        { label: '复盘报告', value: reportCount, unit: '份' },
      ],
      recentReportTitle: latestReport?.title ?? '暂无复盘报告',
      mode: this.toJobModeLabel(profile?.jobMode),
      pipeline: {
        applications: applicationCount,
        interviews: funnelInterviewCount,
        offers: statusCounts.offer,
      },
      activity: {
        todayCount: todayActivity.totalCount,
        level: todayActivity.level,
        calendar: activityCalendar,
      },
      suggestedTodos: this.buildSuggestedTodos({
        resumeCount,
        applicationCount,
        interviewCount,
        reportCount,
      }),
    };
  }

  private startOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private endOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  private toStatusCounts(rows: Array<{ status: string; _count: { status: number } }>) {
    const counts = {
      draft: 0,
      interested: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      archived: 0,
    };

    for (const row of rows) {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row._count.status;
      }
    }

    return counts;
  }

  private toActivityLevel(count: number) {
    if (count >= 7) return 4;
    if (count >= 4) return 3;
    if (count >= 2) return 2;
    if (count >= 1) return 1;
    return 0;
  }

  private buildActivityCalendar(
    rows: Array<{
      date: Date;
      applicationCount: number;
      audioUploadCount: number;
      mockInterviewCount: number;
    }>,
  ) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const rowMap = new Map(rows.map((row) => [this.toDateKey(row.date), row]));

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), index + 1);
      const dateKey = this.toDateKey(date);
      const row = rowMap.get(dateKey);
      const applicationCount = row?.applicationCount ?? 0;
      const audioUploadCount = row?.audioUploadCount ?? 0;
      const mockInterviewCount = row?.mockInterviewCount ?? 0;
      const totalCount = applicationCount + audioUploadCount + mockInterviewCount;

      return {
        date: dateKey,
        day: index + 1,
        applicationCount,
        audioUploadCount,
        mockInterviewCount,
        totalCount,
        level: this.toActivityLevel(totalCount),
      };
    });
  }

  private toDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private buildSuggestedTodos(input: {
    resumeCount: number;
    applicationCount: number;
    interviewCount: number;
    reportCount: number;
  }) {
    const todos: Array<{ id: string; text: string; icon: string; isHighPriority?: boolean }> = [];

    if (input.resumeCount === 0) {
      todos.push({
        id: 'onboarding-upload-resume',
        text: '上传第一份简历',
        icon: 'upload_file',
        isHighPriority: true,
      });
    }

    if (input.applicationCount === 0) {
      todos.push({
        id: 'onboarding-add-job',
        text: '添加第一个目标岗位',
        icon: 'work',
      });
    }

    if (input.interviewCount === 0) {
      todos.push({
        id: 'onboarding-mock-interview',
        text: '完成一次模拟面试',
        icon: 'psychology',
      });
    }

    if (input.reportCount === 0) {
      todos.push({
        id: 'onboarding-review',
        text: '生成第一份面试复盘',
        icon: 'summarize',
      });
    }

    return todos.slice(0, 3);
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
