import { BadRequestException } from '@nestjs/common';
import { normalizeUploadFilename } from './normalize-upload-filename';

const PDF_MAGIC = '%PDF-';
const ZIP_MAGIC = 'PK\x03\x04';
const SAFE_FILENAME = /[^a-zA-Z0-9.\-_\u4e00-\u9fa5]/g;

export type ResumeUploadKind = 'preview' | 'parse';

export function sanitizeUploadFilename(filename: string) {
  const normalized = normalizeUploadFilename(filename);
  const basename = normalized.split(/[\\/]/).pop() ?? 'resume';
  const cleaned = basename.replace(SAFE_FILENAME, '_').replace(/_+/g, '_');
  return cleaned || 'resume';
}

export function assertResumeFile(file: Express.Multer.File, kind: ResumeUploadKind) {
  const filename = sanitizeUploadFilename(file.originalname);
  const lower = filename.toLowerCase();
  const head = file.buffer.subarray(0, 8).toString('latin1');
  const isPdf = head.startsWith(PDF_MAGIC);
  const isDocx = head.startsWith(ZIP_MAGIC) && lower.endsWith('.docx');
  const isLegacyDoc = lower.endsWith('.doc');

  if (kind === 'parse' && !isPdf && !isDocx) {
    throw new BadRequestException('请上传真实的 PDF 或 DOCX 简历文件');
  }

  if (kind === 'preview' && !isPdf && !isDocx && !isLegacyDoc) {
    throw new BadRequestException('请上传真实的 PDF、DOC 或 DOCX 简历文件');
  }

  return filename;
}
