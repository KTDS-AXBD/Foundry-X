---
code: FX-DSGN-IA
title: "IA 구조 개선 — 사이드바 재구조화 + 온보딩 상세 설계"
version: 1.0
status: Active
category: DSGN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Foundry-X IA 구조 개선 Design Document

> **Summary**: 사이드바 IA 재구조화 + 온보딩 가이드 + UI/UX 개선 상세 설계
>
> **Project**: Foundry-X
> **Plan**: [[ia-restructure.plan.md]]
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft

---

## 1. Sprint 82: 사이드바 IA 재구조화 (F241)

### 1.1 sidebar.tsx 데이터 구조 변경

**변경 파일**: `packages/web/src/components/sidebar.tsx`

기존 `navGroups` + `axBdGroup` + `utilItems` + `serviceGroup` 4개 데이터 구조를 **프로세스 6단계 기반 단일 배열**로 통합.

```typescript
// ── 새 사이드바 구조 ──

const topItems: NavItem[] = [
  { href: "/getting-started", label: "시작하기", icon: Rocket },
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
];

const processGroups: NavGroup[] = [
  {
    key: "collect",
    label: "1. 수집",
    icon: Inbox,        // 기존 SR 그룹 아이콘 재사용
    items: [
      { href: "/sr", label: "SR 목록", icon: ClipboardList },
      { href: "/discovery/collection", label: "수집 채널", icon: Radio },
      { href: "/ir-proposals", label: "IR Bottom-up", icon: ArrowUpFromLine },
    ],
  },
  {
    key: "discover",
    label: "2. 발굴",
    icon: Search,
    items: [
      { href: "/ax-bd/discovery", label: "Discovery 프로세스", icon: Map },
      { href: "/ax-bd/ideas", label: "아이디어 관리", icon: Lightbulb },
      { href: "/ax-bd/bmc", label: "BMC", icon: Blocks },
      { href: "/discovery-progress", label: "진행률", icon: BarChart3 },
    ],
  },
  {
    key: "shape",
    label: "3. 형상화",
    icon: PenTool,
    items: [
      { href: "/spec-generator", label: "Spec 생성", icon: FileText },
      { href: "/ax-bd", label: "사업제안서", icon: FileSignature },
      { href: "/offering-packs", label: "Offering Pack", icon: Package },
    ],
  },
  {
    key: "validate",
    label: "4. 검증/공유",
    icon: CheckCircle,
    items: [
      { href: "/pipeline", label: "파이프라인", icon: GitBranch },
    ],
  },
  {
    key: "productize",
    label: "5. 제품화",
    icon: Rocket,       // 다른 Rocket 인스턴스 — 구분 위해 다른 아이콘 고려
    items: [
      { href: "/mvp-tracking", label: "MVP 추적", icon: Target },
    ],
  },
  {
    key: "gtm",
    label: "6. GTM",
    icon: TrendingUp,
    items: [
      { href: "/projects", label: "프로젝트 현황", icon: FolderKanban },
    ],
  },
];

const knowledgeGroup: NavGroup = {
  key: "knowledge",
  label: "지식",
  icon: BookOpen,
  items: [
    { href: "/wiki", label: "지식베이스", icon: BookOpen },
    { href: "/methodologies", label: "방법론 관리", icon: Library },
  ],
};

const adminGroup: NavGroup = {
  key: "admin",
  label: "관리",
  icon: Settings,
  items: [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/agents", label: "에이전트", icon: Bot },
    { href: "/tokens", label: "토큰 비용", icon: Coins },
    { href: "/architecture", label: "아키텍처", icon: Blocks },
    { href: "/workspace", label: "내 작업", icon: FolderKanban },
    { href: "/settings/jira", label: "설정", icon: Settings },
  ],
};

const externalGroup: NavGroup = {
  key: "external",
  label: "외부 서비스",
  icon: Link2,
  items: [
    { href: "/discovery", label: "Discovery-X", icon: Search },
    { href: "/foundry", label: "AI Foundry", icon: FlaskConical },
  ],
};
```

### 1.2 NavLinks 렌더링 변경

```tsx
function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const pathname = usePathname();
  const { openGroups, toggle } = useGroupState();

  return (
    <nav className="flex flex-col gap-0.5">
      {/* 시작하기 + 홈 */}
      {topItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 */}
      {processGroups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          group={group}
          pathname={pathname}
          isOpen={openGroups.has(group.key)}
          onToggle={() => toggle(group.key)}
          onSelect={onSelect}
        />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 지식 */}
      <CollapsibleGroup
        group={knowledgeGroup}
        pathname={pathname}
        isOpen={openGroups.has(knowledgeGroup.key)}
        onToggle={() => toggle(knowledgeGroup.key)}
        onSelect={onSelect}
      />

      {/* 관리 */}
      <CollapsibleGroup
        group={adminGroup}
        pathname={pathname}
        isOpen={openGroups.has(adminGroup.key)}
        onToggle={() => toggle(adminGroup.key)}
        onSelect={onSelect}
      />

      <div className="my-2 border-t border-border/40" />

      {/* 외부 서비스 */}
      <CollapsibleGroup
        group={externalGroup}
        pathname={pathname}
        isOpen={openGroups.has(externalGroup.key)}
        onToggle={() => toggle(externalGroup.key)}
        onSelect={onSelect}
      />

      {/* 도움말 */}
      <NavLink
        item={{ href: "/getting-started", label: "도움말", icon: HelpCircle }}
        pathname={pathname}
        onSelect={onSelect}
      />
    </nav>
  );
}
```

### 1.3 localStorage 마이그레이션

기존 그룹 키(`sr`, `dev`, `status`, `ax-bd`, `services`)가 새 키(`collect`, `discover`, `shape`, `validate`, `productize`, `gtm`, `knowledge`, `admin`, `external`)로 변경되므로, 기존 사용자의 열림/닫힘 상태가 초기화됨.

**전략**: 새 기본값으로 프로세스 그룹 전체 펼침 + 관리/외부 접힘.

```typescript
const DEFAULT_OPEN = new Set(["collect", "discover", "shape", "validate", "productize", "gtm"]);
```

### 1.4 OnboardingTour 업데이트

기존 `TOUR_STEPS`의 `target` 값이 변경된 그룹 키에 맞게 수정 필요:

| 기존 target | 새 target | 설명 |
|-------------|-----------|------|
| `group-sr` | `group-collect` | 수집 |
| `group-dev` | `group-shape` | 형상화 |
| `group-status` | `group-validate` | 검증/공유 |

**Tour 스텝 재구성** (6단계 프로세스 기반):

```typescript
const TOUR_STEPS: TourStep[] = [
  { target: "getting-started", title: "🚀 시작하기", description: "..." },
  { target: "dashboard", title: "🏠 홈", description: "프로세스 전체 진행률을 한눈에" },
  { target: "group-collect", title: "📥 1. 수집", description: "SR, IR, 외부 채널에서 아이디어를 수집" },
  { target: "group-discover", title: "🔍 2. 발굴", description: "아이디어를 분석하고 사업성 평가" },
  { target: "group-shape", title: "📐 3. 형상화", description: "Spec과 사업제안서로 구체화" },
  { target: "group-validate", title: "✅ 4~6. 검증→제품화→GTM", description: "게이트 통과, MVP 제작, 시장 진출" },
  { target: "getting-started", title: "🎉 투어 완료!", description: "..." },
];
```

### 1.5 `/ax-bd` 리다이렉트 변경

현재 `/ax-bd`는 `/ax-bd/ideas`로 리다이렉트. 형상화 단계에서 "사업제안서"로 사용하므로 **BDP 편집 기능**이 있는 페이지로 변경하거나, 현재 리다이렉트를 유지.

**결정**: Sprint 80에서 만든 BDP 편집 기능이 `/ax-bd` 하위에 이미 라우트가 있을 수 있으므로 확인 필요. 없다면 리다이렉트를 `/ax-bd/ideas`로 유지하고, 사이드바 label만 "사업제안서"로 표기.

### 1.6 변경 영향 분석

| 파일 | 변경 유형 | 영향 |
|------|-----------|------|
| `sidebar.tsx` | 데이터 구조 전면 변경 | 핵심 변경 |
| `OnboardingTour.tsx` | target 키 + 스텝 내용 변경 | 연동 변경 |
| E2E 테스트 (`dashboard.spec.ts` 등) | `data-tour` 셀렉터 변경 | 테스트 수정 |
| `globals.css` | 변경 없음 | - |
| 각 page.tsx | 변경 없음 (라우트 유지) | - |

---

## 2. Sprint 83: 온보딩 가이드 강화 (F242 + F243)

### 2.1 ProcessStageGuide 컴포넌트 (F242)

**신규 파일**: `packages/web/src/components/feature/ProcessStageGuide.tsx`

각 프로세스 단계 페이지 진입 시 표시하는 안내 카드. localStorage 기반 "다시 보지 않기" 지원.

```typescript
interface ProcessStageGuideProps {
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  description: string;
  agentHelp: string;      // "이 단계에서 Agent가 도와주는 일"
  nextAction: {
    label: string;
    href: string;
  };
}
```

**동작**:
1. 페이지 첫 진입 시 상단에 안내 카드 표시
2. `localStorage`에 `fx-stage-guide-{stage}` 키로 완료 여부 저장
3. "다시 보지 않기" 클릭 시 숨김, "가이드 다시 보기" 링크로 복원
4. 카드 내용은 각 page.tsx에서 props로 전달 (하드코딩 아님)

### 2.2 대시보드 홈 재설계 (F243)

**변경 파일**: `packages/web/src/app/(app)/dashboard/page.tsx`

현재: SDD Triangle Health Score + 요구사항 + 하네스 무결성 + 신선도
변경: **프로세스 파이프라인 진행률** 중심 + 기존 위젯은 하단 보조

```
┌─────────────────────────────────────────────────┐
│ 프로세스 파이프라인 (가로 스테퍼)                   │
│ 📥 수집 → 🔍 발굴 → 📐 형상화 → ✅ 검증         │
│  (N건)     (N건)     (N건)       (N건)           │
│ → 🚀 제품화 → 📈 GTM                             │
├─────────────────────────────────────────────────┤
│ 퀵 액션              │ Sprint Status             │
│ [SR 등록]            │ Done / In Progress /      │
│ [아이디어 추가]       │ Planned                   │
│ [Spec 생성]          │                            │
│ [파이프라인]          │                            │
├─────────────────────────────────────────────────┤
│ SDD Triangle         │ Harness Health             │
│ Harness Freshness    │                            │
└─────────────────────────────────────────────────┘
```

**구현 특이사항**:
- `STAGES` 배열을 `ProcessStageGuide.tsx`에서 import하여 파이프라인 뷰에서 재사용 (DRY)
- "최근 활동" 영역은 별도 Sprint으로 분리 (scope-out)

**데이터 소스**: 기존 API `/pipeline/stats`에서 `byStage` 데이터 활용.

### 2.3 Getting Started 재구성 (scope-out → 별도 Sprint)

> **결정**: 기존 getting-started 페이지의 3대 업무 동선 + 5탭 구조는 이미 충분히 기능하므로, 6단계 플로우 차트 재구성은 온보딩 피드백 수집 후 별도 Sprint에서 진행.

---

## 3. Sprint 84: AXIS DS 기반 UI/UX 개선 (F244)

### 3.1 기존 AXIS DS 토큰 활용

`globals.css`에 이미 AXIS semantic colors가 정의되어 있음:
- `--axis-primary`, `--axis-blue`, `--axis-green`, `--axis-violet`, `--axis-warm`

### 3.2 사이드바 비주얼 개선

- 프로세스 단계 번호 뱃지 (원형, AXIS 색상)
- 그룹 헤더에 단계 번호 + 아이콘 조합
- 활성 단계 하이라이트 (왼쪽 바 또는 배경색)

```
프로세스 단계별 AXIS 색상 매핑 (Tailwind utility class 방식):
1. 수집    → bg-axis-blue    (oklch 0.623 0.214 259.815)
2. 발굴    → bg-axis-violet  (oklch 0.58 0.2 290)
3. 형상화  → bg-axis-warm    (oklch 0.65 0.16 55)
4. 검증    → bg-axis-green   (oklch 0.62 0.17 145)
5. 제품화  → bg-axis-indigo  (oklch 0.55 0.22 270)
6. GTM    → bg-axis-rose    (oklch 0.60 0.19 15)
```

**구현 방식**: CSS `[data-stage]` selector 대신 `stageColor` prop을 통해 Tailwind utility 직접 적용. dark 모드 토큰은 globals.css에서 자동 전환.

### 3.3 카드/레이아웃 통일

- `elevation` 통일: 카드는 `shadow-sm` + `border` (기존 shadcn/ui 유지)
- `border-radius` 통일: `rounded-lg` (12px)
- 간격 시스템: Tailwind 기본 (4px 배수) — AXIS 토큰과 동일

---

## 4. 구현 순서 체크리스트

### Sprint 82 (F241)
- [ ] sidebar.tsx 데이터 구조 변경 (processGroups 배열)
- [ ] NavLinks 렌더링 로직 업데이트
- [ ] 새 아이콘 import 추가 (Radio, ArrowUpFromLine, PenTool, etc.)
- [ ] useGroupState 기본값 변경
- [ ] OnboardingTour.tsx target/content 업데이트
- [ ] E2E 테스트 data-tour 셀렉터 업데이트
- [ ] typecheck + lint 통과 확인

### Sprint 83 (F242 + F243)
- [x] ProcessStageGuide.tsx 컴포넌트 제작 (경로 자동 감지 방식, layout.tsx 전역 적용)
- [x] layout.tsx에 ProcessStageGuide 통합 (각 page.tsx 개별 수정 불필요)
- [x] dashboard/page.tsx 프로세스 파이프라인 뷰 + 퀵 액션 추가
- [ ] ~~getting-started/page.tsx 6단계 플로우 차트 재구성~~ (scope-out → 별도 Sprint)
- [x] E2E 테스트 갱신 (dashboard.spec.ts)

### Sprint 84 (F244)
- [x] AXIS 색상 토큰을 단계별로 매핑 (globals.css에 indigo/rose 추가)
- [x] 사이드바 단계 번호 뱃지 추가 (stageColor prop + 원형 번호 뱃지)
- [x] 활성 단계 좌측 border 하이라이트
- [x] 카드/레이아웃 일관성 유지 (기존 shadcn/ui 기반)
- [x] typecheck 통과

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | Initial draft | Sinclair Seo |
