export type LinkStatus =
  | "draft"
  | "interested"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "archived";

export type LinkRecord = {
  id: number;
  title: string;
  company?: string | null;
  description: string;
  sourceUrl?: string | null;
  status: LinkStatus;
  createdAt: string;
  updatedAt: string;
};

export type LinkRecordInput = {
  title: string;
  company?: string;
  description: string;
  sourceUrl?: string;
  status: LinkStatus;
};

export type LinkAnalysisSummary = {
  month: string;
  totalApplications: number;
  savedJobs: number;
  interviewRate: number;
  rejectionRate: number;
  offerRate: number;
  statusCounts: Record<LinkStatus, number>;
  insights: string[];
};
