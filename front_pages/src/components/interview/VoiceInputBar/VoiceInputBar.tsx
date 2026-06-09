import { Button, Toast } from "antd-mobile";
import { Mic, Square } from "lucide-react";
import { useState } from "react";

import { canRecordAudio, transcribeAudio } from "@/services/speech";
import type { VoiceInputStatus } from "@/features/interview/types";

type VoiceInputBarProps = {
  onTranscribed: (text: string) => void;
};

export function VoiceInputBar({ onTranscribed }: VoiceInputBarProps) {
  const [status, setStatus] = useState<VoiceInputStatus>("idle");

  async function handleRecord() {
    if (!canRecordAudio()) {
      Toast.show("当前环境不支持录音，请使用文字输入");
      return;
    }
    if (status === "recording") {
      setStatus("uploading");
      const result = await transcribeAudio();
      setStatus(result.status);
      onTranscribed(result.text);
      Toast.show("语音已转写");
      window.setTimeout(() => setStatus("idle"), 500);
      return;
    }
    setStatus("recording");
  }

  return (
    <Button fill="outline" onClick={handleRecord} aria-label="语音输入">
      {status === "recording" ? <Square size={16} /> : <Mic size={16} />}
      {status === "recording" ? " 完成录音" : status === "uploading" ? " 转写中" : " 语音"}
    </Button>
  );
}
