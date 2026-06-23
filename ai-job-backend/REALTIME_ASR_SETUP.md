# 实时语音转文字接入说明

本文档记录模拟面试语音输入的生产同构方案。当前默认接入 vivo 蓝心实时 ASR。

## 目标

模拟面试需要“边说边出字”，不适合继续使用 `POST /speech/transcribe` 这种上传整段音频再批量转写的链路。

新的链路是：

```text
前端麦克风
  -> 16kHz PCM 小音频帧
  -> ws://localhost:3000/speech/realtime
  -> NestJS 鉴权和代理
  -> vivo 蓝心实时 ASR
  -> partial/final 文本
  -> 前端回答框实时更新
```

## vivo 官方协议要点

参考文档：`https://aigc.vivo.com.cn/#/document/index?id=1738`

- WebSocket 地址：`wss://api-ai.vivo.com.cn/asr/v2`
- 鉴权 Header：`Authorization: Bearer <LANXIN_API_KEY>`
- 音频格式：`16k / 16bit / 单声道 / PCM`
- 连接后先发送 text JSON，`type=started`
- 之后持续发送 binary PCM 音频帧
- 结束本句发送 binary：`--end--`
- 关闭连接发送 binary：`--close--`
- 通用短语音能力 id：`shortasrinput`
- 单轮识别时长：60 秒以内

注意：vivo 返回 `is_finish=true` 时只代表当前短句识别轮次结束，不代表用户整次录音结束。模拟面试需要支持“说一段、停顿、继续说”，因此后端会在收到 final 后自动重新发送一次 `started`，开启下一轮识别。

## 环境变量

在 `ai-job-backend/.env` 中配置：

```env
REALTIME_ASR_PROVIDER="vivo"
LANXIN_API_BASE_URL="https://api-ai.vivo.com.cn"
LANXIN_APP_ID="your-vivo-app-id"
LANXIN_API_KEY="your-vivo-app-key"
LANXIN_ASR_ENGINE_ID="shortasrinput"
LANXIN_ASR_CLIENT_VERSION="unknown"
LANXIN_ASR_PACKAGE="unknown"
LANXIN_ASR_SDK_VERSION="unknown"
LANXIN_ASR_ANDROID_VERSION="unknown"
LANXIN_ASR_NET_TYPE="1"
LANXIN_ASR_END_VAD_TIME_MS="10000"
LANXIN_ASR_CHINESE_TO_DIGITAL="1"
LANXIN_ASR_PUNCTUATION="1"
```

说明：

- `LANXIN_API_KEY` 只能放后端或服务器 Secret，不能放前端。
- `REALTIME_ASR_PROVIDER=vivo` 时，后端会自动拼 vivo ASR WebSocket URL，不需要 `REALTIME_ASR_WS_URL`。
- 如果未来切换本地 ASR，可设置 `REALTIME_ASR_PROVIDER=local` 并配置 `REALTIME_ASR_WS_URL`。

## 前后端协议

前端连接自己的后端：

```text
ws://localhost:3000/speech/realtime?token=<JWT>&sampleRate=16000&language=zh-CN
```

前端发送：

- 二进制消息：`pcm_s16le`，16kHz，单声道。
- JSON 控制消息：

```json
{
  "type": "start",
  "sampleRate": 16000,
  "encoding": "pcm_s16le",
  "language": "zh-CN"
}
```

后端返回给前端：

```json
{
  "type": "ready",
  "provider": "vivo",
  "sampleRate": 16000,
  "language": "zh-CN"
}
```

```json
{
  "type": "partial",
  "text": "我在这个项目中"
}
```

```json
{
  "type": "final",
  "text": "我在这个项目中主要负责数据清洗和指标分析。"
}
```

```json
{
  "type": "error",
  "message": "实时语音服务暂不可用"
}
```

## 与批量 ASR 的分工

`POST /speech/transcribe` 和 DashScope Fun-ASR 继续保留，适合：

- 长录音上传。
- 真实面试复盘。
- 知识库构建前的批量转写。

`/speech/realtime` 用于：

- 模拟面试语音回答。
- 低延迟实时输入。
- 类似手机输入法的“边说边出字”体验。

## 连续说话策略

实时面试不是单句命令，而是连续回答。当前策略如下：

- 前端只维持一条 `/speech/realtime` WebSocket，不在每次停顿后重连。
- 后端收到 vivo 的 `is_finish=true` 后，等待 `LANXIN_ASR_RESTART_DELAY_MS`，默认 120ms。
- 延迟结束后，后端关闭当前 vivo 上游连接，并重新创建一个新的 vivo WebSocket 会话。
- 前端到后端的连接不断开，所以用户不用重新点击语音按钮。
- 重连期间后端会短暂缓存音频帧，降低第二句话开头被吞掉的概率。
- 每轮 vivo 识别结果的 `resultId` 会加上轮次偏移，避免新会话从 1 开始编号时覆盖上一句话。
- `LANXIN_ASR_END_VAD_TIME_MS` 默认设置为 10000ms，避免用户思考停顿 2 秒左右就被 vivo 判定为短句结束。
- 如果用户手动停止录音，前端发送 `stop` 并关闭连接，后端向 vivo 发送 `--close--`。
