import { API_BASE_URL, getAuthToken } from "../api/client";

export type RealtimeSpeechEvent = {
  type: "ready" | "partial" | "final" | "error";
  text?: string;
  message?: string;
  provider?: string;
  resultId?: number;
  reformation?: number;
  isLast?: boolean;
  isFinish?: boolean;
  recognitionRound?: number;
};

export type RealtimeSpeechSession = {
  stop: () => void;
};

type StartRealtimeSpeechOptions = {
  language?: string;
  sampleRate?: number;
  onMessage: (event: RealtimeSpeechEvent) => void;
  onError: (message: string) => void;
  onClose?: () => void;
};

export function canRecordAudio() {
  return (
    typeof window !== "undefined" &&
    "WebSocket" in window &&
    "AudioContext" in window &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function startRealtimeTranscription({
  language = "zh-CN",
  sampleRate = 16000,
  onMessage,
  onError,
  onClose,
}: StartRealtimeSpeechOptions): Promise<RealtimeSpeechSession> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const silenceGain = audioContext.createGain();
  const pendingFrames: ArrayBuffer[] = [];
  const maxPendingFrames = 80;
  const reconnectDelayMs = 120;
  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: number | null = null;
  let reconnecting = false;
  let connectionRound = 0;

  silenceGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silenceGain);
  silenceGain.connect(audioContext.destination);

  const connectSocket = () => {
    if (stopped) return;

    const nextSocket = new WebSocket(buildRealtimeSpeechUrl({ sampleRate, language }));
    socket = nextSocket;

    nextSocket.onopen = () => {
      reconnecting = false;
      nextSocket.send(
        JSON.stringify({
          type: "start",
          sampleRate,
          encoding: "pcm_s16le",
          language,
        }),
      );

      while (pendingFrames.length > 0 && nextSocket.readyState === WebSocket.OPEN) {
        const frame = pendingFrames.shift();
        if (frame) nextSocket.send(frame);
      }
    };

    nextSocket.onmessage = (event) => {
      const message = parseRealtimeMessage(event.data);
      const effectiveRound = connectionRound + (message.recognitionRound ?? 0);
      const rawResultId = message.resultId === undefined ? undefined : message.resultId % 100000;

      onMessage({
        ...message,
        resultId: rawResultId === undefined ? undefined : effectiveRound * 100000 + rawResultId,
        recognitionRound: effectiveRound,
      });

      if (message.type === "error") {
        onError(message.message ?? "\u5b9e\u65f6\u8bed\u97f3\u670d\u52a1\u6682\u4e0d\u53ef\u7528");
        return;
      }

      if (message.type === "final" && message.isFinish === true) {
        connectionRound += 1;
        reconnectSocket(nextSocket);
      }
    };

    nextSocket.onerror = () => {
      if (stopped || reconnecting) return;
      onError("\u5b9e\u65f6\u8bed\u97f3\u8fde\u63a5\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u540e\u7aef\u670d\u52a1\u548c\u5b9e\u65f6 ASR \u914d\u7f6e\u6b63\u5e38");
    };

    nextSocket.onclose = () => {
      if (stopped) {
        onClose?.();
        return;
      }

      if (reconnecting) return;
      reconnectSocket(nextSocket);
    };
  };

  const reconnectSocket = (currentSocket: WebSocket) => {
    if (stopped || socket !== currentSocket || reconnecting) return;

    reconnecting = true;

    if (currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.send(JSON.stringify({ type: "stop" }));
      currentSocket.close(1000, "restart realtime asr round");
    } else if (currentSocket.readyState === WebSocket.CONNECTING) {
      currentSocket.close(1000, "restart realtime asr round");
    }

    if (reconnectTimer) window.clearTimeout(reconnectTimer);

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connectSocket();
    }, reconnectDelayMs);
  };

  processor.onaudioprocess = (event) => {
    if (stopped) return;

    const input = event.inputBuffer.getChannelData(0);
    const pcm16 = encodePcm16(downSample(input, audioContext.sampleRate, sampleRate));
    const activeSocket = socket;

    if (activeSocket?.readyState === WebSocket.OPEN && !reconnecting) {
      activeSocket.send(pcm16);
      return;
    }

    pendingFrames.push(pcm16);
    if (pendingFrames.length > maxPendingFrames) pendingFrames.shift();
  };

  connectSocket();

  return {
    stop() {
      if (stopped) return;

      stopped = true;

      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      processor.disconnect();
      source.disconnect();
      silenceGain.disconnect();
      stream.getTracks().forEach((track) => track.stop());
      void audioContext.close();

      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop" }));
        socket.close(1000, "user stopped recording");
      } else if (socket?.readyState === WebSocket.CONNECTING) {
        socket.close(1000, "user stopped recording");
      }
    },
  };
}

function buildRealtimeSpeechUrl(input: { sampleRate: number; language: string }) {
  const url = new URL("/speech/realtime", API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("sampleRate", String(input.sampleRate));
  url.searchParams.set("language", input.language);

  const token = getAuthToken();
  if (token) url.searchParams.set("token", token);

  return url.toString();
}

function parseRealtimeMessage(data: unknown): RealtimeSpeechEvent {
  if (typeof data !== "string") return { type: "partial", text: "" };

  try {
    return JSON.parse(data) as RealtimeSpeechEvent;
  } catch {
    return { type: "partial", text: data };
  }
}

function downSample(input: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (inputSampleRate === outputSampleRate) return input;

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let index = 0; index < outputLength; index += 1) {
    output[index] = input[Math.floor(index * ratio)] ?? 0;
  }

  return output;
}

function encodePcm16(input: Float32Array) {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);

  input.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });

  return buffer;
}
