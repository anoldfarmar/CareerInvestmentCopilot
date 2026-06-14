import axios from "axios";

import { http } from "@/services/http";
import { unwrapItems, type PaginatedResponse } from "@/services/pagination";

import { mockResumeAnalysis, mockResumeCompare } from "./mock";
import type {
  BackendResume,
  OptimizedResumeContent,
  ResumeAnalysisResult,
  ResumeCompareResult,
  ResumeExportRecord,
  ResumeJdMatchResult,
  ResumeOptimizeFormValues,
  ResumePdfTemplate,
  ResumeParseStatus,
  ResumeVersion,
  StructuredResume,
  UploadedResume,
} from "./types";

const useMock = import.meta.env.VITE_USE_MOCK !== "false";

export async function uploadResume(file: File): Promise<UploadedResume> {
  if (!useMock) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await http.post<UploadedResume>("/resumes/upload", form);
    return data;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 800));
  return {
    resumeId: "resume_001",
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function analyzeResume(values: ResumeOptimizeFormValues): Promise<ResumeAnalysisResult> {
  if (!useMock) {
    const { data } = await http.post<ResumeAnalysisResult>("/resumes/analyze", values);
    return data;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 900));
  return mockResumeAnalysis;
}

export async function getResumeAnalysis(resumeId: string): Promise<ResumeAnalysisResult> {
  if (!useMock) {
    const { data } = await http.get<ResumeAnalysisResult>(`/resumes/${resumeId}/analysis`);
    return data;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return { ...mockResumeAnalysis, resumeId };
}

export async function optimizeResume(resumeId: string): Promise<ResumeCompareResult> {
  if (!useMock) {
    const { data } = await http.post<ResumeCompareResult>(`/resumes/${resumeId}/optimize`);
    return data;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 900));
  return { ...mockResumeCompare, resumeId };
}

export async function getResumeCompare(resumeId: string): Promise<ResumeCompareResult> {
  if (!useMock) {
    const { data } = await http.get<ResumeCompareResult>(`/resumes/${resumeId}/compare`);
    return data;
  }

  await new Promise((resolve) => window.setTimeout(resolve, 300));
  return { ...mockResumeCompare, resumeId };
}

// 创建空简历记录，Markdown 会在 MinerU 解析完成后由后端回填。
export async function createResumeForParsing(file: File): Promise<BackendResume> {
  const { data } = await http.post<BackendResume>("/resumes", {
    title: file.name,
  });
  return data;
}

// 将文件交给 MinerU，并把异步任务绑定到刚创建的简历记录。
export async function uploadResumeForParsing(resumeId: number, file: File): Promise<BackendResume> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await http.post<BackendResume>(`/resumes/${resumeId}/parse/upload`, form);
  return data;
}

// 查询 MinerU 状态；后端在解析完成后会自动保存 Markdown。
export async function syncResumeParsing(resumeId: number): Promise<BackendResume> {
  const { data } = await http.get<BackendResume>(`/resumes/${resumeId}/parse`);
  return data;
}

export function isResumeParsingStatus(status?: ResumeParseStatus): boolean {
  return status === "pending" || status === "waiting-file" || status === "uploading" || status === "running";
}

export async function getResumes(): Promise<BackendResume[]> {
  const { data } = await http.get<BackendResume[] | PaginatedResponse<BackendResume>>("/resumes");
  return unwrapItems(data);
}

export async function getResume(resumeId: number): Promise<BackendResume> {
  const { data } = await http.get<BackendResume>(`/resumes/${resumeId}`);
  return data;
}

// 调用 DeepSeek，将 MinerU Markdown 转成结构化简历 JSON。
export async function structureResume(resumeId: number): Promise<BackendResume> {
  const { data } = await http.post<BackendResume>(`/resumes/${resumeId}/structure`, undefined, {
    timeout: 120000,
  });
  return data;
}

// 保存用户人工确认或修正后的结构化简历。
export async function saveStructuredResume(resumeId: number, resume: StructuredResume): Promise<BackendResume> {
  const { data } = await http.put<BackendResume>(`/resumes/${resumeId}/structured-content`, resume);
  return data;
}

// 根据已确认的 structuredContent 生成优化稿，JD 和追加建议均为可选。
export async function generateOptimizedResume(
  resumeId: number,
  jobDescription?: string,
  additionalInstruction?: string,
): Promise<BackendResume> {
  const payload = {
    ...(jobDescription?.trim() ? { jobDescription: jobDescription.trim() } : {}),
    ...(additionalInstruction?.trim() ? { additionalInstruction: additionalInstruction.trim() } : {}),
  };
  const { data } = await http.post<BackendResume>(`/resumes/${resumeId}/optimize`, payload, {
    timeout: 120000,
  });
  return data;
}

export async function analyzeResumeJdMatch(
  resumeId: number,
  jobDescription: string,
): Promise<ResumeJdMatchResult> {
  const { data } = await http.post<ResumeJdMatchResult>(`/resumes/${resumeId}/jd-match`, {
    jobDescription: jobDescription.trim(),
  });
  return data;
}

// 保存用户手动修改后的优化稿，不覆盖 structuredContent。
export async function saveOptimizedResume(resumeId: number, content: OptimizedResumeContent): Promise<BackendResume> {
  const { data } = await http.put<BackendResume>(`/resumes/${resumeId}/optimized-content`, content);
  return data;
}

export async function saveResumeDraft(resumeId: number, content: OptimizedResumeContent): Promise<BackendResume> {
  const { data } = await http.put<BackendResume>(`/resumes/${resumeId}/draft-content`, { content });
  return data;
}

export async function finalizeResume(
  resumeId: number,
  content?: OptimizedResumeContent,
  label?: string,
): Promise<BackendResume> {
  const { data } = await http.post<BackendResume>(`/resumes/${resumeId}/finalize`, {
    ...(content ? { content } : {}),
    ...(label?.trim() ? { label: label.trim() } : {}),
  });
  return data;
}

export async function getResumeVersions(resumeId: number): Promise<ResumeVersion[]> {
  const { data } = await http.get<ResumeVersion[]>(`/resumes/${resumeId}/versions`);
  return data;
}

export async function getResumeExports(resumeId: number): Promise<ResumeExportRecord[]> {
  const { data } = await http.get<ResumeExportRecord[]>(`/resumes/${resumeId}/exports`);
  return data;
}

export async function deleteResumeExport(resumeId: number, exportId: number): Promise<ResumeExportRecord> {
  const { data } = await http.delete<ResumeExportRecord>(`/resumes/${resumeId}/exports/${exportId}`);
  return data;
}

function getFilenameFromContentDisposition(contentDisposition?: string) {
  if (!contentDisposition) return undefined;

  const utf8Filename = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8Filename) return decodeURIComponent(utf8Filename);

  return contentDisposition.match(/filename="?([^"]+)"?/i)?.[1];
}

async function getBlobErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error) || !(error.response?.data instanceof Blob)) {
    return undefined;
  }

  const text = await error.response.data.text();
  if (!text) return undefined;

  try {
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) return parsed.message.join("；");
    return parsed.message;
  } catch {
    return text;
  }
}

// PDF 导出和普通 JSON 接口不同：后端返回 Blob，前端需要手动创建下载链接。
export async function getResumePdfPreviewHtml(
  resumeId: number,
  template: ResumePdfTemplate,
  versionId?: number,
): Promise<string> {
  const { data } = await http.get<string>(`/resumes/${resumeId}/export/preview`, {
    params: {
      template,
      ...(versionId ? { versionId } : {}),
    },
    responseType: "text",
  });
  return data;
}

export async function exportResumePdf(
  resumeId: number,
  template: ResumePdfTemplate,
  versionId?: number,
): Promise<void> {
  const response = await http
    .post<Blob>(`/resumes/${resumeId}/export/pdf`, undefined, {
      params: {
        template,
        ...(versionId ? { versionId } : {}),
      },
      responseType: "blob",
      timeout: 120000,
    })
    .catch(async (error: unknown) => {
      const message = await getBlobErrorMessage(error);
      if (message) throw new Error(message);
      throw error;
    });

  const filename =
    getFilenameFromContentDisposition(response.headers["content-disposition"]) ??
    `resume-${resumeId}-${template}.pdf`;
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function parseResumeFile(
  file: File,
  onStatusChange?: (resume: BackendResume) => void,
): Promise<BackendResume> {
  const created = await createResumeForParsing(file);
  const uploaded = await uploadResumeForParsing(created.id, file);
  onStatusChange?.(uploaded);

  // MinerU 是异步服务。每 2 秒查询一次，最多等待约 4 分钟。
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
    const resume = await syncResumeParsing(created.id);
    onStatusChange?.(resume);

    if (resume.parseStatus === "done") return resume;
    if (resume.parseStatus === "failed") {
      throw new Error("MinerU 解析失败，请检查文件后重试");
    }
  }

  throw new Error("MinerU 解析超时，请稍后重试");
}
