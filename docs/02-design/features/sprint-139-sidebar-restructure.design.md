---
code: FX-DSGN-S139
title: "Sprint 139 — F322 사이드바 구조 재설계 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 139
f_items: [F322]
plan_ref: "[[FX-PLAN-S139]]"
---

# FX-DSGN-S139 — 사이드바 구조 재설계 Design

## §1 설계 목표

FX-IA-Change-Plan-v1.3.docx 기준으로 사이드바 메뉴 구조를 재설계한다. Member 메뉴 25→12개(52% 축소), TBD 섹션 접기, Admin 7메뉴 전용 그룹. 탭 내부 구현(F323~F328)은 스코프 외.

## §2 기존 자산 분석

| 자산 | 위치 | Lines | 활용 |
|------|------|:-----:|------|
| `sidebar.tsx` | `packages/web/src/components/sidebar.tsx` | 658 | DEFAULT 상수 + NavLinks + CollapsibleGroup 재구성 |
| `navigation-loader.ts` | `packages/web/src/lib/navigation-loader.ts` | 138 | SidebarConfig 타입 확장 (collapsed/badge/adminGroups) |
| `sidebar.json` | `packages/web/content/navigation/sidebar.json` | ~200 | CMS 데이터 전면 재작성 |
| `tina/config.ts` | `packages/web/tina/config.ts` | 170 | navigation collection 스키마 확장 |
| `router.tsx` | `packages/web/src/router.tsx` | ~120 | 리다이렉트 추가 (기존 16건 + 신규) |

## §3 상세 설계

### 파일 1: `packages/web/src/lib/navigation-loader.ts` (수정)

타입 확장 + adminGroups 로딩 추가:

```typescript
// === 타입 변경 ===

export interface SidebarNavGroup {
  key: string;
  label: string;
  iconKey?: string;
  stageColor?: string;
  sortOrder?: number;
  visible?: boolean;
  collapsed?: boolean;   // NEW — 기본 접힘 상태 (수집/GTM용)
  badge?: string;         // NEW — 뱃지 텍스트 ("TBD" 등)
  items: SidebarNavItem[];
}

export interface SidebarConfig {
  navId: string;
  topItems: SidebarNavItem[];
  processGroups: SidebarNavGroup[];
  bottomItems: SidebarNavItem[];
  adminGroups?: SidebarNavGroup[];  // NEW — Admin 전용 메뉴 그룹
}
```

검증 기준:
- [x] `SidebarNavGroup`에 `collapsed: boolean`, `badge: string` 필드 추가
- [x] `SidebarConfig`에 `adminGroups?: SidebarNavGroup[]` 필드 추가
- [x] `getIcon()`에 누락 아이콘 키 추가 불필요 (기존 iconMap 커버)
- [x] typecheck 통과

### 파일 2: `packages/web/content/navigation/sidebar.json` (전면 재작성)

v1.3 기준 메뉴 구조:

```json
{
  "navId": "main-sidebar",
  "topItems": [
    { "href": "/dashboard", "label": "대시보드", "iconKey": "LayoutDashboard", "visible": true, "sortOrder": 0 },
    { "href": "/getting-started", "label": "시작하기", "iconKey": "Rocket", "visible": true, "sortOrder": 1 }
  ],
  "processGroups": [
    {
      "key": "collect",
      "label": "1. 수집",
      "iconKey": "Inbox",
      "stageColor": "bg-axis-blue",
      "sortOrder": 0,
      "visible": true,
      "collapsed": true,
      "badge": "TBD",
      "items": [
        { "href": "/collection/field", "label": "Field 수집", "iconKey": "Radio", "visible": false, "sortOrder": 0 },
        { "href": "/collection/ideas", "label": "IDEA Portal", "iconKey": "ArrowUpFromLine", "visible": false, "sortOrder": 1 },
        { "href": "/collection/screening", "label": "스크리닝", "iconKey": "ClipboardList", "visible": false, "sortOrder": 2 }
      ]
    },
    {
      "key": "discover",
      "label": "2. 발굴",
      "iconKey": "Search",
      "stageColor": "bg-axis-violet",
      "sortOrder": 1,
      "visible": true,
      "items": [
        { "href": "/discovery", "label": "발굴", "iconKey": "Map", "visible": true, "sortOrder": 0 },
        { "href": "/discovery/report", "label": "평가 결과서", "iconKey": "ClipboardCheck", "visible": true, "sortOrder": 1 }
      ]
    },
    {
      "key": "shape",
      "label": "3. 형상화",
      "iconKey": "PenTool",
      "stageColor": "bg-axis-warm",
      "sortOrder": 2,
      "visible": true,
      "items": [
        { "href": "/shaping/business-plan", "label": "사업기획서", "iconKey": "FileSignature", "visible": true, "sortOrder": 0 },
        { "href": "/shaping/offering", "label": "Offering", "iconKey": "Package", "visible": true, "sortOrder": 1 },
        { "href": "/shaping/prd", "label": "PRD", "iconKey": "FileText", "visible": true, "sortOrder": 2 },
        { "href": "/shaping/prototype", "label": "Prototype", "iconKey": "Code", "visible": true, "sortOrder": 3 }
      ]
    },
    {
      "key": "validate",
      "label": "4. 검증",
      "iconKey": "CheckCircle",
      "stageColor": "bg-axis-green",
      "sortOrder": 3,
      "visible": true,
      "items": [
        { "href": "/validation", "label": "검증", "iconKey": "CheckCircle", "visible": true, "sortOrder": 0 },
        { "href": "/validation/share", "label": "산출물 공유", "iconKey": "Users", "visible": true, "sortOrder": 1 }
      ]
    },
    {
      "key": "productize",
      "label": "5. 제품화",
      "iconKey": "Rocket",
      "stageColor": "bg-axis-indigo",
      "sortOrder": 4,
      "visible": true,
      "items": [
        { "href": "/product", "label": "제품화", "iconKey": "Target", "visible": true, "sortOrder": 0 },
        { "href": "/product/offering-pack", "label": "Offering Pack", "iconKey": "Package", "visible": true, "sortOrder": 1 }
      ]
    },
    {
      "key": "gtm",
      "label": "6. GTM",
      "iconKey": "TrendingUp",
      "stageColor": "bg-axis-rose",
      "sortOrder": 5,
      "visible": true,
      "collapsed": true,
      "badge": "TBD",
      "items": [
        { "href": "/gtm/outreach", "label": "대고객 선제안", "iconKey": "Send", "visible": false, "sortOrder": 0 },
        { "href": "/gtm/pipeline", "label": "파이프라인", "iconKey": "GitBranch", "visible": false, "sortOrder": 1 }
      ]
    }
  ],
  "bottomItems": [
    { "href": "/wiki", "label": "위키", "iconKey": "BookOpen", "visible": true, "sortOrder": 0 },
    { "href": "/settings", "label": "설정", "iconKey": "Settings", "visible": true, "sortOrder": 1 }
  ],
  "adminGroups": [
    {
      "key": "admin-manage",
      "label": "관리",
      "iconKey": "Settings",
      "sortOrder": 0,
      "visible": true,
      "items": [
        { "href": "/tokens", "label": "토큰/모델", "iconKey": "Coins", "visible": true, "sortOrder": 0 },
        { "href": "/workspace", "label": "워크스페이스", "iconKey": "FolderKanban", "visible": true, "sortOrder": 1 },
        { "href": "/agents", "label": "에이전트", "iconKey": "Bot", "visible": true, "sortOrder": 2 },
        { "href": "/architecture", "label": "아키텍처", "iconKey": "Blocks", "visible": true, "sortOrder": 3 },
        { "href": "/methodologies", "label": "방법론", "iconKey": "Library", "visible": true, "sortOrder": 4 },
        { "href": "/projects", "label": "프로젝트", "iconKey": "FolderKanban", "visible": true, "sortOrder": 5 },
        { "href": "/nps-dashboard", "label": "NPS 대시보드", "iconKey": "BarChart3", "visible": true, "sortOrder": 6 }
      ]
    }
  ]
}
```

검증 기준:
- [x] topItems 2개 (대시보드 + 시작하기)
- [x] processGroups 6개, 수집/GTM에 `collapsed: true, badge: "TBD"`
- [x] 발굴 items 2개 (발굴 + 평가 결과서)
- [x] 형상화 items 4개 (사업기획서 + Offering + PRD + Prototype)
- [x] 검증 items 2개 (검증 + 산출물 공유)
- [x] 제품화 items 2개 (제품화 + Offering Pack)
- [x] bottomItems 2개 (위키 + 설정)
- [x] adminGroups 1그룹 7개 메뉴
- [x] JSON 유효성 (파싱 에러 없음)

### 파일 3: `packages/web/src/components/sidebar.tsx` (주요 변경)

#### 3-A: DEFAULT 상수 업데이트

```typescript
// DEFAULT_TOP_ITEMS: 4→2개
const DEFAULT_TOP_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/getting-started", label: "시작하기", icon: Rocket },
];

// DEFAULT_PROCESS_GROUPS: 수집/GTM에 collapsed/badge 추가, 항목 수 변경
// (CMS sidebar.json과 동일 구조, fallback용)

// DEFAULT_MEMBER_BOTTOM_ITEMS: 3→2개
const DEFAULT_MEMBER_BOTTOM_ITEMS: NavItem[] = [
  { href: "/wiki", label: "위키", icon: BookOpen },
  { href: "/settings", label: "설정", icon: Settings },
];
```

#### 3-B: NavGroup 인터페이스 확장

```typescript
interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  stageColor?: string;
  visibility?: Visibility;
  condition?: (ctx: VisibilityContext) => boolean;
  collapsed?: boolean;   // NEW
  badge?: string;         // NEW
}
```

#### 3-C: CollapsibleGroup에 collapsed/badge 렌더링

```tsx
function CollapsibleGroup({ group, pathname, isOpen, onToggle, onSelect }: Props) {
  const hasActive = group.items.some(/* ... */);
  const isCollapsed = group.collapsed && !hasActive;

  return (
    <div data-tour={`group-${group.key}`}>
      <button type="button" onClick={onToggle} className={cn(/* ... */)}>
        {/* 기존 아이콘/라벨 */}
        {group.badge && (
          <span className="ml-auto mr-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {group.badge}
          </span>
        )}
        <ChevronRight className={cn(/* rotate */, isOpen && "rotate-90")} />
      </button>
      {isOpen && !isCollapsed && (
        <div className={cn("ml-4 flex flex-col gap-0.5 border-l pl-2", /* ... */)}>
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
          ))}
        </div>
      )}
      {isOpen && isCollapsed && (
        <div className="ml-4 px-3 py-2 text-xs text-muted-foreground">
          준비 중이에요
        </div>
      )}
    </div>
  );
}
```

#### 3-D: CMS adminGroups 로딩

```typescript
// CMS-driven Admin Groups (sidebar.json → adminGroups)
const adminGroups: NavGroup[] = cmsNav?.adminGroups
  ? cmsNav.adminGroups
      .filter((g) => g.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        key: g.key,
        label: g.label,
        icon: getIcon(g.iconKey ?? "Settings"),
        visibility: "admin" as Visibility,
        items: g.items
          .filter((i) => i.visible !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(cmsItemToNav),
      }))
  : [adminGroup]; // fallback to existing DEFAULT
```

#### 3-E: knowledgeGroup + externalGroup 제거

- `knowledgeGroup` 삭제 — 위키는 bottomItems로, 방법론은 Admin으로, 스킬카탈로그는 위키 내부로, Ontology는 Admin에 선택적
- `externalGroup` 삭제 — 사용 빈도 낮음, Admin 설정 내로 이동 가능

#### 3-F: NavLinks 렌더 구조 변경

```tsx
function NavLinks({ onSelect }: { onSelect?: () => void }) {
  // ... 기존 hooks

  return (
    <nav className="flex flex-col gap-0.5">
      {/* 상단: 대시보드 + 시작하기 */}
      {filteredTopItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      <div className="my-2 border-t border-border/40" />

      {/* 프로세스 6단계 (collapsed/badge 지원) */}
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

      {/* 하단 고정: 위키 + 설정 (Member + Admin 공통) */}
      {memberBottomItems.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} onSelect={onSelect} />
      ))}

      {/* Admin 전용 관리 그룹 */}
      {isAdmin && (
        <>
          <div className="my-2 border-t border-border/40" />
          {adminGroups.map((group) => (
            <CollapsibleGroup
              key={group.key}
              group={group}
              pathname={pathname}
              isOpen={openGroups.has(group.key)}
              onToggle={() => toggle(group.key)}
              onSelect={onSelect}
            />
          ))}
        </>
      )}
    </nav>
  );
}
```

#### 3-G: useGroupState 초기값 변경

```typescript
// 수집/GTM은 기본 접힘
const DEFAULT_OPEN = new Set(["discover", "shape", "validate", "productize"]);
// "collect", "gtm" 제외 (collapsed 그룹)
```

검증 기준:
- [x] DEFAULT_TOP_ITEMS 2개
- [x] DEFAULT_PROCESS_GROUPS 수집/GTM에 collapsed+badge
- [x] DEFAULT_MEMBER_BOTTOM_ITEMS 2개 (위키+설정)
- [x] knowledgeGroup 제거
- [x] externalGroup 제거
- [x] adminGroup을 CMS adminGroups로 전환
- [x] CollapsibleGroup에 badge 렌더링
- [x] collapsed 상태에서 "준비 중이에요" 메시지
- [x] useGroupState 초기값에서 collect/gtm 제외
- [x] typecheck 통과

### 파일 4: `packages/web/tina/config.ts` (수정)

navigation collection processGroups 스키마에 필드 추가:

```typescript
// processGroups.items 수준이 아닌, processGroups 그룹 수준에 추가
{
  type: "boolean",
  name: "collapsed",
  label: "Default Collapsed",
},
{
  type: "string",
  name: "badge",
  label: "Badge Text",
},
```

adminGroups 필드 추가:

```typescript
{
  type: "object",
  name: "adminGroups",
  label: "Admin Groups",
  list: true,
  fields: [
    { type: "string", name: "key", label: "Key", required: true },
    { type: "string", name: "label", label: "Label", required: true },
    { type: "string", name: "iconKey", label: "Icon Key" },
    { type: "number", name: "sortOrder", label: "Sort Order" },
    { type: "boolean", name: "visible", label: "Visible" },
    {
      type: "object", name: "items", label: "Items", list: true,
      fields: [
        { type: "string", name: "href", label: "Path", required: true },
        { type: "string", name: "label", label: "Label", required: true },
        { type: "string", name: "iconKey", label: "Icon Key", required: true },
        { type: "boolean", name: "visible", label: "Visible" },
        { type: "number", name: "sortOrder", label: "Sort Order" },
      ],
    },
  ],
},
```

검증 기준:
- [x] processGroups 그룹에 `collapsed` boolean + `badge` string 필드 추가
- [x] `adminGroups` 최상위 필드 추가 (processGroups와 동일 구조)
- [x] TinaCMS admin(/admin) 페이지에서 sidebar.json 편집 가능

### 파일 5: `packages/web/src/router.tsx` (수정)

#### 새 라우트 추가

```typescript
// ── 2단계 발굴 (v1.3 통합) ──
{ path: "discovery", lazy: () => import("@/routes/ax-bd/discover-dashboard") },
// ↑ /discovery → 발굴 대시보드 (기본 랜딩). F324에서 탭 UI로 전환 예정

// ── 4단계 검증 (v1.3 통합) ──
{ path: "validation", lazy: () => import("@/routes/validation-division") },
// ↑ /validation → 기존 본부 검증 페이지를 임시 랜딩. F326에서 탭 UI로 전환 예정

// ── 5단계 제품화 (v1.3 통합) ──
{ path: "product", lazy: () => import("@/routes/mvp-tracking") },
// ↑ /product → 기존 MVP 추적 페이지를 임시 랜딩. F327에서 탭 UI로 전환 예정

// ── 형상화 신규 경로 ──
{ path: "shaping/business-plan", lazy: () => import("@/routes/ax-bd/index") },
// ↑ 사업기획서 = 기존 사업제안서 페이지

// ── 검증 산출물 공유 ──
{ path: "validation/share", lazy: () => import("@/routes/team-shared") },
// ↑ 팀 공유 페이지를 산출물 공유로 재활용

// ── 제품화 Offering Pack ──
{ path: "product/offering-pack", lazy: () => import("@/routes/offering-packs") },
// ↑ 형상화에서 이동

// ── NPS 대시보드 ──
{ path: "nps-dashboard", lazy: () => import("@/routes/nps-dashboard") },

// ── 설정 (공통) ──
{ path: "settings", lazy: () => import("@/routes/settings-jira") },
```

#### 신규 리다이렉트 (기존 16건 아래에 추가)

```typescript
// ── Phase 13 Redirects (v1.3 IA 재설계) ──
{ path: "team-shared", element: <Navigate to="/validation/share" replace /> },
{ path: "ax-bd/demo", element: <Navigate to="/getting-started" replace /> },
{ path: "discovery/items", element: <Navigate to="/discovery" replace /> },
{ path: "discovery/ideas-bmc", element: <Navigate to="/discovery" replace /> },
{ path: "discovery/dashboard", element: <Navigate to="/discovery" replace /> },
{ path: "shaping/proposal", element: <Navigate to="/shaping/business-plan" replace /> },
{ path: "shaping/review", element: <Navigate to="/dashboard" replace /> },
{ path: "validation/pipeline", element: <Navigate to="/validation" replace /> },
{ path: "product/mvp", element: <Navigate to="/product" replace /> },
{ path: "product/poc", element: <Navigate to="/product" replace /> },
{ path: "tools-guide", element: <Navigate to="/getting-started" replace /> },
{ path: "analytics", element: <Navigate to="/nps-dashboard" replace /> },
{ path: "settings/jira", element: <Navigate to="/settings" replace /> },
```

**주의 — 기존 리다이렉트 충돌 해소:**
- `discovery` path (line 116) 현재: `→ /external/discovery-x` → **제거** (F322에서 `/discovery`를 실제 라우트로 등록)
- `projects` path (line 115) 현재: `→ /gtm/projects` → **유지** (GTM은 TBD지만 라우트는 보존)

검증 기준:
- [x] `/discovery` → 발굴 대시보드 (기존 redirect 제거, 실제 라우트로 전환)
- [x] `/validation` → 검증 임시 랜딩
- [x] `/product` → 제품화 임시 랜딩
- [x] `/shaping/business-plan` → 사업기획서 (기존 사업제안서)
- [x] `/validation/share` → 산출물 공유 (기존 팀 공유)
- [x] `/product/offering-pack` → Offering Pack (기존 shaping/offering)
- [x] 신규 리다이렉트 13건 추가
- [x] 기존 `discovery` redirect 제거 (충돌 해소)
- [x] 기존 라우트 path와 리다이렉트 path 중복 없음

### 파일 6: 기존 라우트 보존

기존 라우트는 **삭제하지 않고 유지**한다. 리다이렉트가 기존 경로를 새 경로로 안내하므로, 기존 페이지 컴포넌트(.tsx 파일)는 그대로 유지. 탭 UI 전환은 F324~F327에서 기존 컴포넌트를 래핑하는 방식으로 진행.

**주의**: `shaping/offering`의 하위 경로들 (`/givc-pitch`, `/:id`, `/:id/brief`)은 `product/offering-pack` 하위로 이동해야 하지만, F322에서는 리다이렉트만 추가하고 기존 라우트도 유지.

```typescript
// 기존 유지 (삭제 안 함)
{ path: "shaping/offering", lazy: () => import("@/routes/offering-packs") },
{ path: "shaping/offering/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
{ path: "shaping/offering/:id", lazy: () => import("@/routes/offering-pack-detail") },
{ path: "shaping/offering/:id/brief", lazy: () => import("@/routes/offering-brief") },

// 신규 추가 (같은 컴포넌트, 새 경로)
{ path: "product/offering-pack", lazy: () => import("@/routes/offering-packs") },
{ path: "product/offering-pack/givc-pitch", lazy: () => import("@/routes/offering-pack-givc-pitch") },
{ path: "product/offering-pack/:id", lazy: () => import("@/routes/offering-pack-detail") },
{ path: "product/offering-pack/:id/brief", lazy: () => import("@/routes/offering-brief") },
```

검증 기준:
- [x] 기존 `/shaping/offering/*` 4개 라우트 유지
- [x] 신규 `/product/offering-pack/*` 4개 라우트 추가 (같은 컴포넌트)
- [x] 기존 URL 접근 시 정상 동작 (삭제 안 했으므로)

## §4 구현 순서 (Sprint Worktree용)

| 단계 | 작업 | 파일 | 예상 |
|:----:|------|------|:----:|
| 1 | navigation-loader.ts 타입 확장 | `src/lib/navigation-loader.ts` | 15m |
| 2 | sidebar.json 전면 재작성 | `content/navigation/sidebar.json` | 30m |
| 3 | sidebar.tsx DEFAULT 상수 + NavGroup 인터페이스 | `src/components/sidebar.tsx` | 30m |
| 4 | sidebar.tsx CollapsibleGroup badge/collapsed 렌더링 | `src/components/sidebar.tsx` | 30m |
| 5 | sidebar.tsx NavLinks 구조 변경 (knowledge/external 제거, admin CMS 전환) | `src/components/sidebar.tsx` | 45m |
| 6 | router.tsx 신규 라우트 + 리다이렉트 + 충돌 해소 | `src/router.tsx` | 45m |
| 7 | tina/config.ts 스키마 확장 | `tina/config.ts` | 20m |
| 8 | typecheck + build | — | 30m |
| 9 | E2E 수정 (사이드바 관련 selector 갱신) | `e2e/` | 60m |
| | **합계** | | **~5h** |

## §5 E2E 영향 분석

### 변경 예상 E2E 파일

사이드바 메뉴 href가 변경되므로, `data-tour` 속성이나 URL 기반 네비게이션 테스트가 영향을 받는다.

| E2E 파일 | 영향 | 대응 |
|----------|------|------|
| `sidebar-navigation.spec.ts` | 메뉴 수/라벨 변경 | 새 구조에 맞게 수정 |
| `discovery-*.spec.ts` | `/discovery/items` → `/discovery` | URL 변경 |
| `shaping-*.spec.ts` | `/shaping/proposal` → `/shaping/business-plan` | URL 변경 |
| `validation-*.spec.ts` | `/validation/pipeline` → `/validation` | URL 변경 |
| `product-*.spec.ts` | `/product/mvp` → `/product` | URL 변경 |
| 기타 | 리다이렉트로 기존 URL 동작 → E2E는 리다이렉트 follow하므로 대부분 통과 | 최소 수정 |

### E2E Skip 사유 (코드로 해결 불가)

| 항목 | 사유 | 해소 시점 |
|------|------|-----------|
| 발굴 탭 내부 네비게이션 | F324 미구현 — 탭 UI 없음 | Sprint 140~141 |
| 검증 탭 전환 | F326 미구현 | Sprint 142~143 |
| 제품화 탭 전환 | F327 미구현 | Sprint 144 |

## §6 수정 허용 파일 목록

Sprint WT에서 수정 가능한 파일:

```
packages/web/src/lib/navigation-loader.ts
packages/web/content/navigation/sidebar.json
packages/web/src/components/sidebar.tsx
packages/web/src/router.tsx
packages/web/tina/config.ts
packages/web/e2e/**/*.spec.ts
packages/web/e2e/fixtures/mock-factory.ts
```

**수정 금지**: SPEC.md, MEMORY.md, CLAUDE.md, CHANGELOG.md, packages/api/**, packages/cli/**

## §7 검증 매트릭스

| # | 검증 항목 | 기준 | 방법 |
|:-:|----------|------|------|
| V1 | Member topItems | 2개 (대시보드 + 시작하기) | sidebar 렌더 확인 |
| V2 | 프로세스 그룹 총 메뉴 수 | 12개 이하 (Member 기준) | count visible items |
| V3 | 수집 그룹 | collapsed + TBD 뱃지 | visual 확인 |
| V4 | GTM 그룹 | collapsed + TBD 뱃지 | visual 확인 |
| V5 | Admin 관리 메뉴 | 7개 | Admin 로그인 후 확인 |
| V6 | 하단 고정 | 위키 + 설정 (Member/Admin 공통) | 렌더 확인 |
| V7 | 기존 URL 리다이렉트 | 13건 + 기존 16건 모두 동작 | E2E 또는 수동 |
| V8 | `/discovery` 충돌 해소 | 발굴 대시보드 로딩 (external/discovery-x가 아님) | 수동 확인 |
| V9 | typecheck | 0 errors | `pnpm typecheck` |
| V10 | build | 성공 | `pnpm build` |
| V11 | E2E | 기존 pass 유지 (수정 포함) | `pnpm e2e` |
| V12 | CMS 편집 | /admin에서 sidebar.json 수정 가능 | TinaCloud 확인 |
