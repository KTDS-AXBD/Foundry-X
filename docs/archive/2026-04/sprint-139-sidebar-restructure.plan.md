---
code: FX-PLAN-S139
title: "Sprint 139 — F322 사이드바 구조 재설계"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 139
f_items: [F322]
---

# FX-PLAN-S139 — 사이드바 구조 재설계

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F322 사이드바 구조 재설계 (FX-REQ-314, P0) |
| Sprint | 139 |
| 우선순위 | P0 (Phase 13 전체 기반) |
| 예상 소요 | ~8h |
| 변경 패키지 | web (sidebar + navigation-loader + routes + content) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | Member 메뉴 25개로 탐색 비용 높음. 프로세스 안내 성격 메뉴와 액션 메뉴 혼재. Admin 메뉴가 불충분 |
| **Solution** | 액션 중심 메뉴 재설계 — 25→12개(52% 축소) + TBD 섹션 접기 + Admin 7메뉴 전용 그룹 |
| **Function UX Effect** | 사이드바 스크롤 감소, 핵심 액션까지 클릭 수 줄어듦, Admin은 전용 관리 영역 확보 |
| **Core Value** | BD 팀원이 "지금 해야 할 일"에 즉시 접근 가능한 액션 중심 IA |

## §1 목표

FX-IA-Change-Plan-v1.3.docx §3 최종 사이드바 레이아웃을 기준으로 sidebar.tsx + sidebar.json을 재구성한다. 이 Sprint은 **메뉴 구조만** 변경하며, 각 메뉴 내부의 탭 구현(F323~F328)은 후속 Sprint에서 진행한다.

### 스코프 내
- sidebar.json(CMS) + sidebar.tsx(DEFAULT fallback) 메뉴 구조 변경
- 수집(1단계) / GTM(6단계) collapsed + TBD 뱃지
- Admin 전용 관리 그룹 7메뉴 재구성
- 하단 고정 영역(위키 + 도움말 챗 + 설정)
- 상단 영역(대시보드 + 시작하기)
- 불필요 메뉴 제거/흡수 (팀 공유→산출물 공유, 데모→시작하기, 스킬카탈로그→위키)
- 기존 라우트 리다이렉트 (이동된 메뉴 href 변경 시)

### 스코프 외 (후속 Sprint)
- F323: 대시보드 ToDo List + 업무 가이드 (내부 콘텐츠)
- F324: 발굴 메뉴 내 탭 구현 (대시보드/프로세스/BMC)
- F325: 형상화 버전관리 패턴
- F326: 검증 탭 구현
- F327: 제품화 탭 구현
- F328: 시작하기 통합 콘텐츠

## §2 현재 → 목표 매핑

### 상단 영역

| 현재 (4개) | 목표 (2개) | 변경 |
|-----------|-----------|------|
| 시작하기 (조건부) | **시작하기** | 유지 — F328에서 내부 콘텐츠 통합 (온보딩+스킬가이드+Cowork+데모+도구가이드) |
| 홈 → /dashboard | **대시보드** → /dashboard | 라벨 "홈"→"대시보드" 변경 |
| 팀 공유 → /team-shared | ❌ 제거 | 산출물 공유(F326)에 흡수 |
| 데모 시나리오 → /ax-bd/demo | ❌ 제거 | 시작하기(F328)에 통합 |

### 프로세스 6단계

| 현재 | 목표 | 변경 |
|------|------|------|
| **1. 수집** (4 sub menus) | **1. 수집** — collapsed, TBD 뱃지 | items 유지하되 기본 접힘 + TBD 표시. visible 속성으로 items 숨김 |
| **2. 발굴** (4 sub menus: Discovery, 아이디어·BMC, 대시보드, 평가 결과서) | **발굴** (메인 메뉴, 탭 없이 라우팅) + **평가 결과서** (독립 메뉴) | sub menus 4→2로 축소. 발굴 클릭 시 /discovery (대시보드 탭 랜딩). 내부 탭은 F324에서 구현 |
| **3. 형상화** (5 sub menus: PRD, 사업제안서, 형상화 리뷰, Prototype, Offering Pack) | **사업기획서** + **Offering** + **PRD** + **Prototype** (4 독립 메뉴) | 형상화 리뷰 제거(대시보드 ToDo로), Offering Pack→5단계. 사업제안서→사업기획서 리네임 |
| **4. 검증/공유** (4 sub menus: 파이프라인, 본부 검증, 전사 검증, 미팅 관리) | **검증** (메인 메뉴, 탭 내부) + **산출물 공유** (독립 메뉴) | sub menus 4→2로 축소. 검증 클릭 시 /validation (인터뷰·미팅 탭 랜딩). 탭은 F326에서 |
| **5. 제품화** (2 sub menus: MVP 추적, PoC 관리) | **제품화** (메인 메뉴, 탭 내부) + **Offering Pack** (독립 메뉴) | sub menus 2→2. 제품화 클릭 시 /product (MVP 탭 랜딩). 탭은 F327에서. Offering Pack은 형상화에서 이동 |
| **6. GTM** (2 sub menus: 프로젝트 현황, 선제안) | **6. GTM** — collapsed, TBD 뱃지 | 수집과 동일하게 접기 + TBD |

### 하단 고정 영역

| 현재 (3개 — Member만) | 목표 (3개) | 변경 |
|-----------|-----------|------|
| 도구 가이드 → /tools-guide | ❌ 제거 | 시작하기(F328)에 통합 |
| 도움말 → /getting-started | **도움말 챗** (Help Agent 위젯) | 기존 페이지 링크 → 글로벌 위젯 (이미 존재) |
| 설정 → /settings/jira | **설정** → /settings | 유지 |
| (없음) | **위키** → /wiki | 하단으로 이동 (+ 스킬 카탈로그 흡수) |

### Admin 전용 관리 그룹

| 현재 (admin 그룹 7개) | 목표 (7개 재구성) | 변경 |
|-----------|-----------|------|
| Analytics | **NPS 대시보드** → /nps-dashboard | 리네임 + 확장 |
| 에이전트 | **에이전트** → /agents | 유지 |
| 토큰 비용 | **토큰/모델** → /tokens | 유지 (모델 품질 대시보드 + 히트맵 확장은 후속) |
| 아키텍처 | **아키텍처** → /architecture | 유지 |
| 내 작업 | **워크스페이스** → /workspace | 리네임 (MCP 서버 설정 포함) |
| 설정 | ❌ 제거 (하단 설정으로 통합) | Admin도 하단 설정 사용 |
| 백업 관리 | ❌ 제거 | 설정 내 서브메뉴로 이동 (후속) |
| (없음) | **방법론** → /methodologies | 지식 그룹에서 이동 |
| (없음) | **프로젝트** → /projects | 신규 추가 |

## §3 구현 순서

| 단계 | 파일 | 작업 | 영향 |
|:----:|------|------|------|
| 1 | `content/navigation/sidebar.json` | v1.3 기준 메뉴 구조 전면 재작성 | CMS 데이터 소스 |
| 2 | `src/lib/navigation-loader.ts` | `SidebarNavGroup`에 `collapsed`, `badge` 필드 추가 | 타입 확장 |
| 3 | `src/components/sidebar.tsx` | DEFAULT 상수 v1.3 동기화 + collapsed/TBD 렌더링 로직 | UI 전면 변경 |
| 4 | `src/components/sidebar.tsx` | Admin 그룹 7메뉴 재구성 + 지식/외부 그룹 제거 | Admin 영역 |
| 5 | `src/components/sidebar.tsx` | 하단 영역: 위키+도움말+설정 (Member/Admin 공통) | 하단 고정 |
| 6 | 라우트 파일 | 리다이렉트 추가 (이동된 href: /team-shared, /ax-bd/demo 등) | 기존 URL 보호 |
| 7 | `tina/config.ts` | navigation collection 스키마에 `collapsed`, `badge` 필드 추가 | CMS 편집 지원 |
| 8 | 전체 검증 | typecheck + build + E2E (사이드바 관련 E2E 테스트) | 품질 게이트 |

## §4 sidebar.json 목표 구조

```json
{
  "navId": "main-sidebar",
  "topItems": [
    { "href": "/dashboard", "label": "대시보드", "iconKey": "LayoutDashboard", "sortOrder": 0 },
    { "href": "/getting-started", "label": "시작하기", "iconKey": "Rocket", "sortOrder": 1 }
  ],
  "processGroups": [
    {
      "key": "collect", "label": "1. 수집", "iconKey": "Inbox",
      "stageColor": "bg-axis-blue", "sortOrder": 0,
      "collapsed": true, "badge": "TBD",
      "items": [
        { "href": "/collection/field", "label": "Field 수집", "iconKey": "Radio", "visible": false },
        { "href": "/collection/ideas", "label": "IDEA Portal", "iconKey": "ArrowUpFromLine", "visible": false },
        { "href": "/collection/screening", "label": "스크리닝", "iconKey": "ClipboardList", "visible": false }
      ]
    },
    {
      "key": "discover", "label": "2. 발굴", "iconKey": "Search",
      "stageColor": "bg-axis-violet", "sortOrder": 1,
      "items": [
        { "href": "/discovery", "label": "발굴", "iconKey": "Map", "sortOrder": 0 },
        { "href": "/discovery/report", "label": "평가 결과서", "iconKey": "ClipboardCheck", "sortOrder": 1 }
      ]
    },
    {
      "key": "shape", "label": "3. 형상화", "iconKey": "PenTool",
      "stageColor": "bg-axis-warm", "sortOrder": 2,
      "items": [
        { "href": "/shaping/business-plan", "label": "사업기획서", "iconKey": "FileSignature", "sortOrder": 0 },
        { "href": "/shaping/offering", "label": "Offering", "iconKey": "Package", "sortOrder": 1 },
        { "href": "/shaping/prd", "label": "PRD", "iconKey": "FileText", "sortOrder": 2 },
        { "href": "/shaping/prototype", "label": "Prototype", "iconKey": "Code", "sortOrder": 3 }
      ]
    },
    {
      "key": "validate", "label": "4. 검증", "iconKey": "CheckCircle",
      "stageColor": "bg-axis-green", "sortOrder": 3,
      "items": [
        { "href": "/validation", "label": "검증", "iconKey": "CheckCircle", "sortOrder": 0 },
        { "href": "/validation/share", "label": "산출물 공유", "iconKey": "Users", "sortOrder": 1 }
      ]
    },
    {
      "key": "productize", "label": "5. 제품화", "iconKey": "Rocket",
      "stageColor": "bg-axis-indigo", "sortOrder": 4,
      "items": [
        { "href": "/product", "label": "제품화", "iconKey": "Target", "sortOrder": 0 },
        { "href": "/product/offering-pack", "label": "Offering Pack", "iconKey": "Package", "sortOrder": 1 }
      ]
    },
    {
      "key": "gtm", "label": "6. GTM", "iconKey": "TrendingUp",
      "stageColor": "bg-axis-rose", "sortOrder": 5,
      "collapsed": true, "badge": "TBD",
      "items": [
        { "href": "/gtm/outreach", "label": "대고객 선제안", "iconKey": "Send", "visible": false },
        { "href": "/gtm/pipeline", "label": "파이프라인", "iconKey": "GitBranch", "visible": false }
      ]
    }
  ],
  "bottomItems": [
    { "href": "/wiki", "label": "위키", "iconKey": "BookOpen", "sortOrder": 0 },
    { "href": "/settings", "label": "설정", "iconKey": "Settings", "sortOrder": 1 }
  ],
  "adminGroups": [
    {
      "key": "admin", "label": "관리", "iconKey": "Settings",
      "items": [
        { "href": "/tokens", "label": "토큰/모델", "iconKey": "Coins", "sortOrder": 0 },
        { "href": "/workspace", "label": "워크스페이스", "iconKey": "FolderKanban", "sortOrder": 1 },
        { "href": "/agents", "label": "에이전트", "iconKey": "Bot", "sortOrder": 2 },
        { "href": "/architecture", "label": "아키텍처", "iconKey": "Blocks", "sortOrder": 3 },
        { "href": "/methodologies", "label": "방법론", "iconKey": "Library", "sortOrder": 4 },
        { "href": "/projects", "label": "프로젝트", "iconKey": "FolderKanban", "sortOrder": 5 },
        { "href": "/nps-dashboard", "label": "NPS 대시보드", "iconKey": "BarChart3", "sortOrder": 6 }
      ]
    }
  ]
}
```

## §5 타입 변경

### navigation-loader.ts 확장

```typescript
export interface SidebarNavGroup {
  key: string;
  label: string;
  iconKey?: string;
  stageColor?: string;
  sortOrder?: number;
  visible?: boolean;
  collapsed?: boolean;    // NEW: 기본 접힘 상태
  badge?: string;          // NEW: TBD 등 뱃지 텍스트
  items: SidebarNavItem[];
}

export interface SidebarConfig {
  navId: string;
  topItems: SidebarNavItem[];
  processGroups: SidebarNavGroup[];
  bottomItems: SidebarNavItem[];
  adminGroups?: SidebarNavGroup[];  // NEW: Admin 전용 그룹
}
```

## §6 라우트 리다이렉트

기존 URL을 보호하기 위한 리다이렉트 (React Router `Navigate` 컴포넌트):

| 기존 경로 | 새 경로 | 사유 |
|-----------|---------|------|
| `/team-shared` | `/validation/share` | 산출물 공유에 흡수 |
| `/ax-bd/demo` | `/getting-started` | 시작하기에 통합 |
| `/discovery/items` | `/discovery` | 발굴 메인으로 통합 |
| `/discovery/ideas-bmc` | `/discovery?tab=bmc` | 발굴 BMC 탭 (F324에서 구현) |
| `/discovery/dashboard` | `/discovery` | 발굴 대시보드 기본 랜딩 |
| `/shaping/proposal` | `/shaping/business-plan` | 사업제안서→사업기획서 리네임 |
| `/shaping/review` | `/dashboard` | 대시보드 ToDo로 이동 |
| `/shaping/offering` | `/product/offering-pack` | 5단계로 이동 |
| `/validation/pipeline` | `/validation` | 검증 메인으로 통합 |
| `/validation/division` | `/validation?tab=division` | 검증 본부 탭 (F326에서 구현) |
| `/validation/company` | `/validation?tab=company` | 검증 전사 탭 |
| `/validation/meetings` | `/validation?tab=meetings` | 검증 인터뷰·미팅 탭 |
| `/product/mvp` | `/product?tab=mvp` | 제품화 MVP 탭 (F327에서 구현) |
| `/product/poc` | `/product?tab=poc` | 제품화 PoC 탭 |
| `/tools-guide` | `/getting-started` | 시작하기에 통합 |
| `/analytics` | `/nps-dashboard` | 리네임 |

## §7 리스크

| 리스크 | 확률 | 완화 |
|--------|:----:|------|
| E2E 테스트 대량 실패 — 사이드바 메뉴 변경으로 기존 E2E selector 깨짐 | 높음 | 리다이렉트로 기존 URL 보호 + data-tour 속성 유지 + E2E 수정 범위 사전 파악 |
| CMS sidebar.json 구조 변경 후 TinaCMS admin 편집 불가 | 중간 | tina/config.ts navigation collection 스키마 동기화 필수 |
| 기존 북마크/딥링크 깨짐 | 중간 | §6 리다이렉트로 전부 커버 |
| collapsed 그룹의 UX — TBD 뱃지가 사용자에게 혼란 | 낮음 | "준비 중" 툴팁 + 접기 상태에서도 클릭 가능하되 빈 콘텐츠 안내 |
| 후속 Sprint(F323~F328) 탭 미구현 상태에서 메뉴 클릭 시 빈 페이지 | 높음 | 각 메뉴 페이지에 "Coming Soon" placeholder 또는 기존 페이지 유지 + 탭 UI만 비활성 |

## §8 의존성

| 항목 | 상태 | 비고 |
|------|:----:|------|
| F321 TinaCMS 네비게이션 | ✅ 완료 | sidebar.json + navigation-loader.ts 인프라 활용 |
| F288~F299 Phase 11 IA | ✅ 완료 | 현재 사이드바 구조의 기반 |
| sidebar.tsx 현재 구조 | ✅ 파악 완료 | 658 lines, CMS fallback 패턴 |

## §9 검증 기준

| 항목 | 기준 |
|------|------|
| Member 메뉴 수 | 12개 이하 (현재 25개 기준) |
| Admin 관리 메뉴 | 7개 (토큰/모델, 워크스페이스, 에이전트, 아키텍처, 방법론, 프로젝트, NPS) |
| 수집/GTM | collapsed + TBD 뱃지 표시 |
| 기존 URL | §6 리다이렉트 전부 동작 |
| typecheck | 0 errors |
| build | 성공 |
| E2E | 기존 테스트 pass (수정 포함) |
