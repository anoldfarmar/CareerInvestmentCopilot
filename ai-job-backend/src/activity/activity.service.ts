import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ActivityField = 'applicationCount' | 'audioUploadCount' | 'mockInterviewCount';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  incrementApplication(userId: number, date = new Date()) {
    return this.increment(userId, 'applicationCount', date);
  }

  incrementAudioUpload(userId: number, date = new Date()) {
    return this.increment(userId, 'audioUploadCount', date);
  }

  incrementMockInterview(userId: number, date = new Date()) {
    return this.increment(userId, 'mockInterviewCount', date);
  }

  private increment(userId: number, field: ActivityField, date: Date) {
    const activityDate = this.toDateOnly(date);

    return this.prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId,
          date: activityDate,
        },
      },
      create: {
        userId,
        date: activityDate,
        [field]: 1,
      },
      update: {
        [field]: {
          increment: 1,
        },
      },
    });
  }

  private toDateOnly(date: Date) {
    const chinaTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return new Date(
      Date.UTC(
        chinaTime.getUTCFullYear(),
        chinaTime.getUTCMonth(),
        chinaTime.getUTCDate(),
      ),
    );
  }
}
