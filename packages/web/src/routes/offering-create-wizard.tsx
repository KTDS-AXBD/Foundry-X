"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createOffering,
  fetchOfferingSections,
  toggleOfferingSection,
  getBizItems,
  type OfferingSectionItem,
} from "@/lib/api-client";
import { ArrowLeft, ArrowRight, Check, Search, SkipForward } from "lucide-react";

// 21개 표준 섹션 (API offering-section.schema.ts STANDARD_SECTIONS 미러)
const STANDARD_SECTIONS = [
  { key: "hero", title: "Hero", sortOrder: 0, isRequired: true },
  { key: "exec_summary", title: "Executive Summary", sortOrder: 1, isRequired: true },
  { key: "s01", title: "추진 배경 및 목적", sortOrder: 2, isRequired: true },
  { key: "s02", title: "사업기회 점검", sortOrder: 3, isRequired: true },
  { key: "s02_1", title: "왜 이 문제/영역인가", sortOrder: 4, isRequired: true },
  { key: "s02_2", title: "왜 이 기술/접근법인가", sortOrder: 5, isRequired: true },
  { key: "s02_3", title: "왜 이 고객/도메인인가", sortOrder: 6, isRequired: true },
  { key: "s02_4", title: "기존 사업/관계 현황", sortOrder: 7, isRequired: false },
  { key: "s02_5", title: "현황 Gap 분석", sortOrder: 8, isRequired: false },
  { key: "s02_6", title: "글로벌·국내 동향", sortOrder: 9, isRequired: true },
  { key: "s03", title: "제안 방향", sortOrder: 10, isRequired: true },
  { key: "s03_1", title: "솔루션 개요", sortOrder: 11, isRequired: true },
  { key: "s03_2", title: "시나리오 / Use Case", sortOrder: 12, isRequired: true },
  { key: "s03_3", title: "사업화 로드맵", sortOrder: 13, isRequired: true },
  { key: "s04", title: "추진 계획", sortOrder: 14, isRequired: true },
  { key: "s04_1", title: "데이터 확보 방식", sortOrder: 15, isRequired: true },
  { key: "s04_2", title: "시장 분석 및 경쟁 환경", sortOrder: 16, isRequired: true },
  { key: "s04_3", title: "사업화 방향 및 매출 계획", sortOrder: 17, isRequired: true },
  { key: "s04_4", title: "추진 체계 및 투자 계획", sortOrder: 18, isRequired: true },
  { key: "s04_5", title: "사업성 교차검증", sortOrder: 19, isRequired: true },
  { key: "s04_6", title: "기대효과", sortOrder: 20, isRequired: true },
  { key: "s05", title: "KT 연계 GTM 전략(안)", sortOrder: 21, isRequired: true },
];

interface BizItemSimple {
  id: string;
  title: string;
  type?: string;
  status?: string;
}

interface WizardState {
  step: 1 | 2 | 3;
  bizItemId: string | null;
  bizItemTitle: string | null;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  excludedSections: Set<string>; // keys of optional sections to exclude
}

export function Component() {
  const navigate = useNavigate();
  const [state, setState] = useState<WizardState>({
    step: 1,
    bizItemId: null,
    bizItemTitle: null,
    title: "",
    purpose: "report",
    format: "html",
    excludedSections: new Set(),
  });
  const [bizItems, setBizItems] = useState<BizItemSimple[] | null>(null);
  const [bizSearch, setBizSearch] = useState("");
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load biz items for Step 1
  useEffect(() => {
    (async () => {
      setLoadingBiz(true);
      try {
        const data = await getBizItems();
        setBizItems(data.items);
      } catch {
        setBizItems([]);
      } finally {
        setLoadingBiz(false);
      }
    })();
  }, []);

  const update = (patch: Partial<WizardState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const goNext = () => {
    if (state.step < 3) update({ step: (state.step + 1) as 1 | 2 | 3 });
  };
  const goPrev = () => {
    if (state.step > 1) update({ step: (state.step - 1) as 1 | 2 | 3 });
  };

  const canProceed = () => {
    if (state.step === 2) return state.title.trim().length > 0;
    return true;
  };

  const toggleSection = (key: string) => {
    const next = new Set(state.excludedSections);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    update({ excludedSections: next });
  };

  const toggleAllOptional = () => {
    const optionalKeys = STANDARD_SECTIONS.filter((s) => !s.isRequired).map((s) => s.key);
    const allExcluded = optionalKeys.every((k) => state.excludedSections.has(k));
    if (allExcluded) {
      // Include all
      const next = new Set(state.excludedSections);
      optionalKeys.forEach((k) => next.delete(k));
      update({ excludedSections: next });
    } else {
      // Exclude all optional
      const next = new Set(state.excludedSections);
      optionalKeys.forEach((k) => next.add(k));
      update({ excludedSections: next });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // 1. Create offering
      const offering = await createOffering({
        bizItemId: state.bizItemId ?? undefined,
        title: state.title.trim(),
        purpose: state.purpose,
        format: state.format,
      });

      // 2. Toggle off excluded sections
      if (state.excludedSections.size > 0) {
        const sections = await fetchOfferingSections(offering.id);
        const toToggle = sections.filter(
          (s: OfferingSectionItem) =>
            state.excludedSections.has(s.sectionKey) && s.isIncluded,
        );
        for (const section of toToggle) {
          await toggleOfferingSection(offering.id, section.id);
        }
      }

      // 3. Navigate to editor
      navigate(`/shaping/offering/${offering.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBizItems = bizItems?.filter(
    (item) =>
      !bizSearch ||
      item.title.toLowerCase().includes(bizSearch.toLowerCase()) ||
      item.type?.toLowerCase().includes(bizSearch.toLowerCase()),
  );

  const optionalSections = STANDARD_SECTIONS.filter((s) => !s.isRequired);
  const allOptionalExcluded = optionalSections.every((s) =>
    state.excludedSections.has(s.key),
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">새 사업기획서 만들기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          발굴 아이템을 연결하고, 목적과 포맷을 선택한 후 목차를 구성해요
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                n === state.step
                  ? "bg-primary text-primary-foreground"
                  : n < state.step
                    ? "bg-green-100 text-green-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {n < state.step ? <Check className="h-4 w-4" /> : n}
            </div>
            <span
              className={`text-sm ${n === state.step ? "font-medium" : "text-muted-foreground"}`}
            >
              {n === 1 ? "발굴 연결" : n === 2 ? "기본 정보" : "목차 선택"}
            </span>
            {n < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="border rounded-lg p-6 min-h-[320px]">
        {/* Step 1: Select BizItem */}
        {state.step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">발굴 아이템 선택</h2>
              <p className="text-sm text-muted-foreground">
                기획서에 연결할 발굴 아이템을 선택하세요. 건너뛰기도 가능해요.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="아이템 검색..."
                value={bizSearch}
                onChange={(e) => setBizSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border rounded text-sm"
              />
            </div>

            {/* BizItem List */}
            {loadingBiz ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded" />
                ))}
              </div>
            ) : !filteredBizItems || filteredBizItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {bizSearch ? "검색 결과가 없어요" : "발굴 아이템이 없어요"}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredBizItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      update({
                        bizItemId: state.bizItemId === item.id ? null : item.id,
                        bizItemTitle:
                          state.bizItemId === item.id ? null : item.title,
                      })
                    }
                    className={`w-full text-left px-4 py-3 rounded border text-sm transition-colors ${
                      state.bizItemId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <div className="font-medium">{item.title}</div>
                    {item.type && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.type}
                        {item.status && ` · ${item.status}`}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                update({ bizItemId: null, bizItemTitle: null });
                goNext();
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
              발굴 아이템 없이 진행
            </button>
          </div>
        )}

        {/* Step 2: Basic Info */}
        {state.step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold mb-1">기본 정보</h2>
              <p className="text-sm text-muted-foreground">
                기획서 제목, 목적, 포맷을 설정하세요.
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={
                  state.bizItemTitle
                    ? `${state.bizItemTitle} 사업기획서`
                    : "사업기획서 제목을 입력하세요"
                }
                onFocus={() => {
                  if (!state.title && state.bizItemTitle) {
                    update({ title: `${state.bizItemTitle} 사업기획서` });
                  }
                }}
                className="w-full px-3 py-2 border rounded text-sm"
              />
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium mb-2">목적</label>
              <div className="flex gap-3">
                {(
                  [
                    { value: "report", label: "보고용", desc: "경영진 보고" },
                    { value: "proposal", label: "제안용", desc: "고객 제안" },
                    { value: "review", label: "검토용", desc: "내부 검토" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update({ purpose: opt.value })}
                    className={`flex-1 px-4 py-3 rounded border text-sm text-center transition-colors ${
                      state.purpose === opt.value
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="block text-sm font-medium mb-2">포맷</label>
              <div className="flex gap-3">
                {(
                  [
                    { value: "html", label: "HTML", desc: "웹 문서" },
                    { value: "pptx", label: "PPTX", desc: "프레젠테이션" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => update({ format: opt.value })}
                    className={`flex-1 px-4 py-3 rounded border text-sm text-center transition-colors ${
                      state.format === opt.value
                        ? "border-primary bg-primary/5 font-medium"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Section Select */}
        {state.step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-1">목차 선택</h2>
                <p className="text-sm text-muted-foreground">
                  필수 섹션은 자동 포함돼요. 선택 섹션은 토글할 수 있어요.
                </p>
              </div>
              <button
                onClick={toggleAllOptional}
                className="text-xs text-primary hover:underline"
              >
                {allOptionalExcluded
                  ? "선택 섹션 전체 포함"
                  : "선택 섹션 전체 제외"}
              </button>
            </div>

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {STANDARD_SECTIONS.map((section) => {
                const isExcluded = state.excludedSections.has(section.key);
                const isIncluded = section.isRequired || !isExcluded;
                return (
                  <label
                    key={section.key}
                    className={`flex items-center gap-3 px-3 py-2 rounded text-sm cursor-pointer transition-colors ${
                      isIncluded ? "bg-muted/20" : "bg-transparent opacity-60"
                    } ${section.isRequired ? "cursor-default" : "hover:bg-muted/40"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      disabled={section.isRequired}
                      onChange={() => {
                        if (!section.isRequired) toggleSection(section.key);
                      }}
                      className="rounded"
                    />
                    <span className="flex-1">
                      {section.title}
                    </span>
                    {section.isRequired && (
                      <span className="text-xs text-muted-foreground">필수</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded">
          {error}
        </p>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={state.step === 1 ? () => navigate("/shaping/offerings") : goPrev}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {state.step === 1 ? "목록으로" : "이전"}
        </Button>

        {state.step < 3 ? (
          <Button onClick={goNext} disabled={!canProceed()}>
            다음
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting || !canProceed()}>
            {submitting ? "생성 중..." : "완료"}
            <Check className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
