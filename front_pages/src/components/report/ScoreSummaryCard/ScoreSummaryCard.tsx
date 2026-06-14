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
        <p className="text-block mt-3">
          {summary}
        </p>
      </div>
    </section>
  );
}
