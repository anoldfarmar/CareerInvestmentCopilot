import type { ReviewDimension } from "@/features/report/types";

type RadarReviewChartProps = {
  dimensions: ReviewDimension[];
};

export function RadarReviewChart({ dimensions }: RadarReviewChartProps) {
  const size = 220;
  const center = size / 2;
  const radius = 82;
  const points = dimensions.map((dimension, index) => {
    const angle = (Math.PI * 2 * index) / dimensions.length - Math.PI / 2;
    const valueRadius = (dimension.score / 100) * radius;
    return {
      label: dimension.label,
      x: center + Math.cos(angle) * valueRadius,
      y: center + Math.sin(angle) * valueRadius,
      lx: center + Math.cos(angle) * (radius + 24),
      ly: center + Math.sin(angle) * (radius + 24),
    };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="评分维度雷达图">
      {[0.35, 0.7, 1].map((scale) => (
        <circle key={scale} cx={center} cy={center} r={radius * scale} fill="none" stroke="#e5e6eb" />
      ))}
      {points.map((point) => (
        <line key={point.label} x1={center} y1={center} x2={point.lx} y2={point.ly} stroke="#eef2f7" />
      ))}
      <polygon points={polygon} fill="rgba(22, 93, 255, 0.18)" stroke="#165dff" strokeWidth="2" />
      {points.map((point) => (
        <text key={point.label} x={point.lx} y={point.ly} textAnchor="middle" fill="#4e5969" fontSize="10">
          {point.label}
        </text>
      ))}
    </svg>
  );
}
