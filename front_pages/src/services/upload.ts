export function isAllowedResumeFile(file: File) {
  // 当前真实解析链路只接入了 MinerU 支持的 PDF 和 DOCX。
  const allowed = [".pdf", ".docx"];
  const fileName = file.name.toLowerCase();
  return allowed.some((ext) => fileName.endsWith(ext));
}

export function isUnderResumeLimit(file: File) {
  return file.size <= 10 * 1024 * 1024;
}
