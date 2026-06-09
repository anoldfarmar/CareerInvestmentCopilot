export type LinkStatus = "pending" | "applied" | "interview" | "offer" | "rejected";

export type LinkRecord = {
  id: string;
  companyName: string;
  jobTitle: string;
  url: string;
  status: LinkStatus;
  remark?: string;
  updatedAt: string;
};

export type LinkRecordInput = Omit<LinkRecord, "id" | "updatedAt">;
