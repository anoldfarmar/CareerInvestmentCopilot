import { http } from "@/services/http";

import { mockResumeAnalysis, mockResumeCompare } from "./mock";
import type {
  BackendResume,
  ResumeAnalysisResult,
  ResumeCompareResult,
  ResumeOptimizeFormValues,
  ResumeParseStatus,
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

// 创建一条空简历记录。Markdown 会在 MinerU 解析完成后自动回填。
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

// 查询 MinerU 状态。后端在解析完成后会自动把 Markdown 保存进数据库。
export async function syncResumeParsing(resumeId: number): Promise<BackendResume> {
  const { data } = await http.get<BackendResume>(`/resumes/${resumeId}/parse`);
  return data;
}

// 这些状态都表示 MinerU 任务还没有结束，前端需要继续查询最新进度。
export function isResumeParsingStatus(status?: ResumeParseStatus): boolean {
  return status === "pending" || status === "waiting-file" || status === "uploading" || status === "running";
}

export async function getResumes(): Promise<BackendResume[]> {
  const { data } = await http.get<BackendResume[]>("/resumes");
  return data;
}

// 调用 DeepSeek，将 MinerU Markdown 转成结构化简历 JSON。
export async function structureResume(resumeId: number): Promise<BackendResume> {
  // 大模型处理完整简历通常比普通 CRUD 更慢，因此单独放宽等待时间。
  // 这里只影响结构化接口，列表查询等普通请求仍使用全局 15 秒超时。
  const { data } = await http.post<BackendResume>(`/resumes/${resumeId}/structure`, undefined, {
    timeout: 120000,
  });
  return data;
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
