from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.asr import router as asr_router
from app.api.routes.health import router as health_router
from app.core.config import settings


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(asr_router, prefix="/api/v1")
