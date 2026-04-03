"use client";

import { useState } from "react";
import {
  Compass,
  MapPin,
  MessageSquare,
  ClipboardCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Users,
  Globe,
  Check,
  Circle,
  Sparkles,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════
   STYLE: Mission Control Briefing
   - Dark forced theme with neon accents
   - Timeline connector with glow
   - Staggered fade-in via CSS @keyframes
   - Per-Act color coding (teal/violet/amber/rose)
   ═══════════════════════════════════════════════ */

const STYLE = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 8px var(--glow-color, rgba(56,189,248,0.4)); }
    50% { box-shadow: 0 0 20px var(--glow-color, rgba(56,189,248,0.6)); }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes dotPulse {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.3); opacity: 1; }
  }
  .demo-fade { animation: fadeSlideUp 0.6s ease-out both; }
  .demo-fade-1 { animation-delay: 0.05s; }
  .demo-fade-2 { animation-delay: 0.1s; }
  .demo-fade-3 { animation-delay: 0.15s; }
  .demo-fade-4 { animation-delay: 0.2s; }
  .demo-fade-5 { animation-delay: 0.25s; }
  .demo-fade-6 { animation-delay: 0.3s; }
  .demo-fade-7 { animation-delay: 0.35s; }
  .demo-fade-8 { animation-delay: 0.4s; }
  .demo-shimmer {
    background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
  }
`;

/* ── Color System per Act ── */
const ACT_COLORS = {
  1: { accent: "#2dd4bf", bg: "rgba(45,212,191,0.08)", border: "rgba(45,212,191,0.3)", glow: "rgba(45,212,191,0.4)", label: "teal" },
  2: { accent: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)", glow: "rgba(167,139,250,0.4)", label: "violet" },
  3: { accent: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.3)", glow: "rgba(251,191,36,0.4)", label: "amber" },
  4: { accent: "#fb7185", bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.3)", glow: "rgba(251,113,133,0.4)", label: "rose" },
} as const;

/* ── Timeline Node ── */
function TimelineNode({ color, isLast }: { color: string; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="h-4 w-4 rounded-full border-2"
        style={{
          borderColor: color,
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}`,
          animation: "dotPulse 2s ease-in-out infinite",
        }}
      />
      {!isLast && (
        <div
          className="w-px flex-1 min-h-[calc(100%-16px)]"
          style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }}
        />
      )}
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-sky-400" />
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

/* ── Checklist ── */
function ChecklistItem({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      {done ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
          <Check className="h-3 w-3" />
        </div>
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-md border border-white/20">
          <Circle className="h-2.5 w-2.5 text-white/30" />
        </div>
      )}
      <span className={cn("text-sm", done ? "text-white/40 line-through" : "text-white/80")}>{children}</span>
    </li>
  );
}

/* ── Act Section ── */
function ActSection({
  number,
  title,
  duration,
  feature,
  icon: Icon,
  scenario,
  steps,
  talkingPoint,
  children,
}: {
  number: 1 | 2 | 3 | 4;
  title: string;
  duration: string;
  feature: string;
  icon: React.ElementType;
  scenario: string;
  steps: string[];
  talkingPoint: string;
  children?: React.ReactNode;
}) {
  const c = ACT_COLORS[number];
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`demo-fade demo-fade-${number + 3} flex gap-5`}>
      {/* Timeline */}
      <div className="hidden sm:flex flex-col items-center pt-2">
        <TimelineNode color={c.accent} isLast={number === 4} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="group flex w-full items-start gap-4 text-left"
        >
          {/* Big Number */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.accent,
              boxShadow: `0 0 24px ${c.glow}`,
            }}
          >
            {number}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <Icon className="h-5 w-5" style={{ color: c.accent }} />
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-white/30 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/30 ml-auto" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: c.bg, color: c.accent, border: `1px solid ${c.border}` }}
              >
                <Clock className="h-3 w-3" /> {duration}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60 border border-white/10">
                {feature}
              </span>
            </div>
          </div>
        </button>

        {/* Body */}
        {expanded && (
          <div className="mt-4 space-y-4 pl-[72px]">
            {/* Scenario */}
            <p className="text-sm italic text-white/40">{scenario}</p>

            {/* Steps */}
            <ol className="space-y-2">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-white/70">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: c.bg, color: c.accent, border: `1px solid ${c.border}` }}
                  >
                    {i + 1}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: step }} />
                </li>
              ))}
            </ol>

            {/* Extra content (tables, grids) */}
            {children}

            {/* Talking Point */}
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: c.bg, borderLeft: `3px solid ${c.accent}` }}
            >
              <span className="mr-2 text-xs font-bold uppercase tracking-wider" style={{ color: c.accent }}>
                Point
              </span>
              <span className="text-white/70" dangerouslySetInnerHTML={{ __html: talkingPoint }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export function Component() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white relative overflow-hidden">
      <style>{STYLE}</style>

      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2"
        style={{
          width: "800px",
          height: "500px",
          background: "radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 py-12">

        {/* ── HERO ── */}
        <div className="demo-fade demo-fade-1 mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-medium text-sky-400">
            <Sparkles className="h-3 w-3" />
            TEAM DEMO SCENARIO
          </div>
          <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              발굴 프로세스
            </span>
            <br />
            <span className="text-white/90">UX 개선</span>
          </h1>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Foundry-X에서 사업 아이템 발굴 프로세스를 직관적으로 시작하고,
            AI 비서 안내를 받으며 단계별로 진행할 수 있어요.
          </p>

          {/* Stat Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <StatPill icon={Users} label="대상" value="AX BD팀 7명" />
            <StatPill icon={Clock} label="소요" value="20~30분" />
            <StatPill icon={Globe} label="URL" value="fx.minu.best" />
          </div>
        </div>

        {/* ── KEY MESSAGES ── */}
        <div className="demo-fade demo-fade-2 mb-12 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-6 backdrop-blur-sm demo-shimmer">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-sky-400">
            <Zap className="h-4 w-4" /> 핵심 메시지
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { emoji: "🔄", title: "채팅 → 프로세스", desc: "단계별 진행 추적 + 산출물 관리 + 팀 공유" },
              { emoji: "💬", title: "Help Agent", desc: "어디서 시작할지 모르겠으면 AI 비서에게 물어보세요" },
              { emoji: "✅", title: "HITL 패널", desc: "AI 결과물을 바로 검토·수정·승인" },
            ].map((msg, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-2xl mb-2">{msg.emoji}</div>
                <div className="text-sm font-semibold text-white mb-1">{msg.title}</div>
                <div className="text-xs text-white/50">{msg.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CHECKLIST ── */}
        <div className="demo-fade demo-fade-3 mb-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/60">
            <Check className="h-4 w-4" /> 사전 준비 체크리스트
          </h2>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            <ChecklistItem>Workers 배포 (D1 0082 시드 적용)</ChecklistItem>
            <ChecklistItem>Pages 배포</ChecklistItem>
            <ChecklistItem>OPENROUTER_API_KEY 설정</ChecklistItem>
            <ChecklistItem>시드 데이터 확인 (헬스케어AI + GIVC)</ChecklistItem>
            <ChecklistItem>Feature Flag 활성화</ChecklistItem>
            <ChecklistItem>발표자 계정 로그인</ChecklistItem>
            <ChecklistItem>화면 공유 준비</ChecklistItem>
          </ul>
        </div>

        {/* ── TIMELINE HEADER ── */}
        <div className="demo-fade demo-fade-4 mb-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">데모 흐름 · 4 ACTS</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* ── ACTS ── */}
        <div className="space-y-10">

          {/* Act 1 */}
          <ActSection
            number={1}
            title="온보딩 투어"
            duration="3분"
            feature="F265"
            icon={Compass}
            scenario="처음 발굴 페이지에 방문하는 팀원의 시점"
            steps={[
              '사이드바 <strong class="text-teal-400">"2. 발굴 → 🧭 발굴 위저드"</strong> 클릭',
              '<strong class="text-teal-400">인터랙티브 투어 자동 시작</strong> — 아이템 선택 → 단계 확인 → 스킬 실행 → 결과 확인 → 다음 단계',
              '투어 완료 → "이제 직접 해볼까요?" (시드 데이터: 헬스케어 AI, GIVC)',
            ]}
            talkingPoint='"처음 오신 분은 이 투어가 자동으로 시작돼요. 다시 보고 싶으면 투어 다시 보기 버튼!"'
          />

          {/* Act 2 */}
          <ActSection
            number={2}
            title="발굴 위저드 탐색"
            duration="5분"
            feature="F263"
            icon={MapPin}
            scenario="사전 등록한 biz-item으로 프로세스 단계 탐색"
            steps={[
              'BizItem 드롭다운에서 <strong class="text-violet-400">"헬스케어 AI 진단 보조"</strong> 또는 <strong class="text-violet-400">"GIVC 플랫폼"</strong> 선택',
              '좌측 스텝퍼에서 <strong class="text-violet-400">2-0 (분류)</strong> 단계 확인',
              '각 단계 클릭 — <strong class="text-violet-400">목적, 추천 스킬, 산출물, 체크포인트</strong>',
              '<strong class="text-violet-400">"시작하기"</strong> 버튼 → IN_PROGRESS 전환',
            ]}
            talkingPoint='"예전엔 메뉴 10개가 나열되어 있었는데, 이제 <strong>스텝퍼만 보면</strong> 어디까지 했는지, 다음엔 뭘 해야 하는지 바로 보여요"'
          />

          {/* Act 3 */}
          <ActSection
            number={3}
            title="Help Agent 질의"
            duration="7분"
            feature="F264"
            icon={MessageSquare}
            scenario="프로세스 진행 중 AI 비서에게 질문"
            steps={[
              '우측 하단 <strong class="text-amber-400">💬 버튼</strong> → Help Agent 챗 패널 열기',
              '아래 <strong class="text-amber-400">5가지 질문</strong>을 순서대로 시연',
            ]}
            talkingPoint='"CC Cowork처럼 물어볼 수 있지만, <strong>내가 보고 있는 아이템과 단계를 자동 인식</strong>해요. 단순 질문은 비용 없이 즉시!"'
          >
            {/* Question Cards */}
            <div className="space-y-2">
              {[
                { q: "다음 뭐 해야 돼?", type: "local" as const, desc: "현재 단계 기반 다음 액션" },
                { q: "쓸 수 있는 스킬은?", type: "local" as const, desc: "추천 스킬 목록" },
                { q: "BMC가 뭐야?", type: "llm" as const, desc: "SSE 스트리밍 타이핑" },
                { q: "시장 규모 분석 방법?", type: "llm" as const, desc: "방법론 + 스킬 추천" },
                { q: "체크포인트 보여줘", type: "local" as const, desc: "현재 단계 체크포인트" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5">
                  <MessageCircle className="h-4 w-4 shrink-0 text-amber-400/60" />
                  <span className="flex-1 text-sm text-white/70">"{item.q}"</span>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    item.type === "local"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  )}>
                    {item.type === "local" ? "즉시" : "LLM"}
                  </span>
                  <span className="hidden sm:inline text-xs text-white/30">{item.desc}</span>
                </div>
              ))}
            </div>
          </ActSection>

          {/* Act 4 */}
          <ActSection
            number={4}
            title="HITL 결과물 검토"
            duration="5분"
            feature="F266"
            icon={ClipboardCheck}
            scenario="스킬 실행 결과를 검토하고 승인"
            steps={[
              '위저드에서 추천 스킬 실행 (예: <strong class="text-rose-400">"시장 스캔"</strong>)',
              '결과 반환 → <strong class="text-rose-400">사이드 드로어 자동 오픈</strong>',
              '<strong class="text-rose-400">4가지 액션</strong> 시연 (아래 참고)',
            ]}
            talkingPoint='"CC Cowork에서는 복사해서 따로 저장했는데, 여기선 <strong>자동 저장 + 승인하면 다음 단계 연결</strong>. 이력도 남아요"'
          >
            {/* HITL Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "✅", label: "승인", desc: "다음 단계 자동 연결", color: "emerald" },
                { icon: "✏️", label: "수정", desc: "에디터 전환 후 저장", color: "sky" },
                { icon: "🔄", label: "재생성", desc: "AI에게 다시 요청", color: "amber" },
                { icon: "❌", label: "거부", desc: "사유 입력 후 기록", color: "rose" },
              ].map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4 text-center transition-transform hover:scale-[1.02]",
                    a.color === "emerald" && "border-emerald-500/30 bg-emerald-500/10",
                    a.color === "sky" && "border-sky-500/30 bg-sky-500/10",
                    a.color === "amber" && "border-amber-500/30 bg-amber-500/10",
                    a.color === "rose" && "border-rose-500/30 bg-rose-500/10",
                  )}
                >
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <div className="text-sm font-bold text-white">{a.label}</div>
                  <div className="text-xs text-white/40 mt-0.5">{a.desc}</div>
                </div>
              ))}
            </div>
          </ActSection>
        </div>

        {/* ── DIVIDER ── */}
        <div className="my-12 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">마무리</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* ── COMPARISON TABLE ── */}
        <div className="demo-fade demo-fade-7 mb-10 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-6 pt-5 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/60">CC Cowork vs Foundry-X</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">항목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">CC Cowork</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-sky-400">Foundry-X</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["시작점", "빈 채팅창", "위저드 스텝퍼"],
                  ["다음 할 일", "직접 기억", "스텝퍼 + Help Agent"],
                  ["산출물 관리", "채팅 히스토리 검색", "단계별 자동 저장"],
                  ["팀 공유", "채팅 링크", "히스토리 + HITL 이력"],
                  ["프로세스 추적", "없음", "진행률 + 사업성 신호등"],
                ].map(([item, old_, new_], i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 font-medium text-white/80">{item}</td>
                    <td className="px-6 py-3 text-white/30">{old_}</td>
                    <td className="px-6 py-3 font-semibold text-sky-400">{new_}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Q&A ── */}
        <div className="demo-fade demo-fade-8 mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white/60">Q&A + 피드백</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "어떤 점이 CC Cowork보다 나았나요?",
              "어떤 점이 불편하거나 부족했나요?",
              "가장 자주 쓸 것 같은 기능은?",
              "Help Agent에게 물어보고 싶은 질문?",
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  {i + 1}
                </span>
                <span className="text-sm text-white/60">{q}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── EMERGENCY ── */}
        <div className="mb-10 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="h-4 w-4" /> 비상 대응
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { situation: "Help Agent 응답 없음", response: "서버 지연 안내 → 로컬 응답 질문 전환" },
              { situation: "페이지 로딩 안 됨", response: "Cold start → 10초 대기 후 새로고침" },
              { situation: "스킬 실행 실패", response: "사전 실행 결과물로 HITL 시연" },
              { situation: "HITL 패널 안 열림", response: "산출물 목록에서 직접 클릭 우회" },
            ].map((e, i) => (
              <div key={i} className="flex gap-3 rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/60" />
                <div>
                  <div className="text-sm font-medium text-amber-300">{e.situation}</div>
                  <div className="text-xs text-white/40 mt-0.5">{e.response}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── POST-DEMO ACTIONS ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/60">
            <ArrowRight className="h-4 w-4" /> 데모 후 액션 아이템
          </h2>
          <div className="space-y-3">
            {[
              { item: "피드백 정리 → Backlog 등록", deadline: "당일", urgent: true },
              { item: "Feature Flag 전체 활성화", deadline: "+1일", urgent: true },
              { item: "Help Agent 프롬프트 튜닝", deadline: "+3일", urgent: false },
              { item: "KPI 측정 (주간 사용자, Help Agent 질문 수)", deadline: "+14일", urgent: false },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                <span className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                  a.urgent ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-white/10 text-white/40 border border-white/10"
                )}>
                  {a.deadline}
                </span>
                <span className="text-sm text-white/70">{a.item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
