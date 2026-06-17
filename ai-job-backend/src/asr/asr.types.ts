export interface FunAsrSentence {
  speaker_id?: string | number;
  text?: string;
}

export interface FunAsrTranscript {
  channel_id?: string | number;
  sentences?: FunAsrSentence[];
}

export interface FunAsrPayload {
  transcripts?: FunAsrTranscript[];
  [key: string]: unknown;
}

export interface TranscriptSentence {
  speakerId: string | number;
  text: string;
}

export interface AsrTranscriptionResult {
  provider: string;
  model: string;
  rawJson: FunAsrPayload;
  text: string;
  speakerTranscript: string;
  roleTranscript: string;
}
