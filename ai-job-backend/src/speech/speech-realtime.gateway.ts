import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { IncomingMessage, Server } from 'node:http';
import { URL } from 'node:url';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { PrismaService } from '../prisma/prisma.service';

type RealtimeAsrMessage = {
  type?: string;
  action?: string;
  code?: number;
  desc?: string;
  text?: string;
  result?: string;
  sentence?: string;
  data?: {
    text?: string;
    is_last?: boolean;
    result_id?: number;
    reformation?: number;
    [key: string]: unknown;
  };
  is_finish?: boolean;
  isFinal?: boolean;
  is_final?: boolean;
  final?: boolean;
  [key: string]: unknown;
};

type NormalizedRealtimeAsrMessage = RealtimeAsrMessage & {
  type: 'ready' | 'partial' | 'final' | 'error';
  text: string;
  message?: string;
  resultId?: number;
  reformation?: number;
  isLast?: boolean;
  isFinish?: boolean;
  recognitionRound?: number;
};

type AuthenticatedUser = {
  id: number;
  email: string;
  name: string | null;
};

type UpstreamConfig = {
  url: string;
  requestId: string;
  headers: Record<string, string> | undefined;
};

@Injectable()
export class SpeechRealtimeGateway {
  private readonly logger = new Logger(SpeechRealtimeGateway.name);
  private server?: WebSocketServer;

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  bind(httpServer: Server) {
    if (this.server) {
      return;
    }

    this.server = new WebSocketServer({
      server: httpServer,
      path: '/speech/realtime',
    });

    this.server.on('connection', (client, request) => {
      void this.handleConnection(client, request);
    });
  }

  private async handleConnection(client: WebSocket, request: IncomingMessage) {
    const user = await this.authenticate(request);
    if (!user) {
      this.sendJson(client, { type: 'error', message: '请先登录后再使用语音面试' });
      client.close(1008, 'unauthorized');
      return;
    }

    const provider = (process.env.REALTIME_ASR_PROVIDER ?? 'vivo').toLowerCase();
    const firstConfig = this.buildUpstreamConfig(provider, user);
    if (!firstConfig) {
      this.sendJson(client, {
        type: 'error',
        message:
          provider === 'vivo' || provider === 'lanxin'
            ? '未配置 LANXIN_API_KEY，无法连接 vivo 实时 ASR。'
            : '未配置 REALTIME_ASR_WS_URL，请先启动本地实时 ASR 服务。',
      });
      client.close(1011, 'realtime asr config missing');
      return;
    }

    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const sampleRate = Number(requestUrl.searchParams.get('sampleRate') ?? 16000);
    const language = requestUrl.searchParams.get('language') ?? 'zh-CN';

    let upstream = new WebSocket(firstConfig.url, { headers: firstConfig.headers });
    let recognitionRestartTimer: ReturnType<typeof setTimeout> | null = null;
    let recognitionRound = 0;
    let closingByClient = false;
    let restartingUpstream = false;
    const pendingAudioFrames: Buffer[] = [];
    const maxPendingAudioFrames = 80;

    const reopenUpstream = () => {
      const nextConfig = this.buildUpstreamConfig(provider, user);
      if (!nextConfig) {
        this.sendJson(client, {
          type: 'error',
          message: '未配置 LANXIN_API_KEY，无法继续连接 vivo 实时 ASR。',
        });
        client.close(1011, 'realtime asr config missing');
        return;
      }

      upstream = new WebSocket(nextConfig.url, { headers: nextConfig.headers });
      bindUpstream(upstream, nextConfig, false);
    };

    const bindUpstream = (socket: WebSocket, config: UpstreamConfig, sendReady: boolean) => {
      socket.on('open', () => {
        if (sendReady) {
          this.sendJson(client, {
            type: 'ready',
            provider,
            sampleRate,
            language,
          });
        }

        this.sendJson(socket, this.buildStartMessage(provider, config.requestId, sampleRate, language, user));

        while (pendingAudioFrames.length > 0 && socket.readyState === WebSocket.OPEN) {
          const frame = pendingAudioFrames.shift();
          if (frame) {
            socket.send(frame, { binary: true });
          }
        }
      });

      socket.on('message', (data, isBinary) => {
        if (client.readyState !== WebSocket.OPEN || socket !== upstream) {
          return;
        }

        if (isBinary) {
          client.send(data, { binary: true });
          return;
        }

        const message = this.normalizeAsrMessage(data, recognitionRound);
        this.sendJson(client, message);

        if (this.shouldRestartRecognition(provider, message) && !recognitionRestartTimer) {
          recognitionRound += 1;
          restartingUpstream = true;
          recognitionRestartTimer = this.restartRecognition(() => {
            recognitionRestartTimer = null;

            if (socket !== upstream || closingByClient) {
              return;
            }

            if (socket.readyState === WebSocket.OPEN) {
              this.sendStopMessage(socket, provider, true);
              socket.close(1000, 'recognition round finished');
              return;
            }

            reopenUpstream();
          });
        }
      });

      socket.on('error', (error) => {
        if (socket !== upstream || restartingUpstream || closingByClient) {
          return;
        }

        this.logger.warn(`实时 ASR 服务连接失败：${error.message}`);
        this.sendJson(client, {
          type: 'error',
          message: '实时语音服务暂不可用，请确认 vivo ASR 密钥和网络连接正常。',
        });
        client.close(1011, 'asr upstream error');
      });

      socket.on('close', () => {
        if (socket !== upstream) {
          return;
        }

        if (restartingUpstream && client.readyState === WebSocket.OPEN) {
          restartingUpstream = false;
          reopenUpstream();
          return;
        }

        if (!closingByClient && (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING)) {
          client.close(1000, 'asr upstream closed');
        }
      });
    };

    bindUpstream(upstream, firstConfig, true);

    client.on('message', (data, isBinary) => {
      if (upstream.readyState !== WebSocket.OPEN) {
        if (isBinary) {
          pendingAudioFrames.push(this.toBuffer(data));
          if (pendingAudioFrames.length > maxPendingAudioFrames) {
            pendingAudioFrames.shift();
          }
        }
        return;
      }

      if (isBinary) {
        upstream.send(data, { binary: true });
        return;
      }

      this.forwardClientControlMessage(upstream, data, provider);
    });

    client.on('close', () => {
      closingByClient = true;
      if (recognitionRestartTimer) {
        clearTimeout(recognitionRestartTimer);
        recognitionRestartTimer = null;
      }

      if (upstream.readyState === WebSocket.OPEN) {
        this.sendStopMessage(upstream, provider, true);
        upstream.close(1000, 'client closed');
      }
    });

    client.on('error', () => {
      closingByClient = true;
      upstream.close(1011, 'client error');
    });
  }

  private buildUpstreamConfig(provider: string, user: AuthenticatedUser): UpstreamConfig | null {
    if (provider === 'vivo' || provider === 'lanxin') {
      const appKey = process.env.LANXIN_API_KEY?.trim();
      if (!appKey) {
        return null;
      }

      const baseUrl = (process.env.LANXIN_ASR_WS_URL ?? process.env.LANXIN_API_BASE_URL ?? 'https://api-ai.vivo.com.cn')
        .replace(/\/$/, '')
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:');
      const requestId = randomUUID().replace(/-/g, '');
      const url = new URL('/asr/v2', baseUrl);

      url.searchParams.set('client_version', process.env.LANXIN_ASR_CLIENT_VERSION ?? 'unknown');
      url.searchParams.set('package', process.env.LANXIN_ASR_PACKAGE ?? 'unknown');
      url.searchParams.set('sdk_version', process.env.LANXIN_ASR_SDK_VERSION ?? 'unknown');
      url.searchParams.set('user_id', this.buildVivoUserId(user));
      url.searchParams.set('android_version', process.env.LANXIN_ASR_ANDROID_VERSION ?? 'unknown');
      url.searchParams.set('system_time', String(Date.now()));
      url.searchParams.set('net_type', process.env.LANXIN_ASR_NET_TYPE ?? '1');
      url.searchParams.set('engineid', process.env.LANXIN_ASR_ENGINE_ID ?? 'shortasrinput');
      url.searchParams.set('requestId', requestId);

      return {
        url: url.toString(),
        requestId,
        headers: {
          Authorization: `Bearer ${appKey}`,
        },
      };
    }

    const localAsrUrl = process.env.REALTIME_ASR_WS_URL;
    return localAsrUrl ? { url: localAsrUrl, requestId: randomUUID(), headers: undefined } : null;
  }

  private buildStartMessage(
    provider: string,
    requestId: string,
    sampleRate: number,
    language: string,
    user: AuthenticatedUser,
  ) {
    if (provider === 'vivo' || provider === 'lanxin') {
      return {
        type: 'started',
        request_id: requestId,
        asr_info: {
          end_vad_time: Number(process.env.LANXIN_ASR_END_VAD_TIME_MS ?? 10000),
          audio_type: 'pcm',
          chinese2digital: Number(process.env.LANXIN_ASR_CHINESE_TO_DIGITAL ?? 1),
          punctuation: Number(process.env.LANXIN_ASR_PUNCTUATION ?? 1),
        },
        business_info: JSON.stringify({
          source: 'ai-job-backend',
          userId: user.id,
          sampleRate,
          language,
        }),
      };
    }

    return {
      type: 'start',
      sampleRate,
      encoding: 'pcm_s16le',
      language,
      userId: user.id,
    };
  }

  private async authenticate(request: IncomingMessage) {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    const token =
      requestUrl.searchParams.get('token') ??
      request.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(token);
      return this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      });
    } catch {
      return null;
    }
  }

  private forwardClientControlMessage(upstream: WebSocket, data: RawData, provider: string) {
    const message = this.toText(data);
    if (!message) {
      return;
    }

    try {
      const payload = JSON.parse(message) as { type?: string };
      if ((provider === 'vivo' || provider === 'lanxin') && payload.type === 'start') {
        return;
      }

      if (payload.type === 'stop') {
        this.sendStopMessage(upstream, provider);
        return;
      }
    } catch {
      // Non-JSON control messages are forwarded to local ASR adapters.
    }

    upstream.send(message);
  }

  private normalizeAsrMessage(data: RawData, recognitionRound = 0): NormalizedRealtimeAsrMessage {
    const text = this.toText(data);
    if (!text) {
      return { type: 'partial', text: '', recognitionRound };
    }

    try {
      const payload = JSON.parse(text) as RealtimeAsrMessage;
      const rawTranscript = payload.data?.text ?? payload.text ?? payload.result ?? payload.sentence ?? '';
      const transcript = this.normalizeInterviewTerms(rawTranscript);
      const isError =
        payload.type === 'error' ||
        payload.action === 'error' ||
        (payload.code !== undefined && payload.code !== 0);
      const isReady = payload.action === 'started';
      const isFinish = payload.is_finish === true;
      const type = isReady ? 'ready' : isError ? 'error' : isFinish ? 'final' : 'partial';
      const rawResultId = payload.data?.result_id;

      return {
        ...payload,
        type,
        text: transcript,
        message: payload.desc,
        resultId: rawResultId === undefined ? undefined : recognitionRound * 100000 + rawResultId,
        reformation: payload.data?.reformation,
        isLast: payload.data?.is_last === true,
        isFinish,
        recognitionRound,
      };
    } catch {
      return { type: 'partial', text: this.normalizeInterviewTerms(text), recognitionRound };
    }
  }

  private sendStopMessage(socket: WebSocket, provider: string, close = false) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (provider === 'vivo' || provider === 'lanxin') {
      socket.send(Buffer.from(close ? '--close--' : '--end--'), { binary: true });
      return;
    }

    this.sendJson(socket, { type: close ? 'close' : 'stop' });
  }

  private shouldRestartRecognition(provider: string, message: NormalizedRealtimeAsrMessage) {
    return (provider === 'vivo' || provider === 'lanxin') && message.type === 'final' && message.isFinish === true;
  }

  private restartRecognition(onRestarted: () => void) {
    return setTimeout(onRestarted, Number(process.env.LANXIN_ASR_RESTART_DELAY_MS ?? 120));
  }

  private buildVivoUserId(user: AuthenticatedUser) {
    return createHash('sha256')
      .update(`${user.id}:${user.email}`)
      .digest('hex')
      .slice(0, 32);
  }

  private normalizeInterviewTerms(text: string) {
    return text
      .replace(/电塞/g, '电赛')
      .replace(/打过电赛/g, '参加过电赛')
      .replace(/拿了一个小三/g, '拿了一个省三')
      .replace(/拿过一个小三/g, '拿过一个省三')
      .replace(/项目经理(?=就是|是|中|里)/g, '项目经历');
  }

  private sendJson(socket: WebSocket, payload: Record<string, unknown>) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  private toText(data: RawData) {
    if (typeof data === 'string') {
      return data;
    }

    if (Buffer.isBuffer(data)) {
      return data.toString('utf8');
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data).toString('utf8');
    }

    return Buffer.from(data).toString('utf8');
  }

  private toBuffer(data: RawData) {
    if (Buffer.isBuffer(data)) {
      return data;
    }

    if (Array.isArray(data)) {
      return Buffer.concat(data);
    }

    return Buffer.from(data);
  }
}
