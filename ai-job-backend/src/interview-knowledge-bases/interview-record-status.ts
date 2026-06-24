export const INTERVIEW_RECORD_STATUS = {
  READY: 'ready',
  ASR_PENDING: 'asr_pending',
  TRANSCRIBING: 'transcribing',
  FAILED: 'failed',
} as const;

export const INTERVIEW_RECORD_STATUSES = [
  INTERVIEW_RECORD_STATUS.READY,
  INTERVIEW_RECORD_STATUS.ASR_PENDING,
  INTERVIEW_RECORD_STATUS.TRANSCRIBING,
  INTERVIEW_RECORD_STATUS.FAILED,
] as const;

export type InterviewRecordStatus = (typeof INTERVIEW_RECORD_STATUSES)[number];

export const INTERVIEW_RECORD_BUILD_STATUS = {
  NOT_BUILT: 'not_built',
  WAITING_ASR: 'waiting_asr',
  BUILDING: 'building',
  BUILT: 'built',
  FAILED: 'failed',
  EMPTY: 'empty',
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

export function isInterviewRecordStatus(status: unknown): status is InterviewRecordStatus {
  return typeof status === 'string' && INTERVIEW_RECORD_STATUSES.includes(status as InterviewRecordStatus);
}

export function isInterviewRecordReady(status: unknown): status is typeof INTERVIEW_RECORD_STATUS.READY {
  return status === INTERVIEW_RECORD_STATUS.READY;
}

export function isInterviewRecordBuildStatus(status: unknown): status is InterviewRecordBuildStatus {
  return (
    typeof status === 'string' &&
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
    typeof status === 'string' &&
    IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES.includes(
      status as (typeof IN_PROGRESS_INTERVIEW_RECORD_BUILD_STATUSES)[number],
    )
  );
}

export function getBuildStatusForTranscript(transcript?: string | null): InterviewRecordBuildStatus {
  return transcript?.trim()
    ? INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT
    : INTERVIEW_RECORD_BUILD_STATUS.EMPTY;
}

export function normalizeInterviewRecordBuildStatus(status: unknown): InterviewRecordBuildStatus {
  return isInterviewRecordBuildStatus(status) ? status : INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT;
}
