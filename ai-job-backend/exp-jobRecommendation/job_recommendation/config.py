from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from .schemas import SearchConfig


def load_tavily_key(env_path: str | Path | None = None) -> str:
  if env_path:
    load_dotenv(env_path, override=True)
  else:
    load_dotenv(override=False)
  return os.environ.get("TAVILY_API_KEY", "").strip()


def load_search_config(
  env_path: str | Path | None = None,
  max_results: int = 30,
  source_keys: tuple[str, ...] = ("campus", "general", "company"),
  mode: str = "fast",
) -> SearchConfig:
  tavily_api_key = load_tavily_key(env_path)
  if not tavily_api_key:
    raise RuntimeError("未配置 TAVILY_API_KEY。请在环境变量或 .env 文件中填写。")
  return SearchConfig(
    tavily_api_key=tavily_api_key,
    max_results=max_results,
    source_keys=source_keys,
    mode=mode,
  )

