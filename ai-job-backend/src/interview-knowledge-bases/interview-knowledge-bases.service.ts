import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AsrService } from '../asr/asr.service';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { getPagination, paginatedResponse } from '../common/pagination/pagination';
import { InterviewAiService } from '../interviews/interview-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAudioRecordDto } from './dto/create-audio-record.dto';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { CreateManualRecordDto } from './dto/create-manual-record.dto';
import { TranscribeAudioRecordDto } from './dto/transcribe-audio-record.dto';
import { assertAudioUpload, getAudioExtension } from './utils/audio-upload.util';

const knowledgeBaseInclude = {
  records: {
    orderBy: { createdAt: 'desc' as const },
  },
};

type KnowledgeBaseWithRecords = Prisma.InterviewKnowledgeBaseGetPayload<{
  include: typeof knowledgeBaseInclude;
}>;

type KnowledgeBaseImpactStats = {
  monthlyQuestionCount: number;
  relatedSessionCount: number;
  lastUsedAt?: string;
  recommendation: string;
};

@Injectable()
export class InterviewKnowledgeBasesService {
  private readonly logger = new Logger(InterviewKnowledgeBasesService.name);
  private readonly audioDir = join(process.cwd(), 'storage', 'knowledge-audios');

  constructor(
    private readonly prisma: PrismaService,
    private readonly interviewAiService: InterviewAiService,
    private readonly asrService: AsrService,
  ) {}

  async create(userId: number, data: CreateKnowledgeBaseDto) {
    const knowledgeBase = await this.prisma.interviewKnowledgeBase.create({
      data: {
        name: data.name,
        description: data.description,
        focusAreas: data.focusAreas ?? [],
        userId,
      },
      include: knowledgeBaseInclude,
    });

    return this.toKnowledgeBaseResponse(knowledgeBase, this.emptyImpactStats(knowledgeBase.records.length));
  }

  async findAll(userId: number, query: PaginationQueryDto) {
    const pagination = getPagination(query);
    const [list, total] = await Promise.all([
      this.prisma.interviewKnowledgeBase.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          _count: {
            select: { records: true },
          },
        },
      }),
      this.prisma.interviewKnowledgeBase.count({ where: { userId } }),
    ]);

    const impactMap = await this.buildKnowledgeBaseImpactMap(
      userId,
      list.map((item) => item.id),
    );

    return paginatedResponse(
      list.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        recordCount: item._count.records,
        focusAreas: Array.isArray(item.focusAreas) ? item.focusAreas : [],
        updatedAt: item.updatedAt.toISOString(),
        impactStats: impactMap.get(item.id) ?? this.emptyImpactStats(item._count.records),
        records: [],
      })),
      total,
      query,
    );
  }

  async findOne(userId: number, id: string) {
    const knowledgeBase = await this.prisma.interviewKnowledgeBase.findFirst({
      where: { id, userId },
      include: knowledgeBaseInclude,
    });

    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在');
    }

    const impactMap = await this.buildKnowledgeBaseImpactMap(userId, [id]);
    return this.toKnowledgeBaseResponse(
      knowledgeBase,
      impactMap.get(knowledgeBase.id) ?? this.emptyImpactStats(knowledgeBase.records.length),
    );
  }

  async remove(userId: number, knowledgeBaseId: string) {
    await this.ensureKnowledgeBase(userId, knowledgeBaseId);

    await this.prisma.interviewKnowledgeBase.delete({
      where: { id: knowledgeBaseId },
    });

    return { id: knowledgeBaseId };
  }

  async removeRecord(userId: number, knowledgeBaseId: string, recordId: string) {
    const record = await this.prisma.realInterviewRecord.findFirst({
      where: {
        id: recordId,
        knowledgeBaseId,
        knowledgeBase: { userId },
      },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException('面试记录不存在');
    }

    await this.prisma.realInterviewRecord.delete({
      where: { id: record.id },
    });

    return { id: record.id, knowledgeBaseId };
  }

  async createManualRecord(userId: number, knowledgeBaseId: string, data: CreateManualRecordDto) {
    await this.ensureKnowledgeBase(userId, knowledgeBaseId);

    const record = await this.prisma.realInterviewRecord.create({
      data: {
        knowledgeBaseId,
        title: data.title,
        sourceType: 'manual',
        interviewDate: new Date(data.interviewDate),
        transcript: data.transcript ?? '',
        status: 'ready',
        buildStatus: data.transcript?.trim() ? 'not_built' : 'empty',
      },
    });

    return this.toRecordResponse(record);
  }

  async createAudioRecord(
    userId: number,
    knowledgeBaseId: string,
    data: CreateAudioRecordDto,
    file?: Express.Multer.File,
  ) {
    await this.ensureKnowledgeBase(userId, knowledgeBaseId);
    const inputAudioUrl = data.audioUrl?.trim();
    if (!file && !inputAudioUrl) {
      throw new BadRequestException('请上传录音文件，或填写公网可访问的音频 URL');
    }

    const storedAudio = file ? await this.saveAudioFile(file) : undefined;
    const audioUrl = inputAudioUrl || storedAudio?.publicUrl;

    const record = await this.prisma.realInterviewRecord.create({
      data: {
        knowledgeBaseId,
        title: data.title,
        sourceType: 'audio',
        interviewDate: new Date(data.interviewDate),
        audioFileName: file?.originalname ?? this.getFileNameFromUrl(inputAudioUrl),
        audioFileSize: file?.size,
        audioUrl,
        status: 'asr_pending',
        buildStatus: 'waiting_asr',
      },
    });

    return this.toRecordResponse(record);
  }

  async transcribeAudioRecord(
    userId: number,
    knowledgeBaseId: string,
    recordId: string,
    data: TranscribeAudioRecordDto,
  ) {
    const record = await this.prisma.realInterviewRecord.findFirst({
      where: {
        id: recordId,
        knowledgeBaseId,
        knowledgeBase: { userId },
      },
    });

    if (!record) {
      throw new NotFoundException('面试录音记录不存在');
    }

    const audioUrl = data.audioUrl ?? record.audioUrl;
    if (!audioUrl) {
      throw new BadRequestException('缺少公网可访问的 audioUrl，DashScope ASR 不能直接读取本地上传文件');
    }

    await this.prisma.realInterviewRecord.update({
      where: { id: record.id },
      data: {
        audioUrl,
        status: 'transcribing',
        buildStatus: 'waiting_asr',
        buildError: null,
      },
    });

    try {
      const result = await this.asrService.transcribeAudioUrl(audioUrl);
      const transcript = result.roleTranscript.trim() || result.text;
      const updated = await this.prisma.realInterviewRecord.update({
        where: { id: record.id },
        data: {
          audioUrl,
          status: 'ready',
          buildStatus: transcript.trim() ? 'not_built' : 'empty',
          buildError: null,
          transcript,
          asrProvider: result.provider,
          asrModel: result.model,
          asrRawJson: result.rawJson as unknown as Prisma.InputJsonValue,
          speakerTranscript: result.speakerTranscript,
          roleTranscript: result.roleTranscript,
          transcribedAt: new Date(),
        },
      });

      return this.toRecordResponse(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.realInterviewRecord.update({
        where: { id: record.id },
        data: {
          status: 'failed',
          buildStatus: 'waiting_asr',
          buildError: message,
        },
      });
      throw error;
    }
  }

  async buildRecord(userId: number, knowledgeBaseId: string, recordId: string) {
    const record = await this.prisma.realInterviewRecord.findFirst({
      where: {
        id: recordId,
        knowledgeBaseId,
        knowledgeBase: { userId },
      },
      include: {
        knowledgeBase: {
          select: {
            focusAreas: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('面试记录不存在');
    }

    if (!record.transcript?.trim()) {
      throw new BadRequestException('该记录还没有转写文本，ASR 接入前不能构建知识库');
    }

    await this.prisma.realInterviewRecord.update({
      where: { id: record.id },
      data: {
        buildStatus: 'building',
        buildError: null,
      },
    });

    try {
      const buildResult = await this.interviewAiService.buildKnowledgeRecord({
        title: record.title,
        transcript: record.transcript,
        focusAreas: Array.isArray(record.knowledgeBase.focusAreas)
          ? record.knowledgeBase.focusAreas.filter((item): item is string => typeof item === 'string')
          : [],
      });

      const updated = await this.prisma.realInterviewRecord.update({
        where: { id: record.id },
        data: {
          status: 'ready',
          buildStatus: 'built',
          buildError: null,
          structuredContent: buildResult as unknown as Prisma.InputJsonValue,
          chunks: buildResult.chunks as unknown as Prisma.InputJsonValue,
        },
      });

      return this.toRecordResponse(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`知识库记录构建失败：${message}`);
      await this.prisma.realInterviewRecord.update({
        where: { id: record.id },
        data: {
          buildStatus: 'failed',
          buildError: message,
        },
      });
      throw error;
    }
  }

  private async ensureKnowledgeBase(userId: number, id: string) {
    const knowledgeBase = await this.prisma.interviewKnowledgeBase.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!knowledgeBase) {
      throw new NotFoundException('知识库不存在');
    }

    return knowledgeBase;
  }

  private async saveAudioFile(file: Express.Multer.File) {
    assertAudioUpload(file);

    await mkdir(this.audioDir, { recursive: true });
    const extension = getAudioExtension(file);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    await writeFile(join(this.audioDir, filename), file.buffer);

    return {
      filename,
      publicUrl: this.buildStoragePublicUrl('knowledge-audios', filename),
    };
  }

  private buildStoragePublicUrl(folder: string, filename: string) {
    const publicBaseUrl = (process.env.ASR_PUBLIC_BASE_URL ?? process.env.APP_PUBLIC_BASE_URL)?.replace(/\/$/, '');
    if (!publicBaseUrl) {
      return undefined;
    }

    return `${publicBaseUrl}/storage/${folder}/${encodeURIComponent(filename)}`;
  }

  private getFileNameFromUrl(url?: string) {
    if (!url) {
      return undefined;
    }

    try {
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').filter(Boolean).pop();
      return filename ? decodeURIComponent(filename) : undefined;
    } catch {
      return undefined;
    }
  }

  private async buildKnowledgeBaseImpactMap(userId: number, knowledgeBaseIds: string[]) {
    const uniqueIds = [...new Set(knowledgeBaseIds)].filter(Boolean);
    const map = new Map<string, KnowledgeBaseImpactStats>();
    uniqueIds.forEach((id) => map.set(id, this.emptyImpactStats(0)));

    if (uniqueIds.length === 0) {
      return map;
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sessions = await this.prisma.interviewSession.findMany({
      where: {
        userId,
        startedAt: { gte: monthStart },
      },
      select: {
        id: true,
        startedAt: true,
        knowledgeBaseIds: true,
        questions: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    for (const session of sessions) {
      const selectedIds = this.readKnowledgeBaseIds(session.knowledgeBaseIds).filter((id) =>
        uniqueIds.includes(id),
      );
      if (selectedIds.length === 0) continue;

      const knowledgeBaseQuestionCount = this.countKnowledgeBaseQuestions(session.questions);
      for (const knowledgeBaseId of selectedIds) {
        const current = map.get(knowledgeBaseId) ?? this.emptyImpactStats(0);
        map.set(knowledgeBaseId, {
          monthlyQuestionCount: current.monthlyQuestionCount + knowledgeBaseQuestionCount,
          relatedSessionCount: current.relatedSessionCount + 1,
          lastUsedAt: current.lastUsedAt ?? session.startedAt.toISOString(),
          recommendation: this.buildKnowledgeBaseRecommendation(
            current.monthlyQuestionCount + knowledgeBaseQuestionCount,
            current.relatedSessionCount + 1,
          ),
        });
      }
    }

    return map;
  }

  private emptyImpactStats(recordCount: number): KnowledgeBaseImpactStats {
    return {
      monthlyQuestionCount: 0,
      relatedSessionCount: 0,
      recommendation:
        recordCount > 0
          ? '本知识库已有素材，建议在下次模拟面试中勾选使用。'
          : '先补充 2-3 条真实面试记录，系统才能基于它生成更贴近你的问题。',
    };
  }

  private countKnowledgeBaseQuestions(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return 0;
    }
    return value.filter((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      return (item as { sourceType?: string }).sourceType === 'knowledge_base';
    }).length;
  }

  private buildKnowledgeBaseRecommendation(questionCount: number, sessionCount: number) {
    if (questionCount >= 6) {
      return '这个知识库已经明显影响出题，建议继续补充高频追问和失败复盘。';
    }
    if (sessionCount > 0) {
      return '本月已被用于模拟面试，建议补充更具体的面试官追问，提升题目颗粒度。';
    }
    return '建议在下次模拟面试中勾选这个知识库，验证它对出题是否有帮助。';
  }

  private buildRecordImpactStats(
    recordCount: number,
    knowledgeBaseImpact: KnowledgeBaseImpactStats,
    recordStatus: string,
  ) {
    const monthlyQuestionCount =
      recordCount > 0 ? Math.ceil(knowledgeBaseImpact.monthlyQuestionCount / recordCount) : 0;
    return {
      monthlyQuestionCount,
      recommendation:
        recordStatus !== 'ready'
          ? '这条记录还在处理，完成转写后才能稳定影响出题。'
          : monthlyQuestionCount > 0
            ? '这条记录所在知识库已被用于出题，建议继续补充面试官追问和你的真实回答。'
            : '这条记录还没有明显影响出题，建议下次模拟面试勾选该知识库。',
    };
  }

  private toKnowledgeBaseResponse(
    knowledgeBase: KnowledgeBaseWithRecords,
    impactStats: KnowledgeBaseImpactStats,
  ) {
    return {
      id: knowledgeBase.id,
      name: knowledgeBase.name,
      description: knowledgeBase.description ?? '',
      recordCount: knowledgeBase.records.length,
      focusAreas: Array.isArray(knowledgeBase.focusAreas) ? knowledgeBase.focusAreas : [],
      updatedAt: knowledgeBase.updatedAt.toISOString(),
      impactStats,
      records: knowledgeBase.records.map((record) =>
        this.toRecordResponse(
          record,
          this.buildRecordImpactStats(knowledgeBase.records.length, impactStats, record.status),
        ),
      ),
    };
  }

  private toRecordResponse(record: {
    id: string;
    knowledgeBaseId: string;
    title: string;
    sourceType: string;
    interviewDate: Date;
    transcript: string | null;
    audioFileName: string | null;
    audioFileSize: number | null;
    audioUrl?: string | null;
    asrProvider?: string | null;
    asrModel?: string | null;
    asrRawJson?: Prisma.JsonValue | null;
    speakerTranscript?: string | null;
    roleTranscript?: string | null;
    transcribedAt?: Date | null;
    status: string;
    buildStatus?: string;
    buildError?: string | null;
    structuredContent?: Prisma.JsonValue | null;
    chunks?: Prisma.JsonValue | null;
    createdAt: Date;
  }, impactStats?: { monthlyQuestionCount: number; recommendation: string }) {
    return {
      id: record.id,
      knowledgeBaseId: record.knowledgeBaseId,
      title: record.title,
      sourceType: record.sourceType,
      interviewDate: record.interviewDate.toISOString().slice(0, 10),
      transcript: record.transcript ?? '',
      audioFileName: record.audioFileName ?? undefined,
      audioFileSize: record.audioFileSize ?? undefined,
      audioUrl: record.audioUrl ?? undefined,
      asrProvider: record.asrProvider ?? undefined,
      asrModel: record.asrModel ?? undefined,
      speakerTranscript: record.speakerTranscript ?? undefined,
      roleTranscript: record.roleTranscript ?? undefined,
      transcribedAt: record.transcribedAt?.toISOString(),
      status: record.status,
      buildStatus: record.buildStatus ?? 'not_built',
      buildError: record.buildError ?? undefined,
      structuredContent: record.structuredContent ?? undefined,
      chunks: record.chunks ?? [],
      impactStats: impactStats ?? {
        monthlyQuestionCount: 0,
        recommendation: '保存后可在模拟面试中勾选该知识库，让这条记录参与出题。',
      },
      createdAt: record.createdAt.toISOString(),
    };
  }

  private readKnowledgeBaseIds(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }
}
