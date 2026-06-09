import { ResumeScoreRing } from "@/components/resume/ResumeScoreRing/ResumeScoreRing";

type ScoreSummaryCardProps = {
  score: number;
  level: string;
  summary: string;
};

export function ScoreSummaryCard({ score, level, summary }: ScoreSummaryCardProps) {
  return (
    <section className="card row">
      <ResumeScoreRing score={score} label="面试评分" size={112} />
      <div>
        <span className="pill">{level}</span>
        <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--color-text-secondary)" }}>
          {summary}
        </p>
      </div>
    </section>
  );
}
