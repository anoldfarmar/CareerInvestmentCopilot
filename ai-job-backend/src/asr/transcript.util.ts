import type { FunAsrPayload, TranscriptSentence } from './asr.types';

export function extractText(payload: unknown): string {
  const values: string[] = [];

  function walk(value: unknown, parentKey = ''): void {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, parentKey));
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => walk(item, key));
      return;
    }

    if (typeof value === 'string' && ['text', 'transcript'].includes(parentKey.toLowerCase())) {
      const stripped = value.trim();
      if (stripped) {
        values.push(stripped);
      }
    }
  }

  walk(payload);
  return Array.from(new Set(values)).join('\n');
}

export function collectSentences(payload: FunAsrPayload): TranscriptSentence[] {
  const sentences: TranscriptSentence[] = [];

  for (const transcript of payload.transcripts ?? []) {
    for (const sentence of transcript.sentences ?? []) {
      const speakerId = sentence.speaker_id ?? transcript.channel_id ?? 'unknown';
      const text = sentence.text?.trim();
      if (text) {
        sentences.push({ speakerId, text });
      }
    }
  }

  return sentences;
}

export function formatSpeakerTranscript(payload: FunAsrPayload): string {
  const lines: string[] = [];
  let currentSpeaker: string | number | undefined;
  let currentTexts: string[] = [];

  for (const sentence of collectSentences(payload)) {
    if (sentence.speakerId !== currentSpeaker && currentTexts.length > 0) {
      lines.push(`说话人${currentSpeaker}: ${currentTexts.join('')}`);
      currentTexts = [];
    }

    currentSpeaker = sentence.speakerId;
    currentTexts.push(sentence.text);
  }

  if (currentTexts.length > 0) {
    lines.push(`说话人${currentSpeaker}: ${currentTexts.join('')}`);
  }

  return lines.join('\n');
}

export function inferSpeakerRoles(sentences: TranscriptSentence[]): Map<string | number, string> {
  const interviewerKeywords = [
    '自我介绍',
    '我想问',
    '想问一个',
    '你刚才',
    '你说到',
    '可以介绍',
    '怎么评价',
    '有没有',
    '知不知道',
    '还有没有',
    '后面可能',
    '下一轮',
    '感谢同学',
  ];
  const candidateKeywords = [
    '我叫',
    '本科毕业',
    '硕士研究生',
    '我认为',
    '我最近',
    '我目前',
    '我参加',
    '我负责',
    '我的项目',
    '我的经历',
    '项目经历',
    '我们当时',
    '我这边',
  ];

  const scores = new Map<string | number, { interviewer: number; candidate: number }>();
  const firstSpeaker = sentences[0]?.speakerId;

  for (const item of sentences) {
    const score = scores.get(item.speakerId) ?? { interviewer: 0, candidate: 0 };
    score.interviewer += interviewerKeywords.reduce((sum, word) => sum + countText(item.text, word), 0);
    score.candidate += candidateKeywords.reduce((sum, word) => sum + countText(item.text, word), 0);
    score.interviewer += countText(item.text, '？') + countText(item.text, '?');

    // 面试录音里，第一个说“请自我介绍”的人通常是面试官。
    if (item.speakerId === firstSpeaker && item.text.includes('自我介绍')) {
      score.interviewer += 5;
    }

    scores.set(item.speakerId, score);
  }

  const roles = new Map<string | number, string>();
  if (scores.size === 0) {
    return roles;
  }

  let interviewerId: string | number | undefined;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const [speakerId, score] of scores.entries()) {
    const roleScore = score.interviewer - score.candidate;
    if (roleScore > bestScore) {
      bestScore = roleScore;
      interviewerId = speakerId;
    }
  }

  for (const speakerId of scores.keys()) {
    roles.set(speakerId, speakerId === interviewerId ? '面试官' : '候选人');
  }

  return roles;
}

export function formatRoleTranscript(payload: FunAsrPayload): string {
  const sentences = collectSentences(payload);
  const roles = inferSpeakerRoles(sentences);
  const lines: string[] = [];
  let currentRole: string | undefined;
  let currentTexts: string[] = [];

  for (const sentence of sentences) {
    const role = roles.get(sentence.speakerId) ?? `说话人${sentence.speakerId}`;

    if (role !== currentRole && currentTexts.length > 0) {
      lines.push(`${currentRole}: ${currentTexts.join('')}`);
      currentTexts = [];
    }

    currentRole = role;
    currentTexts.push(sentence.text);
  }

  if (currentTexts.length > 0) {
    lines.push(`${currentRole}: ${currentTexts.join('')}`);
  }

  const roleSummary = Array.from(roles.entries())
    .map(([speakerId, role]) => `${speakerId}=${role}`)
    .join('; ');

  return `角色判断: ${roleSummary}\n\n${lines.join('\n')}`;
}

function countText(text: string, word: string): number {
  return text.split(word).length - 1;
}
