---
code: FX-DSGN-S169
title: "Sprint 169 Design — Offerings 목록 + 생성 위자드"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S169]], [[FX-SPEC-001]]"
---

# Sprint 169 Design: Offerings 목록 + 생성 위자드

## 1. Overview

Sprint 167~168에서 구축한 Offerings CRUD API + Export + Validate 위에 Web UI를 추가한다:
- **F374** — Offerings 목록 페이지: 상태 필터, 카드 그리드, 버전 배지, 삭제
- **F375** — Offering 생성 위자드: 3단계 (발굴 연결 → 기본 정보 → 목차 선택)

기존 패턴: `offering-packs.tsx`(카드 그리드 + 상태 필터 + 모달 생성) 참고하되, 생성은 별도 위자드 페이지로 분리.

## 2. 라우트 설계

### 2-1. 신규 라우트

| 경로 | 파일 | 설명 |
|------|------|------|
| `/shaping/offerings` | `routes/offerings-list.tsx` | Offerings 목록 (F374) |
| `/shaping/offerings/new` | `routes/offering-create-wizard.tsx` | 생성 위자드 (F375) |

### 2-2. router.tsx 변경

```typescript
// ── 3단계 형상화 (shaping) ── 기존 offering 아래에 추가
{ path: "shaping/offerings", lazy: () => import("@/routes/offerings-list") },
{ path: "shaping/offerings/new", lazy: () => import("@/routes/offering-create-wizard") },
```

> 주의: `shaping/offerings/new`를 `shaping/offerings/:id`보다 **먼저** 선언해야 "new"가 `:id`로 매칭되지 않음.

### 2-3. 사이드바 변경

`components/sidebar.tsx` shape 섹션에 항목 추가:
```typescript
items: [
  { href: "/shaping/business-plan", label: "사업기획서", icon: FileSignature },
  { href: "/shaping/offerings", label: "Offerings", icon: FileOutput },  // 신규
  { href: "/shaping/offering", label: "Offering Pack", icon: Package },  // 라벨 변경
  { href: "/shaping/prd", label: "PRD", icon: FileText },
  { href: "/shaping/prototype", label: "Prototype", icon: Code },
],
```

## 3. F374: Offerings 목록 페이지

### 3-1. API 연동

**기존 API** (Sprint 167 F370):
```
GET /api/offerings?status={status}&page={page}&limit={limit}
→ { items: Offering[], total: number, page: number, limit: number }
```

**api-client.ts 추가 함수**:
```typescript
export interface OfferingListItem {
  id: string;
  orgId: string;
  bizItemId: string | null;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  status: "draft" | "generating" | "review" | "approved" | "shared";
  currentVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchOfferings(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: OfferingListItem[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return fetchApi(`/offerings${qs ? `?${qs}` : ""}`);
}

export async function deleteOffering(id: string): Promise<void> {
  await fetchApi(`/offerings/${id}`, { method: "DELETE" });
}

export async function createOffering(data: {
  bizItemId?: string;
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
}): Promise<OfferingListItem> {
  return postApi("/offerings", data);
}
```

### 3-2. 컴포넌트 구조 — offerings-list.tsx

```
OfferingsListPage
├── Header (제목 + "새로 만들기" 버튼 → /shaping/offerings/new)
├── StatusFilterTabs (all | draft | generating | review | approved | shared)
├── OfferingCardGrid
│   ├── OfferingCard × N (인라인 컴포넌트)
│   │   ├── 상태 배지 (STATUS_COLORS 맵)
│   │   ├── 목적 태그 (PURPOSE_LABELS: report→보고용, proposal→제안용, review→검토용)
│   │   ├── 포맷 아이콘 (html/pptx)
│   │   ├── 버전 배지 (v{currentVersion})
│   │   ├── 생성일
│   │   └── 삭제 버튼 (확인 다이얼로그)
│   └── EmptyState (첫 기획서 만들기 CTA)
└── SkeletonGrid (로딩 중)
```

### 3-3. 상태/레이블 매핑

```typescript
const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  generating: "생성중",
  review: "검토중",
  approved: "승인",
  shared: "공유됨",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  generating: "bg-purple-100 text-purple-700",
  review: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  shared: "bg-blue-100 text-blue-700",
};

const PURPOSE_LABELS: Record<string, string> = {
  report: "보고용",
  proposal: "제안용",
  review: "검토용",
};

const FORMAT_LABELS: Record<string, string> = {
  html: "HTML",
  pptx: "PPTX",
};
```

### 3-4. 삭제 플로우

1. 카드 우측 상단 삭제 아이콘 클릭
2. `window.confirm("정말 삭제할까요?")` 확인
3. `DELETE /api/offerings/:id` 호출
4. 목록 새로고침

## 4. F375: Offering 생성 위자드

### 4-1. 위자드 구조 — offering-create-wizard.tsx

3단계 위자드, 단일 파일 내 구현 (별도 컴포넌트 분리 불필요):

```
OfferingCreateWizard
├── StepIndicator (1→2→3 진행 표시)
├── Step 1: SelectBizItem
│   ├── BizItem 검색/목록 (GET /biz-items)
│   ├── 선택된 아이템 하이라이트
│   └── "건너뛰기" 옵션 (bizItemId 없이 생성 가능)
├── Step 2: BasicInfo
│   ├── 제목 (text input, 필수)
│   ├── 목적 (radio: report/proposal/review)
│   └── 포맷 (radio: html/pptx)
├── Step 3: SectionSelect
│   ├── 21개 표준 섹션 체크리스트
│   ├── 필수 섹션은 checked + disabled
│   ├── 선택 섹션은 토글 가능
│   └── "전체 선택/해제" 토글
├── NavigationButtons (이전/다음/완료)
└── 완료 → POST /offerings → navigate(/shaping/offering/:id/edit)
```

### 4-2. 위자드 상태 관리

```typescript
interface WizardState {
  step: 1 | 2 | 3;
  bizItemId: string | null;
  bizItemTitle: string | null;  // 선택된 아이템 표시용
  title: string;
  purpose: "report" | "proposal" | "review";
  format: "html" | "pptx";
  excludedSections: Set<string>;  // 제외할 optional section key 목록
}

// 초기값
const initialState: WizardState = {
  step: 1,
  bizItemId: null,
  bizItemTitle: null,
  title: "",
  purpose: "report",
  format: "html",
  excludedSections: new Set(),  // 기본: 전체 포함 (빈 Set = 모두 선택)
};
```

### 4-3. Step 1 — 발굴 아이템 선택

**API**: `GET /api/biz-items` (기존 API)

```typescript
interface BizItemSimple {
  id: string;
  title: string;
  type: string;
  status: string;
}
```

- 아이템 카드 목록 표시 (title + type + status)
- 클릭으로 선택, 다시 클릭으로 해제
- "발굴 아이템 없이 진행" 건너뛰기 링크

### 4-4. Step 2 — 기본 정보

- **제목**: 필수, 미입력 시 "다음" 비활성화
- **목적**: 라디오 3개 (보고용/제안용/검토용), 기본값 "보고용"
- **포맷**: 라디오 2개 (HTML/PPTX), 기본값 "HTML"
- BizItem 선택 시 제목을 `"{bizItemTitle} 사업기획서"` 로 자동 프리필

### 4-5. Step 3 — 섹션 목차 선택

- 22개 `STANDARD_SECTIONS` 표시 (key 대신 한국어 title 사용)
- `isRequired === true`인 섹션: checked + disabled (해제 불가)
- `isRequired === false`인 섹션: 토글 가능
- 전체 선택/해제 버튼 (필수 섹션 제외한 선택 섹션만 영향)

### 4-6. 제출 플로우

1. Step 3에서 "완료" 클릭
2. `POST /api/offerings` — `{ bizItemId?, title, purpose, format }`
3. 성공 시 → `navigate(\`/shaping/offering/${newId}/edit\`)` (에디터로 이동)
4. 실패 시 → 에러 메시지 표시, 재시도 가능

> Note: API가 offering 생성 시 `initStandard` 섹션을 자동 생성하므로, Step 3의 섹션 선택은 **생성 후** 별도 API 호출로 토글할 수 있다. 생성 시점에는 목차 선택을 저장하지 않고, 생성 직후 불필요한 섹션을 toggle-off 하는 방식.

### 4-7. 생성 후 섹션 토글 처리

위자드 완료 시:
1. `POST /offerings` → offering 생성 (21개 전체 섹션 자동 초기화)
2. Step 3에서 `isRequired === false`이면서 선택 해제된 섹션에 대해:
   ```
   PATCH /offerings/:id/sections/:sectionId/toggle
   ```
   순차 호출하여 `is_included = false`로 변경
3. 에디터 페이지로 이동

## 5. 파일 변경 목록

### 5-1. 신규 파일

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/web/src/routes/offerings-list.tsx` | F374 목록 페이지 |
| 2 | `packages/web/src/routes/offering-create-wizard.tsx` | F375 생성 위자드 |

### 5-2. 수정 파일

| # | 파일 | 변경 내용 |
|---|------|----------|
| 3 | `packages/web/src/lib/api-client.ts` | fetchOfferings, createOffering, deleteOffering 추가 |
| 4 | `packages/web/src/router.tsx` | /shaping/offerings, /shaping/offerings/new 라우트 추가 |
| 5 | `packages/web/src/components/sidebar.tsx` | "Offerings" 메뉴 추가, "Offering" → "Offering Pack" 라벨 변경 |

## 6. 검증 체크리스트

### F374 목록 페이지
- [ ] D-374-01: /shaping/offerings 접근 시 offerings 목록 렌더링
- [ ] D-374-02: 상태 필터 탭 6개 (all/draft/generating/review/approved/shared)
- [ ] D-374-03: 필터 탭 클릭 시 해당 상태만 표시
- [ ] D-374-04: 카드에 상태 배지 + 목적 태그 + 포맷 + 버전 + 생성일 표시
- [ ] D-374-05: 빈 상태 (offerings 0건) 시 EmptyState 컴포넌트 표시
- [ ] D-374-06: 로딩 중 SkeletonGrid 표시
- [ ] D-374-07: 삭제 버튼 → confirm → DELETE API → 목록 새로고침
- [ ] D-374-08: 사이드바에 "Offerings" 메뉴 표시 + 활성 상태
- [ ] D-374-09: "새로 만들기" 버튼 → /shaping/offerings/new 이동

### F375 생성 위자드
- [ ] D-375-01: /shaping/offerings/new 접근 시 위자드 Step 1 렌더링
- [ ] D-375-02: Step 1 — 발굴 아이템 목록 표시 + 선택 가능
- [ ] D-375-03: Step 1 — "건너뛰기" 클릭 시 Step 2로 이동 (bizItemId null)
- [ ] D-375-04: Step 2 — 제목 입력 필수 검증
- [ ] D-375-05: Step 2 — 목적 라디오 3개 (report/proposal/review)
- [ ] D-375-06: Step 2 — 포맷 라디오 2개 (html/pptx)
- [ ] D-375-07: Step 2 — BizItem 선택 시 제목 자동 프리필
- [ ] D-375-08: Step 3 — 21개 표준 섹션 체크리스트 표시
- [ ] D-375-09: Step 3 — 필수 섹션 checked + disabled
- [ ] D-375-10: Step 3 — 선택 섹션 토글 가능
- [ ] D-375-11: Step 3 — "전체 선택/해제" 토글
- [ ] D-375-12: 스텝 진행 표시기 (1/2/3)
- [ ] D-375-13: 이전/다음 네비게이션 동작
- [ ] D-375-14: 완료 → POST /offerings → 에디터 페이지로 이동
- [ ] D-375-15: 생성 후 선택 해제 섹션 toggle-off 처리

### 공통
- [ ] D-COM-01: typecheck 통과
- [ ] D-COM-02: 기존 테스트 회귀 없음
- [ ] D-COM-03: 사이드바 "Offering Pack" 라벨 변경
