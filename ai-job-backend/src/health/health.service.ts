import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      database: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  ready() {
    return {
      status: 'ok',
      dependencies: {
        deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
        mineruConfigured: Boolean(process.env.MINERU_AGENT_BASE_URL),
        asr: {
          provider: 'dashscope',
          configured: Boolean(process.env.DASHSCOPE_API_KEY),
          model: process.env.DASHSCOPE_ASR_MODEL ?? 'fun-asr',
        },
        realtimeAsr: {
          provider: process.env.REALTIME_ASR_PROVIDER ?? 'vivo',
          configured:
            (process.env.REALTIME_ASR_PROVIDER ?? 'vivo').toLowerCase() === 'vivo'
              ? Boolean(process.env.LANXIN_API_KEY)
              : Boolean(process.env.REALTIME_ASR_WS_URL),
          websocketUrl:
            (process.env.REALTIME_ASR_PROVIDER ?? 'vivo').toLowerCase() === 'vivo'
              ? 'wss://api-ai.vivo.com.cn/asr/v2'
              : process.env.REALTIME_ASR_WS_URL ?? null,
        },
        rag: 'reserved',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
