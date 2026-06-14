import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createLink, deleteLink, getLinkAnalysis, getLinks, updateLink } from "./api";
import type { LinkRecordInput, LinkStatus } from "./types";

export function useLinks(status: LinkStatus | "all", enabled = true) {
  return useQuery({ queryKey: ["links", status], queryFn: () => getLinks(status), enabled });
}

export function useLinkAnalysis(enabled = true) {
  return useQuery({ queryKey: ["links", "analysis"], queryFn: getLinkAnalysis, enabled });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] }),
  });
}

export function useUpdateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: LinkRecordInput }) => updateLink(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] }),
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["links"] }),
  });
}
