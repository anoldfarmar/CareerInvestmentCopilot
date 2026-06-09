import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createKnowledgeBase,
  createManualInterviewRecord,
  getKnowledgeBase,
  getKnowledgeBases,
  uploadInterviewAudio,
} from "./api";

export function useKnowledgeBases() {
  return useQuery({ queryKey: ["interview-knowledge-bases"], queryFn: getKnowledgeBases });
}

export function useKnowledgeBase(knowledgeBaseId: string) {
  return useQuery({
    queryKey: ["interview-knowledge-bases", knowledgeBaseId],
    queryFn: () => getKnowledgeBase(knowledgeBaseId),
    enabled: Boolean(knowledgeBaseId),
  });
}

function useInvalidateKnowledgeBases() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["interview-knowledge-bases"] });
}

export function useCreateKnowledgeBase() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: createKnowledgeBase, onSuccess: invalidate });
}

export function useCreateManualInterviewRecord() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: createManualInterviewRecord, onSuccess: invalidate });
}

export function useUploadInterviewAudio() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: uploadInterviewAudio, onSuccess: invalidate });
}
