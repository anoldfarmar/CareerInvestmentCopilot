import {
  INTERVIEW_RECORD_BUILD_STATUS,
  INTERVIEW_RECORD_BUILD_STATUSES,
  INTERVIEW_RECORD_STATUS,
  INTERVIEW_RECORD_STATUSES,
  getBuildStatusForTranscript,
  isInterviewRecordBuildComplete,
  isInterviewRecordBuildFailed,
  isInterviewRecordBuildInProgress,
  isInterviewRecordBuildStatus,
  isInterviewRecordReady,
  isInterviewRecordStatus,
  normalizeInterviewRecordBuildStatus,
} from './interview-record-status';

describe('interview record status contract', () => {
  it('defines the existing persisted record statuses', () => {
    expect(INTERVIEW_RECORD_STATUSES).toEqual([
      'ready',
      'asr_pending',
      'transcribing',
      'failed',
    ]);
  });

  it('defines the existing persisted build statuses', () => {
    expect(INTERVIEW_RECORD_BUILD_STATUSES).toEqual([
      'not_built',
      'waiting_asr',
      'building',
      'built',
      'failed',
      'empty',
    ]);
  });

  it('identifies ready record status', () => {
    expect(isInterviewRecordReady(INTERVIEW_RECORD_STATUS.READY)).toBe(true);
    expect(isInterviewRecordReady(INTERVIEW_RECORD_STATUS.ASR_PENDING)).toBe(false);
    expect(isInterviewRecordStatus(INTERVIEW_RECORD_STATUS.TRANSCRIBING)).toBe(true);
    expect(isInterviewRecordStatus('unknown')).toBe(false);
  });

  it('identifies complete, failed, and in-progress build statuses', () => {
    expect(isInterviewRecordBuildComplete(INTERVIEW_RECORD_BUILD_STATUS.BUILT)).toBe(true);
    expect(isInterviewRecordBuildComplete(INTERVIEW_RECORD_BUILD_STATUS.BUILDING)).toBe(false);

    expect(isInterviewRecordBuildFailed(INTERVIEW_RECORD_BUILD_STATUS.FAILED)).toBe(true);
    expect(isInterviewRecordBuildFailed(INTERVIEW_RECORD_BUILD_STATUS.EMPTY)).toBe(false);

    expect(isInterviewRecordBuildInProgress(INTERVIEW_RECORD_BUILD_STATUS.WAITING_ASR)).toBe(true);
    expect(isInterviewRecordBuildInProgress(INTERVIEW_RECORD_BUILD_STATUS.BUILDING)).toBe(true);
    expect(isInterviewRecordBuildInProgress(INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT)).toBe(false);

    expect(isInterviewRecordBuildStatus(INTERVIEW_RECORD_BUILD_STATUS.EMPTY)).toBe(true);
    expect(isInterviewRecordBuildStatus('unknown')).toBe(false);
  });

  it('derives build status from transcript content', () => {
    expect(getBuildStatusForTranscript('真实面试转写')).toBe(INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT);
    expect(getBuildStatusForTranscript('   ')).toBe(INTERVIEW_RECORD_BUILD_STATUS.EMPTY);
    expect(getBuildStatusForTranscript(null)).toBe(INTERVIEW_RECORD_BUILD_STATUS.EMPTY);
  });

  it('normalizes missing or unknown build status to not_built', () => {
    expect(normalizeInterviewRecordBuildStatus(INTERVIEW_RECORD_BUILD_STATUS.BUILT)).toBe(
      INTERVIEW_RECORD_BUILD_STATUS.BUILT,
    );
    expect(normalizeInterviewRecordBuildStatus(undefined)).toBe(INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT);
    expect(normalizeInterviewRecordBuildStatus('unknown')).toBe(INTERVIEW_RECORD_BUILD_STATUS.NOT_BUILT);
  });
});
