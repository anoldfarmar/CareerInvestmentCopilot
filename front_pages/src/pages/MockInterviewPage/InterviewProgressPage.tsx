import { Button } from "antd-mobile";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { useGenerateReport } from "@/features/report/hooks";
import { useInterviewProgress } from "@/features/interview/hooks";
import { formatPercent } from "@/utils/format";

export function InterviewProgressPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useInterviewProgress(sessionId);
  const generateMutation = useGenerateReport();

  async function handleGenerateReport() {
    const report = await generateMutation.mutateAsync(sessionId);
    navigate(routePaths.reportDetail(report.reportId));
  }

  return (
    <AppShell title="面试进度" showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在同步面试进度" /> : null}
      {isError ? <ErrorState title="面试进度加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card page-stack">
            <div className="row">
              <strong>{data.stage}</strong>
              <span className="pill">
                {data.currentQuestion}/{data.totalQuestions}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "var(--color-border)" }}>
              <div
                style={{
                  width: formatPercent((data.currentQuestion / data.totalQuestions) * 100),
                  height: 8,
                  borderRadius: 999,
                  background: "var(--color-primary)",
                }}
              />
            </div>
          </section>
          <section className="card page-stack">
            <strong>面试信息</strong>
            <div className="row"><span>已用时长</span><span>{data.usedMinutes} 分钟</span></div>
            <div className="row"><span>平均回答</span><span>{data.averageAnswerSeconds} 秒</span></div>
            <div className="row"><span>回答字数</span><span>{data.totalWords} 字</span></div>
          </section>
          <section className="card page-stack">
            <strong>题型分布</strong>
            {data.distribution.map((item) => (
              <div className="row" key={item.label}>
                <span>{item.label}</span>
                <span className="pill">{item.done}/{item.total}</span>
              </div>
            ))}
          </section>
          <div className="fixed-actions">
            <Button block fill="outline" onClick={() => navigate(routePaths.interviewChat(sessionId))}>
              继续面试
            </Button>
            <Button block color="primary" loading={generateMutation.isPending} onClick={() => void handleGenerateReport()}>
              生成复盘报告
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
