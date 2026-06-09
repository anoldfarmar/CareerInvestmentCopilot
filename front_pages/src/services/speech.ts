import type { VoiceInputStatus } from "@/features/interview/types";

export function canRecordAudio() {
  return typeof window !== "undefined" && "MediaRecorder" in window && Boolean(navigator.mediaDevices);
}

export async function transcribeAudio(): Promise<{ text: string; status: VoiceInputStatus }> {
  await new Promise((resolve) => window.setTimeout(resolve, 700));
  return {
    text: "我会先说明项目背景，再用 STAR 结构展开自己的行动和结果。",
    status: "transcribed",
  };
}
