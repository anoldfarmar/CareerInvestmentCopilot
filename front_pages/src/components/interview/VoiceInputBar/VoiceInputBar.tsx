import { Button, Toast } from "antd-mobile";
import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";

import type { VoiceInputStatus } from "@/features/interview/types";
import {
  canRecordAudio,
  startRealtimeTranscription,
  type RealtimeSpeechEvent,
  type RealtimeSpeechSession,
} from "@/services/speech";

type VoiceInputBarProps = {
  value?: string;
  onTranscribed: (text: string) => void;
};

type TranscriptSegment = {
  id: number;
  text: string;
  finalized: boolean;
  recognitionRound?: number;
};

export function VoiceInputBar({ value = "", onTranscribed }: VoiceInputBarProps) {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");
  const sessionRef = useRef<RealtimeSpeechSession | null>(null);
  const baseTextRef = useRef("");
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const nextSegmentIdRef = useRef(1);
  const readyToastShownRef = useRef(false);

  async function handleRecord() {
    if (!canRecordAudio()) {
      Toast.show("当前环境不支持实时录音，请检查浏览器麦克风权限");
      return;
    }

    if (status === "recording") {
      sessionRef.current?.stop();
      sessionRef.current = null;
      setStatus("transcribed");
      Toast.show("已停止录音");
      window.setTimeout(() => setStatus("idle"), 800);
      return;
    }

    try {
      setStatus("uploading");
      readyToastShownRef.current = false;
      baseTextRef.current = value.trim() ? `${value.trim()}\n` : "";
      segmentsRef.current = [];
      nextSegmentIdRef.current = 1;

      sessionRef.current = await startRealtimeTranscription({
        language: "zh-CN",
        onMessage: handleRealtimeMessage,
        onError: (message) => {
          setStatus("failed");
          Toast.show(message);
        },
        onClose: () => {
          sessionRef.current = null;
          setStatus((current) => (current === "failed" ? current : "idle"));
        },
      });
    } catch {
      setStatus("failed");
      Toast.show("无法打开麦克风，请检查浏览器权限");
      window.setTimeout(() => setStatus("idle"), 800);
    }
  }

  function handleRealtimeMessage(event: RealtimeSpeechEvent) {
    if (event.type === "ready" && !readyToastShownRef.current) {
      readyToastShownRef.current = true;
      setStatus("recording");
      Toast.show("实时转写已连接，请开始回答");
      return;
    }

    if (event.type === "partial" || event.type === "final") {
      upsertSegment(event);
      onTranscribed(buildTranscript());
    }
  }

  function upsertSegment(event: RealtimeSpeechEvent) {
    const text = normalizeDisplayText(event.text ?? "");
    if (!text) {
      return;
    }

    const id = event.resultId ?? nextSegmentIdRef.current;
    const existingIndex = segmentsRef.current.findIndex((segment) => segment.id === id);
    const nextSegment = {
      id,
      text,
      finalized: event.type === "final" || event.isLast === true || event.isFinish === true,
      recognitionRound: event.recognitionRound,
    };

    if (existingIndex >= 0) {
      segmentsRef.current[existingIndex] = nextSegment;
      return;
    }

    const lastSegment = segmentsRef.current[segmentsRef.current.length - 1];
    const canReformLastSegment =
      event.reformation === 1 &&
      lastSegment &&
      !lastSegment.finalized &&
      (event.recognitionRound === undefined || lastSegment.recognitionRound === event.recognitionRound);

    if (canReformLastSegment) {
      segmentsRef.current[segmentsRef.current.length - 1] = nextSegment;
      nextSegmentIdRef.current = Math.max(nextSegmentIdRef.current, id + 1);
      return;
    }

    segmentsRef.current.push(nextSegment);
    nextSegmentIdRef.current = Math.max(nextSegmentIdRef.current, id + 1);
  }

  function buildTranscript() {
    const merged = segmentsRef.current
      .slice()
      .sort((left, right) => left.id - right.id)
      .map((segment) => segment.text)
      .join("");

    return `${baseTextRef.current}${merged}`;
  }

  return (
    <Button fill="outline" onClick={handleRecord} disabled={status === "uploading"} aria-label="语音输入">
      {status === "recording" ? <Square size={16} /> : <Mic size={16} />}
      {status === "recording" ? " 停止录音" : status === "uploading" ? " 连接中" : " 语音"}
    </Button>
  );
}

function normalizeDisplayText(text: string) {
  return text
    .replace(/电塞/g, "电赛")
    .replace(/拿了一个小三/g, "拿了一个省三")
    .replace(/拿过一个小三/g, "拿过一个省三")
    .replace(/项目经理(?=就是|是|中|里)/g, "项目经历");
}
