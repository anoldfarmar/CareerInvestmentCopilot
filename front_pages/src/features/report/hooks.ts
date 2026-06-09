import { useMutation, useQuery } from "@tanstack/react-query";

import { generateReport, getReport, getReports } from "./api";

export function useReports() {
  return useQuery({ queryKey: ["reports"], queryFn: getReports });
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: ["reports", reportId],
    queryFn: () => getReport(reportId),
    enabled: Boolean(reportId),
  });
}

export function useGenerateReport() {
  return useMutation({ mutationFn: generateReport });
}
