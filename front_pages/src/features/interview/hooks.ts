import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createInterviewSession,
  endInterviewSession,
  getInterviewProgress,
  getInterviewSession,
  submitInterviewAnswer,
} from "./api";

export function useInterviewSession(sessionId: string) {
  return useQuery({
    queryKey: ["interview", sessionId],
    queryFn: () => getInterviewSession(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useInterviewProgress(sessionId: string) {
  return useQuery({
    queryKey: ["interview", sessionId, "progress"],
    queryFn: () => getInterviewProgress(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useCreateInterviewSession() {
  return useMutation({ mutationFn: createInterviewSession });
}

export function useSubmitInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitInterviewAnswer,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
    },
  });
}

export function useEndInterviewSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endInterviewSession,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId, "progress"], data);
    },
  });
}
