---
code: FX-DSGN-S221
title: "Sprint 221 Design — PRD 확정 + 3단계 버전 관리"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# Sprint 221: PRD 확정 + 3단계 버전 관리 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F456 — 최종 PRD 확정 + 버전 관리 |
| Sprint | 221 |
| 핵심 전략 | `biz_generated_prds`에 status 컬럼 추가 + 3단계 PRD(자동/인터뷰/확정) 전체 관리 UI |
| 참조 | [[FX-PLAN-S221]], [[FX-SPEC-001]] |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | PRD가 여러 버전으로 존재하지만 확정 프로세스와 비교 수단이 없음 |
| Solution | PDCA 검증 기반 확정 전환 + line-level diff + 인라인 편집기 |
| Function UX Effect | PRD 생성~확정 라이프사이클 완전 추적 |
| Core Value | Prototype Builder(F457) 입력 품질 보장 |

---

## 1. DB 변경

### 1.1 마이그레이션: `biz_generated_prds` status 컬럼

```sql
-- {NEXT}_prd_confirmation.sql
-- Sprint 221: PRD 확정 상태 관리 (F456)

ALTER TABLE biz_generated_prds ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
-- status 값: 'draft' | 'reviewing' | 'confirmed'

CREATE INDEX IF NOT EXISTS idx_generated_prds_status
  ON biz_generated_prds(biz_item_id, status);
```

### 1.2 기존 스키마 활용

`biz_generated_prds` 테이블은 이미 `version INTEGER` + `UNIQUE(biz_item_id, version)` 제약을 가지고 있어요.

| version | 의미 | status 초기값 | 편집 가능 |
|---------|------|--------------|-----------|
| 1 | 1차 PRD (자동 생성, F454) | draft | 읽기 전용 |
| 2 | 2차 PRD (인터뷰 반영, F455) | draft | 편집 가능 |
| 3 | 3차 PRD (확정, F456) | confirmed | 편집 가능 |

- version 1은 자동 생성 원본이므로 편집을 차단해요 (API 레벨에서 version=1이면 PATCH 거부).
- version 3은 confirm API가 version 2를 복제하여 생성하고, status를 `confirmed`로 설정해요.

---

## 2. API 상세

### 2.1 PRD 확정

```
POST /api/biz-items/:bizItemId/prds/:prdId/confirm
```

**요청**: Body 없음 (prdId가 version 2인 PRD를 가리켜야 함)

**로직**:
1. prdId 조회 → version=2 확인 (아니면 400)
2. PDCA 검증 수행:
   - 필수 섹션 존재 확인 (목표/범위/제약/성공지표/리스크)
   - 각 섹션 최소 길이 체크 (50자 이상)
3. 검증 통과 시:
   - version 2의 status → `reviewing` → `confirmed` (또는 즉시 `confirmed`)
   - version 3 INSERT: content 복제 + status=`confirmed` + generated_at=now
4. 검증 실패 시: 400 + 실패 항목 목록 반환

**응답**: `201 Created`
```json
{
  "id": "...",
  "bizItemId": "...",
  "version": 3,
  "status": "confirmed",
  "content": "...",
  "generatedAt": "2026-04-08T..."
}
```

**Zod 스키마**: `prdConfirmResponseSchema`

### 2.2 PRD 버전 목록

```
GET /api/biz-items/:bizItemId/prds
```

**응답**: `200 OK`
```json
{
  "prds": [
    { "id": "abc", "version": 1, "status": "draft", "generatedAt": "...", "contentPreview": "..." },
    { "id": "def", "version": 2, "status": "confirmed", "generatedAt": "...", "contentPreview": "..." },
    { "id": "ghi", "version": 3, "status": "confirmed", "generatedAt": "...", "contentPreview": "..." }
  ]
}
```

- `contentPreview`: content의 앞 200자 (목록에서 전문 전송 방지)

### 2.3 PRD 상세

```
GET /api/biz-items/:bizItemId/prds/:prdId
```

**응답**: `200 OK` — 전문 content + 메타데이터 (version, status, criteria_snapshot, generated_at)

### 2.4 PRD 버전 비교 (Diff)

```
GET /api/biz-items/:bizItemId/prds/diff?v1={prdId1}&v2={prdId2}
```

**로직**:
1. v1, v2 두 PRD 조회
2. content를 line 단위로 분할
3. 간단한 LCS 기반 diff 생성 (added/removed/unchanged)

**응답**: `200 OK`
```json
{
  "v1": { "id": "abc", "version": 1 },
  "v2": { "id": "def", "version": 2 },
  "hunks": [
    { "type": "unchanged", "content": "# 프로젝트 개요" },
    { "type": "removed", "content": "- 초기 목표: ..." },
    { "type": "added", "content": "- 수정된 목표: ..." }
  ]
}
```

### 2.5 PRD 편집

```
PATCH /api/biz-items/:bizItemId/prds/:prdId
```

**요청**:
```json
{ "content": "# 수정된 PRD 내용\n..." }
```

**로직**:
1. prdId 조회 → version=1이면 403 (읽기 전용)
2. content 업데이트 + generated_at 갱신

**응답**: `200 OK` — 수정된 PRD 객체

**Zod 스키마**: `prdEditSchema` — `{ content: z.string().min(100) }`

---

## 3. 서비스 레이어

### 3.1 PrdConfirmationService

```typescript
// packages/api/src/core/offering/services/prd-confirmation-service.ts

export interface PrdValidationResult {
  valid: boolean;
  errors: string[];  // 실패한 검증 항목
}

export class PrdConfirmationService {
  constructor(private db: D1Database) {}

  /** PDCA 검증: 필수 섹션 + 최소 길이 */
  validate(content: string): PrdValidationResult { ... }

  /** version 2 → confirmed + version 3 생성 */
  async confirm(bizItemId: string, prdId: string): Promise<GeneratedPrd> { ... }

  /** 두 PRD 간 line-level diff */
  diff(content1: string, content2: string): DiffHunk[] { ... }
}
```

### 3.2 검증 항목 (PDCA 기반)

| # | 섹션 | 키워드 패턴 | 최소 길이 |
|---|------|-----------|----------|
| 1 | 프로젝트 개요 | `# .*개요\|# .*Overview` | 50자 |
| 2 | 목표 | `## .*목표\|## .*Goal` | 50자 |
| 3 | 범위 | `## .*범위\|## .*Scope` | 30자 |
| 4 | 제약 사항 | `## .*제약\|## .*Constraint` | 30자 |
| 5 | 성공 지표 | `## .*성공\|## .*Success\|## .*KPI` | 30자 |

- 5개 중 4개 이상 통과 시 검증 성공 (1개 누락 허용)

### 3.3 Diff 알고리즘

- 외부 라이브러리 없이 간단한 LCS(Longest Common Subsequence) 구현
- line 단위 비교 (문자 단위 아님)
- 출력: `{ type: 'added' | 'removed' | 'unchanged', content: string }[]`

---

## 4. UI 컴포넌트

### 4.1 컴포넌트 구조

```
packages/web/src/
├── routes/
│   └── discovery/
│       └── prd-management.tsx      # PRD 관리 페이지 (라우트)
├── components/
│   └── prd/
│       ├── PrdVersionList.tsx       # 3단계 PRD 카드 목록
│       ├── PrdDetailView.tsx        # PRD 상세 (Markdown 렌더링)
│       ├── PrdEditor.tsx            # 인라인 Markdown 편집기
│       ├── PrdDiffView.tsx          # 버전 비교 (unified/side-by-side)
│       └── PrdConfirmDialog.tsx     # 확정 확인 다이얼로그
```

### 4.2 PrdVersionList

3개의 버전 카드를 가로 배치:

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 1차 PRD (자동)   │  │ 2차 PRD (인터뷰) │  │ 3차 PRD (확정)   │
│ ─────────────── │  │ ─────────────── │  │ ─────────────── │
│ 🔒 읽기 전용     │  │ ✏️ 편집 가능     │  │ ✅ 확정됨        │
│                 │  │                 │  │                 │
│ 2026-04-06      │  │ 2026-04-07      │  │ 2026-04-08      │
│                 │  │                 │  │                 │
│ [상세 보기]      │  │ [편집] [확정하기] │  │ [상세 보기] [편집]│
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

- version 3이 없으면 3번째 카드는 빈 상태 + "2차 PRD 확정 시 생성됩니다" 안내
- "확정하기" 버튼은 version 2 카드에만 표시 (version 3 미존재 시)

### 4.3 PrdDetailView

| 영역 | 내용 |
|------|------|
| 헤더 | 버전 뱃지 (1차/2차/3차) + 상태 뱃지 (draft/confirmed) + 생성일 |
| 본문 | Markdown → HTML 렌더링 (react-markdown 또는 기존 프로젝트 렌더러) |
| 메타 | 사용 모델, 토큰 수, criteria_snapshot 요약 |
| 액션 | [편집] (2차/3차만) + [비교하기] + [확정하기] (2차만) |

### 4.4 PrdEditor

- Textarea 기반 Markdown 편집기 (별도 라이브러리 없이 순수 구현)
- 미리보기 토글: 편집 ↔ 렌더링 전환
- 자동 저장: 5초 debounce로 PATCH API 호출
- version 1 접근 시 읽기 전용 모드 강제 (편집 불가 안내 배너)

### 4.5 PrdDiffView

- 버전 선택: 드롭다운 2개 (v1, v2)
- 표시 모드: unified (기본) / side-by-side 토글
- 색상: added=초록 배경, removed=빨강 배경, unchanged=기본

### 4.6 PrdConfirmDialog

- 모달 다이얼로그: "이 PRD를 최종 확정하시겠어요?"
- 검증 결과 미리보기: 통과/실패 항목 목록 표시
- 확인 시 confirm API 호출 → 성공 시 목록 새로고침

---

## 5. 라우팅

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/discovery/:bizItemId/prds` | PrdManagement | PRD 목록 + 관리 |
| `/discovery/:bizItemId/prds/:prdId` | PrdDetailView | PRD 상세 |
| `/discovery/:bizItemId/prds/:prdId/edit` | PrdEditor | PRD 편집 |
| `/discovery/:bizItemId/prds/diff` | PrdDiffView | 버전 비교 |

기존 Discovery 라우트의 하위 경로로 배치 — 사이드바 메뉴에 "PRD 관리" 항목 추가.

---

## 6. 구현 파일 목록

| # | 경로 | 동작 | 비고 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/{NEXT}_prd_confirmation.sql` | 신규 | status 컬럼 + 인덱스 |
| 2 | `packages/api/src/core/offering/services/prd-confirmation-service.ts` | 신규 | 검증 + 확정 + diff |
| 3 | `packages/api/src/core/offering/schemas/prd-confirmation-schema.ts` | 신규 | Zod 스키마 |
| 4 | `packages/api/src/core/discovery/routes/biz-items.ts` | 수정 | PRD 관련 엔드포인트 5개 추가 |
| 5 | `packages/api/src/__tests__/prd-confirmation.test.ts` | 신규 | API + 서비스 테스트 |
| 6 | `packages/web/src/routes/discovery/prd-management.tsx` | 신규 | PRD 관리 페이지 |
| 7 | `packages/web/src/components/prd/PrdVersionList.tsx` | 신규 | 버전 카드 목록 |
| 8 | `packages/web/src/components/prd/PrdDetailView.tsx` | 신규 | PRD 상세 |
| 9 | `packages/web/src/components/prd/PrdEditor.tsx` | 신규 | Markdown 편집기 |
| 10 | `packages/web/src/components/prd/PrdDiffView.tsx` | 신규 | 버전 비교 |
| 11 | `packages/web/src/components/prd/PrdConfirmDialog.tsx` | 신규 | 확정 다이얼로그 |
| 12 | `packages/api/src/__tests__/helpers/mock-d1.ts` | 수정 | status 컬럼 반영 |

---

## 7. 검증 기준

### 7.1 API 테스트

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | version 2 PRD confirm → 성공 | 201 + version 3 생성 + status=confirmed |
| 2 | version 1 PRD confirm → 실패 | 400 "version 2만 확정 가능" |
| 3 | 검증 실패 (필수 섹션 누락) confirm | 400 + errors 배열 |
| 4 | GET /prds 목록 조회 | 200 + version 1~3 포함 |
| 5 | GET /prds/diff?v1=...&v2=... | 200 + hunks 배열 |
| 6 | PATCH version 1 PRD | 403 "읽기 전용" |
| 7 | PATCH version 2 PRD | 200 + 수정된 content |

### 7.2 UI 테스트

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | PrdVersionList 렌더링 | 3개 카드 표시 (3차 없으면 빈 카드) |
| 2 | PrdDiffView 비교 | unified diff 정상 렌더링 |
| 3 | PrdEditor 편집 모드 | textarea + 미리보기 토글 동작 |
| 4 | PrdConfirmDialog 확정 | 검증 결과 표시 + 확인 버튼 동작 |

### 7.3 통합 시나리오

| # | 시나리오 | 기대 결과 |
|---|----------|-----------|
| 1 | PRD 목록 → 2차 상세 → 편집 → 확정 → 3차 생성 확인 | 전체 플로우 동작 |
| 2 | 1차 vs 3차 diff 비교 | 변경 사항 시각적 표시 |
| 3 | 확정 후 2차 재편집 → 재확정 불가 | 이미 3차 존재 시 확정 버튼 비활성화 |
