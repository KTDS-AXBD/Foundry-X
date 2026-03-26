"use client";

import { Badge } from "@/components/ui/badge";

const DISCOVERY_TYPES = [
  { key: "I", name: "아이디어형", color: "bg-blue-100 text-blue-700 border-blue-200", desc: "팀원 발상·경영진 방향" },
  { key: "M", name: "시장·타겟형", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "특정 산업/고객군 기회" },
  { key: "P", name: "고객문제형", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "현장 Pain Point" },
  { key: "T", name: "기술형", color: "bg-purple-100 text-purple-700 border-purple-200", desc: "AI 기술/트렌드 기반" },
  { key: "S", name: "기존서비스형", color: "bg-rose-100 text-rose-700 border-rose-200", desc: "서비스 벤치마크" },
] as const;

const BRANCH_STAGES = [
  { id: "2-1", name: "레퍼런스 분석" },
  { id: "2-2", name: "수요 시장 검증" },
  { id: "2-3", name: "경쟁·자사 분석" },
  { id: "2-4", name: "사업 아이템 도출" },
  { id: "2-5", name: "핵심 아이템 선정", isCommitGate: true },
  { id: "2-6", name: "타겟 고객 정의" },
  { id: "2-7", name: "비즈니스 모델 정의" },
];

const COMMON_STAGES = [
  { id: "2-8", name: "패키징" },
  { id: "2-9", name: "AI 멀티페르소나 평가" },
  { id: "2-10", name: "최종 보고서" },
];

export default function ProcessFlowV82() {
  return (
    <div className="space-y-6">
      {/* Step 2-0: Classification */}
      <div className="rounded-xl border-2 border-slate-800 bg-slate-900 p-5 text-white">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
          Step 2-0
        </div>
        <h3 className="text-base font-bold">사업 아이템 분류</h3>
        <p className="mt-1 text-sm text-slate-300">
          AI Agent 3턴 대화로 5유형(I/M/P/T/S) 분류 → 유형별 맞춤 분석 경로 제안
        </p>
      </div>

      {/* Branch Arrow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-slate-400" />
          <div className="text-xs font-semibold text-muted-foreground">5유형 분기</div>
          <div className="h-2 w-px bg-slate-400" />
          <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-400" />
        </div>
      </div>

      {/* 5 Types */}
      <div className="grid grid-cols-5 gap-2">
        {DISCOVERY_TYPES.map((t) => (
          <div key={t.key} className={`rounded-lg border p-3 text-center ${t.color}`}>
            <div className="text-xs font-bold">Type {t.key}</div>
            <div className="text-sm font-semibold">{t.name}</div>
            <div className="mt-0.5 text-[10px] opacity-70">{t.desc}</div>
          </div>
        ))}
      </div>

      {/* HITL Banner */}
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-[10px] font-bold text-white">
          H
        </span>
        <span className="text-xs font-medium text-green-800">
          HITL (Human-In-The-Loop) — 2-1~2-7 전 단계 AI 초안 + 담당자 검증
        </span>
      </div>

      {/* Branch Stages (2-1 ~ 2-7) */}
      <div className="space-y-1.5">
        {BRANCH_STAGES.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5"
          >
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {s.id}
            </Badge>
            <span className="text-sm font-medium">{s.name}</span>
            {s.isCommitGate && (
              <Badge className="ml-auto border-amber-200 bg-amber-50 text-amber-700">
                Commit Gate
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Common Stages Arrow */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center">
          <div className="h-3 w-px bg-slate-400" />
          <div className="text-xs font-semibold text-muted-foreground">공통 단계</div>
          <div className="h-2 w-px bg-slate-400" />
          <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-400" />
        </div>
      </div>

      {/* Common Stages (2-8 ~ 2-10) */}
      <div className="space-y-1.5">
        {COMMON_STAGES.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-4 py-2.5"
          >
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {s.id}
            </Badge>
            <span className="text-sm font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
