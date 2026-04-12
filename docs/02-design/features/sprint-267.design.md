---
id: FX-DESIGN-267
title: Sprint 267 — F516 대시보드 현행화 Design
sprint: 267
f_items: [F516]
date: 2026-04-12
status: done
---

# Sprint 267 Design — F516 대시보드 현행화

## §1 변경 아이템 상세

### 1. ProcessStageGuide.tsx — STAGES 축소

**Before**: STAGES 6개 (수집/발굴/형상화/검증공유/제품화/GTM)
**After**: STAGES 2개 (발굴/형상화)

```typescript
const STAGES: StageInfo[] = [
  { stage: 2, label: "발굴", ... },
  { stage: 3, label: "형상화", ... },
];
```

`ResetStageGuides` 내 `for (let i = 1; i <= 6; i++)` → STAGES 기반 루프로 변경.

### 2. dashboard.tsx — 5개 변경

#### 2-1. 제거 항목
- imports: `HealthScore`, `RequirementItem`, `HarnessIntegrity`, `FreshnessReport`, `HarnessHealth`, `WorkGuideSection`, `gradeClass`
- useApi 호출: health, reqs, integrity, freshness (4개)
- 위젯: Sprint Status, SDD Triangle, Harness Health, Harness Freshness
- `BD_STAGE_KEYS` 6개 → 2개 (`["DISCOVERY", "FORMALIZATION"]`)

#### 2-2. 퀵 액션 교체
```typescript
const quickActions = [
  { label: "발굴 아이템",  href: "/discovery/items",     icon: Search },
  { label: "아이디어/BMC", href: "/discovery/ideas-bmc", icon: Lightbulb },
  { label: "PRD 작성",     href: "/shaping/prd",         icon: FileText },
  { label: "Offering",    href: "/shaping/offerings",   icon: Package },
];
```

#### 2-3. stageColors / STAGE_NUM_TO_DB_KEY 축소
```typescript
const stageColors = ["bg-violet-500", "bg-amber-500"];
const STAGE_NUM_TO_DB_KEY: Record<number, string> = {
  2: "DISCOVERY",
  3: "FORMALIZATION",
};
```

#### 2-4. Wiki 링크 (WorkGuideSection 대체)
```tsx
<div className="mt-4 rounded-lg border bg-card p-4 text-sm text-muted-foreground">
  📖 업무 가이드는{" "}
  <a href="https://wiki.ktds.co.kr/..." className="text-primary underline" target="_blank" rel="noopener noreferrer">
    Wiki
  </a>
  를 참고하세요.
</div>
```

### 3. TodoSection.tsx — 3개 변경

#### 3-1. NEXT_ACTIONS 2단계로 축소
```typescript
const NEXT_ACTIONS: Record<number, { label: string; href: string }> = {
  2: { label: "평가 실행", href: "/discovery?tab=process" },
  3: { label: "사업기획서 작성", href: "/shaping/business-plan" },
};
```
fallback: `NEXT_ACTIONS[2]`

#### 3-2. stageColors 2색으로 변경
```typescript
const stageColors = ["bg-violet-500", "bg-amber-500"];
```

#### 3-3. 빈 상태 메시지
```tsx
<Link to="/discovery/items" className="text-primary underline">발굴 시작</Link>
```

## §5 파일 매핑

| 파일 | 변경 종류 |
|------|-----------|
| `packages/web/src/components/feature/ProcessStageGuide.tsx` | STAGES 배열 축소, ResetStageGuides 루프 변경 |
| `packages/web/src/routes/dashboard.tsx` | import 정리, useApi 제거, 퀵 액션/stageColors/위젯/Wiki 변경 |
| `packages/web/src/components/feature/TodoSection.tsx` | NEXT_ACTIONS, stageColors, 빈 상태 메시지 변경 |

## §6 TDD 판단

- 변경 파일 3개, 모두 UI 컴포넌트 (React, 렌더링 로직)
- API 서비스 로직 신규 없음 → TDD 면제 (권장 등급)
- 타입체크 + 기존 테스트 회귀 확인으로 갈음
