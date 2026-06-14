import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buildKnowledgeRecord,
  createKnowledgeBase,
  createManualInterviewRecord,
  deleteKnowledgeBase,
  deleteKnowledgeRecord,
  getKnowledgeBase,
  getKnowledgeBases,
  transcribeAudioRecord,
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

export function useDeleteKnowledgeBase() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: deleteKnowledgeBase, onSuccess: invalidate });
}

export function useCreateManualInterviewRecord() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: createManualInterviewRecord, onSuccess: invalidate });
}

export function useDeleteKnowledgeRecord() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: deleteKnowledgeRecord, onSuccess: invalidate });
}

export function useUploadInterviewAudio() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: uploadInterviewAudio, onSuccess: invalidate });
}

export function useBuildKnowledgeRecord() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: buildKnowledgeRecord, onSuccess: invalidate });
}

export function useTranscribeAudioRecord() {
  const invalidate = useInvalidateKnowledgeBases();
  return useMutation({ mutationFn: transcribeAudioRecord, onSuccess: invalidate });
}
