export const JOB_STATUS = {
  DRAFT: "draft",
  INTERESTED: "interested",
  APPLIED: "applied",
  INTERVIEWING: "interviewing",
  OFFER: "offer",
  REJECTED: "rejected",
  ARCHIVED: "archived",
} as const;

export const JOB_STATUSES = [
  JOB_STATUS.DRAFT,
  JOB_STATUS.INTERESTED,
  JOB_STATUS.APPLIED,
  JOB_STATUS.INTERVIEWING,
  JOB_STATUS.OFFER,
  JOB_STATUS.REJECTED,
  JOB_STATUS.ARCHIVED,
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export function isJobStatus(status: unknown): status is JobStatus {
  return typeof status === "string" && JOB_STATUSES.includes(status as JobStatus);
}

export const RESUME_PARSE_STATUS = {
  NOT_STARTED: "not_started",
  WAITING_FILE: "waiting-file",
  UPLOADING: "uploading",
  PENDING: "pending",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  UNSUPPORTED: "unsupported",
} as const;

export const RESUME_PARSE_STATUSES = [
  RESUME_PARSE_STATUS.NOT_STARTED,
  RESUME_PARSE_STATUS.WAITING_FILE,
  RESUME_PARSE_STATUS.UPLOADING,
  RESUME_PARSE_STATUS.PENDING,
  RESUME_PARSE_STATUS.RUNNING,
  RESUME_PARSE_STATUS.DONE,
  RESUME_PARSE_STATUS.FAILED,
  RESUME_PARSE_STATUS.UNSUPPORTED,
] as const;

export type ResumeParseStatus = (typeof RESUME_PARSE_STATUSES)[number];

const FAILED_RESUME_PARSE_STATUSES = [
  RESUME_PARSE_STATUS.FAILED,
  RESUME_PARSE_STATUS.UNSUPPORTED,
] as const satisfies readonly ResumeParseStatus[];

const IN_PROGRESS_RESUME_PARSE_STATUSES = [
  RESUME_PARSE_STATUS.WAITING_FILE,
  RESUME_PARSE_STATUS.UPLOADING,
  RESUME_PARSE_STATUS.PENDING,
  RESUME_PARSE_STATUS.RUNNING,
] as const satisfies readonly ResumeParseStatus[];

export function isResumeParseStatus(status: unknown): status is ResumeParseStatus {
  return typeof status === "string" && RESUME_PARSE_STATUSES.includes(status as ResumeParseStatus);
}

export function isResumeParseSuccessful(status: unknown): status is typeof RESUME_PARSE_STATUS.DONE {
  return status === RESUME_PARSE_STATUS.DONE;
}

export function isResumeParseFailed(status: unknown): status is (typeof FAILED_RESUME_PARSE_STATUSES)[number] {
  return (
    typeof status === "string" &&
    FAILED_RESUME_PARSE_STATUSES.includes(status as (typeof FAILED_RESUME_PARSE_STATUSES)[number])
  );
}

export function isResumeParseTerminal(
  status: unknown,
): status is typeof RESUME_PARSE_STATUS.DONE | (typeof FAILED_RESUME_PARSE_STATUSES)[number] {
  return isResumeParseSuccessful(status) || isResumeParseFailed(status);
}

export function isResumeParseInProgress(
  status: unknown,
): status is (typeof IN_PROGRESS_RESUME_PARSE_STATUSES)[number] {
  return (
    typeof status === "string" &&
    IN_PROGRESS_RESUME_PARSE_STATUSES.includes(status as (typeof IN_PROGRESS_RESUME_PARSE_STATUSES)[number])
  );
}

export const INTERVIEW_RECORD_BUILD_STATUS = {
  NOT_BUILT: "not_built",
  WAITING_ASR: "waiting_asr",
  BUILDING: "building",
  BUILT: "built",
  FAILED: "failed",
  EMPTY: "empty",
} as const;

export const INTERVIEW_RECORD_BUILD_STATUSES = [
  INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT,
  INTERVIEW_RECORD_BUILD_STATUS.WAITING_ASR,
  INTERVIEW_RECORD_BUILD_STATUS.BUILDING,
  INTERVIEW_RECORD_BUILD_STATUS.BUILT,
  INTERVIEW_RECORD_BUILD_STATUS.FAILED,
  INTERVIEW_RECORD_BUILD_STATUS.EMPTY,
] as const;

export type InterviewRecordBuildStatus = (typeof INTERVIEW_RECORD_BUILD_STATUSES)[number];

const IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES = [
  INTERVIEW_RECORD_BUILD_STATUS.WAITING_ASR,
  INTERVIEW_RECORD_BUILD_STATUS.BUILDING,
] as const satisfies readonly InterviewRecordBuildStatus[];

export function isInterviewRecordBuildStatus(status: unknown): status is InterviewRecordBuildStatus {
  return (
    typeof status === "string" &&
    INTERVIEW_RECORD_BUILD_STATUSES.includes(status as InterviewRecordBuildStatus)
  );
}

export function isInterviewRecordBuildComplete(
  status: unknown,
): status is typeof INTERVIEW_RECORD_BUILD_STATUS.BUILT {
  return status === INTERVIEW_RECORD_BUILD_STATUS.BUILT;
}

export function isInterviewRecordBuildFailed(
  status: unknown,
): status is typeof INTERVIEW_RECORD_BUILD_STATUS.FAILED {
  return status === INTERVIEW_RECORD_BUILD_STATUS.FAILED;
}

export function isInterviewRecordBuildInProgress(
  status: unknown,
): status is (typeof IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES)[number] {
  return (
    typeof status === "string" &&
    IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES.includes(
      status as (typeof IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES)[number],
    )
  );
}
