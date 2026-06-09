import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  analyzeResume,
  getResumeAnalysis,
  getResumeCompare,
  getResumes,
  isResumeParsingStatus,
  optimizeResume,
  parseResumeFile,
  structureResume,
  syncResumeParsing,
  uploadResume,
} from "./api";
import type { BackendResume } from "./types";

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
