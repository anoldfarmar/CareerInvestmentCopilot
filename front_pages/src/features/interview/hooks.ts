import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addInterviewQuestion,
  createInterviewSession,
  endInterviewSession,
  getInterviewProgress,
  getInterviewSession,
  getLatestActiveInterviewSession,
  moveToNextInterviewQuestion,
  skipInterviewQuestion,
  submitInterviewAnswer,
  submitQuestionFeedback,
} from "./api";

export function useInterviewSession(sessionId: string) {
  return useQuery({
    queryKey: ["interview", sessionId],
    queryFn: () => getInterviewSession(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useLatestActiveInterviewSession() {
  return useQuery({
    queryKey: ["interview", "active", "latest"],
    queryFn: getLatestActiveInterviewSession,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInterviewSession,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
      queryClient.setQueryData(["interview", "active", "latest"], data);
    },
  });
}

export function useSkipInterviewQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: skipInterviewQuestion,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
    },
  });
}

export function useAddInterviewQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addInterviewQuestion,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
    },
  });
}

export function useSubmitInterviewAnswer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitInterviewAnswer,
    onMutate: async ({ sessionId, answer }) => {
      await queryClient.cancelQueries({ queryKey: ["interview", sessionId] });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof getInterviewSession>>>(["interview", sessionId]);

      if (previous) {
        queryClient.setQueryData(["interview", sessionId], {
          ...previous,
          messages: [
            ...previous.messages,
            {
              id: `optimistic-user-${Date.now()}`,
              sessionId,
              role: "user" as const,
              content: answer,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      return { previous, sessionId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["interview", context.sessionId], context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
    },
  });
}

export function useMoveToNextInterviewQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: moveToNextInterviewQuestion,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
      queryClient.setQueryData(["interview", "active", "latest"], data.ended ? null : data);
    },
  });
}

export function useEndInterviewSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: endInterviewSession,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId, "progress"], data);
      void queryClient.invalidateQueries({ queryKey: ["interview", "active", "latest"] });
      window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["reports"] }), 3000);
      window.setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["reports"] }), 9000);
    },
  });
}

export function useSubmitQuestionFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitQuestionFeedback,
    onSuccess: (data) => {
      queryClient.setQueryData(["interview", data.sessionId], data);
    },
  });
}
