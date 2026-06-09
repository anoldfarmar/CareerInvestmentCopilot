type ResumeScoreRingProps = {
  score: number;
  total?: number;
  label?: string;
  size?: number;
};

function scoreColor(score: number) {
  if (score < 60) return "#f53f3f";
  if (score < 80) return "#ff7d00";
  return "#165dff";
}

export function ResumeScoreRing({ score, total = 100, label = "综合评分", size = 120 }: ResumeScoreRingProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(score / total, 1));
  const dashOffset = circumference * (1 - progress);
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}${score}分`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e8f0ff" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="#1d2129" fontSize="28" fontWeight="800">
        {score}
      </text>
      <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" fill="#86909c" fontSize="12">
        {label}
      </text>
    </svg>
  );
}
