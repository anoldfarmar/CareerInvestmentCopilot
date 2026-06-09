import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createLink, deleteLink, getLinks, updateLink } from "./api";
import type { LinkRecordInput, LinkStatus } from "./types";

export function useLinks(status: LinkStatus | "all") {
  return useQuery({ queryKey: ["links", status], queryFn: () => getLinks(status) });
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
    mutationFn: ({ id, input }: { id: string; input: LinkRecordInput }) => updateLink(id, input),
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
