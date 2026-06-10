from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.services.ai.lanxin_file_asr import DEFAULT_AUDIO_TYPE, LanxinAsrError, LanxinFileAsrClient


router = APIRouter(prefix="/asr", tags=["asr"])

BACKEND_ROOT = Path(__file__).resolve().parents[3]
TEST_AUDIO_PATH = BACKEND_ROOT / "data" / "腾讯音乐_数据科学.m4a"
ASR_RESULT_DIR = BACKEND_ROOT / "data" / "asr_results"


@router.post("/transcribe-test-audio")
def transcribe_test_audio(audio_type: str = Query(default=DEFAULT_AUDIO_TYPE)):
    try:
        result = LanxinFileAsrClient().transcribe_file(
            audio_path=TEST_AUDIO_PATH,
            output_dir=ASR_RESULT_DIR,
            audio_type=audio_type,
        )
    except LanxinAsrError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "success": True,
        "data": result,
        "error": None,
        "request_id": result["task_id"],
    }
