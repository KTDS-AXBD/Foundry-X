// F390: Builder Quality — 일별 점수 추이 라인 차트 (Sprint 178)

interface TrendPoint {
  date: string;
  avgScore: number;
  count: number;
}

interface QualityTrendLineProps {
  points: TrendPoint[];
}

export default function QualityTrendLine({ points }: QualityTrendLineProps) {
  if (points.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-8 text-center">
        아직 품질 데이터가 없어요.
      </div>
    );
  }

  const width = 500;
  const height = 200;
  const padX = 40;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const maxScore = 100;
  const xScale = (i: number) => padX + (i / Math.max(points.length - 1, 1)) * chartW;
  const yScale = (v: number) => padY + chartH - (v / maxScore) * chartH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(p.avgScore)}`)
    .join(" ");

  // 80점 기준선
  const thresholdY = yScale(80);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* Y축 그리드 */}
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line
              x1={padX}
              x2={width - padX}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
            <text
              x={padX - 6}
              y={yScale(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={9}
              className="fill-muted-foreground"
            >
              {v}
            </text>
          </g>
        ))}

        {/* 80점 기준선 */}
        <line
          x1={padX}
          x2={width - padX}
          y1={thresholdY}
          y2={thresholdY}
          stroke="hsl(0, 70%, 55%)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <text
          x={width - padX + 4}
          y={thresholdY}
          dominantBaseline="middle"
          fontSize={8}
          fill="hsl(0, 70%, 55%)"
        >
          80
        </text>

        {/* 데이터 라인 */}
        <path d={linePath} fill="none" stroke="hsl(210, 80%, 55%)" strokeWidth={2} />

        {/* 데이터 포인트 */}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={xScale(i)}
              cy={yScale(p.avgScore)}
              r={3}
              fill={p.avgScore >= 80 ? "hsl(142, 70%, 45%)" : "hsl(38, 92%, 50%)"}
            />
            {/* X축 라벨 (최대 7개만) */}
            {(points.length <= 7 || i % Math.ceil(points.length / 7) === 0) && (
              <text
                x={xScale(i)}
                y={height - 4}
                textAnchor="middle"
                fontSize={8}
                className="fill-muted-foreground"
              >
                {p.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
