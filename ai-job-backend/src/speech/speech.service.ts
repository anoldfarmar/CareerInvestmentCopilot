import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { AsrService } from '../asr/asr.service';

@Injectable()
export class SpeechService {
  private readonly audioDir = join(process.cwd(), 'storage', 'asr-audios');

  constructor(private readonly asrService: AsrService) {}

  async transcribe(input: { audioUrl?: string; file?: Express.Multer.File }) {
    const audioUrl = input.audioUrl ?? (await this.saveAndBuildPublicUrl(input.file));
    const result = await this.asrService.transcribeAudioUrl(audioUrl);

    return {
      text: result.roleTranscript.trim() || result.text,
      status: 'transcribed',
      provider: result.provider,
      model: result.model,
      speakerTranscript: result.speakerTranscript,
      roleTranscript: result.roleTranscript,
    };
  }

  private async saveAndBuildPublicUrl(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传 audio 文件，或传入公网可访问的 audioUrl');
    }

    const publicBaseUrl = process.env.ASR_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (!publicBaseUrl) {
      throw new BadRequestException(
        '本地录音已收到，但 DashScope ASR 需要公网音频 URL。请配置 ASR_PUBLIC_BASE_URL，或直接传入 audioUrl。',
      );
    }

    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('请上传音频文件');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('音频文件不能超过 50MB');
    }

    await mkdir(this.audioDir, { recursive: true });
    const extension = extname(file.originalname) || this.getExtensionByMime(file.mimetype);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    await writeFile(join(this.audioDir, filename), file.buffer);

    return `${publicBaseUrl}/storage/asr-audios/${encodeURIComponent(filename)}`;
  }

  private getExtensionByMime(mimeType: string) {
    if (mimeType.includes('webm')) return '.webm';
    if (mimeType.includes('mpeg')) return '.mp3';
    if (mimeType.includes('wav')) return '.wav';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return '.m4a';
    return '.webm';
  }
}
