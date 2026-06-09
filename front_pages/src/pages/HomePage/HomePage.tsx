import { BarChart3, FileUp, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { FeatureActionCard } from "@/components/home/FeatureActionCard/FeatureActionCard";
import { KPIGrid } from "@/components/home/KPIGrid/KPIGrid";
import { useHomeOverview } from "@/features/home/hooks";

export function HomePage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useHomeOverview();

  return (
    <AppShell title="AI求职助手" showMenu>
      {isLoading ? <LoadingState text="正在整理求职准备进度" /> : null}
      {isError ? <ErrorState title="首页数据加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card" style={{ background: "linear-gradient(135deg, #ffffff, #e8f0ff)" }}>
            <p className="muted" style={{ margin: 0 }}>
              今天适合推进一小步
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 22 }}>简历优化 → 模拟面试 → 面试复盘</h1>
          </section>

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
