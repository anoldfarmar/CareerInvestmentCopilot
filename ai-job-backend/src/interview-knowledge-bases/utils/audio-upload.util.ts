import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';

const ALLOWED_AUDIO_EXTENSIONS = new Set([
  '.m4a',
  '.mp3',
  '.wav',
  '.aac',
  '.ogg',
  '.oga',
  '.webm',
  '.mp4',
  '.flac',
  '.amr',
]);

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/amr',
  // 有些手机或浏览器上传 m4a/mp4 音频时会给这两个类型。
  'video/mp4',
  'application/octet-stream',
]);

export function assertAudioUpload(file?: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('请上传录音文件');
  }

  const extension = extname(file.originalname ?? '').toLowerCase();
  const mimeType = (file.mimetype ?? '').toLowerCase();
  const isAudioLike =
    mimeType.startsWith('audio/') ||
    ALLOWED_AUDIO_MIME_TYPES.has(mimeType) ||
    ALLOWED_AUDIO_EXTENSIONS.has(extension);

  if (!isAudioLike) {
    throw new BadRequestException(
      `不支持的录音格式：${file.originalname || 'unknown'}（${file.mimetype || 'unknown'}）。请上传 m4a、mp3、wav、aac、ogg、webm、flac 或 amr 文件。`,
    );
  }
}

export function getAudioExtension(file: Express.Multer.File) {
  const extension = extname(file.originalname ?? '').toLowerCase();
  if (ALLOWED_AUDIO_EXTENSIONS.has(extension)) {
    return extension;
  }

  const mimeType = (file.mimetype ?? '').toLowerCase();
  if (mimeType.includes('m4a') || mimeType.includes('mp4')) return '.m4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return '.mp3';
  if (mimeType.includes('wav')) return '.wav';
  if (mimeType.includes('aac')) return '.aac';
  if (mimeType.includes('ogg')) return '.ogg';
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('flac')) return '.flac';
  if (mimeType.includes('amr')) return '.amr';
  return '.m4a';
}
