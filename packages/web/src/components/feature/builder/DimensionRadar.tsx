// F390: Builder Quality — 5차원 레이더 차트 (Sprint 178)
// 순수 SVG 구현 (라이브러리 없음)

interface DimensionRadarProps {
  dimensions: {
    build: number;
    ui: number;
    functional: number;
    prd: number;
    code: number;
  };
}

const LABELS = ["Build", "UI", "Functional", "PRD", "Code"];

export default function DimensionRadar({ dimensions }: DimensionRadarProps) {
  const values = [dimensions.build, dimensions.ui, dimensions.functional, dimensions.prd, dimensions.code];
  const cx = 150;
  const cy = 150;
  const r = 100;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  function polarToCart(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const angleStep = 360 / 5;
  const dataPoints = values.map((v, i) => {
    const angle = i * angleStep;
    return polarToCart(angle, v * r);
  });
  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 300" width={280} height={280}>
        {/* 격자 */}
        {levels.map((lv) => (
          <polygon
            key={lv}
            points={Array.from({ length: 5 }, (_, i) => {
              const p = polarToCart(i * angleStep, lv * r);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeWidth={1}
          />
        ))}

        {/* 축 */}
        {Array.from({ length: 5 }, (_, i) => {
          const p = polarToCart(i * angleStep, r);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          );
        })}

        {/* 데이터 영역 */}
        <polygon
          points={polygon}
          fill="hsl(210, 80%, 55%)"
          fillOpacity={0.25}
          stroke="hsl(210, 80%, 55%)"
          strokeWidth={2}
        />

        {/* 데이터 포인트 */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={4} fill="hsl(210, 80%, 55%)" />
        ))}

        {/* 라벨 */}
        {LABELS.map((label, i) => {
          const p = polarToCart(i * angleStep, r + 24);
          return (
            <text
              key={label}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={11}
            >
              {label} ({(values[i] * 100).toFixed(0)}%)
            </text>
          );
        })}
      </svg>
    </div>
  );
}
