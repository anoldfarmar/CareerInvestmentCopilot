import { Button } from "antd-mobile";
import { useNavigate, useParams } from "react-router-dom";

import { routePaths } from "@/app/router/routePaths";
import { AppShell } from "@/components/common/AppShell/AppShell";
import { ErrorState, LoadingState } from "@/components/common/State/State";
import { useResume } from "@/features/resume/hooks";
import type { StructuredResume } from "@/features/resume/types";

type DiffStatus = "added" | "modified" | "deleted" | "unchanged";

type ResumeDiffItem = {
  title: string;
  before: string;
  after: string;
  status: DiffStatus;
  reason: string;
};

const statusLabel: Record<DiffStatus, string> = {
  added: "新增",
  modified: "修改",
  deleted: "删除",
  unchanged: "未变更",
};

function stringify(value: unknown) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : Object.values(item as Record<string, unknown>).filter(Boolean).join(" · ")))
      .filter(Boolean)
      .join("\n");
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).filter(Boolean).join(" · ");
  }
  return String(value);
}

function getStatus(before: string, after: string): DiffStatus {
  if (!before && after) return "added";
  if (before && !after) return "deleted";
  if (before !== after) return "modified";
  return "unchanged";
}

function buildDiffItems(before?: StructuredResume | null, after?: StructuredResume | null, notes: string[] = []) {
  const fields = [
    { title: "基本信息", before: stringify(before?.basicInfo), after: stringify(after?.basicInfo) },
    { title: "个人总结", before: stringify(before?.summary), after: stringify(after?.summary) },
    { title: "技能关键词", before: stringify(before?.skills), after: stringify(after?.skills) },
    { title: "工作经历", before: stringify(before?.workExperiences), after: stringify(after?.workExperiences) },
    { title: "项目经历", before: stringify(before?.projects), after: stringify(after?.projects) },
    { title: "教育经历", before: stringify(before?.educations), after: stringify(after?.educations) },
  ];

  return fields.map((field, index): ResumeDiffItem => {
    const status = getStatus(field.before, field.after);
    return {
      ...field,
      status,
      reason:
        notes[index] ??
        (status === "unchanged"
          ? "该字段本轮没有明显调整。"
          : "本轮优化尝试提升表达清晰度、岗位匹配度或关键词覆盖。"),
    };
  });
}

export function ResumeComparePage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const numericResumeId = resumeId ? Number(resumeId) : undefined;
  const { data, isLoading, isError, refetch } = useResume(numericResumeId);
  const optimizedContent = data?.finalizedContent ?? data?.draftContent ?? data?.optimizedContent;
  const diffItems = buildDiffItems(data?.structuredContent, optimizedContent?.optimizedResume, optimizedContent?.optimizationNotes);
  const changedItems = diffItems.filter((item) => item.status !== "unchanged");
  const addedCount = diffItems.filter((item) => item.status === "added").length;
  const modifiedCount = diffItems.filter((item) => item.status === "modified").length;

  return (
    <AppShell title="优化前后对比" showBack showTabBar={false}>
      {isLoading ? <LoadingState text="正在加载简历对比" /> : null}
      {isError ? <ErrorState title="简历对比加载失败" description="请稍后重试。" onAction={() => void refetch()} /> : null}
      {data ? (
        <div className="page-stack">
          <section className="card page-stack">
            <div className="section-title">
              <h2>改进总览</h2>
              <span className="pill">{changedItems.length} 处变化</span>
            </div>
            <p className="text-block">
              本次优化共识别 {changedItems.length} 处变化，其中新增 {addedCount} 处、修改 {modifiedCount} 处。重点关注“个人总结、技能关键词、项目经历”的岗位匹配度。
            </p>
            {optimizedContent?.optimizationNotes?.length ? (
              <ul className="resume-note-list">
                {optimizedContent.optimizationNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

          {diffItems.map((item) => (
            <section className="card page-stack" key={item.title}>
              <div className="row">
                <strong>{item.title}</strong>
                <span className={`pill resume-diff-pill resume-diff-pill--${item.status}`}>{statusLabel[item.status]}</span>
              </div>
              <div className="resume-compare-grid">
                <div>
                  <span className="resume-compare-label">优化前</span>
                  <p>{item.before || "无内容"}</p>
                </div>
                <div>
                  <span className="resume-compare-label resume-compare-label--after">优化后</span>
                  <p>{item.after || "无内容"}</p>
                </div>
              </div>
              <section className="resume-diff-reason">
                <strong>为什么这样改</strong>
                <p>{item.reason}</p>
              </section>
            </section>
          ))}

          <Button block color="primary" onClick={() => navigate(routePaths.resumeOptimize, { replace: true })}>
            返回简历优化工作台
          </Button>
        </div>
      ) : null}
    </AppShell>
  );
}
