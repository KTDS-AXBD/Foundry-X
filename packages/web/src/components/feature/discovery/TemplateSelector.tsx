"use client";

/**
 * Sprint 215: 기획서 템플릿 선택 모달 (F445)
 * 3종 템플릿 + 톤/분량 선택
 */
import { useState } from "react";
import { FileText, Presentation, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type TemplateType = 'internal' | 'proposal' | 'ir-pitch';
type ToneType = 'formal' | 'casual';
type LengthType = 'short' | 'medium' | 'long';

export interface TemplateParams {
  templateType: TemplateType;
  tone: ToneType;
  length: LengthType;
}

interface TemplateSelectorProps {
  onSelect: (params: TemplateParams) => void;
  onCancel: () => void;
}

const TEMPLATES: Array<{
  type: TemplateType;
  name: string;
  description: string;
  detail: string;
  icon: React.ElementType;
}> = [
  {
    type: 'internal',
    name: '내부보고',
    description: '요약 중심 · 2~3페이지',
    detail: '핵심 지표와 실행 가능성을 중심으로 팀 내 의사결정을 위한 보고서',
    icon: FileText,
  },
  {
    type: 'proposal',
    name: '제안서',
    description: '고객 관점 · 5~7페이지',
    detail: '문제→해결→효과 구조로 고객/파트너에게 사업 가치를 설득하는 제안서',
    icon: Presentation,
  },
  {
    type: 'ir-pitch',
    name: 'IR 피치',
    description: '투자자 관점 · 10슬라이드',
    detail: '시장→제품→비즈모델→팀 스토리로 투자자를 설득하는 IR 자료',
    icon: TrendingUp,
  },
];

export default function TemplateSelector({ onSelect, onCancel }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('internal');
  const [tone, setTone] = useState<ToneType>('formal');
  const [length, setLength] = useState<LengthType>('medium');

  const handleGenerate = () => {
    onSelect({ templateType: selectedTemplate, tone, length });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl p-6 space-y-5 mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">사업기획서 템플릿 선택</h2>
          <Button variant="ghost" size="icon" onClick={onCancel} aria-label="닫기">
            <X className="size-4" />
          </Button>
        </div>

        {/* 템플릿 카드 */}
        <div className="grid gap-3">
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            const isSelected = selectedTemplate === t.type;
            return (
              <button
                key={t.type}
                onClick={() => setSelectedTemplate(t.type)}
                className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:bg-muted/50"
                }`}
                aria-pressed={isSelected}
              >
                <Icon className={`size-5 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.detail}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 옵션 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">어투</label>
            <div className="flex gap-2">
              {([['formal', '공식적'], ['casual', '친근하게']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTone(val)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    tone === val ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                  }`}
                  aria-pressed={tone === val}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">분량</label>
            <div className="flex gap-1">
              {([['short', '짧게'], ['medium', '보통'], ['long', '길게']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLength(val)}
                  className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                    length === val ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                  }`}
                  aria-pressed={length === val}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 생성 버튼 */}
        <Button className="w-full" onClick={handleGenerate}>
          기획서 생성 시작
        </Button>
      </div>
    </div>
  );
}
