---
code: FX-DSGN-S96
title: "Sprint 96 — HITL 인터랙션 패널 설계 (F266)"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-FDU]], [[FX-PLAN-S96]]"
---

# Sprint 96: HITL 인터랙션 패널 설계 (F266)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F266 HITL 인터랙션 + 결과물 확인 — 인라인 패널 |
| Sprint | 96 |
| 상위 설계 | [[FX-DSGN-FDU]] §5 |
| 핵심 | 사이드 드로어에서 산출물 4-action (승인/수정/재생성/거부) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 스킬 실행 결과를 확인·검증할 인터페이스 없음 |
| Solution | 사이드 드로어 HITL 패널 + 리뷰 이력 |
| Function UX Effect | 스킬 실행 → 즉시 결과 검토 → 승인 시 다음 단계 자동 연결 |
| Core Value | HITL 워크플로우로 AI 산출물 품질 보장 |

---

## 1. 컴포넌트 구조

```
DiscoveryWizard.tsx (기존)
  └── HitlReviewPanel.tsx [신규] — 사이드 드로어 (우측 480px)
       ├── ArtifactViewer — 산출물 마크다운 렌더링
       ├── ReviewActions — 4-action 버튼 (승인/수정/재생성/거부)
       ├── EditMode — textarea + 미리보기 토글 (수정 시)
       ├── RejectReasonInput — 거부 사유 입력 (거부 시)
       └── ReviewHistory — 리뷰 이력 타임라인
```

## 2. API 설계

### 2.1 HITL Review 서비스

```typescript
// packages/api/src/services/hitl-review-service.ts [신규]
export class HitlReviewService {
  constructor(private db: D1Database) {}

  // 리뷰 기록 생성 + artifact 상태 전환
  async submitReview(input: {
    orgId: string;
    artifactId: string;
    reviewerId: string;
    action: 'approved' | 'modified' | 'regenerated' | 'rejected';
    reason?: string;
    modifiedContent?: string;
  }): Promise<HitlReview>

  // artifact 리뷰 이력 조회
  async getHistory(artifactId: string): Promise<HitlReview[]>
}
```

### 2.2 라우트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/hitl/review` | 리뷰 기록 생성 + 상태 전환 |
| GET | `/hitl/history/:artifactId` | 리뷰 이력 조회 |

### 2.3 Zod 스키마

```typescript
// packages/api/src/schemas/hitl-review-schema.ts [신규]
submitReviewSchema = z.object({
  artifactId: z.string().min(1),
  action: z.enum(['approved', 'modified', 'regenerated', 'rejected']),
  reason: z.string().optional(),         // 거부 시 필수
  modifiedContent: z.string().optional(), // 수정 시 필수
})
```

## 3. D1 마이그레이션

```sql
-- 0078_hitl_reviews.sql
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

## 4. BdArtifact 상태 확장

기존 `pending|running|completed|failed` → `approved|rejected` 추가:

```
pending → running → completed → approved
                             → rejected
                             → (수정 시 새 버전 생성)
```

- `bd-artifact-service.ts`: `updateStatus()` 메서드로 상태 전환
- `bd-artifact.ts` 스키마: `status` enum에 `approved`, `rejected` 추가

## 5. 파일 변경 매트릭스

| # | 유형 | 파일 | 설명 |
|---|------|------|------|
| 1 | 신규 | `api/src/services/hitl-review-service.ts` | 리뷰 CRUD + artifact 상태 전환 |
| 2 | 신규 | `api/src/routes/hitl-review.ts` | POST /hitl/review, GET /hitl/history/:artifactId |
| 3 | 신규 | `api/src/schemas/hitl-review-schema.ts` | Zod 스키마 |
| 4 | 신규 | `api/src/db/migrations/0078_hitl_reviews.sql` | hitl_artifact_reviews 테이블 |
| 5 | 신규 | `web/src/components/feature/discovery/HitlReviewPanel.tsx` | 사이드 드로어 UI |
| 6 | 수정 | `api/src/app.ts` | hitl-review 라우트 등록 |
| 7 | 수정 | `api/src/schemas/bd-artifact.ts` | status enum에 approved/rejected 추가 |
| 8 | 수정 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | HITL 패널 연결 |
| 9 | 수정 | `web/src/lib/api-client.ts` | HITL API 함수 추가 |
| 10 | 신규 | `api/src/__tests__/hitl-review-service.test.ts` | 서비스 단위 테스트 |
| 11 | 신규 | `api/src/__tests__/hitl-review-route.test.ts` | 라우트 통합 테스트 |

## 6. 테스트 전략

- **서비스 테스트**: 리뷰 CRUD + artifact 상태 전환 (approved/rejected) + modified 시 새 버전
- **라우트 테스트**: 인증 + 스키마 검증 + 에러 케이스 (artifact 미존재, 거부 시 reason 누락)
- **컴포넌트**: 4-action 버튼 렌더링 + 수정 모드 토글 + 거부 사유 입력

## 7. 성공 기준

- [ ] 4-action(승인/수정/재생성/거부) 모두 동작
- [ ] 승인 시 artifact status='approved'
- [ ] 거부 시 reason 필수 검증
- [ ] 리뷰 이력 D1 저장 + 조회
- [ ] 테스트 5건 이상 통과
