---
code: FX-PLAN-S96
title: "Sprint 96 — HITL 인터랙션 패널 (F266)"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-FDU]]"
---

# Sprint 96: HITL 인터랙션 패널 (F266)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F266 HITL 인터랙션 + 결과물 확인 — 인라인 패널 (승인/수정/재생성/거부) |
| Sprint | 96 |
| 우선순위 | P0 |
| 의존성 | F263(위저드, Sprint 94), F260(스킬 실행), F261(산출물). F264(Help Agent)와 코드 의존 없음 → 병렬 가능 |
| Design | docs/02-design/features/fx-discovery-ux.design.md §5 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 스킬 실행 결과를 확인·검증할 인터페이스 없음 → AI 산출물 신뢰도 낮음 |
| Solution | 사이드 드로어에서 산출물 인라인 표시 + 승인/수정/재생성/거부 4-action |
| Function UX Effect | 스킬 실행 → 즉시 결과 검토 → 승인 시 다음 단계 자동 연결 |
| Core Value | HITL(Human-in-the-Loop) 워크플로우로 AI 산출물 품질 보장 |

## 작업 목록

### API (신규)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `api/src/services/hitl-review-service.ts` | 리뷰 CRUD + artifact 상태 전환 (approved/rejected) + 다음 단계 자동 연결 |
| 2 | `api/src/routes/hitl-review.ts` | POST /hitl/review, GET /hitl/history/:artifactId |
| 3 | `api/src/schemas/hitl-review-schema.ts` | Zod 스키마 |
| 4 | `api/src/db/migrations/0079_hitl_reviews.sql` | hitl_artifact_reviews 테이블 |

### Web (신규)

| # | 파일 | 설명 |
|---|------|------|
| 5 | `web/src/components/feature/discovery/HitlReviewPanel.tsx` | 사이드 드로어: 산출물 마크다운 렌더 + 4-action 버튼 + 수정 에디터 + 리뷰 이력 |

### 수정

| # | 파일 | 설명 |
|---|------|------|
| 6 | `api/src/index.ts` | hitl-review 라우트 등록 |
| 7 | `api/src/services/bd-artifact-service.ts` | approved/rejected 상태 추가 |
| 8 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | 스킬 실행 → HITL 패널 연결 |
| 9 | `web/src/lib/api-client.ts` | HITL API 함수 추가 |

### 테스트

| # | 파일 | 설명 |
|---|------|------|
| 10 | `api/src/services/__tests__/hitl-review-service.test.ts` | 리뷰 CRUD + 상태 전환 |
| 11 | `api/src/routes/__tests__/hitl-review.test.ts` | 인증 + 리뷰 기록 |

## 기술 결정

### HITL 액션별 동작

| 액션 | API 동작 | 부수 효과 |
|------|---------|-----------|
| ✅ 승인 | `artifact.status = 'approved'` | 다음 단계 입력으로 자동 연결 (discovery_wizard_progress 갱신) |
| ✏️ 수정 | 새 버전 생성 (`bd-artifact-service` version++) | 수정 내용으로 artifact.content 업데이트 |
| 🔄 재생성 | `bd-skill-executor` 재호출 | 새 artifact 생성 → 기존 것은 superseded |
| ❌ 거부 | `artifact.status = 'rejected'` + 사유 기록 | 다음 단계 미연결, 사유 필수 입력 |

### D1 스키마

```sql
CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
  reason TEXT,
  modified_content TEXT,
  previous_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_hitl_artifact ON hitl_artifact_reviews(artifact_id, created_at);
```

### 사이드 드로어 UX

- 위치: 위저드 우측 `width: 480px`
- 트리거: 스킬 실행 완료 시 자동 오픈, 또는 산출물 클릭
- 산출물: 마크다운 렌더링 (`react-markdown` 기존 사용)
- 수정 모드: textarea + 미리보기 토글

## 사전 조건

- [ ] Sprint 94 (F263) merge 완료
- [ ] bd-artifact-service에 status 필드 존재 확인
- 참고: Sprint 95 (F264)와 코드 의존 없음 — 병렬 실행 가능

## 성공 기준

- [ ] 4-action(승인/수정/재생성/거부) 모두 동작
- [ ] 승인 시 다음 단계 자동 연결
- [ ] 리뷰 이력 D1 저장 + 조회
- [ ] 테스트 2건 이상 통과
