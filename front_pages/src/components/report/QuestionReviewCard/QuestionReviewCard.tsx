import type { QuestionReview } from "@/features/report/types";

type QuestionReviewCardProps = {
  review: QuestionReview;
};

export function QuestionReviewCard({ review }: QuestionReviewCardProps) {
  return (
    <article className="card page-stack">
      <strong>{review.question}</strong>
      <p className="muted">原回答：{review.answer}</p>
      <p style={{ margin: 0, lineHeight: 1.6 }}>{review.comment}</p>
      <div>
        {review.issues.map((issue) => (
          <span className="pill" key={issue} style={{ marginRight: 6, marginBottom: 6 }}>
            {issue}
          </span>
        ))}
      </div>
      <p className="muted">建议：{review.advice}</p>
      <p className="muted">参考：{review.referenceAnswer}</p>
    </article>
  );
}
