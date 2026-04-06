// F390: Builder Quality — 4개 KPI 스코어 카드 (Sprint 178)

import { Card } from "@/components/ui/card";

interface ScoreCardGridProps {
  averageScore: number;
  above80Pct: number;
  totalCostSaved: number;
  totalPrototypes: number;
}

export default function ScoreCardGrid({
  averageScore,
  above80Pct,
  totalCostSaved,
  totalPrototypes,
}: ScoreCardGridProps) {
  const cards = [
    {
      label: "평균 품질 점수",
      value: averageScore.toFixed(1),
      suffix: "/ 100",
      color: averageScore >= 80 ? "text-green-600" : averageScore >= 60 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "80점+ 비율",
      value: `${above80Pct.toFixed(1)}%`,
      suffix: "",
      color: above80Pct >= 70 ? "text-green-600" : above80Pct >= 40 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "비용 절감",
      value: `$${totalCostSaved.toFixed(2)}`,
      suffix: "saved",
      color: "text-blue-600",
    },
    {
      label: "총 프로토타입",
      value: String(totalPrototypes),
      suffix: "개",
      color: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="text-xs text-muted-foreground mb-1">{card.label}</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
            {card.suffix && (
              <span className="text-xs text-muted-foreground">{card.suffix}</span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
