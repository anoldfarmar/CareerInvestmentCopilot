import type { StructuredResume } from "@/features/resume/types";

function EmptyHint() {
  return <p className="muted" style={{ margin: 0 }}>暂无内容</p>;
}

type ResumeContentPreviewProps = {
  resume: StructuredResume;
  title: string;
  description: string;
};

export function ResumeContentPreview({ resume, title, description }: ResumeContentPreviewProps) {
  const basicInfo = resume.basicInfo;

  return (
    <section className="card page-stack">
      <div>
        <strong>{title}</strong>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {description}
        </p>
      </div>

      <div className="resume-preview-section">
        <strong>基本信息</strong>
        {basicInfo && Object.values(basicInfo).some(Boolean) ? (
          <p>{[basicInfo.name, basicInfo.phone, basicInfo.email].filter(Boolean).join(" · ")}</p>
        ) : (
          <EmptyHint />
        )}
      </div>

      <div className="resume-preview-section">
        <strong>个人总结</strong>
        {resume.summary ? <p>{resume.summary}</p> : <EmptyHint />}
      </div>

      <div className="resume-preview-section">
        <strong>技能</strong>
        {resume.skills?.length ? (
          <div className="resume-preview-tags">
            {resume.skills.map((skill) => (
              <span className="pill" key={skill}>{skill}</span>
            ))}
          </div>
        ) : (
          <EmptyHint />
        )}
      </div>

      <div className="resume-preview-section">
        <strong>工作经历</strong>
        {resume.workExperiences?.length ? (
          resume.workExperiences.map((item, index) => (
            <article key={`${item.company}-${item.position}-${index}`}>
              <div className="row">
                <b>{item.company} · {item.position}</b>
                <span className="muted">{[item.startDate, item.endDate].filter(Boolean).join(" - ")}</span>
              </div>
              {item.description ? <p>{item.description}</p> : null}
            </article>
          ))
        ) : (
          <EmptyHint />
        )}
      </div>

      <div className="resume-preview-section">
        <strong>项目经历</strong>
        {resume.projects?.length ? (
          resume.projects.map((item, index) => (
            <article key={`${item.name}-${index}`}>
              <b>{item.name}</b>
              {item.description ? <p>{item.description}</p> : null}
            </article>
          ))
        ) : (
          <EmptyHint />
        )}
      </div>

      <div className="resume-preview-section">
        <strong>教育经历</strong>
        {resume.educations?.length ? (
          resume.educations.map((item, index) => (
            <article key={`${item.school}-${index}`}>
              <b>{item.school}</b>
              <p>{[item.major, item.degree].filter(Boolean).join(" · ")}</p>
            </article>
          ))
        ) : (
          <EmptyHint />
        )}
      </div>
    </section>
  );
}
