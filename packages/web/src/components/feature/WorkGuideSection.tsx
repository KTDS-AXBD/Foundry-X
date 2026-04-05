"use client";

/**
 * F323 — 업무 가이드
 * 검증 흐름 / 제품화 / 개발 파이프라인 / 오프라인 활동 안내
 * 정적 콘텐츠 — API 호출 없음
 */
import { Link } from "react-router-dom";
import { Accordion } from "@/components/ui/accordion";
import type { AccordionItemData } from "@/components/ui/accordion";
import {
  CheckCircle,
  Rocket,
  GitBranch,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  가이드 데이터                                                       */
/* ------------------------------------------------------------------ */

interface GuideItem {
  id: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
  href: string;
}

const GUIDES: GuideItem[] = [
  {
    id: "verification",
    title: "4단계 검증 흐름",
    description: "본부 → 전사 → Pre-PRB → 임원 보고 → 최종 의사결정",
    detail:
      "각 단계에서 사업성, 기술 타당성, 투자 규모를 검증해요. 본부 검증이 통과되면 전사 검증으로 자동 이관되며, Pre-PRB에서 비용 투자 심의를 거쳐 임원 보고까지 이어져요.",
    icon: CheckCircle,
    href: "/validation",
  },
  {
    id: "product",
    title: "5단계 제품화",
    description: "MVP와 PoC 병렬 진행 → Offering Pack 패키징",
    detail:
      "MVP(최소 기능 제품)와 PoC(기술 검증)를 병렬로 진행할 수 있어요. 완성되면 Offering Pack으로 패키징하여 고객에게 제안해요.",
    icon: Rocket,
    href: "/product",
  },
  {
    id: "pipeline",
    title: "개발 파이프라인",
    description: "PRD → 요구사항 인터뷰 → PDCA → Sprint → 배포",
    detail:
      "AI 에이전트가 PRD 초안을 자동 생성하고, 인터뷰를 통해 요구사항을 구체화해요. PDCA(Plan→Do→Check→Act) 사이클을 Sprint 단위로 반복하며 점진적으로 완성해요.",
    icon: GitBranch,
    href: "/shaping/prd",
  },
  {
    id: "offline",
    title: "오프라인 활동",
    description: "전문가 인터뷰, 유관부서 미팅, 고객사 방문",
    detail:
      "온라인 분석만으로는 한계가 있어요. 도메인 전문가 인터뷰, 유관부서 협의, 고객사 현장 방문 일정을 관리하고 결과를 기록해요.",
    icon: CalendarDays,
    href: "/validation?tab=meetings",
  },
];

/* ------------------------------------------------------------------ */
/*  WorkGuideSection                                                   */
/* ------------------------------------------------------------------ */

export function WorkGuideSection() {
  const items: AccordionItemData[] = GUIDES.map((guide) => ({
    value: guide.id,
    trigger: (
      <div className="flex items-center gap-3">
        <guide.icon className="size-4 shrink-0 text-primary" />
        <div className="text-left">
          <div className="font-medium">{guide.title}</div>
          <div className="text-xs text-muted-foreground">
            {guide.description}
          </div>
        </div>
      </div>
    ),
    content: (
      <div className="space-y-2 pl-7">
        <p>{guide.detail}</p>
        <Link
          to={guide.href}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          이동하기 <ArrowRight className="size-3" />
        </Link>
      </div>
    ),
  }));

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        📖 업무 가이드
      </h2>
      <Accordion items={items} type="multiple" />
    </div>
  );
}
