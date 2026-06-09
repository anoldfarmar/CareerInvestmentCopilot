export type HomeKpi = {
  label: string;
  value: number;
  unit?: string;
};

export type HomeOverview = {
  kpis: HomeKpi[];
  recentReportTitle: string;
  mode: string;
};
