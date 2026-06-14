import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { deleteReport, generateReport, getReport, getReports } from "./api";

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: getReports,
    refetchInterval: 5000,
  });
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: ["reports", reportId],
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateReport,
    onSuccess: (report) => {
      queryClient.setQueryData(["reports", report.reportId], report);
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteReport,
    onSuccess: ({ reportId }) => {
      queryClient.removeQueries({ queryKey: ["reports", reportId] });
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
