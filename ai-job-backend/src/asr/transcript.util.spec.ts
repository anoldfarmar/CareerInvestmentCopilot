import type { FunAsrPayload } from './asr.types';
import {
  collectSentences,
  extractText,
  formatRoleTranscript,
  formatSpeakerTranscript,
  inferSpeakerRoles,
} from './transcript.util';

describe('transcript utilities', () => {
  const payload: FunAsrPayload = {
    transcripts: [
      {
        channel_id: 'left',
        sentences: [
          { speaker_id: '1', text: '请先做一个自我介绍。' },
          { speaker_id: '2', text: '我叫小明，我负责过推荐系统项目。' },
          { speaker_id: '1', text: '你刚才说到推荐系统，可以展开讲讲吗？' },
          { speaker_id: '2', text: '我主要负责召回链路和效果评估。' },
        ],
      },
    ],
  };

  it('collects sentences and extracts raw text from nested payload', () => {
    expect(collectSentences(payload)).toHaveLength(4);
    expect(extractText({ data: { text: '第一段' }, extra: [{ transcript: '第二段' }] })).toBe('第一段\n第二段');
  });

  it('formats speaker transcript and infers interviewer/candidate roles', () => {
    const roles = inferSpeakerRoles(collectSentences(payload));

    expect(roles.get('1')).toBe('面试官');
    expect(roles.get('2')).toBe('候选人');
    expect(formatSpeakerTranscript(payload)).toContain('说话人1: 请先做一个自我介绍。');
    expect(formatRoleTranscript(payload)).toContain('角色判断: 1=面试官; 2=候选人');
  });
});
