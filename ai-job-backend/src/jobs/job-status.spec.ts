import {
  JOB_STATUSES,
  createJobStatusCounts,
  isApplicationJobStatus,
  isJobStatus,
} from './job-status';

describe('job status contract', () => {
  it('defines the existing persisted Job statuses', () => {
    expect(JOB_STATUSES).toEqual([
      'draft',
      'interested',
      'applied',
      'interviewing',
      'offer',
      'rejected',
      'archived',
    ]);
  });

  it('identifies statuses that count as applications', () => {
    expect(isApplicationJobStatus('applied')).toBe(true);
    expect(isApplicationJobStatus('interviewing')).toBe(true);
    expect(isApplicationJobStatus('offer')).toBe(true);
    expect(isApplicationJobStatus('rejected')).toBe(true);

    expect(isApplicationJobStatus('draft')).toBe(false);
    expect(isApplicationJobStatus('interested')).toBe(false);
    expect(isApplicationJobStatus('archived')).toBe(false);
    expect(isApplicationJobStatus('unknown')).toBe(false);
  });

  it('validates known Job statuses', () => {
    expect(isJobStatus('draft')).toBe(true);
    expect(isJobStatus('archived')).toBe(true);
    expect(isJobStatus('unknown')).toBe(false);
  });

  it('initializes counts for every Job status', () => {
    expect(createJobStatusCounts()).toEqual({
      draft: 0,
      interested: 0,
      applied: 0,
      interviewing: 0,
      offer: 0,
      rejected: 0,
      archived: 0,
    });
  });
});
