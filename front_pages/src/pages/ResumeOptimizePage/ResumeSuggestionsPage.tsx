import { Button, Tabs } from "antd-mobile";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { ResumeScoreRing } from "@/components/resume/ResumeScoreRing/ResumeScoreRing";
import { SuggestionCard } from "@/components/resume/SuggestionCard/SuggestionCard";
import type { SuggestionCategory } from "@/features/resume/types";
import { useOptimizeResume, useResumeAnalysis } from "@/features/resume/hooks";

const tabs: { key: SuggestionCategory; title: string }[] = [
  { key: "structure", title: "结构分析" },
  { key: "keyword", title: "关键词" },
  { key: "rewrite", title: "经历改写" },
  { key: "ats", title: "ATS 检查" },
];

export function ResumeSuggestionsPage() {
  const { resumeId = "resume_001" } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>();
  const { data, isLoading, isError, refetch } = useResumeAnalysis(resumeId);
  const optimizeMutation = useOptimizeResume();

  const issues = useMemo(() => data?.issues ?? [], [data]);

  async function handleOptimize() {
    await optimizeMutation.mutateAsync(resumeId);
    navigate(routePaths.resumeCompare(resumeId));
  }

  return (
    <AppShell title="优化建议" showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在读取分析结果" /> : null}
      {isError ? <ErrorState title="优化建议加载失败" description="可以重试获取分析结果。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card row">
            <ResumeScoreRing score={data.totalScore} />
            <div>
              <strong>综合评价</strong>
              <p className="muted" style={{ lineHeight: 1.6 }}>
                {data.summary}
              </p>
            </div>
          </section>

          <section className="card page-stack">
            <strong>指标预览</strong>
            {data.metrics.map((metric) => (
              <div key={metric.key}>
                <div className="row">
                  <span>{metric.label}</span>
                  <span className="pill">{metric.score}</span>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: "var(--color-bg)", marginTop: 8 }}>
                  <div style={{ width: `${metric.score}%`, height: 6, borderRadius: 999, background: "var(--color-primary)" }} />
                </div>
              </div>
            ))}
          </section>

          <section className="card page-stack">
            <strong>存在问题</strong>
            {issues.map((issue) => (
              <div key={issue.id} style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
                <div className="row">
                  <strong>{issue.title}</strong>
                  <span className="pill">{issue.severity}</span>
                </div>
                <p className="muted">{issue.description}</p>
                <p className="muted">建议：{issue.suggestion}</p>
              </div>
            ))}
          </section>

          <section className="card page-stack">
            <Tabs>
              {tabs.map((tab) => (
                <Tabs.Tab title={tab.title} key={tab.key}>
                  <div className="page-stack" style={{ marginTop: 12 }}>
                    {data.suggestions
                      .filter((item) => item.category === tab.key)
                      .map((suggestion) => (
                        <SuggestionCard
                          key={suggestion.id}
                          suggestion={suggestion}
                          selected={selected === suggestion.id}
                          onSelect={setSelected}
                        />
                      ))}
                  </div>
                </Tabs.Tab>
              ))}
            </Tabs>
          </section>

          <div className="fixed-actions">
            <Button block fill="outline" onClick={() => navigate(routePaths.resumeOptimize)}>
              重新分析
            </Button>
            <Button block color="primary" loading={optimizeMutation.isPending} onClick={() => void handleOptimize()}>
              一键优化
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
