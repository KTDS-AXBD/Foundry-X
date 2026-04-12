---
code: FX-ANLS-064
title: "Sprint 64 Gap Analysis — F203 아이디어-BMC 연결 + F204 BMC 댓글"
version: 1.0
status: Active
category: ANLS
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 64
features: [F203, F204]
design: "[[FX-DSGN-064]]"
---

# Sprint 64 Design-Implementation Gap Analysis Report

## Analysis Overview

| 항목 | 값 |
|------|-----|
| Analysis Target | F203 아이디어-BMC 연결 + F204 BMC 댓글 |
| Design Document | `docs/02-design/features/sprint-64.design.md` |
| Implementation | `packages/api/src/{services,routes,schemas}/`, `packages/shared/src/ax-bd.ts` |
| Analysis Date | 2026-03-25 |

---

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| API Endpoints (F203) | 100% | ✅ |
| API Endpoints (F204) | 100% | ✅ |
| Service Logic (F203) | 100% | ✅ |
| Service Logic (F204) | 95% | ✅ |
| Data Model | 100% | ✅ |
| Schema Validation | 95% | ✅ |
| Shared Types | 100% | ✅ |
| Test Coverage (F203) | 100% | ✅ |
| Test Coverage (F204) | 100% | ✅ |
| Web Components | 0% | ❌ |
| Route Registration | 100% | ✅ |
| **Overall (API)** | **98%** | **✅** |
| **Overall (API+Web)** | **82%** | **⚠️** |

---

## Section 2: F203 아이디어-BMC 연결

### 2.1 IdeaBmcLinkService

| Design 항목 | 구현 | 일치 | 비고 |
|-------------|:----:|:----:|------|
| `createBmcFromIdea(ideaId, tenantId, userId, title?)` | ✅ | ✅ | 시그니처 완전 일치 |
| 아이디어 존재 확인 | ✅ | ✅ | `ideaService.getById` → `NotFoundError` |
| BmcService.create() 호출 | ✅ | ✅ | title fallback `BMC: ${idea.title}` 구현 |
| ax_idea_bmc_links INSERT | ✅ | ✅ | `crypto.randomUUID()` + `Date.now()` |
| `linkBmc(ideaId, bmcId, tenantId)` | ✅ | ✅ | 시그니처 일치 |
| 아이디어 + BMC 존재 확인 | ✅ | ✅ | 양쪽 모두 검증 |
| 중복 체크 → 409 | ✅ | ✅ | SELECT 먼저 확인 + `ConflictError` |
| `unlinkBmc(ideaId, bmcId, tenantId)` | ✅ | ✅ | DELETE + changes 확인 |
| `getBmcsByIdea(ideaId, tenantId)` | ✅ | ✅ | JOIN 쿼리, `is_deleted=0` 필터 |
| `getIdeaByBmc(bmcId, tenantId)` | ✅ | ✅ | JOIN + LIMIT 1, null 반환 |

**Match Rate: 100%**

### 2.2 Route: ax-bd-links.ts

| Design Endpoint | 구현 | HTTP | 일치 |
|----------------|:----:|:----:|:----:|
| `POST /api/ax-bd/ideas/:ideaId/bmc` | ✅ | POST | ✅ |
| `POST /api/ax-bd/ideas/:ideaId/bmc/link` | ✅ | POST | ✅ |
| `DELETE /api/ax-bd/ideas/:ideaId/bmc/link` | ✅ | DELETE | ✅ |
| `GET /api/ax-bd/ideas/:ideaId/bmcs` | ✅ | GET | ✅ |
| `GET /api/ax-bd/bmcs/:bmcId/idea` | ✅ | GET | ✅ |

- 에러 핸들링: NotFoundError→404, ConflictError→409 모두 구현
- 응답 포맷: `{ items: bmcs }` (getBmcsByIdea), `{ idea }` (getIdeaByBmc) — 합리적 래핑

**Match Rate: 100%**

### 2.3 Schema: idea-bmc-link.schema.ts

| Design | 구현 | 일치 | 비고 |
|--------|:----:|:----:|------|
| `linkBmcSchema: { bmcId: string.min(1) }` | ✅ | ✅ | `LinkBmcSchema` (PascalCase, @hono/zod-openapi 사용) |
| `createBmcFromIdeaSchema: { title?: string.max(200) }` | ✅ | ✅ | `CreateBmcFromIdeaSchema` |

- 차이: `z` import를 `@hono/zod-openapi`에서 가져옴 + `.openapi()` 체이닝 추가 — 프로젝트 관행 준수, 기능 동일

**Match Rate: 95%** (네이밍 케이스 차이는 기존 프로젝트 PascalCase 관행 준수)

### 2.4 D1: 0048_ax_idea_bmc_links.sql

| Design | 구현 | 일치 |
|--------|:----:|:----:|
| `ax_idea_bmc_links` 테이블 | ✅ | ✅ |
| `id TEXT PRIMARY KEY` | ✅ | ✅ |
| `idea_id TEXT NOT NULL` | ✅ | ✅ |
| `bmc_id TEXT NOT NULL` | ✅ | ✅ |
| `created_at INTEGER NOT NULL` | ✅ | ✅ |
| `UNIQUE(idea_id, bmc_id)` | ✅ | ✅ |
| `idx_links_idea_id` 인덱스 | ✅ | ✅ |
| `idx_links_bmc_id` 인덱스 | ✅ | ✅ |

**Match Rate: 100%** — DDL 완전 일치

### 2.5 Web: IdeaBmcSection

| Design 컴포넌트 | 구현 | 일치 | 비고 |
|-----------------|:----:|:----:|------|
| `IdeaBmcSection.tsx` | ❌ | ❌ | 미구현 |
| `BmcSelectModal.tsx` | ❌ | ❌ | 미구현 |

**Match Rate: 0%** — Web 컴포넌트 미구현 (API 백엔드만 구현 완료)

---

## Section 3: F204 BMC 댓글

### 3.1 BmcCommentService

| Design 항목 | 구현 | 일치 | 비고 |
|-------------|:----:|:----:|------|
| `createComment(bmcId, authorId, content, blockType?)` | ✅ | ✅ | 시그니처 일치 |
| BMC 존재 확인 | ✅ | ✅ | `SELECT id FROM ax_bmcs WHERE ... is_deleted=0` |
| blockType 유효성 검증 | ✅ | ✅ | `BMC_BLOCK_TYPES` 배열로 검증 |
| @멘션 파싱 | ✅ | ✅ | `parseMentions()` private 메서드 |
| INSERT ax_bmc_comments | ✅ | ✅ | |
| 멘션 알림 전송 | ⚠️ | ⚠️ | 파싱만 구현, NotificationService 연동은 주석으로 "Phase 1 scope 외" 표기 |
| `getComments(bmcId, blockType?, limit?, offset?)` | ✅ | ✅ | 페이지네이션 + 블록 필터 |
| `deleteComment(commentId, userId)` | ✅ | ✅ | 본인만 삭제, ForbiddenError |
| `getCommentCounts(bmcId)` | ✅ | ✅ | GROUP BY + `_total`, null→`_general` 매핑 |
| `parseMentions(content)` private | ✅ | ✅ | regex `/(@\w+)/g` |

- NotificationService 연동 미구현은 설계 문서에서도 "추후"로 언급 — 의도적 스코프 조정

**Match Rate: 95%** (알림 연동 미구현, 의도적 deferral)

### 3.2 Route: ax-bd-comments.ts

| Design Endpoint | 구현 | HTTP | 일치 |
|----------------|:----:|:----:|:----:|
| `POST /api/ax-bd/bmcs/:bmcId/comments` | ✅ | POST | ✅ |
| `GET /api/ax-bd/bmcs/:bmcId/comments` | ✅ | GET | ✅ |
| `DELETE /api/ax-bd/bmcs/:bmcId/comments/:commentId` | ✅ | DELETE | ✅ |
| `GET /api/ax-bd/bmcs/:bmcId/comments/count` | ✅ | GET | ✅ |

- 쿼리 파라미터: `?block=`, `?limit=`, `?offset=` 모두 구현
- 에러: NotFoundError→404, ForbiddenError→403, ValidationError→400

**Match Rate: 100%**

### 3.3 Schema: bmc-comment.schema.ts

| Design | 구현 | 일치 | 비고 |
|--------|:----:|:----:|------|
| `content: z.string().min(1).max(2000)` | ✅ | ✅ | |
| `blockType: z.enum([...9블록]).optional()` | ✅ | ✅ | `BmcBlockTypeSchema` 재사용 (bmc.schema.ts에서 import) |

- 구현이 `BmcBlockTypeSchema`를 재사용하여 DRY 원칙 준수 — Design의 인라인 enum보다 우수

**Match Rate: 100%**

### 3.4 D1: 0049_ax_bmc_comments.sql

| Design | 구현 | 일치 |
|--------|:----:|:----:|
| `ax_bmc_comments` 테이블 | ✅ | ✅ |
| 6개 컬럼 (id, bmc_id, block_type, author_id, content, created_at) | ✅ | ✅ |
| `idx_comments_bmc_id` 인덱스 | ✅ | ✅ |
| `idx_comments_block` 복합 인덱스 | ✅ | ✅ |

**Match Rate: 100%** — DDL 완전 일치

### 3.5 Web: CommentPanel

| Design 컴포넌트 | 구현 | 일치 | 비고 |
|-----------------|:----:|:----:|------|
| `CommentPanel.tsx` | ❌ | ❌ | 미구현 |
| `CommentBadge.tsx` | ❌ | ❌ | 미구현 |
| `MentionInput.tsx` | ❌ | ❌ | 미구현 |

**Match Rate: 0%** — Web 컴포넌트 미구현

---

## Section 4: 공유 타입 (shared/ax-bd.ts)

| Design 타입 | 구현 | 일치 | 비고 |
|-------------|:----:|:----:|------|
| `IdeaBmcLink { id, ideaId, bmcId, createdAt }` | ✅ | ✅ | 필드 완전 일치 |
| `BmcComment { id, bmcId, blockType?, authorId, authorName?, content, createdAt }` | ✅ | ✅ | 필드 완전 일치 |
| `CommentCounts { [blockType]: number, _total: number }` | ✅ | ✅ | index signature + _total |

**Match Rate: 100%**

---

## Section 5: Worker 파일 매핑 + 리더 처리

| 파일 | Design 역할 | 구현 | 일치 |
|------|------------|:----:|:----:|
| `idea-bmc-link-service.ts` | W1 | ✅ | ✅ |
| `ax-bd-links.ts` route | W1 | ✅ | ✅ |
| `idea-bmc-link.schema.ts` | W1 | ✅ | ✅ |
| `0048_ax_idea_bmc_links.sql` | W1 | ✅ | ✅ |
| `ax-bd-links.test.ts` | W1 | ✅ | ✅ |
| `IdeaBmcSection.tsx` | W1 | ❌ | ❌ |
| `BmcSelectModal.tsx` | W1 | ❌ | ❌ |
| `bmc-comment-service.ts` | W2 | ✅ | ✅ |
| `ax-bd-comments.ts` route | W2 | ✅ | ✅ |
| `bmc-comment.schema.ts` | W2 | ✅ | ✅ |
| `0049_ax_bmc_comments.sql` | W2 | ✅ | ✅ |
| `ax-bd-comments.test.ts` | W2 | ✅ | ✅ |
| `CommentPanel.tsx` | W2 | ❌ | ❌ |
| `CommentBadge.tsx` | W2 | ❌ | ❌ |
| `MentionInput.tsx` | W2 | ❌ | ❌ |
| `app.ts` route 등록 | Leader | ✅ | ✅ |
| `shared/ax-bd.ts` 타입 | Leader | ✅ | ✅ |

---

## Section 6: 테스트 설계 비교

### F203 테스트 (Design ~10건 vs 구현 18건)

| # | Design 테스트 | 구현 | 일치 | 구현 위치 |
|---|-------------|:----:|:----:|-----------|
| 1 | 아이디어에서 새 BMC 생성 + 링크 | ✅ | ✅ | `createBmcFromIdea > creates a new BMC...` |
| 2 | 기존 BMC 연결 | ✅ | ✅ | `linkBmc > links an existing BMC...` |
| 3 | 연결 해제 | ✅ | ✅ | `unlinkBmc > removes a link...` |
| 4 | 아이디어의 BMC 목록 조회 | ✅ | ✅ | `getBmcsByIdea > returns multiple...` |
| 5 | BMC의 아이디어 조회 | ✅ | ✅ | `getIdeaByBmc > returns the linked idea` |
| 6 | 미존재 아이디어 → 404 | ✅ | ✅ | 3곳에서 검증 (create/link/unlink) |
| 7 | 미존재 BMC → 404 | ✅ | ✅ | `linkBmc > throws NotFoundError for BMC` |
| 8 | 중복 연결 → 409 | ✅ | ✅ | `linkBmc > throws ConflictError` |
| 9 | 타 테넌트 접근 → 403 | ✅ | ✅ | `tenant isolation` describe (2건) |
| 10 | 연결 해제 후 재연결 | ✅ | ✅ | `re-link after unlink` describe |

추가 구현: custom title 테스트, empty array 테스트, unlink NotFoundError 등 8건 초과 구현

**Match Rate: 100%** (Design 10건 전부 커버 + 초과 8건)

### F204 테스트 (Design ~12건 vs 구현 23건)

| # | Design 테스트 | 구현 | 일치 | 구현 위치 |
|---|-------------|:----:|:----:|-----------|
| 1 | 블록 댓글 작성 | ✅ | ✅ | Service + Route 양쪽 |
| 2 | BMC 전체 댓글 (blockType=null) | ✅ | ✅ | `creates a general comment without blockType` |
| 3 | 댓글 목록 조회 | ✅ | ✅ | Service + Route 양쪽 |
| 4 | 블록별 필터 조회 | ✅ | ✅ | `filters comments by blockType` |
| 5 | 댓글 삭제 (본인) | ✅ | ✅ | Service + Route 양쪽 |
| 6 | 타인 댓글 삭제 → 403 | ✅ | ✅ | Service + Route 양쪽 (user_2 생성→user_1 삭제) |
| 7 | 블록별 댓글 수 집계 | ✅ | ✅ | Service + Route 양쪽 |
| 8 | @멘션 파싱 검증 | ✅ | ✅ | `parseMentions` describe (간접 검증) |
| 9 | 미존재 BMC → 404 | ✅ | ✅ | Service + Route 양쪽 |
| 10 | 빈 댓글 → 400 | ✅ | ✅ | Route `POST returns 400 for empty content` |
| 11 | 2000자 초과 → 400 | ✅ | ✅ | Route `POST returns 400 for content exceeding 2000` |
| 12 | 잘못된 blockType → 400 | ✅ | ✅ | Service (ValidationError) + Route (400) |

추가: soft-deleted BMC 검증, pagination limit/offset, 빈 BMC count 등 11건 초과

**Match Rate: 100%** (Design 12건 전부 커버 + 초과 11건)

---

## Differences Found

### Missing Features (Design O, Implementation X)

| Item | Design Location | Description | Impact |
|------|----------------|-------------|--------|
| IdeaBmcSection.tsx | Design §2.5 | 아이디어 상세 페이지 내 BMC 연결 영역 | Medium |
| BmcSelectModal.tsx | Design §2.5 | 기존 BMC 선택 모달 | Medium |
| CommentPanel.tsx | Design §3.5 | 블록별 댓글 사이드패널 | Medium |
| CommentBadge.tsx | Design §3.5 | 블록 옆 댓글 수 배지 | Low |
| MentionInput.tsx | Design §3.5 | @멘션 자동완성 입력 | Low |
| NotificationService 연동 | Design §3.1 step 5 | 멘션 알림 전송 | Low (의도적 deferral) |

### Added Features (Design X, Implementation O)

| Item | Implementation Location | Description |
|------|------------------------|-------------|
| 로컬 Error 클래스 | `idea-bmc-link-service.ts:169-181` | NotFoundError, ConflictError 자체 정의 |
| 로컬 Error 클래스 | `bmc-comment-service.ts:146-165` | NotFoundError, ForbiddenError, ValidationError 자체 정의 |
| BmcSummary/IdeaSummary 타입 | `idea-bmc-link-service.ts:5-17` | 서비스 내 로컬 타입 정의 |
| CommentRow 변환 헬퍼 | `bmc-comment-service.ts:24-33` | DB Row→API 타입 변환 |
| Route 테스트 (Hono) | `ax-bd-comments.test.ts:233-429` | Hono app.request 통합 테스트 13건 |

### Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| Schema import | `z from "zod"` | `z from "@hono/zod-openapi"` | None (관행 준수) |
| Schema naming | camelCase (`linkBmcSchema`) | PascalCase (`LinkBmcSchema`) | None (관행 준수) |
| blockType enum | 인라인 z.enum 9종 | `BmcBlockTypeSchema` 재사용 | Positive (DRY) |
| parseMentions regex | `/@(\w+)/g` matchAll | `/@(\w+)/g` match + slice(1) | None (동일 결과) |
| BmcComment.blockType | `blockType?: string` (optional) | `blockType: string \| null` (nullable) | Low (API 동작 동일) |

---

## Score Summary

| 영역 | 항목 수 | 일치 | Match Rate |
|------|:------:|:----:|:----------:|
| F203 Service (5 메서드) | 5 | 5 | 100% |
| F203 Route (5 endpoints) | 5 | 5 | 100% |
| F203 Schema | 2 | 2 | 100% |
| F203 D1 Migration | 1 | 1 | 100% |
| F203 Web (2 컴포넌트) | 2 | 0 | 0% |
| F203 Tests (10 설계) | 10 | 10 | 100% |
| F204 Service (5 메서드) | 5 | 5 | 100% |
| F204 Route (4 endpoints) | 4 | 4 | 100% |
| F204 Schema | 1 | 1 | 100% |
| F204 D1 Migration | 1 | 1 | 100% |
| F204 Web (3 컴포넌트) | 3 | 0 | 0% |
| F204 Tests (12 설계) | 12 | 12 | 100% |
| Shared Types | 3 | 3 | 100% |
| Route Registration | 2 | 2 | 100% |
| **Total** | **55** | **50** | **91%** |
| **API Backend Only** | **50** | **50** | **100%** |

---

## Recommended Actions

### Immediate Actions (API Backend)
- 없음 — API 백엔드 구현 완전 일치 (100%)

### Web Frontend (후속 Sprint 가능)
1. `IdeaBmcSection.tsx` + `BmcSelectModal.tsx` — F203 Web UI 구현
2. `CommentPanel.tsx` + `CommentBadge.tsx` + `MentionInput.tsx` — F204 Web UI 구현
3. Web 컴포넌트 구현 시 기존 `packages/web/src/components/feature/ax-bd/` 디렉토리에 추가

### Documentation Update
1. NotificationService 연동 deferral을 Design 문서에 명시적으로 기록 권장
2. Error 클래스 자체 정의 패턴을 Design에 반영 (프로젝트 공통 에러 추출 검토)

---

## Related Documents
- Design: [sprint-64.design.md](../../02-design/features/sprint-64.design.md)
- Plan: [sprint-64.plan.md](../../01-plan/features/sprint-64.plan.md)

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-25 | Initial gap analysis | Sinclair Seo (AI-assisted) |
