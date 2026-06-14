import { Button, Dialog, Selector, Toast } from "antd-mobile";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { EmptyState, ErrorState, SkeletonState } from "@/components/common/State/State";
import { useDeleteReport, useReports } from "@/features/report/hooks";

export function ReportListPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useReports();
  const deleteMutation = useDeleteReport();

  async function handleDeleteReport(reportId: string) {
    const confirmed = await Dialog.confirm({
      title: "删除复盘报告",
      content: "确认删除这份复盘报告吗？删除后不会影响原来的面试记录。",
      confirmText: "删除",
      cancelText: "取消",
    });
    if (!confirmed) return;

    await deleteMutation.mutateAsync(reportId);
    Toast.show("复盘报告已删除");
  }

  return (
    <AppShell title="复盘报告">
      <section className="card page-stack" style={{ marginBottom: 16 }}>
        <strong>复盘类型</strong>
        <Selector
          multiple={false}
          value={["mock"]}
          options={[
            { label: "模拟面试复盘", value: "mock" },
            { label: "真实面试复盘", value: "real" },
          ]}
          onChange={(value) => {
            if (value[0] === "real") navigate(routePaths.realInterviewKnowledgeBases);
          }}
        />
        <p className="muted" style={{ margin: 0 }}>
          模拟面试复盘会保留 AI 训练报告；真实面试复盘可沉淀录音和对话，形成专属知识库。
        </p>
      </section>
      {isLoading ? <SkeletonState rows={3} /> : null}
      {isError ? <ErrorState title="报告列表加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="还没有复盘报告"
          description="完成一次模拟面试后即可查看复盘报告"
          actionText="开始面试"
          onAction={() => navigate(routePaths.interviewSetup)}
        />
      ) : null}
      {data && data.length > 0 ? (
        <div className="page-stack">
          {data.map((report) => (
            <article className="card page-stack" key={report.reportId}>
              <div className="row">
                <strong>{report.title}</strong>
                <span className="pill">{report.score} 分</span>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {report.createdAt} · {report.level}
              </p>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{report.summary}</p>
              <div className="resume-action-grid">
                <Button block fill="outline" onClick={() => navigate(routePaths.reportDetail(report.reportId))}>
                  查看详情
                </Button>
                <Button
                  block
                  fill="outline"
                  color="danger"
                  loading={deleteMutation.isPending}
                  onClick={() => void handleDeleteReport(report.reportId)}
                >
                  删除报告
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}
