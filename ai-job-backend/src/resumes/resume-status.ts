export const RESUME_PARSE_STATUS = {
  NOT_STARTED: 'not_started',
  WAITING_FILE: 'waiting-file',
  UPLOADING: 'uploading',
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  UNSUPPORTED: 'unsupported',
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

export const MINERU_RESUME_PARSE_STATUSES = [
  RESUME_PARSE_STATUS.WAITING_FILE,
  RESUME_PARSE_STATUS.UPLOADING,
  RESUME_PARSE_STATUS.PENDING,
  RESUME_PARSE_STATUS.RUNNING,
  RESUME_PARSE_STATUS.DONE,
  RESUME_PARSE_STATUS.FAILED,
] as const;

export type MineruResumeParseStatus = (typeof MINERU_RESUME_PARSE_STATUSES)[number];

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
  return typeof status === 'string' && RESUME_PARSE_STATUSES.includes(status as ResumeParseStatus);
}

export function isResumeParseSuccessful(status: unknown): status is typeof RESUME_PARSE_STATUS.DONE {
  return status === RESUME_PARSE_STATUS.DONE;
}

export function isResumeParseFailed(status: unknown): status is (typeof FAILED_RESUME_PARSE_STATUSES)[number] {
  return (
    typeof status === 'string' &&
    FAILED_RESUME_PARSE_STATUSES.includes(status as (typeof FAILED_RESUME_PARSE_STATUSES)[number])
  );
}

export function isResumeParseTerminal(status: unknown): status is
  | typeof RESUME_PARSE_STATUS.DONE
  | (typeof FAILED_RESUME_PARSE_STATUSES)[number] {
  return isResumeParseSuccessful(status) || isResumeParseFailed(status);
}

export function isResumeParseInProgress(
  status: unknown,
): status is (typeof IN_PROGRESS_RESUME_PARSE_STATUSES)[number] {
  return (
    typeof status === 'string' &&
    IN_PROGRESS_RESUME_PARSE_STATUSES.includes(status as (typeof IN_PROGRESS_RESUME_PARSE_STATUSES)[number])
  );
}
