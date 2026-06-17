import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { getPagination, paginatedResponse } from '../common/pagination/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(userId: number, data: CreateJobDto) {
    const job = await this.prisma.job.create({
      data: {
        ...data,
        userId,
      },
    });

    if (this.isApplicationStatus(job.status)) {
      await this.activityService.incrementApplication(userId, job.createdAt);
    }

    return job;
  }

  async findAll(userId: number, query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where: { userId },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.job.count({ where: { userId } }),
    ]);

    return paginatedResponse(items, total, query);
  }

  async getAnalysis(userId: number) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const jobs = await this.prisma.job.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    const monthlyJobs = jobs.filter((job) => job.updatedAt >= monthStart);
    const effectiveJobs = monthlyJobs.filter((job) =>
      ['applied', 'interviewing', 'offer', 'rejected'].includes(job.status),
    );
    const statusCounts = this.countByStatus(monthlyJobs);
    const total = effectiveJobs.length;
    const interviewCount = statusCounts.interviewing + statusCounts.offer;
    const rejectedCount = statusCounts.rejected;
    const offerCount = statusCounts.offer;

    return {
      month: monthStart.toISOString().slice(0, 7),
      totalApplications: total,
      savedJobs: monthlyJobs.length,
      interviewRate: this.toRate(interviewCount, total),
      rejectionRate: this.toRate(rejectedCount, total),
      offerRate: this.toRate(offerCount, total),
      statusCounts,
      insights: this.buildInsights(total, interviewCount, rejectedCount, offerCount),
    };
  }

  async findOne(userId: number, id: number) {
    const job = await this.prisma.job.findFirst({
      where: { id, userId },
    });

    if (!job) {
      throw new NotFoundException('岗位不存在');
    }

    return job;
  }

  async update(userId: number, id: number, data: UpdateJobDto) {
    const previous = await this.findOne(userId, id);

    const updated = await this.prisma.job.update({
      where: { id },
      data,
    });

    if (
      typeof data.status === 'string' &&
      !this.isApplicationStatus(previous.status) &&
      this.isApplicationStatus(updated.status)
    ) {
      await this.activityService.incrementApplication(userId, updated.updatedAt);
    }

    return updated;
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.job.delete({
      where: { id },
    });
  }

  private countByStatus(jobs: Array<{ status: string }>) {
    const statuses = ['draft', 'interested', 'applied', 'interviewing', 'offer', 'rejected', 'archived'];
    return Object.fromEntries(
      statuses.map((status) => [status, jobs.filter((job) => job.status === status).length]),
    ) as Record<string, number>;
  }

  private isApplicationStatus(status: string) {
    return ['applied', 'interviewing', 'offer', 'rejected'].includes(status);
  }

  private toRate(count: number, total: number) {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  private buildInsights(total: number, interviewCount: number, rejectedCount: number, offerCount: number) {
    if (total === 0) {
      return ['本月还没有形成有效投递记录，先保存并更新 3-5 个目标岗位状态。'];
    }

    const insights: string[] = [];
    if (interviewCount === 0) {
      insights.push('本月暂未进入面试，建议优先检查简历关键词和 JD 匹配度。');
    } else {
      insights.push('已有岗位进入面试阶段，建议复用对应 JD 做专项模拟面试。');
    }
    if (rejectedCount / total >= 0.5) {
      insights.push('拒绝率偏高，建议回到简历对比页检查项目亮点和量化成果。');
    }
    if (offerCount > 0) {
      insights.push('已经出现 Offer，可沉淀成功岗位的 JD 特征，反向优化投递策略。');
    }
    insights.push('每次状态变化后及时更新记录，系统才能形成更可靠的反馈闭环。');
    return insights;
  }
}
