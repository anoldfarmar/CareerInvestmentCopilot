import type { OptimizedResumeContent, StructuredResume } from "@/features/resume/types";

import { ResumeContentPreview } from "../ResumeContentPreview/ResumeContentPreview";

type OptimizedResumePreviewProps = {
  originalResume?: StructuredResume | null;
  content: OptimizedResumeContent;
};

function EmptyHint() {
  return <p className="muted" style={{ margin: 0 }}>暂无内容</p>;
}

function stringifyList(values?: string[]) {
  return values?.length ? values.join("，") : "";
}

function stringifyWorkExperiences(resume?: StructuredResume | null) {
  return resume?.workExperiences
    ?.map((item) =>
      [
        [item.company, item.position].filter(Boolean).join(" · "),
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
        item.description,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function stringifyProjects(resume?: StructuredResume | null) {
  return resume?.projects
    ?.map((item) => [item.name, item.description].filter(Boolean).join("\n"))
    .join("\n\n");
}

function stringifyEducations(resume?: StructuredResume | null) {
  return resume?.educations
    ?.map((item) => [item.school, item.major, item.degree].filter(Boolean).join(" · "))
    .join("\n");
}

function CompareBlock({ title, before, after }: { title: string; before?: string; after?: string }) {
  const hasContent = Boolean(before || after);

  return (
    <div className="resume-compare-block">
      <strong>{title}</strong>
      {hasContent ? (
        <div className="resume-compare-grid">
          <div>
            <span className="resume-compare-label">优化前</span>
            <p>{before || "暂无内容"}</p>
          </div>
          <div>
            <span className="resume-compare-label resume-compare-label--after">优化后</span>
            <p>{after || "暂无内容"}</p>
          </div>
        </div>
      ) : (
        <EmptyHint />
      )}
    </div>
  );
}

export function OptimizedResumePreview({ originalResume, content }: OptimizedResumePreviewProps) {
  const optimizedResume = content.optimizedResume;

  return (
    <section className="page-stack">
      <section className="card page-stack">
        <div>
          <strong>优化稿总览</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            先看本次调整说明，再看优化后的完整简历和前后对比。
          </p>
        </div>

        <div className="resume-preview-section">
          <strong>本次优化说明</strong>
          {content.optimizationNotes.length ? (
            <ul className="resume-note-list">
              {content.optimizationNotes.map((note, index) => (
                <li key={`${note}-${index}`}>{note}</li>
              ))}
            </ul>
          ) : (
            <EmptyHint />
          )}
        </div>
      </section>

      <ResumeContentPreview
        resume={optimizedResume}
        title="优化后简历预览"
        description="这里使用和结构化预览一致的排版，方便你像看正式简历一样检查完整优化稿。"
      />

      <section className="card page-stack">
        <div>
          <strong>前后对比</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            按模块对照原结构化简历和优化稿，便于快速判断模型改了哪里。
          </p>
        </div>

        <CompareBlock title="个人总结" before={originalResume?.summary} after={optimizedResume.summary} />
        <CompareBlock title="技能" before={stringifyList(originalResume?.skills)} after={stringifyList(optimizedResume.skills)} />
        <CompareBlock
          title="工作经历"
          before={stringifyWorkExperiences(originalResume)}
          after={stringifyWorkExperiences(optimizedResume)}
        />
        <CompareBlock title="项目经历" before={stringifyProjects(originalResume)} after={stringifyProjects(optimizedResume)} />
        <CompareBlock title="教育经历" before={stringifyEducations(originalResume)} after={stringifyEducations(optimizedResume)} />
      </section>
    </section>
  );
}
