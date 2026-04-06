/**
 * F377: GAN Panel — 추진론/반대론 좌우 분할 (Sprint 170)
 */

interface GanFeedbackParsed {
  generator?: { points?: string[] };
  discriminator?: { points?: string[] };
}

interface GanPanelProps {
  ganFeedback: string | null;
}

function safeParse(json: string | null): GanFeedbackParsed | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as GanFeedbackParsed;
  } catch {
    return null;
  }
}

export function GanPanel({ ganFeedback }: GanPanelProps) {
  const parsed = safeParse(ganFeedback);

  if (!parsed && !ganFeedback) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg">
        GAN 교차검증 결과가 없어요.
      </div>
    );
  }

  // 파싱 실패 시 원본 텍스트 표시
  if (!parsed) {
    return (
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">GAN 교차검증</h4>
        <p className="text-sm whitespace-pre-wrap">{ganFeedback}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3">GAN 교차검증</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-xs font-medium text-green-700 mb-2">추진론 (Generator)</h5>
          <ul className="space-y-1">
            {(parsed.generator?.points ?? []).map((pt, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-green-500 shrink-0">+</span>
                <span>{pt}</span>
              </li>
            ))}
            {(!parsed.generator?.points?.length) && (
              <li className="text-sm text-muted-foreground">데이터 없음</li>
            )}
          </ul>
        </div>
        <div>
          <h5 className="text-xs font-medium text-red-700 mb-2">반대론 (Discriminator)</h5>
          <ul className="space-y-1">
            {(parsed.discriminator?.points ?? []).map((pt, i) => (
              <li key={i} className="text-sm flex gap-2">
                <span className="text-red-500 shrink-0">−</span>
                <span>{pt}</span>
              </li>
            ))}
            {(!parsed.discriminator?.points?.length) && (
              <li className="text-sm text-muted-foreground">데이터 없음</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
