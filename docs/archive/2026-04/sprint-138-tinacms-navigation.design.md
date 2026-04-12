---
code: FX-DSGN-S138
title: "Sprint 138 — F321 TinaCMS 네비게이션 ���적 관리 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 138
f_items: [F321]
---

# FX-DSGN-S138 — TinaCMS 네비게이션 동��� 관리 Design

## §1 설계 목표

사이드바 메뉴 + 랜딩 페이지 섹션을 TinaCMS content 파일로 관리. 비개발자가 메뉴 순서/표시를 변경 가능.

## §2 기존 자산 분석

| 자산 | 위치 | 활용 |
|------|------|------|
| `sidebar.tsx` | `packages/web/src/components/sidebar.tsx` | 메뉴 하드코딩 → 동적 로딩 |
| `tina/config.ts` | `packages/web/tina/config.ts` | collection 추가 대상 |
| `content/landing/hero.md` | `packages/web/content/landing/hero.md` | 기존 TinaCMS content |
| Landing page | `packages/web/src/routes/landing.tsx` | 섹션 순서 동적화 대상 |

## §3 상세 설계

### 파일 1: tina/config.ts (수정)

navigation collection 추가 + landing에 `sort_order` 필드:

```typescript
// navigation collection 추가
{
  name: "navigation",
  label: "Navigation",
  path: "content/navigation",
  format: "json",
  fields: [
    { type: "string", name: "id", label: "ID", isTitle: true, required: true },
    {
      type: "object", name: "topItems", label: "Top Items", list: true,
      fields: [
        { type: "string", name: "href", label: "Path", required: true },
        { type: "string", name: "label", label: "Label", required: true },
        { type: "string", name: "iconKey", label: "Icon Key", required: true },
        { type: "boolean", name: "visible", label: "Visible" },
        { type: "number", name: "sortOrder", label: "Sort Order" },
      ],
    },
    {
      type: "object", name: "processGroups", label: "Process Groups", list: true,
      fields: [
        { type: "string", name: "key", label: "Key", required: true },
        { type: "string", name: "label", label: "Label", required: true },
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
    {
      type: "object", name: "bottomItems", label: "Bottom Items", list: true,
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

landing collection에 `sort_order` 추가:
```typescript
{ type: "number", name: "sort_order", label: "Sort Order" },
```

### 파일 2: content/navigation/sidebar.json (신규)

현재 하드코딩된 메뉴 구조를 JSON으로 옮김:

```json
{
  "id": "main-sidebar",
  "topItems": [
    { "href": "/getting-started", "label": "시작하기", "iconKey": "Rocket", "visible": true, "sortOrder": 0 },
    { "href": "/dashboard", "label": "홈", "iconKey": "LayoutDashboard", "visible": true, "sortOrder": 1 },
    { "href": "/team-shared", "label": "팀 공유", "iconKey": "Users", "visible": true, "sortOrder": 2 },
    { "href": "/ax-bd/demo", "label": "데모 시���리오", "iconKey": "Presentation", "visible": true, "sortOrder": 3 }
  ],
  "processGroups": [
    {
      "key": "collect", "label": "1. 수집", "sortOrder": 0, "visible": true,
      "items": [
        { "href": "/collection/sr", "label": "SR 목록", "iconKey": "ClipboardList", "visible": true, "sortOrder": 0 },
        { "href": "/collection/field", "label": "Field 수집", "iconKey": "Radio", "visible": true, "sortOrder": 1 },
        { "href": "/collection/ideas", "label": "IDEA Portal", "iconKey": "ArrowUpFromLine", "visible": true, "sortOrder": 2 },
        { "href": "/collection/agent", "label": "Agent 수집", "iconKey": "Bot", "visible": true, "sortOrder": 3 }
      ]
    },
    {
      "key": "discover", "label": "2. 발굴", "sortOrder": 1, "visible": true,
      "items": [
        { "href": "/discovery/items", "label": "Discovery", "iconKey": "Map", "visible": true, "sortOrder": 0 },
        { "href": "/discovery/ideas-bmc", "label": "아이디어·BMC", "iconKey": "Lightbulb", "visible": true, "sortOrder": 1 },
        { "href": "/discovery/dashboard", "label": "대시보드", "iconKey": "BarChart3", "visible": true, "sortOrder": 2 },
        { "href": "/discovery/report", "label": "평가 결과서", "iconKey": "ClipboardCheck", "visible": true, "sortOrder": 3 }
      ]
    }
  ],
  "bottomItems": [
    { "href": "/help", "label": "도움말", "iconKey": "HelpCircle", "visible": true, "sortOrder": 0 },
    { "href": "/tools-guide", "label": "도구 가이드", "iconKey": "PenTool", "visible": true, "sortOrder": 1 }
  ]
}
```

> 6개 processGroups 전체 포함 (위는 2개만 예시). 초기 데이터는 sidebar.tsx의 하드코딩을 그대로 옮김.

### 파일 3: src/lib/navigation-loader.ts (신규)

```typescript
import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";

// 빌드타임 import — content 파일 없으면 null
let sidebarData: SidebarConfig | null = null;
try {
  sidebarData = (await import("../../content/navigation/sidebar.json")).default;
} catch {
  sidebarData = null;
}

// Icon key → LucideIcon 매핑
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard: Icons.LayoutDashboard,
  BookOpen: Icons.BookOpen,
  // ... 기존 sidebar.tsx에서 import하는 모든 아이콘
};

export function getIcon(key: string): LucideIcon {
  return iconMap[key] ?? Icons.HelpCircle;
}

export function loadSidebarConfig(): SidebarConfig | null {
  return sidebarData;
}

export interface SidebarNavItem {
  href: string;
  label: string;
  iconKey: string;
  visible?: boolean;
  sortOrder?: number;
}

export interface SidebarNavGroup {
  key: string;
  label: string;
  sortOrder?: number;
  visible?: boolean;
  items: SidebarNavItem[];
}

export interface SidebarConfig {
  id: string;
  topItems: SidebarNavItem[];
  processGroups: SidebarNavGroup[];
  bottomItems: SidebarNavItem[];
}
```

### 파일 4: sidebar.tsx (수정)

기존 하드코딩을 **fallback**으로 유지하면서, content 파일이 있으면 동적 렌더링:

```typescript
import { loadSidebarConfig, getIcon } from "@/lib/navigation-loader";

// Content-driven navigation (빌드타임, TinaCMS 편집 → PR → 재배포)
const cmsNav = loadSidebarConfig();

// CMS 데이터가 있으면 변환, 없으면 기존 하드코딩 사용
const topItems: NavItem[] = cmsNav
  ? cmsNav.topItems
      .filter((i) => i.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((i) => ({ href: i.href, label: i.label, icon: getIcon(i.iconKey) }))
  : DEFAULT_TOP_ITEMS;  // 기존 하드코딩을 DEFAULT_*로 이름 변경

const processGroups: NavGroup[] = cmsNav
  ? cmsNav.processGroups
      .filter((g) => g.visible !== false)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((g) => ({
        key: g.key,
        label: g.label,
        icon: getIcon(g.items[0]?.iconKey ?? "HelpCircle"),
        items: g.items
          .filter((i) => i.visible !== false)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((i) => ({ href: i.href, label: i.label, icon: getIcon(i.iconKey) })),
      }))
  : DEFAULT_PROCESS_GROUPS;
```

**핵심**: 기존 하드코딩 데이터를 `DEFAULT_*` 상수로 이름 변경하여 fallback으로 보존. visibility/admin 로직은 그대로 유지.

### 파일 5: 랜딩 페이지 content 파일 (신규)

`content/landing/features.md`:
```markdown
---
title: Features
section: features
sort_order: 1
---
기능 섹션 콘텐츠
```

`content/landing/stats.md`:
```markdown
---
title: Stats
section: stats
sort_order: 2
---
```

`content/landing/cta.md`:
```markdown
---
title: CTA
section: cta
sort_order: 3
---
```

### 파일 6: landing.tsx (수정)

섹션 렌더링을 `sort_order` 기준으로 동적 정렬. hero.md + features.md + stats.md + cta.md를 sort_order ASC로 렌더링.

## §4 검증 체크리스트

- [ ] `tina/config.ts` — navigation collection 추가 + tinacms build 성공
- [ ] `content/navigation/sidebar.json` — 초기 데이터 정상
- [ ] `sidebar.tsx` — CMS 데이터 로딩 시 동적 렌더링
- [ ] `sidebar.tsx` — CMS 데이터 없을 때 기존 하드코딩 fallback
- [ ] `landing.tsx` — sort_order 기준 섹션 순서
- [ ] `/admin` — Navigation 컬렉션 편집 UI 표시
- [ ] `pnpm typecheck` — 에러 0건
- [ ] `pnpm build` — 빌드 성공
- [ ] 기존 E2E — 회귀 0건
