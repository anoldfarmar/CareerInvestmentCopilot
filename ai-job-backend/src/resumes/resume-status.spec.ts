import {
  MINERU_RESUME_PARSE_STATUSES,
  RESUME_PARSE_STATUSES,
  RESUME_PARSE_STATUS,
  isResumeParseFailed,
  isResumeParseInProgress,
  isResumeParseStatus,
  isResumeParseSuccessful,
  isResumeParseTerminal,
} from './resume-status';

describe('resume parse status contract', () => {
  it('defines the existing persisted Resume parse statuses', () => {
    expect(RESUME_PARSE_STATUSES).toEqual([
      'not_started',
      'waiting-file',
      'uploading',
      'pending',
      'running',
      'done',
      'failed',
      'unsupported',
    ]);
  });

  it('defines the MinerU parse statuses that can be synced to Resume parseStatus', () => {
    expect(MINERU_RESUME_PARSE_STATUSES).toEqual([
      'waiting-file',
      'uploading',
      'pending',
      'running',
      'done',
      'failed',
    ]);
  });

  it('identifies successful, failed, terminal, and in-progress parse statuses', () => {
    expect(isResumeParseSuccessful(RESUME_PARSE_STATUS.DONE)).toBe(true);
    expect(isResumeParseSuccessful(RESUME_PARSE_STATUS.PENDING)).toBe(false);

    expect(isResumeParseFailed(RESUME_PARSE_STATUS.FAILED)).toBe(true);
    expect(isResumeParseFailed(RESUME_PARSE_STATUS.UNSUPPORTED)).toBe(true);
    expect(isResumeParseFailed(RESUME_PARSE_STATUS.DONE)).toBe(false);

    expect(isResumeParseTerminal(RESUME_PARSE_STATUS.DONE)).toBe(true);
    expect(isResumeParseTerminal(RESUME_PARSE_STATUS.FAILED)).toBe(true);
    expect(isResumeParseTerminal(RESUME_PARSE_STATUS.UNSUPPORTED)).toBe(true);
    expect(isResumeParseTerminal(RESUME_PARSE_STATUS.RUNNING)).toBe(false);

    expect(isResumeParseInProgress(RESUME_PARSE_STATUS.WAITING_FILE)).toBe(true);
    expect(isResumeParseInProgress(RESUME_PARSE_STATUS.UPLOADING)).toBe(true);
    expect(isResumeParseInProgress(RESUME_PARSE_STATUS.PENDING)).toBe(true);
    expect(isResumeParseInProgress(RESUME_PARSE_STATUS.RUNNING)).toBe(true);
    expect(isResumeParseInProgress(RESUME_PARSE_STATUS.NOT_STARTED)).toBe(false);
  });

  it('validates known Resume parse statuses', () => {
    expect(isResumeParseStatus(RESUME_PARSE_STATUS.NOT_STARTED)).toBe(true);
    expect(isResumeParseStatus(RESUME_PARSE_STATUS.UNSUPPORTED)).toBe(true);
    expect(isResumeParseStatus('unknown')).toBe(false);
  });
});
