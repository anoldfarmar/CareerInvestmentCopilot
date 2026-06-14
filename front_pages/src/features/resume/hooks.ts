import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  analyzeResumeJdMatch,
  analyzeResume,
  deleteResumeExport,
  exportResumePdf,
  finalizeResume,
  generateOptimizedResume,
  getResumeAnalysis,
  getResumeCompare,
  getResumeExports,
  getResumePdfPreviewHtml,
  getResumeVersions,
  getResume,
  getResumes,
  isResumeParsingStatus,
  optimizeResume,
  parseResumeFile,
  saveOptimizedResume,
  saveResumeDraft,
  saveStructuredResume,
  structureResume,
  syncResumeParsing,
  uploadResume,
} from "./api";
import type { BackendResume } from "./types";
import type { ResumePdfTemplate } from "./types";

export function useResumeAnalysis(resumeId: string) {
  return useQuery({
    queryKey: ["resume", resumeId, "analysis"],
    queryFn: () => getResumeAnalysis(resumeId),
    enabled: Boolean(resumeId),
  });
}

export function useResumeCompare(resumeId: string) {
  return useQuery({
    queryKey: ["resume", resumeId, "compare"],
    queryFn: () => getResumeCompare(resumeId),
    enabled: Boolean(resumeId),
  });
}

export function useUploadResume() {
  return useMutation({ mutationFn: uploadResume });
}

export function useAnalyzeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: analyzeResume,
    onSuccess: (data) => {
      queryClient.setQueryData(["resume", data.resumeId, "analysis"], data);
    },
  });
}

export function useOptimizeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: optimizeResume,
    onSuccess: (data) => {
      queryClient.setQueryData(["resume", data.resumeId, "compare"], data);
    },
  });
}

export function useResumes(enabled = true) {
  return useQuery({
    queryKey: ["resumes"],
    queryFn: getResumes,
    enabled,
  });
}

export function useResume(resumeId?: number) {
  return useQuery({
    queryKey: ["resume", resumeId],
    queryFn: () => getResume(resumeId!),
    enabled: Boolean(resumeId),
  });
}

// 类似页面重新挂载后恢复一个定时器：只要 MinerU 尚未结束，就每 2 秒同步一次状态。
export function useResumeParseStatus(resumeId?: number, enabled = true) {
  return useQuery({
    queryKey: ["resume", resumeId, "parse"],
    queryFn: () => syncResumeParsing(resumeId!),
    enabled: enabled && Boolean(resumeId),
    refetchInterval: (query) => (isResumeParsingStatus(query.state.data?.parseStatus) ? 2000 : false),
  });
}

export function useParseResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      onStatusChange,
    }: {
      file: File;
      onStatusChange?: (resume: BackendResume) => void;
    }) => parseResumeFile(file, onStatusChange),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useStructureResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: structureResume,
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useSaveStructuredResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, resume }: { resumeId: number; resume: Parameters<typeof saveStructuredResume>[1] }) =>
      saveStructuredResume(resumeId, resume),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useGenerateOptimizedResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resumeId,
      jobDescription,
      additionalInstruction,
    }: {
      resumeId: number;
      jobDescription?: string;
      additionalInstruction?: string;
    }) => generateOptimizedResume(resumeId, jobDescription, additionalInstruction),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useAnalyzeResumeJdMatch() {
  return useMutation({
    mutationFn: ({ resumeId, jobDescription }: { resumeId: number; jobDescription: string }) =>
      analyzeResumeJdMatch(resumeId, jobDescription),
  });
}

export function useSaveOptimizedResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, content }: { resumeId: number; content: Parameters<typeof saveOptimizedResume>[1] }) =>
      saveOptimizedResume(resumeId, content),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useSaveResumeDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, content }: { resumeId: number; content: Parameters<typeof saveResumeDraft>[1] }) =>
      saveResumeDraft(resumeId, content),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
}

export function useFinalizeResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resumeId,
      content,
      label,
    }: {
      resumeId: number;
      content?: Parameters<typeof finalizeResume>[1];
      label?: string;
    }) => finalizeResume(resumeId, content, label),
    onSuccess: (resume) => {
      queryClient.setQueryData(["resume", resume.id], resume);
      void queryClient.invalidateQueries({ queryKey: ["resumes"] });
      void queryClient.invalidateQueries({ queryKey: ["resume", resume.id, "versions"] });
    },
  });
}

export function useResumeVersions(resumeId?: number) {
  return useQuery({
    queryKey: ["resume", resumeId, "versions"],
    queryFn: () => getResumeVersions(resumeId!),
    enabled: Boolean(resumeId),
  });
}

export function useResumeExports(resumeId?: number) {
  return useQuery({
    queryKey: ["resume", resumeId, "exports"],
    queryFn: () => getResumeExports(resumeId!),
    enabled: Boolean(resumeId),
  });
}

export function useResumePdfPreview(resumeId?: number, template?: ResumePdfTemplate, versionId?: number) {
  return useQuery({
    queryKey: ["resume", resumeId, "pdf-preview", template, versionId ?? "current"],
    queryFn: () => getResumePdfPreviewHtml(resumeId!, template!, versionId),
    enabled: Boolean(resumeId && template),
  });
}

export function useExportResumePdf() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resumeId,
      template,
      versionId,
    }: {
      resumeId: number;
      template: ResumePdfTemplate;
      versionId?: number;
    }) => exportResumePdf(resumeId, template, versionId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["resume", variables.resumeId, "exports"] });
    },
  });
}

export function useDeleteResumeExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, exportId }: { resumeId: number; exportId: number }) =>
      deleteResumeExport(resumeId, exportId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["resume", variables.resumeId, "exports"] });
    },
  });
}
