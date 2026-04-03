---
code: FX-DSGN-113
title: Sprint 113 Design — Role-based Sidebar + 리브랜딩
version: 1.0
status: Draft
category: DSGN
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 113
f-items: F288, F289
plan-ref: FX-PLAN-113
---

# Sprint 113 Design — Role-based Sidebar + 리브랜딩

> Plan 참조: [[FX-PLAN-113]] `docs/01-plan/features/sprint-113-ia-structure.plan.md`

---

## 1. Design Overview

### 1.1 변경 파일 목록

| # | 파일 | 변경 유형 | 설명 |
|---|------|:--------:|------|
| 1 | `packages/web/src/components/sidebar.tsx` | MODIFY | NavItem/NavGroup 인터페이스 확장 + visibility 필터링 + 리브랜딩 |
| 2 | `packages/web/src/components/__tests__/sidebar.test.tsx` | NEW | Role-based visibility 단위 테스트 |

> **원칙**: sidebar.tsx 단일 파일 변경. 옵션 A(useMemo 내부 필터링) 채택.
> useUserRole.ts, auth-store.ts 변경 없음.

### 1.2 변경하지 않는 파일

- `packages/web/src/hooks/useUserRole.ts` — 기존 그대로 사용
- `packages/web/src/lib/stores/auth-store.ts` — 기존 그대로 사용
- `packages/web/src/router.tsx` — 라우트 경로 변경은 Sprint 114
- 모든 `packages/web/src/routes/*.tsx` — 페이지 컴포넌트 변경 없음

---

## 2. 인터페이스 설계

### 2.1 NavItem / NavGroup 확장

```typescript
// ── 변경 전 ──
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string;
}

// ── 변경 후 ──
type Visibility = "all" | "admin" | "conditional";

interface VisibilityContext {
  isAdmin: boolean;
  onboardingComplete: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  visibility?: Visibility;                          // default: "all"
  condition?: (ctx: VisibilityContext) => boolean;   // visibility === "conditional" 일 때 사용
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string;
  visibility?: Visibility;                          // 그룹 레벨 visibility
  condition?: (ctx: VisibilityContext) => boolean;
}
```

### 2.2 필터링 유틸 함수

```typescript
function isVisible(
  entry: { visibility?: Visibility; condition?: (ctx: VisibilityContext) => boolean },
  ctx: VisibilityContext,
): boolean {
  if (!entry.visibility || entry.visibility === "all") return true;
  if (entry.visibility === "admin") return ctx.isAdmin;
  if (entry.visibility === "conditional" && entry.condition) return entry.condition(ctx);
  return true;
}
```

---

## 3. 데이터 변경 상세

### 3.1 topItems 변경

```typescript
const topItems: NavItem[] = [
  {
    href: "/getting-started",
    label: "시작하기",
    icon: Rocket,
    visibility: "conditional",
    condition: (ctx) => !ctx.onboardingComplete,  // 온보딩 미완료 시만 상단 노출
  },
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/team-shared", label: "팀 공유", icon: Users },
  { href: "/ax-bd/demo", label: "데모 시나리오", icon: Presentation },
];
```

### 3.2 processGroups 리브랜딩 (F289)

프로세스 6단계 그룹은 모두 `visibility: "all"` (기본값) 유지. 명칭만 변경:

```diff
 // 1단계 수집
   items: [
     { href: "/sr", label: "SR 목록", icon: ClipboardList },
-    { href: "/discovery/collection", label: "수집 채널", icon: Radio },
+    { href: "/discovery/collection", label: "Field 수집", icon: Radio },
-    { href: "/ir-proposals", label: "IR Bottom-up", icon: ArrowUpFromLine },
+    { href: "/ir-proposals", label: "IDEA Portal", icon: ArrowUpFromLine },
   ],

 // 3단계 형상화
   items: [
-    { href: "/spec-generator", label: "Spec 생성", icon: FileText },
+    { href: "/spec-generator", label: "PRD", icon: FileText },
     { href: "/ax-bd", label: "사업제안서", icon: FileSignature },
     { href: "/ax-bd/shaping", label: "형상화 리뷰", icon: ClipboardCheck },
     { href: "/offering-packs", label: "Offering Pack", icon: Package },
   ],
```

### 3.3 knowledgeGroup — 개별 아이템 visibility

```typescript
const knowledgeGroup: NavGroup = {
  key: "knowledge",
  label: "지식",
  icon: BookOpen,
  items: [
    { href: "/wiki", label: "지식베이스", icon: BookOpen, visibility: "admin" },
    { href: "/methodologies", label: "방법론 관리", icon: Library, visibility: "admin" },
    { href: "/ax-bd/skill-catalog", label: "스킬 카탈로그", icon: Library },  // all — BD팀 필요
    { href: "/ax-bd/ontology", label: "Ontology", icon: Network, visibility: "admin" },
  ],
};
```

> 지식 그룹은 `visibility` 생략(all). 그룹 자체는 보이되, 내부 아이템이 필터링됨.
> Member에게는 "스킬 카탈로그" 1개만 남음. 아이템이 1개라도 있으면 그룹 헤더 표시.

### 3.4 adminGroup — 그룹 레벨 admin 전용

```typescript
const adminGroup: NavGroup = {
  key: "admin",
  label: "관리",
  icon: Settings,
  visibility: "admin",  // ← 그룹 전체를 admin 전용으로
  items: [
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/agents", label: "에이전트", icon: Bot },
    { href: "/tokens", label: "토큰 비용", icon: Coins },
    { href: "/architecture", label: "아키텍처", icon: Blocks },
    { href: "/workspace", label: "내 작업", icon: FolderKanban },
    { href: "/settings/jira", label: "설정", icon: Settings },
    // Member용 설정은 별도 처리 (아래 3.6 참조)
  ],
};
```

### 3.5 externalGroup — 그룹 레벨 admin 전용

```typescript
const externalGroup: NavGroup = {
  key: "external",
  label: "외부 서비스",
  icon: Link2,
  visibility: "admin",  // ← admin 전용
  items: [
    { href: "/discovery", label: "Discovery-X", icon: Search },
    { href: "/foundry", label: "AI Foundry", icon: FlaskConical },
  ],
};
```

### 3.6 Member용 설정 + 시작하기 (관리 그룹 대체)

Admin 그룹이 숨겨진 Member에게 최소한의 설정 접근을 제공하기 위해,
하단에 Member용 아이템을 별도로 추가:

```typescript
const memberBottomItems: NavItem[] = [
  {
    href: "/getting-started",
    label: "도움말",
    icon: HelpCircle,
  },
  {
    href: "/settings/jira",
    label: "설정",
    icon: Settings,
  },
];
```

> Admin일 때는 기존 관리 그룹에 설정이 있으므로, memberBottomItems는 Member에게만 노출.
> 기존 하단 "도움말" NavLink도 이 배열로 통합.

---

## 4. NavLinks 컴포넌트 변경

### 4.1 필터링 로직 (useMemo)

```typescript
function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const { pathname } = useLocation();
  const { openGroups, toggle } = useGroupState();
  const { isAdmin } = useUserRole();

  // 온보딩 완료 여부 — localStorage 캐시 사용 (추가 API 호출 없음)
  const onboardingComplete = useMemo(() => {
    try {
      const progress = localStorage.getItem("onboarding_progress");
      return progress === "100";
    } catch {
      return false;
    }
  }, []);

  const ctx: VisibilityContext = useMemo(
    () => ({ isAdmin, onboardingComplete }),
    [isAdmin, onboardingComplete],
  );

  // 그룹 필터링: 그룹 visibility 체크 → 아이템 visibility 체크 → 빈 그룹 제거
  const filteredProcessGroups = useMemo(
    () => processGroups
      .filter((g) => isVisible(g, ctx))
      .map((g) => ({ ...g, items: g.items.filter((item) => isVisible(item, ctx)) }))
      .filter((g) => g.items.length > 0),
    [ctx],
  );

  const filteredKnowledge = useMemo(() => {
    if (!isVisible(knowledgeGroup, ctx)) return null;
    const items = knowledgeGroup.items.filter((item) => isVisible(item, ctx));
    return items.length > 0 ? { ...knowledgeGroup, items } : null;
  }, [ctx]);

  const filteredAdmin = useMemo(
    () => (isVisible(adminGroup, ctx) ? adminGroup : null),
    [ctx],
  );

  const filteredExternal = useMemo(
    () => (isVisible(externalGroup, ctx) ? externalGroup : null),
    [ctx],
  );

  const filteredTopItems = useMemo(
    () => topItems.filter((item) => isVisible(item, ctx)),
    [ctx],
  );

  // 자동 펼침 대상도 필터링된 그룹만 사용
  const allVisibleGroups = useMemo(
    () => [
      ...filteredProcessGroups,
      ...(filteredKnowledge ? [filteredKnowledge] : []),
      ...(filteredAdmin ? [filteredAdmin] : []),
      ...(filteredExternal ? [filteredExternal] : []),
    ],
    [filteredProcessGroups, filteredKnowledge, filteredAdmin, filteredExternal],
  );

  useEffect(() => {
    for (const group of allVisibleGroups) {
      if (group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))) {
        if (!openGroups.has(group.key)) {
          toggle(group.key);
        }
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="flex flex-col gap-0.5">
      {/* 시작하기(조건부) + 홈 + 팀공유 + 데모 */}
      {filteredTopItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 */}
      {filteredProcessGroups.map((group) => (
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

      {/* 지식 (필터링 후 아이템이 있을 때만) */}
      {filteredKnowledge && (
        <CollapsibleGroup
          group={filteredKnowledge}
          pathname={pathname}
          isOpen={openGroups.has(filteredKnowledge.key)}
          onToggle={() => toggle(filteredKnowledge.key)}
          onSelect={onSelect}
        />
      )}

      {/* 관리 (Admin 전용) */}
      {filteredAdmin && (
        <CollapsibleGroup
          group={filteredAdmin}
          pathname={pathname}
          isOpen={openGroups.has(filteredAdmin.key)}
          onToggle={() => toggle(filteredAdmin.key)}
          onSelect={onSelect}
        />
      )}

      {filteredExternal && (
        <>
          <div className="my-2 border-t border-border/40" />
          <CollapsibleGroup
            group={filteredExternal}
            pathname={pathname}
            isOpen={openGroups.has(filteredExternal.key)}
            onToggle={() => toggle(filteredExternal.key)}
            onSelect={onSelect}
          />
        </>
      )}

      {/* Member 하단: 도움말 + 설정 */}
      {!isAdmin && (
        <>
          <div className="my-2 border-t border-border/40" />
          {memberBottomItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
          ))}
        </>
      )}
    </nav>
  );
}
```

---

## 5. 테스트 설계

### 5.1 단위 테스트 (`sidebar.test.tsx`)

| # | 테스트 케이스 | 검증 항목 |
|---|-------------|----------|
| T-01 | `isVisible` — visibility 'all'은 항상 true | 기본값 동작 |
| T-02 | `isVisible` — visibility 'admin' + isAdmin=false → false | Admin 전용 숨김 |
| T-03 | `isVisible` — visibility 'admin' + isAdmin=true → true | Admin 노출 |
| T-04 | `isVisible` — visibility 'conditional' + condition 결과 | 조건부 동작 |
| T-05 | Member 로그인 시 관리 그룹 미노출 | DOM에 '/tokens' 링크 없음 |
| T-06 | Admin 로그인 시 관리 그룹 노출 | DOM에 '/tokens' 링크 있음 |
| T-07 | 리브랜딩: "Field 수집" 텍스트 존재 | 명칭 변경 확인 |
| T-08 | 리브랜딩: "IDEA Portal" 텍스트 존재 | 명칭 변경 확인 |
| T-09 | 리브랜딩: "PRD" 텍스트 존재 (Spec 생성 대신) | 명칭 변경 확인 |
| T-10 | Member: 지식 그룹에 "스킬 카탈로그"만 노출 | 아이템 레벨 필터링 |

### 5.2 E2E 영향 분석

기존 E2E 35 specs 중 사이드바 메뉴 텍스트를 직접 참조하는 테스트가 있을 수 있음.
리브랜딩 후 깨지는 E2E가 있으면 텍스트 매칭 부분만 수정.

> E2E fixture의 로그인 계정이 admin role이면 대부분 문제없음.
> Member role E2E가 있다면 관리 메뉴 접근 테스트 스킵 필요.

---

## 6. 구현 순서 (Implementation Order)

```
Step 1: 인터페이스 확장 (5분)
  └─ NavItem, NavGroup에 visibility + condition 필드 추가
  └─ Visibility, VisibilityContext 타입 정의
  └─ isVisible() 유틸 함수 추가

Step 2: Admin 전용 마킹 (5분)
  └─ adminGroup: visibility: "admin"
  └─ externalGroup: visibility: "admin"
  └─ knowledgeGroup 아이템 중 wiki/methodologies/ontology: visibility: "admin"

Step 3: 리브랜딩 (2분)
  └─ "수집 채널" → "Field 수집"
  └─ "IR Bottom-up" → "IDEA Portal"
  └─ "Spec 생성" → "PRD"

Step 4: 시작하기 조건부 + memberBottomItems (3분)
  └─ topItems의 시작하기에 conditional visibility 추가
  └─ memberBottomItems 배열 정의 (도움말 + 설정)

Step 5: NavLinks 필터링 로직 (10분)
  └─ useUserRole() 호출 추가
  └─ onboardingComplete localStorage 읽기
  └─ useMemo 필터링 체인
  └─ JSX 렌더링에 filtered* 변수 적용

Step 6: 테스트 (10분)
  └─ sidebar.test.tsx 작성 (T-01 ~ T-10)
  └─ pnpm test + typecheck + e2e 확인
```

**예상 소요**: ~35분 (autopilot 기준)

---

## 7. 검증 항목 (Gap Analysis 기준)

| V# | 검증 항목 | 검증 방법 |
|----|----------|----------|
| V-01 | NavItem에 visibility 속성 존재 | 타입 체크 |
| V-02 | isVisible 유틸 함수 존재 + 정상 동작 | 단위 테스트 T-01~T-04 |
| V-03 | Admin 전용 메뉴 9개 마킹 | 코드 인스펙션 |
| V-04 | Member 로그인 시 관리/외부서비스 미노출 | 테스트 T-05 + 수동 확인 |
| V-05 | Admin 로그인 시 전체 메뉴 노출 | 테스트 T-06 + 수동 확인 |
| V-06 | 리브랜딩 3건 반영 | 테스트 T-07~T-09 |
| V-07 | 지식 그룹 아이템 레벨 필터링 | 테스트 T-10 |
| V-08 | 시작하기 조건부 노출 | 코드 인스펙션 |
| V-09 | Member 하단 도움말+설정 노출 | 코드 인스펙션 |
| V-10 | 기존 Web 테스트 전체 통과 | `pnpm test` |
| V-11 | TypeScript 에러 0건 | `pnpm typecheck` |
| V-12 | E2E 35 specs 통과 | `pnpm e2e` |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial design — F288+F289 sidebar 변경 상세 | Sinclair Seo |
