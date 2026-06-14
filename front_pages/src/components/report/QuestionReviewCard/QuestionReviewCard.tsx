import type { QuestionReview } from "@/features/report/types";

type QuestionReviewCardProps = {
  review: QuestionReview;
};

export function QuestionReviewCard({ review }: QuestionReviewCardProps) {
  return (
    <article className="card page-stack report-question-card">
      <div>
        <strong>{review.question}</strong>
        <p className="muted mt-1">你的回答：{review.answer || "这一题还没有回答"}</p>
      </div>

      {review.correctPoints?.length || review.wrongPoints?.length ? (
        <section className="report-diagnosis-grid">
          <DiagnosisItem title="答得好的地方" text={(review.correctPoints ?? ["暂无明显亮点"]).join("；")} />
          <DiagnosisItem title="需要修正的地方" text={(review.wrongPoints ?? ["暂无明显错误"]).join("；")} />
        </section>
      ) : null}

      <section className="report-diagnosis-grid">
        <DiagnosisItem title="内容" text={review.diagnosis?.content ?? review.comment} />
        <DiagnosisItem title="逻辑" text={review.diagnosis?.logic ?? "建议按背景、行动、结果组织回答。"} />
        <DiagnosisItem title="表达" text={review.diagnosis?.expression ?? "建议先讲结论，再展开细节。"} />
        <DiagnosisItem title="深度" text={review.diagnosis?.depth ?? "建议补充技术细节和业务结果。"} />
      </section>

      <section className="report-improvement-block">
        <strong>下次怎么改</strong>
        <p>{review.improvement?.summary ?? review.advice}</p>
        <p className="muted">示例：{review.improvement?.example ?? review.referenceAnswer}</p>
        {review.improvement?.nextTry ? <p className="muted">练习要求：{review.improvement.nextTry}</p> : null}
      </section>

      <div className="pill-list">
        {review.issues.map((issue) => (
          <span className="pill" key={issue}>
            {issue}
          </span>
        ))}
      </div>

      {review.knowledgeTags?.length ? (
        <section className="page-stack">
          <strong>知识库标签</strong>
          <div className="pill-list">
            {review.knowledgeTags.map((tag) => (
              <span className="pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {review.qaTranscript?.length ? (
        <section className="page-stack">
          <strong>本题 QA 记录</strong>
          {review.qaTranscript.map((item, index) => (
            <p className="muted" key={`${item.role}-${index}`}>
              {item.role === "assistant" ? "面试官" : "我"}：{item.content}
            </p>
          ))}
        </section>
      ) : null}

      {review.practiceResources?.length ? (
        <section className="page-stack">
          <strong>练习资源</strong>
          {review.practiceResources.map((resource) => (
            <span className="muted" key={resource}>
              {resource}
            </span>
          ))}
        </section>
      ) : null}
    </article>
  );
}

function DiagnosisItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="report-diagnosis-item">
      <span>{title}</span>
      <p>{text}</p>
    </div>
  );
}
