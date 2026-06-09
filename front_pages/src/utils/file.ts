import { isAllowedResumeFile, isUnderResumeLimit } from "@/services/upload";

export function validateResumeFile(file: File) {
  if (!isAllowedResumeFile(file)) return "仅支持 PDF / DOCX 文件";
  if (!isUnderResumeLimit(file)) return "文件大小不能超过 10MB";
  return "";
}
