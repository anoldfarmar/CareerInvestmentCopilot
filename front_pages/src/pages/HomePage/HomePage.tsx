import { Button } from "antd-mobile";
import { BarChart3, FileUp, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, SkeletonState } from "@/components/common/State/State";
import { FeatureActionCard } from "@/components/home/FeatureActionCard/FeatureActionCard";
import { KPIGrid } from "@/components/home/KPIGrid/KPIGrid";
import { useHomeOverview } from "@/features/home/hooks";
import { useLatestActiveInterviewSession } from "@/features/interview/hooks";
import { useInterviewStore } from "@/stores/interviewStore";

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useHomeOverview();
  const activeInterviewQuery = useLatestActiveInterviewSession();
  const setCurrentSessionId = useInterviewStore((state) => state.setCurrentSessionId);
  const activeInterview = activeInterviewQuery.data;

  return (
    <AppShell title="AI求职助手" showMenu>
      {isLoading ? <SkeletonState rows={3} /> : null}
      {isError ? <ErrorState title="首页数据加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack fade-in">
          <section className="card hero-card">
            <p className="muted" style={{ margin: 0 }}>
              今天适合推进一小步
            </p>
            <h1 className="text-h1 mt-2">简历优化 → 模拟面试 → 面试复盘</h1>
          </section>

          <section className="card page-stack">
            <div>
              <strong>新手 30 秒上手</strong>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                第一次使用可以按这 3 步走，先拿到一份可编辑的优化稿，再进入模拟面试。
              </p>
            </div>
            <div className="page-stack" style={{ gap: 10 }}>
              <div className="row">
                <span className="pill">1</span>
                <span>上传简历并解析，确认结构化内容是否正确。</span>
              </div>
              <div className="row">
                <span className="pill">2</span>
                <span>粘贴目标 JD，生成优化稿并查看真实匹配度。</span>
              </div>
              <div className="row">
                <span className="pill">3</span>
                <span>带着优化后的简历进入模拟面试，结束后查看 AI 复盘。</span>
              </div>
            </div>
            <Button block color="primary" onClick={() => navigate(routePaths.resumeOptimize)}>
              从上传简历开始
            </Button>
          </section>

          {activeInterview ? (
            <section className="card page-stack">
              <div className="row">
                <div>
                  <strong>继续上次模拟面试</strong>
                  <p className="muted" style={{ margin: "6px 0 0" }}>
                    已进行到第 {activeInterview.currentQuestion}/{activeInterview.totalQuestions} 题，对话记录已保存。
                  </p>
                </div>
                <span className="pill">进行中</span>
              </div>
              <Button
                block
                color="primary"
                onClick={() => {
                  setCurrentSessionId(activeInterview.sessionId);
                  navigate(routePaths.interviewChat(activeInterview.sessionId));
                }}
              >
                继续面试
              </Button>
            </section>
          ) : null}

          <div className="section-title">
            <h2>求职准备概览</h2>
          </div>
          <KPIGrid items={data.kpis} />

          <div className="section-title">
            <h2>核心功能</h2>
          </div>
          <FeatureActionCard
            icon={<FileUp size={23} />}
            title="上传简历并优化"
            description="解析简历内容，生成岗位匹配优化建议"
            buttonText="去优化"
            variant="primary"
            onClick={() => navigate(routePaths.resumeOptimize)}
          />
          <FeatureActionCard
            icon={<Mic size={23} />}
            title="开始模拟面试"
            description="AI 面试官追问训练，模拟真实面试流程"
            buttonText="开始面试"
            variant="success"
            onClick={() => navigate(routePaths.interviewSetup)}
          />
          <FeatureActionCard
            icon={<BarChart3 size={23} />}
            title="查看面试复盘"
            description="查看回答评分、问题点评和改进建议"
            buttonText="查看复盘"
            variant="accent"
            onClick={() => navigate(routePaths.reportList)}
          />

        </div>
      ) : null}
    </AppShell>
  );
}
