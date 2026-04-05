/**
 * Sprint 156: F346 — 리포트 탭 헤더
 * 단계 번호 원형 배지 + 제목 + 색상 라인
 */
interface StepHeaderProps {
  stepNum: string;
  title: string;
  color: string;
}

export function StepHeader({ stepNum, title, color }: StepHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b pb-3 mb-4" style={{ borderColor: color }}>
      <span
        className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold"
        style={{ backgroundColor: color }}
      >
        {stepNum}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
