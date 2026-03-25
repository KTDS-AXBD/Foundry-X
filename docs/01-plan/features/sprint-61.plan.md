---
code: FX-PLAN-061
title: "Sprint 61 — F197 BMC 캔버스 CRUD + F198 아이디어 등록 및 태그"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 61
features: [F197, F198]
req: [FX-REQ-AX-001, FX-REQ-AX-007]
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | AX BD팀의 BMC(비즈니스 모델 캔버스) 작성이 개별 파일로 분산되어 버전 관리·협업·재사용이 불가능하고, 사업 아이디어가 체계적으로 관리되지 않아 중복 작업과 지식 소실이 발생 |
| **Solution** | Foundry-X 위에 BMC 캔버스 에디터(9개 블록 CRUD)와 아이디어 관리 모듈을 구축하고, Git SSOT + D1 미러 하이브리드 저장 전략으로 버전 관리와 검색을 동시에 해결 |
| **Function UX Effect** | 아이디어 등록(제목·설명·태그) → BMC 생성(9개 블록 에디터) → Git 커밋 대기 → 사용자 확인 후 커밋 → D1 자동 동기화 → 목록/필터/검색 즉시 반영 |
| **Core Value** | Git이 SSOT, DB는 미러 — 모든 BD 산출물이 Git에 버전 관리되면서도 D1 기반 빠른 조회·필터링이 가능한 하이브리드 아키텍처 확립. Sprint 62~64 AI 에이전트·협업 기능의 기반 |

| 항목 | 값 |
|------|-----|
| Feature | F197 BMC 캔버스 CRUD + F198 아이디어 등록 및 태그 |
| Sprint | 61 |
| PRD | FX-PLAN-AX-BD-001 v1.4 (Phase 1 — Ideation MVP) |
| 예상 산출물 | 2 routes, 4+ services, 2 D1 migrations (0045~0046), 3 D1 테이블, 2 schemas, 2 shared types, 10+ endpoints, 2+ Web 페이지/컴포넌트, 50+ tests |

---

## 1. 배경 및 목표

### 1.1 Phase 5d — AX BD Ideation MVP

PRD v1.4 (FX-PLAN-AX-BD-001)의 Phase 1으로, AX BD팀이 AI 에이전트의 도움을 받아 BMC 초안을 30분 이내에 생성하고 Git에 커밋할 수 있는 환경을 구축해요.

Sprint 61은 이 중 **P0 기반 기능** 2건을 구현해요:

```
Phase 5d Sprint 로드맵
┌──────────────────────┐
│ Sprint 61 (현재)      │  F197 BMC CRUD + F198 아이디어 등록
│  ↓ (기반 완성)        │
│ Sprint 62             │  F199 BMCAgent 초안 자동 생성
│  ↓ (에이전트 준비)     │
│ Sprint 63             │  F200~F203 부가 기능 4건
│  ↓                    │
│ Sprint 64             │  F204 댓글 + 통합 테스트 + 파일럿
└──────────────────────┘
```

### 1.2 목표

1. **F197 (FX-REQ-AX-001, P0)**: BMC 캔버스 CRUD — 9개 블록 생성·수정·저장, Git 커밋 대기 상태 관리, 동시 편집 충돌 감지
2. **F198 (FX-REQ-AX-007, P0)**: 아이디어 등록 및 태그 — 제목·설명·태그 등록, Git+D1 하이브리드 저장, 태그 필터링

### 1.3 선행 조건 확인

| Feature | 설명 | 상태 |
|---------|------|------|
| F40 | JWT 인증 + RBAC | ✅ |
| F83 | 멀티테넌시 기반 | ✅ |
| F149 | PromptGatewayService (마스킹) | ✅ (Sprint 62에서 활용) |
| D1 | 0001~0044 마이그레이션 적용 완료 | ✅ |

### 1.4 핵심 설계 원칙

1. **Git SSOT**: BMC 본문과 아이디어 내용은 Git이 진실. D1은 조회 최적화용 미러
2. **자동 커밋 절대 금지**: CONSTITUTION §6.2 — `X-Human-Approved: true` 헤더 없이 커밋 API 호출 시 403
3. **webhook 기반 동기화**: Git 커밋 후 D1 자동 업데이트, 실패 시 지수 백오프(1s→2s→4s, 3회)
4. **기존 인프라 재사용**: Hono API, D1, JWT 인증, RBAC — 새 모듈이지만 기존 패턴 준수

---

## 2. 구현 범위

### 2.1 F197 — BMC 캔버스 CRUD

#### API (BE — Worker 1)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/ax-bd/bmc` | POST | BMC 생성 (9개 블록 빈 초기화) |
| `/ax-bd/bmc` | GET | BMC 목록 조회 (필터/정렬/페이징) |
| `/ax-bd/bmc/:id` | GET | BMC 상세 조회 (블록 포함) |
| `/ax-bd/bmc/:id` | PUT | BMC 수정 (블록 업데이트) |
| `/ax-bd/bmc/:id` | DELETE | BMC 삭제 (soft delete) |
| `/ax-bd/bmc/:id/stage` | POST | Git 커밋 대기 상태로 전환 (staging) |

**서비스:**
- `BmcService` — BMC CRUD 로직 + D1 미러 관리
- `BmcSyncService` — Git↔D1 동기화 + `sync_status` 관리 + 실패 시 `sync_failures` 기록

**BMC 9개 블록 (block_type):**
```
customer_segments, value_propositions, channels,
customer_relationships, revenue_streams,
key_resources, key_activities, key_partnerships,
cost_structure
```

#### Web (FE — Worker 2)

| 컴포넌트 | 설명 |
|---------|------|
| `BmcEditorPage` | BMC 에디터 페이지 — 9개 블록 그리드 레이아웃 |
| `BmcBlockEditor` | 개별 블록 편집 컴포넌트 (텍스트 입력) |
| `BmcListPage` | BMC 목록 페이지 (카드 뷰) |
| `BmcStagingBar` | Git 커밋 대기 상태 바 — "변경 사항 저장" + 커밋 메시지 입력 |

#### AC (PRD §4.1 FX-REQ-AX-001)

```
AC-1: 신규 BMC 생성 → 9개 블록 빈 폼 표시 → 텍스트 입력·저장 → Git staging 상태
AC-2: 수정 후 저장 → Git diff 생성 → 커밋 메시지 입력 후 수동 커밋
AC-3: Git 저장 중 네트워크 오류 → "저장 실패" 메시지 + 로컬 유지
AC-4: 동시 편집 충돌 → "다른 사용자가 변경" 안내 표시
```

### 2.2 F198 — 아이디어 등록 및 태그

#### API (BE — Worker 1)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/ax-bd/ideas` | POST | 아이디어 등록 |
| `/ax-bd/ideas` | GET | 아이디어 목록 조회 (태그 필터/정렬) |
| `/ax-bd/ideas/:id` | GET | 아이디어 상세 조회 |
| `/ax-bd/ideas/:id` | PUT | 아이디어 수정 |
| `/ax-bd/ideas/:id` | DELETE | 아이디어 삭제 (soft delete) |

**서비스:**
- `IdeaService` — 아이디어 CRUD + 태그 관리 + D1 미러
- (BmcSyncService 재사용 — Git↔D1 동기화)

**저장 전략 (Git+D1 하이브리드):**
```
Git (SSOT):  ideas/{id}/idea.md     ← 내용의 진실
D1 (미러):   ax_ideas 테이블         ← 목록 조회·필터·검색 최적화
동기화:      Git 커밋 후 webhook → D1 자동 업데이트
```

#### Web (FE — Worker 2)

| 컴포넌트 | 설명 |
|---------|------|
| `IdeaListPage` | 아이디어 목록 페이지 — 태그 필터, 최신순 정렬 |
| `IdeaCreateForm` | 아이디어 등록 폼 — 제목(필수), 설명(200자), 태그(복수) |
| `IdeaDetailPage` | 아이디어 상세 페이지 — 추후 BMC 연결(F203) 확장점 |
| `TagFilter` | 태그 기반 필터링 컴포넌트 |

#### AC (PRD §4.4 FX-REQ-AX-007)

```
AC-1: 제목+설명+태그 입력 → 저장 → Git 커밋 + D1 동기화 → 목록에 즉시 표시
AC-2: 태그 "AI" 필터링 → 해당 태그 아이디어만 표시 (최신순)
AC-3: 제목 빈칸/설명 200자 초과 → 인라인 오류 메시지 + 저장 차단
```

---

## 3. D1 마이그레이션

### 0045_ax_ideas.sql

```sql
-- 아이디어 미러 테이블
CREATE TABLE ax_ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT CHECK(length(description) <= 200),
  tags        TEXT,                         -- JSON array
  git_ref     TEXT NOT NULL,                -- Git commit SHA (SSOT 참조)
  author_id   TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_ideas_author   ON ax_ideas(author_id);
CREATE INDEX idx_ax_ideas_tags     ON ax_ideas(tags);
CREATE INDEX idx_ax_ideas_updated  ON ax_ideas(updated_at DESC);
```

### 0046_ax_bmcs.sql

```sql
-- BMC 메타 미러 테이블
CREATE TABLE ax_bmcs (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT REFERENCES ax_ideas(id),
  title       TEXT NOT NULL,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_bmcs_idea_id   ON ax_bmcs(idea_id);
CREATE INDEX idx_ax_bmcs_author    ON ax_bmcs(author_id);

-- BMC 블록 캐시 (조회 최적화용)
CREATE TABLE ax_bmc_blocks (
  bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
  block_type  TEXT NOT NULL CHECK(block_type IN (
                'customer_segments', 'value_propositions', 'channels',
                'customer_relationships', 'revenue_streams',
                'key_resources', 'key_activities', 'key_partnerships',
                'cost_structure'
              )),
  content     TEXT,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (bmc_id, block_type)
);

-- 동기화 실패 기록 테이블
CREATE TABLE sync_failures (
  id            TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,              -- 'idea' | 'bmc'
  resource_id   TEXT NOT NULL,
  git_ref       TEXT NOT NULL,
  payload       TEXT NOT NULL,              -- 재시도 시 사용할 원본 JSON
  error_msg     TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,                    -- 지수 백오프 다음 시도 시각
  created_at    INTEGER NOT NULL
);
```

---

## 4. Worker 분배 (2-Worker Agent Team)

```
Worker 1 (BE): F197 API + F198 API
├── ax-bd route 파일 생성 (bmc.ts, ideas.ts)
├── BmcService, IdeaService, BmcSyncService
├── Zod schemas (bmc.schema.ts, idea.schema.ts)
├── D1 migrations (0045, 0046)
├── Shared types (ax-bd.ts)
└── Tests: 30+ API tests

Worker 2 (FE): F197 Web + F198 Web
├── BmcEditorPage, BmcBlockEditor, BmcListPage, BmcStagingBar
├── IdeaListPage, IdeaCreateForm, IdeaDetailPage, TagFilter
├── (app)/ax-bd/ 라우팅 구조
├── api-client 확장 (ax-bd 모듈)
└── Tests: 20+ Web tests
```

**Worker 1 허용 파일:**
```
packages/api/src/routes/ax-bd-bmc.ts
packages/api/src/routes/ax-bd-ideas.ts
packages/api/src/services/bmc-service.ts
packages/api/src/services/idea-service.ts
packages/api/src/services/bmc-sync-service.ts
packages/api/src/schemas/bmc.schema.ts
packages/api/src/schemas/idea.schema.ts
packages/api/src/db/migrations/0045_ax_ideas.sql
packages/api/src/db/migrations/0046_ax_bmcs.sql
packages/shared/src/ax-bd.ts
packages/api/src/index.ts (라우트 등록만)
packages/api/src/__tests__/ax-bd-bmc.test.ts
packages/api/src/__tests__/ax-bd-ideas.test.ts
```

**Worker 2 허용 파일:**
```
packages/web/src/app/(app)/ax-bd/page.tsx
packages/web/src/app/(app)/ax-bd/bmc/page.tsx
packages/web/src/app/(app)/ax-bd/bmc/[id]/page.tsx
packages/web/src/app/(app)/ax-bd/ideas/page.tsx
packages/web/src/app/(app)/ax-bd/ideas/[id]/page.tsx
packages/web/src/components/feature/ax-bd/BmcEditorPage.tsx
packages/web/src/components/feature/ax-bd/BmcBlockEditor.tsx
packages/web/src/components/feature/ax-bd/BmcListPage.tsx
packages/web/src/components/feature/ax-bd/BmcStagingBar.tsx
packages/web/src/components/feature/ax-bd/IdeaListPage.tsx
packages/web/src/components/feature/ax-bd/IdeaCreateForm.tsx
packages/web/src/components/feature/ax-bd/IdeaDetailPage.tsx
packages/web/src/components/feature/ax-bd/TagFilter.tsx
packages/web/src/lib/api-client.ts (ax-bd 섹션 추가만)
packages/web/src/__tests__/ax-bd/*.test.tsx
```

---

## 5. CONSTITUTION 적용 (PRD §6)

### 자동 커밋 방지 메커니즘 (§6.2)

Sprint 61에서 ax-bd 라우트에 다음 인터셉터를 구현:

```typescript
// POST /ax-bd/*/commit 엔드포인트 인터셉터
const humanApprovedGuard = async (c: Context, next: Next) => {
  const isHumanApproved = c.req.header('X-Human-Approved') === 'true';
  const tokenType = c.get('tokenType'); // JWT 페이로드에서
  if (tokenType === 'agent' || !isHumanApproved) {
    return c.json({ error: 'Human approval required' }, 403);
  }
  await next();
};
```

### RBAC 적용 (PRD §2.1)

```
BD 애널리스트: 아이디어/BMC 본인 소유 CRUD + 팀 전체 조회
BD 매니저:     아이디어/BMC 전체 CRUD + BMC 승인
AI 에이전트:   읽기 전용 (초안 제안은 별도 API, Sprint 62)
```

---

## 6. Match Rate 목표

| Feature | PRD 목표 | 계획 목표 |
|---------|---------|---------|
| F197 BMC CRUD | 95% | 95% |
| F198 아이디어 등록 | 95% | 95% |

---

## 7. 리스크 및 대응

| 리스크 | 가능성 | 임팩트 | 대응 |
|--------|:------:|:------:|------|
| Git 커밋 UX가 비개발자에게 장벽 | 높 | 높 | 커밋 메시지 자동 제안 (1-click), Paper Prototype 세션(PRD §9) |
| Git↔D1 동기화 실패 누적 | 중 | 중 | sync_failures 테이블 + 지수 백오프 3회 + "⚠️ 미동기화" 배너 |
| Worker 간 파일 충돌 | 낮 | 중 | BE/FE 파일 완전 분리 + File Guard |

---

## 8. 다음 단계

Sprint 61 완료 후:
- `/pdca design sprint-61` → Design 문서 작성
- `/ax-sprint start 61` → Worktree 생성 + 2-Worker 병렬 구현
- Sprint 62 (F199 BMCAgent) → F197 BMC CRUD 기반 위에 AI 초안 생성 기능 추가
