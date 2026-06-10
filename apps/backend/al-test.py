from http import HTTPStatus
from dashscope.audio.asr import Transcription
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit
from urllib import request
import dashscope
import os
import json
import sys

INPUT_AUDIO_PATH = Path(
    r"D:\Study\rh\zhitouCopilot\project\apps\backend\data\腾讯音乐_数据科学.m4a"
)
RAW_INPUT_AUDIO_URL = "http://39.108.109.40:80/腾讯音乐_数据科学.m4a"
OUTPUT_DIR = Path(r"D:\Study\rh\zhitouCopilot\project\apps\backend\data\asr_results")
OUTPUT_JSON_PATH = OUTPUT_DIR / f"{INPUT_AUDIO_PATH.stem}_fun_asr.json"
OUTPUT_TEXT_PATH = OUTPUT_DIR / f"{INPUT_AUDIO_PATH.stem}_fun_asr.txt"
OUTPUT_SPEAKER_TEXT_PATH = OUTPUT_DIR / f"{INPUT_AUDIO_PATH.stem}_fun_asr_speakers.txt"
OUTPUT_ROLE_TEXT_PATH = OUTPUT_DIR / f"{INPUT_AUDIO_PATH.stem}_fun_asr_roles.txt"


def load_local_env() -> None:
    env_path = Path(__file__).resolve().parent / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def extract_text(payload):
    text_values = []

    def walk(value, parent_key=""):
        if isinstance(value, dict):
            for key, item in value.items():
                walk(item, key)
            return
        if isinstance(value, list):
            for item in value:
                walk(item, parent_key)
            return
        if isinstance(value, str) and parent_key.lower() in {"text", "transcript"}:
            stripped = value.strip()
            if stripped:
                text_values.append(stripped)

    walk(payload)
    return "\n".join(dict.fromkeys(text_values))


def format_speaker_transcript(payload):
    lines = []
    current_speaker = None
    current_texts = []

    for transcript in payload.get("transcripts", []):
        for sentence in transcript.get("sentences", []):
            speaker_id = sentence.get("speaker_id", transcript.get("channel_id", "unknown"))
            text = sentence.get("text", "").strip()
            if not text:
                continue

            if speaker_id != current_speaker and current_texts:
                lines.append(f"{current_speaker}：{''.join(current_texts)}")
                current_texts = []

            current_speaker = speaker_id
            current_texts.append(text)

    if current_texts:
        lines.append(f"{current_speaker}：{''.join(current_texts)}")

    return "\n".join(lines)


def collect_sentences(payload):
    sentences = []
    for transcript in payload.get("transcripts", []):
        for sentence in transcript.get("sentences", []):
            speaker_id = sentence.get("speaker_id", transcript.get("channel_id", "unknown"))
            text = sentence.get("text", "").strip()
            if text:
                sentences.append({"speaker_id": speaker_id, "text": text})
    return sentences


def infer_speaker_roles(sentences):
    interviewer_keywords = [
        "自我介绍",
        "我想问",
        "想问一下",
        "你刚才",
        "你说到",
        "可以介绍",
        "怎么评价",
        "有没有",
        "知不知道",
        "还有没有",
        "后面可能",
        "下一轮",
        "感谢同学",
    ]
    candidate_keywords = [
        "我叫",
        "本科毕业",
        "硕士研究生",
        "我认为",
        "我最近",
        "我目前",
        "我参加",
        "我负责",
        "我的项目",
        "我们当时",
        "我这边",
    ]

    scores = {}
    first_speaker = sentences[0]["speaker_id"] if sentences else None
    for item in sentences:
        speaker_id = item["speaker_id"]
        text = item["text"]
        scores.setdefault(speaker_id, {"interviewer": 0, "candidate": 0})

        scores[speaker_id]["interviewer"] += sum(text.count(word) for word in interviewer_keywords)
        scores[speaker_id]["candidate"] += sum(text.count(word) for word in candidate_keywords)
        scores[speaker_id]["interviewer"] += text.count("？") + text.count("?")

        if speaker_id == first_speaker and "自我介绍" in text:
            scores[speaker_id]["interviewer"] += 5

    if not scores:
        return {}

    interviewer_id = max(
        scores,
        key=lambda speaker_id: scores[speaker_id]["interviewer"]
        - scores[speaker_id]["candidate"],
    )

    roles = {speaker_id: "候选人" for speaker_id in scores}
    roles[interviewer_id] = "面试官"
    return roles


def format_role_transcript(payload):
    sentences = collect_sentences(payload)
    roles = infer_speaker_roles(sentences)
    lines = []
    current_role = None
    current_texts = []

    for sentence in sentences:
        speaker_id = sentence["speaker_id"]
        role = roles.get(speaker_id, f"说话人{speaker_id}")
        text = sentence["text"]

        if role != current_role and current_texts:
            lines.append(f"{current_role}：{''.join(current_texts)}")
            current_texts = []

        current_role = role
        current_texts.append(text)

    if current_texts:
        lines.append(f"{current_role}：{''.join(current_texts)}")

    role_summary = "；".join(f"{speaker_id}={role}" for speaker_id, role in roles.items())
    return f"角色判断：{role_summary}\n\n" + "\n".join(lines)


def encode_url_path(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            quote(parts.path),
            parts.query,
            parts.fragment,
        )
    )


def format_existing_json() -> None:
    if not OUTPUT_JSON_PATH.exists():
        raise FileNotFoundError(f"ASR result JSON not found: {OUTPUT_JSON_PATH}")

    result = json.loads(OUTPUT_JSON_PATH.read_text(encoding="utf-8"))
    speaker_text = format_speaker_transcript(result)
    role_text = format_role_transcript(result)
    OUTPUT_SPEAKER_TEXT_PATH.write_text(speaker_text, encoding="utf-8")
    OUTPUT_ROLE_TEXT_PATH.write_text(role_text, encoding="utf-8")
    print(f"speaker text saved to: {OUTPUT_SPEAKER_TEXT_PATH}")
    print(f"role text saved to: {OUTPUT_ROLE_TEXT_PATH}")


if "--format-existing" in sys.argv:
    format_existing_json()
    raise SystemExit(0)

# 以下为华北2（北京）地域的URL，各地域的URL不同。
dashscope.base_http_api_url = 'https://dashscope.aliyuncs.com/api/v1'

# 新加坡和北京地域的API Key不同。获取API Key：https://help.aliyun.com/zh/model-studio/get-api-key
# 若没有配置环境变量，请用百炼API Key将下行替换为：dashscope.api_key = "sk-xxx"
load_local_env()
dashscope.api_key = os.getenv("DASHSCOPE_API_KEY")

if not INPUT_AUDIO_PATH.exists():
    raise FileNotFoundError(f"Input audio not found: {INPUT_AUDIO_PATH}")

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
input_audio_url = encode_url_path(RAW_INPUT_AUDIO_URL)
print(f"input audio url: {input_audio_url}")

task_response = Transcription.async_call(
    model='fun-asr',
    file_urls=[input_audio_url],
    diarization_enabled=True,
    speaker_count=2,
    language_hints=['zh', 'en']  # language_hints为可选参数，用于指定待识别音频的语言代码。取值范围请参见API参考文档。
)

transcription_response = Transcription.wait(task=task_response.output.task_id)

if transcription_response.status_code == HTTPStatus.OK:
    for transcription in transcription_response.output['results']:
        if transcription['subtask_status'] == 'SUCCEEDED':
            url = transcription['transcription_url']
            result = json.loads(request.urlopen(url).read().decode('utf8'))
            OUTPUT_JSON_PATH.write_text(
                json.dumps(result, indent=4, ensure_ascii=False),
                encoding="utf-8",
            )
            OUTPUT_TEXT_PATH.write_text(extract_text(result), encoding="utf-8")
            OUTPUT_SPEAKER_TEXT_PATH.write_text(
                format_speaker_transcript(result),
                encoding="utf-8",
            )
            OUTPUT_ROLE_TEXT_PATH.write_text(
                format_role_transcript(result),
                encoding="utf-8",
            )
            print(json.dumps(result, indent=4,
                            ensure_ascii=False))
            print(f"result saved to: {OUTPUT_JSON_PATH}")
            print(f"text saved to: {OUTPUT_TEXT_PATH}")
            print(f"speaker text saved to: {OUTPUT_SPEAKER_TEXT_PATH}")
            print(f"role text saved to: {OUTPUT_ROLE_TEXT_PATH}")
        else:
            print('transcription failed!')
            print(transcription)
else:
        print('Error: ', transcription_response.output.message)
