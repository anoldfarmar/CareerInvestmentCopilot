// 部分 multipart 上传链路会把 UTF-8 文件名字节误当成 Latin-1 文本。
// 例如“简历.pdf”可能会变成“ç®å.pdf”。
export function normalizeUploadFilename(filename: string) {
  const decodedFilename = Buffer.from(filename, 'latin1').toString('utf8');

  // 如果转换结果包含替换字符，说明原文件名并不是被误解码的 UTF-8。
  // 此时保留原值，避免破坏本来正常的文件名。
  return decodedFilename.includes('\uFFFD') ? filename : decodedFilename;
}
