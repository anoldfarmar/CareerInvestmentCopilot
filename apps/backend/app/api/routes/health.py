from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "service": "zhitou-copilot-backend",
            "checked_at": datetime.now(timezone.utc).isoformat(),
        },
        "error": None,
        "request_id": "health_check",
    }

