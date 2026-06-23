import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type ProfileWithUser = {
  name: string | null;
  jobMode: string;
  targetDirection: string;
  targetDirections: Prisma.JsonValue | null;
  customTargetDirection: string | null;
  subscriptionPlan: string;
  language: string;
  questionCount: number;
  enableVoiceInput: boolean;
  showStarTips: boolean;
};

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const profile = user?.profile;
    return this.toResponse({
      name: profile?.name ?? user?.name ?? null,
      jobMode: profile?.jobMode ?? 'junior',
      targetDirection: profile?.targetDirection ?? '研发',
      targetDirections: profile?.targetDirections ?? ['研发', '后端'],
      customTargetDirection: profile?.customTargetDirection ?? null,
      subscriptionPlan: profile?.subscriptionPlan ?? 'free',
      language: profile?.language ?? 'zh-CN',
      questionCount: profile?.questionCount ?? 5,
      enableVoiceInput: profile?.enableVoiceInput ?? true,
      showStarTips: profile?.showStarTips ?? true,
    });
  }

  async updateMe(userId: number, data: UpdateProfileDto) {
    const targetDirections = this.normalizeTargetDirections(data.targetDirections, data.targetDirection);
    const targetDirection = data.targetDirection ?? targetDirections[0] ?? '研发';
    const createData = {
      userId,
      name: data.name,
      jobMode: data.jobMode ?? 'junior',
      targetDirection,
      targetDirections: targetDirections as unknown as Prisma.InputJsonValue,
      customTargetDirection: data.customTargetDirection,
      subscriptionPlan: data.subscriptionPlan ?? 'free',
      language: data.language ?? 'zh-CN',
      questionCount: data.questionCount ?? 5,
      enableVoiceInput: data.enableVoiceInput ?? true,
      showStarTips: data.showStarTips ?? true,
    };
    const updateData = {
      ...data,
      targetDirection,
      targetDirections: targetDirections as unknown as Prisma.InputJsonValue,
    };

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: createData,
      update: updateData,
    });

    if (typeof data.name !== 'undefined') {
      await this.prisma.user.update({
        where: { id: userId },
        data: { name: data.name },
      });
    }

    return this.toResponse(profile);
  }

  async removeMe(userId: number) {
    await this.prisma.$transaction([
      this.prisma.userProfile.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { name: null },
      }),
    ]);

    return this.findMe(userId);
  }

  private toResponse(profile: ProfileWithUser) {
    return {
      name: profile.name ?? '',
      jobMode: profile.jobMode,
      targetDirection: profile.targetDirection,
      targetDirections: this.readStringArray(profile.targetDirections, [profile.targetDirection]),
      customTargetDirection: profile.customTargetDirection ?? '',
      subscriptionPlan: profile.subscriptionPlan,
      language: profile.language,
      questionCount: profile.questionCount,
      enableVoiceInput: profile.enableVoiceInput,
      showStarTips: profile.showStarTips,
      subscription: this.buildSubscription(profile.subscriptionPlan),
    };
  }

  private readStringArray(value: Prisma.JsonValue | null, fallback: string[]) {
    if (!Array.isArray(value)) {
      return fallback;
    }

    const items = value.filter((item): item is string => typeof item === 'string');
    return items.length > 0 ? items : fallback;
  }

  private normalizeTargetDirections(value?: string[], primary?: string) {
    const items = [...(value ?? []), primary]
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);

    const uniqueItems = [...new Set(items)];
    return uniqueItems.length > 0 ? uniqueItems : ['研发'];
  }

  private buildSubscription(plan: string) {
    const isPremium = plan === 'premium';
    return {
      plan,
      planLabel: isPremium ? '高级版' : '免费版',
      limits: isPremium ? ['模拟面试次数不限', '可使用专家级复盘', '知识库录音额度更高'] : ['每月 5 场免费模拟面试', '基础复盘报告', '本地知识库记录'],
      benefits: ['无限模拟面试', '专家级复盘建议', '真实面试知识库增强', '简历多模板导出'],
      upgradeEnabled: !isPremium,
    };
  }
}
