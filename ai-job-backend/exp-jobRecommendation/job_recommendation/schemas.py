from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SearchResult:
  index: int
  title: str
  url: str
  summary: str
  source: str = "公开网页"
  tier: str = "主投岗"
  tier_reason: str = "与搜索关键词相关，适合作为候选岗位。"


@dataclass(frozen=True)
class SourceGroup:
  key: str
  name: str
  domains: list[str]


@dataclass(frozen=True)
class SourceTarget:
  key: str
  name: str
  domain: str
  group_key: str
  group_name: str
  base_quota: int


@dataclass(frozen=True)
class SearchConfig:
  tavily_api_key: str
  max_results: int = 30
  source_keys: tuple[str, ...] = ("campus", "general", "company")
  mode: str = "fast"

