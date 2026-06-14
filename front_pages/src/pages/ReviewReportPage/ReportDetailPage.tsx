import { Button } from "antd-mobile";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, SkeletonState } from "@/components/common/State/State";
import { QuestionReviewCard } from "@/components/report/QuestionReviewCard/QuestionReviewCard";
import { RadarReviewChart } from "@/components/report/RadarReviewChart/RadarReviewChart";
import { ScoreSummaryCard } from "@/components/report/ScoreSummaryCard/ScoreSummaryCard";
import { useReport } from "@/features/report/hooks";

export function ReportDetailPage() {
  const { reportId = "report_001" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useReport(reportId);

  return (
    <AppShell title="面试复盘报告" showBack showTabBar={false}>
      {isLoading ? <SkeletonState rows={3} /> : null}
      {isError ? <ErrorState title="报告详情加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <ScoreSummaryCard score={data.score} level={data.level} summary={data.summary} />
          {data.topDirections.length ? (
            <section className="card page-stack">
              <div className="section-title">
                <h2>Top 3 改进方向</h2>
              </div>
              {data.topDirections.map((direction) => (
                <article className="report-direction-card" key={direction.title}>
                  <strong>{direction.title}</strong>
                  <p>{direction.reason}</p>
                  <div className="pill-list">
                    {direction.actions.map((action) => (
                      <span className="pill" key={action}>
                        {action}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          ) : null}
          <section className="card">
            <strong>评分维度</strong>
            <RadarReviewChart dimensions={data.dimensions} />
          </section>
          <div className="section-title">
            <h2>逐题诊断</h2>
          </div>
          {data.questions.length > 0 ? (
            data.questions.map((review) => <QuestionReviewCard key={review.id} review={review} />)
          ) : (
            <section className="card">
              <p className="muted">本报告暂无逐题明细。</p>
            </section>
          )}
          <section className="card page-stack">
            <strong>后续训练建议</strong>
            {data.nextActions.map((action) => (
              <span className="pill" key={action}>
                {action}
              </span>
            ))}
          </section>
          <Button block color="primary" onClick={() => navigate(routePaths.interviewSetup)}>
            再练一次
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
