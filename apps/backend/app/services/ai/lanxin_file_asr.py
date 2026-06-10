import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib import parse

import requests

from app.core.config import settings


SLICE_LEN = 5 * 1024 * 1024
DEFAULT_AUDIO_TYPE = "auto"


class LanxinAsrError(RuntimeError):
    pass


class LanxinFileAsrClient:
    def __init__(self) -> None:
        self.session = requests.Session()
        self.api_url = self._build_api_url(settings.lanxin_api_base_url)
        self.app_key = settings.lanxin_api_key.strip()
        self.app_id = settings.lanxin_app_id.strip()
        self.timeout = settings.ai_timeout_seconds

        if not self.api_url:
            raise LanxinAsrError("LANXIN_API_BASE_URL is not configured")
        if not self.app_key:
            raise LanxinAsrError("LANXIN_API_KEY is not configured")

    def transcribe_file(
        self,
        audio_path: Path,
        output_dir: Path,
        audio_type: str = DEFAULT_AUDIO_TYPE,
    ) -> dict[str, Any]:
        if not audio_path.exists():
            raise LanxinAsrError(f"Audio file does not exist: {audio_path}")

        output_dir.mkdir(parents=True, exist_ok=True)
        x_session_id = "".join(str(uuid.uuid1()).split("-"))

        with audio_path.open("rb") as audio_file:
            audio_id, slice_num = self._task_create(audio_file, x_session_id, audio_type)
            self._task_upload(audio_id, audio_file, slice_num, x_session_id, audio_path.name)

        task_id = self._task_run(x_session_id, audio_id)
        progress_payload = self._wait_until_complete(x_session_id, task_id)
        result_payload = self._task_result(x_session_id, task_id)
        transcript = extract_transcript_text(result_payload)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        stem = f"{audio_path.stem}_{timestamp}"
        text_path = output_dir / f"{stem}.txt"
        json_path = output_dir / f"{stem}.json"

        text_path.write_text(transcript, encoding="utf-8")
        json_path.write_text(
            json.dumps(result_payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        return {
            "audio_path": str(audio_path),
            "audio_id": audio_id,
            "task_id": task_id,
            "slice_num": slice_num,
            "progress": progress_payload,
            "transcript": transcript,
            "text_path": str(text_path),
            "raw_result_path": str(json_path),
        }

    @staticmethod
    def _build_api_url(configured_url: str) -> str:
        configured_url = configured_url.strip().strip("/")
        if not configured_url:
            return ""
        if not configured_url.startswith(("http://", "https://")):
            configured_url = f"http://{configured_url}"
        if not configured_url.endswith("/lasr"):
            configured_url = f"{configured_url}/lasr"
        return configured_url

    def _create_params(
        self,
        audio_id: str | None = None,
        x_session_id: str | None = None,
        slice_index: int | None = None,
    ) -> tuple[str, dict[str, str]]:
        params: dict[str, Any] = {
            "client_version": parse.quote("2.0"),
            "package": parse.quote("pack"),
            "user_id": parse.quote(self.app_id or "zhitou-copilot"),
            "system_time": parse.quote(str(int(round(time.time() * 1000)))),
            "net_type": 1,
            "engineid": "fileasrrecorder",
            "requestId": parse.quote(str(uuid.uuid4())),
        }

        if audio_id is not None and x_session_id is not None and slice_index is not None:
            params["audio_id"] = audio_id
            params["x-sessionId"] = x_session_id
            params["slice_index"] = str(slice_index)

        headers = {"Authorization": f"Bearer {self.app_key}"}
        return "&".join(f"{key}={value}" for key, value in params.items()), headers

    def _task_create(
        self,
        audio_file: Any,
        x_session_id: str,
        audio_type: str,
    ) -> tuple[str, int]:
        audio_file.seek(0, 2)
        size = audio_file.tell()
        slice_num, other = divmod(size, SLICE_LEN)
        if other > 0:
            slice_num += 1

        post_body = {
            "audio_type": audio_type,
            "x-sessionId": x_session_id,
            "slice_num": slice_num,
        }

        param_str, headers = self._create_params()
        headers["Content-Type"] = "application/json; charset=UTF-8"
        payload = self._post_json(f"{self.api_url}/create?{param_str}", post_body, headers)
        self._raise_for_error_action(payload, "task_create")

        try:
            return payload["data"]["audio_id"], slice_num
        except KeyError as exc:
            raise LanxinAsrError(f"task_create response missing audio_id: {payload}") from exc

    def _task_upload(
        self,
        audio_id: str,
        audio_file: Any,
        n_slices: int,
        x_session_id: str,
        filename: str,
    ) -> None:
        for slice_index in range(n_slices):
            audio_file.seek(slice_index * SLICE_LEN)
            slice_data = audio_file.read(SLICE_LEN)
            payload = self._http_chunk_upload(
                slice_data,
                audio_id,
                x_session_id,
                slice_index,
                filename,
            )
            self._raise_for_error_action(payload, f"task_upload slice {slice_index}")

    def _http_chunk_upload(
        self,
        audio_data: bytes,
        audio_id: str,
        x_session_id: str,
        slice_index: int,
        filename: str,
    ) -> dict[str, Any]:
        boundary = "".join(str(uuid.uuid1()).split("-"))
        reqbody = bytes("------------------------------" + boundary + "\r\n", "utf-8")
        reqbody += bytes(
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n',
            "utf-8",
        )
        reqbody += bytes("Content-Type: application/octet-stream\r\n\r\n", "utf-8")
        reqbody += audio_data + bytes("\r\n", "utf-8")
        reqbody += bytes("------------------------------" + boundary + "--\r\n", "utf-8")

        param_str, headers = self._create_params(
            audio_id=audio_id,
            x_session_id=x_session_id,
            slice_index=slice_index,
        )
        headers["Accept"] = "*/*"
        headers["Content-Type"] = (
            "multipart/form-data; boundary=----------------------------" + boundary
        )

        response = self.session.post(
            f"{self.api_url}/upload?{param_str}",
            data=reqbody,
            headers=headers,
            timeout=self.timeout,
        )
        return self._response_json(response, f"task_upload slice {slice_index}")

    def _task_run(self, x_session_id: str, audio_id: str) -> str:
        post_body = {"audio_id": audio_id, "x-sessionId": x_session_id}
        param_str, headers = self._create_params()
        headers["Content-Type"] = "application/json; charset=UTF-8"
        payload = self._post_json(f"{self.api_url}/run?{param_str}", post_body, headers)
        self._raise_for_error_action(payload, "task_run")

        try:
            return payload["data"]["task_id"]
        except KeyError as exc:
            raise LanxinAsrError(f"task_run response missing task_id: {payload}") from exc

    def _wait_until_complete(self, x_session_id: str, task_id: str) -> dict[str, Any]:
        started_at = time.time()
        while True:
            time.sleep(2)
            payload = self._task_progress(x_session_id, task_id)
            progress = payload.get("data", {}).get("progress", 0)
            if progress == 100:
                return payload
            if time.time() - started_at > self.timeout * 10:
                raise LanxinAsrError(f"ASR task timed out at progress {progress}: {payload}")

    def _task_progress(self, x_session_id: str, task_id: str) -> dict[str, Any]:
        post_body = {"task_id": task_id, "x-sessionId": x_session_id}
        param_str, headers = self._create_params()
        headers["Content-Type"] = "application/json; charset=UTF-8"
        payload = self._post_json(f"{self.api_url}/progress?{param_str}", post_body, headers)
        self._raise_for_error_action(payload, "task_progress")
        return payload

    def _task_result(self, x_session_id: str, task_id: str) -> dict[str, Any]:
        post_body = {"task_id": task_id, "x-sessionId": x_session_id}
        param_str, headers = self._create_params()
        headers["Content-Type"] = "application/json; charset=UTF-8"
        payload = self._post_json(f"{self.api_url}/result?{param_str}", post_body, headers)
        self._raise_for_error_action(payload, "task_result")
        return payload

    def _post_json(
        self,
        url: str,
        body: dict[str, Any],
        headers: dict[str, str],
    ) -> dict[str, Any]:
        response = self.session.post(
            url,
            data=json.dumps(body),
            headers=headers,
            timeout=self.timeout,
        )
        return self._response_json(response, url)

    @staticmethod
    def _response_json(response: requests.Response, context: str) -> dict[str, Any]:
        if response.status_code != 200:
            raise LanxinAsrError(f"{context} failed: {response.status_code} {response.text}")
        try:
            return response.json()
        except ValueError as exc:
            raise LanxinAsrError(f"{context} returned non-JSON response: {response.text}") from exc

    @staticmethod
    def _raise_for_error_action(payload: dict[str, Any], context: str) -> None:
        if payload.get("action") == "error":
            raise LanxinAsrError(f"{context} failed: {payload.get('desc') or payload}")


def extract_transcript_text(payload: Any) -> str:
    text_values: list[str] = []
    preferred_keys = {
        "text",
        "transcript",
        "onebest",
        "sentence",
        "utterance",
        "content",
        "result",
    }

    def walk(value: Any, parent_key: str = "") -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                walk(item, key)
            return
        if isinstance(value, list):
            for item in value:
                walk(item, parent_key)
            return
        if isinstance(value, str) and parent_key.lower() in preferred_keys:
            stripped = value.strip()
            if stripped:
                text_values.append(stripped)

    walk(payload)
    deduped = list(dict.fromkeys(text_values))
    return "\n".join(deduped)
