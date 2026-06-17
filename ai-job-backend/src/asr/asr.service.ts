import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { externalFetch } from '../common/http/external-http.client';
import type { AsrTranscriptionResult, FunAsrPayload } from './asr.types';
import { extractText, formatRoleTranscript, formatSpeakerTranscript } from './transcript.util';

type DashScopeTaskResponse = {
  output?: {
    task_id?: string;
    task_status?: string;
    results?: Array<{
      subtask_status?: string;
      transcription_url?: string;
      message?: string;
    }>;
    message?: string;
  };
  message?: string;
};

@Injectable()
export class AsrService {
  private readonly provider = 'dashscope';
  private readonly endpoint = 'https://dashscope.aliyuncs.com/api/v1';

  async transcribeAudioUrl(audioUrl: string): Promise<AsrTranscriptionResult> {
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('缺少 DASHSCOPE_API_KEY，请检查 .env 文件');
    }

    const model = process.env.DASHSCOPE_ASR_MODEL ?? 'fun-asr';
    const taskId = await this.createTranscriptionTask({
      apiKey,
      audioUrl,
      model,
      speakerCount: Number(process.env.ASR_SPEAKER_COUNT ?? 2),
      languageHints: this.readLanguageHints(),
    });
    const task = await this.waitForTask(
      apiKey,
      taskId,
      Number(process.env.ASR_POLL_INTERVAL_MS ?? 5000),
      Number(process.env.ASR_TIMEOUT_MS ?? 600000),
    );
    const result = task.output?.results?.find((item) => item.subtask_status === 'SUCCEEDED');

    if (!result?.transcription_url) {
      throw new BadGatewayException(`ASR 任务完成但没有 transcription_url：${JSON.stringify(task.output ?? task)}`);
    }

    const rawJson = await this.downloadAsrResult(result.transcription_url);
    return {
      provider: this.provider,
      model,
      rawJson,
      text: extractText(rawJson),
      speakerTranscript: formatSpeakerTranscript(rawJson),
      roleTranscript: formatRoleTranscript(rawJson),
    };
  }

  private async createTranscriptionTask(options: {
    apiKey: string;
    audioUrl: string;
    model: string;
    speakerCount: number;
    languageHints: string[];
  }) {
    const response = await externalFetch(`${this.endpoint}/services/audio/asr/transcription`, {
      serviceName: 'DashScope ASR',
      timeoutMs: Number(process.env.ASR_HTTP_TIMEOUT_MS ?? 30000),
      userMessage: 'ASR 任务创建失败，请稍后重试',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: options.model,
        input: {
          file_urls: [this.encodeUrlPath(options.audioUrl)],
        },
        parameters: {
          diarization_enabled: true,
          speaker_count: options.speakerCount,
          language_hints: options.languageHints,
        },
      }),
    });

    const payload = (await response.json()) as DashScopeTaskResponse;
    const taskId = payload.output?.task_id;
    if (!response.ok || !taskId) {
      throw new BadGatewayException(`ASR 任务创建失败：${response.status} ${JSON.stringify(payload)}`);
    }

    return taskId;
  }

  private async waitForTask(apiKey: string, taskId: string, pollIntervalMs: number, timeoutMs: number) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const response = await externalFetch(`${this.endpoint}/tasks/${taskId}`, {
        serviceName: 'DashScope ASR',
        timeoutMs: Number(process.env.ASR_HTTP_TIMEOUT_MS ?? 30000),
        userMessage: 'ASR 任务查询失败，请稍后重试',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      const payload = (await response.json()) as DashScopeTaskResponse;
      const taskStatus = payload.output?.task_status;

      if (!response.ok) {
        throw new BadGatewayException(`ASR 任务查询失败：${response.status} ${JSON.stringify(payload)}`);
      }

      if (taskStatus === 'SUCCEEDED') {
        return payload;
      }

      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED') {
        throw new BadGatewayException(`ASR 任务${taskStatus}：${JSON.stringify(payload.output ?? payload)}`);
      }

      await this.sleep(pollIntervalMs);
    }

    throw new BadGatewayException(`ASR 任务超时：${taskId}`);
  }

  private async downloadAsrResult(url: string) {
    const response = await externalFetch(url, {
      serviceName: 'DashScope ASR Result',
      timeoutMs: Number(process.env.ASR_HTTP_TIMEOUT_MS ?? 30000),
      userMessage: 'ASR 结果下载失败，请稍后重试',
    });

    if (!response.ok) {
      throw new BadGatewayException(`ASR 结果下载失败：${response.status} ${response.statusText}`);
    }

    return (await response.json()) as FunAsrPayload;
  }

  private readLanguageHints() {
    return (process.env.ASR_LANGUAGE_HINTS ?? 'zh,en')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private encodeUrlPath(url: string): string {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((part) => encodeURIComponent(decodeURIComponent(part)))
      .join('/');
    return parsed.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
