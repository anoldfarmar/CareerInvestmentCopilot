from __future__ import annotations

from pathlib import Path

from job_recommendation import load_tavily_key, recommend_jobs_from_resume_profile


def main() -> None:
  env_path = Path(__file__).resolve().parents[1] / ".env"
  tavily_api_key = load_tavily_key(env_path)
  if not tavily_api_key:
    raise RuntimeError("请在 JobRecommendation/.env 中配置 TAVILY_API_KEY。")

  results = recommend_jobs_from_resume_profile(
    tavily_api_key=tavily_api_key,
    target_roles=["数据分析", "商业分析", "数据运营", "数据产品"],
    cities=["北京", "上海", "天津"],
    skills=["Python", "SQL", "Power BI", "Tableau", "机器学习", "A/B测试"],
    availability="可连续实习6个月 每周5天",
    max_results=20,
    source_keys=("campus", "general", "company"),
    mode="fast",
    profile="data",
  )

  for item in results:
    print(f"{item.index}. [{item.tier}] {item.title}")
    print(f"   来源：{item.source}")
    print(f"   链接：{item.url}")
    print(f"   摘要：{item.summary}")
    print(f"   原因：{item.tier_reason}")
    print()


if __name__ == "__main__":
  main()

