export const JOB_STATUSES = [
  'draft',
  'interested',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'archived',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export type JobStatusCounts = Record<JobStatus, number>;

export const APPLICATION_JOB_STATUSES = [
  'applied',
  'interviewing',
  'offer',
  'rejected',
] as const satisfies readonly JobStatus[];

export function isJobStatus(status: unknown): status is JobStatus {
  return typeof status === 'string' && JOB_STATUSES.includes(status as JobStatus);
}

export function isApplicationJobStatus(status: unknown): status is (typeof APPLICATION_JOB_STATUSES)[number] {
  return typeof status === 'string' && APPLICATION_JOB_STATUSES.includes(status as (typeof APPLICATION_JOB_STATUSES)[number]);
}

export function createJobStatusCounts(): JobStatusCounts {
  return Object.fromEntries(JOB_STATUSES.map((status) => [status, 0])) as JobStatusCounts;
}
