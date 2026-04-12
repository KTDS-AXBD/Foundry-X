---
code: FX-PLAN-064
title: "Sprint 64 — F203 아이디어-BMC 연결 + F204 BMC 댓글 및 협업"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 64
features: [F203, F204]
req: [FX-REQ-AX-008, FX-REQ-AX-003]
prd: docs/specs/bizdevprocess-3/prd-ax-bd-v1.4.md
depends-on: Sprint 61 (F197 BMC CRUD + F198 아이디어 등록)
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 아이디어와 BMC가 별도로 존재하여 어떤 아이디어에서 어떤 BMC가 나왔는지 추적 불가. BMC에 대한 팀원 피드백 채널이 없어 구두/메신저로 논의 |
| **Solution** | 아이디어↔BMC 양방향 링크로 연결 관계를 Git 커밋으로 추적하고, 블록별 댓글+멘션으로 BMC 위에서 직접 협업 |
| **Function UX Effect** | 아이디어 상세 → "BMC 생성/연결" → 양방향 링크 자동 기록 → BMC 에디터에서 블록별 댓글 → @멘션 알림 |
| **Core Value** | 아이디어→BMC 파이프라인을 단일 플랫폼에서 추적. 댓글로 의사결정 맥락이 BMC에 직접 붙어 지식 소실 방지 |

| 항목 | 값 |
|------|-----|
| Feature | F203 아이디어-BMC 연결 + F204 BMC 댓글 및 협업 |
| Sprint | 64 |
| PRD | FX-PLAN-AX-BD-001 v1.4 (Phase 1 — Ideation MVP) |
| 선행 조건 | Sprint 61 완료 (F197 BMC CRUD ✅, F198 아이디어 등록 ✅) |
| 병렬 대상 | Sprint 62와 동시 실행 가능 (파일 겹침 없음) |
| Worker 구성 | W1: F203 (아이디어-BMC 연결), W2: F204 (BMC 댓글) |

---

## 1. Feature 상세

### F203 — 아이디어-BMC 연결 (FX-REQ-AX-008, P1)

**목표**: 아이디어에서 BMC를 생성하거나 기존 BMC를 연결하여 양방향 추적 가능하게 함.

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/ideas/:ideaId/bmc` | 아이디어에서 새 BMC 생성 + 양방향 링크 |
| 2 | POST | `/api/ax-bd/ideas/:ideaId/bmc/link` | 기존 BMC와 연결 |
| 3 | DELETE | `/api/ax-bd/ideas/:ideaId/bmc/link` | BMC 연결 해제 |
| 4 | GET | `/api/ax-bd/ideas/:ideaId/bmcs` | 아이디어에 연결된 BMC 목록 |
| 5 | GET | `/api/ax-bd/bmcs/:bmcId/idea` | BMC에 연결된 아이디어 조회 |

**핵심 로직**:
- `idea-bmc-link-service.ts`: 양방향 링크 CRUD
- D1 `ax_idea_bmc_links` 테이블 (ideaId, bmcId, createdAt)
- BMC 생성 시 기존 `bmc-service.ts`의 `create()` 재사용 후 링크 추가
- 에러: BMC 미존재 시 404, 이미 연결 시 409

**UI**:
- 아이디어 상세 페이지에 "BMC 생성" / "기존 BMC 연결" 버튼
- BMC 선택 모달 (기존 BMC 목록 표시)
- BMC 상세에서 연결된 아이디어 표시

### F204 — BMC 댓글 및 협업 (FX-REQ-AX-003, P1)

**목표**: BMC 블록별 댓글 + @멘션 알림으로 팀 협업.

**API Endpoints**:
| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/ax-bd/bmcs/:bmcId/comments` | 댓글 작성 (block_type 선택적) |
| 2 | GET | `/api/ax-bd/bmcs/:bmcId/comments` | BMC의 전체 댓글 목록 |
| 3 | GET | `/api/ax-bd/bmcs/:bmcId/comments?block=:blockType` | 특정 블록 댓글 필터 |
| 4 | DELETE | `/api/ax-bd/bmcs/:bmcId/comments/:commentId` | 댓글 삭제 (본인만) |
| 5 | GET | `/api/ax-bd/bmcs/:bmcId/comments/count` | 블록별 댓글 수 집계 |

**핵심 로직**:
- `bmc-comment-service.ts`: CRUD + 블록별 집계
- D1 `ax_bmc_comments` 테이블 (PRD §8 스키마 그대로 사용)
- @멘션 파싱: `/@(\w+)/g` → 사용자 ID 추출 → 인앱 알림 (기존 notification 서비스 연동)
- 댓글은 D1 전용 (Git 커밋 대상 아님)

**UI**:
- BMC 에디터 블록 옆 댓글 아이콘 (댓글 수 배지)
- 댓글 사이드패널 (블록 클릭 시 열림)
- @멘션 자동완성 (팀원 목록)

---

## 2. D1 마이그레이션

### 0048_ax_idea_bmc_links.sql
```sql
CREATE TABLE ax_idea_bmc_links (
  id         TEXT PRIMARY KEY,
  idea_id    TEXT NOT NULL,
  bmc_id     TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(idea_id, bmc_id)
);
CREATE INDEX idx_links_idea_id ON ax_idea_bmc_links(idea_id);
CREATE INDEX idx_links_bmc_id ON ax_idea_bmc_links(bmc_id);
```

### 0049_ax_bmc_comments.sql
```sql
CREATE TABLE ax_bmc_comments (
  id         TEXT PRIMARY KEY,
  bmc_id     TEXT NOT NULL,
  block_type TEXT,
  author_id  TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_comments_bmc_id ON ax_bmc_comments(bmc_id);
CREATE INDEX idx_comments_block ON ax_bmc_comments(bmc_id, block_type);
```

---

## 3. Worker Plan

| Worker | Feature | 파일 범위 | 테스트 |
|--------|---------|-----------|--------|
| W1 | F203 아이디어-BMC 연결 | services/idea-bmc-link-service.ts, routes/ax-bd-links.ts, schemas/idea-bmc-link.schema.ts, migration 0048, Web: IdeaBmcLinkButton, BmcSelectModal | ~15 tests |
| W2 | F204 BMC 댓글 | services/bmc-comment-service.ts, routes/ax-bd-comments.ts, schemas/bmc-comment.schema.ts, migration 0049, Web: CommentPanel, CommentBadge | ~15 tests |

**파일 충돌 없음**: W1은 links, W2는 comments — 독립 도메인.
**app.ts 라우트 등록**: 리더가 merge 후 일괄 추가 (충돌 방지).

---

## 4. 테스트 전략

- API 테스트: `ax-bd-links.test.ts` (F203), `ax-bd-comments.test.ts` (F204)
- 에러 케이스: 404 BMC/Idea 미존재, 409 중복 연결, 403 타인 댓글 삭제
- 블록별 댓글 수 집계 정확성
- 멘션 파싱 정규식 검증

---

## 5. Sprint 62와의 병렬 실행 전략

Sprint 62 (F199 BMCAgent + F200 버전히스토리)와 동시에 실행한다.

**독립 보장 근거**:
- Sprint 62 파일: `bmc-agent-service.ts`, `bmc-history-service.ts`, `ax-bd-agent.ts`, `ax-bd-history.ts`
- Sprint 64 파일: `idea-bmc-link-service.ts`, `bmc-comment-service.ts`, `ax-bd-links.ts`, `ax-bd-comments.ts`
- **공유 파일 없음** — `app.ts` 라우트 등록만 merge 시 동시 추가

**Merge 전략**: Sprint 62 먼저 merge → Sprint 64 rebase → merge (migration 번호 조정 가능)
