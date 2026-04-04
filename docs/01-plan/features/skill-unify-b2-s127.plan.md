---
code: FX-PLAN-S127
title: "Sprint 127 Plan — F306 DERIVED/CAPTURED → SKILL.md 자동 생성 (D3 해소)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-SPEC-SKILL-UNIFY]]"
  - "[[FX-PLAN-S125]]"
---

# Sprint 127 Plan — F306 DERIVED/CAPTURED → SKILL.md 자동 생성

## 1. 목표

D3 단절 해소 — 승인된 DERIVED/CAPTURED 후보가 SKILL.md를 자동 생성하여 CC에서 즉시 실행 가능.

| F-item | 제목 | REQ | 단절 |
|--------|------|-----|:----:|
| F306 | DERIVED/CAPTURED → SKILL.md 자동 생성 | FX-REQ-298 | D3 |

## 2. 현재 상태

**이미 구현된 것 (Phase 10, F276~F277)**:
- `DerivedSkillGeneratorService.generate()` — 패턴 → 후보 생성
- `CapturedSkillGeneratorService.generate()` — 워크플로우 → 후보 생성
- `POST /skills/derived/candidates/:id/review` — HITL 리뷰 (approve/reject)
- 승인 시 `skill_registry`에 자동 등록 (`registered_skill_id` 설정)
- `derived_candidates`, `captured_candidates` D1 테이블

**없는 것 (D3 단절)**:
- SKILL.md 파일 생성 로직 없음
- 승인 후 marketplace 등록 플로우 없음
- SKILL.md 다운로드/배포 API 없음

## 3. 구현 계획

### A. SKILL.md 생성 서비스
1. `SkillMdGeneratorService` — 후보 데이터를 SKILL.md 템플릿으로 렌더링
   - 입력: `SkillRegistryEntry` + 후보 상세 (prompt, category, tags)
   - 출력: SKILL.md 텍스트 (frontmatter + body)
   - 템플릿: ax-marketplace SKILL.md 포맷 호환

### B. Deploy API
1. `POST /api/skills/registry/:skillId/deploy` — SKILL.md 생성 + 다운로드
   - admin only
   - 응답: `{ skillMd: string, fileName: string }`
   - 옵션: `{ format: "download" | "preview" }`

### C. 리뷰 후 자동 생성 연동
1. DerivedReviewService.review() 승인 시 → SKILL.md 자동 생성 + D1 저장
2. CapturedReviewService (동일 패턴)
3. `skill_registry` 테이블에 `skill_md_content` 컬럼 추가? 또는 별도 테이블?
   → 기존 스키마 변경 최소화: `skill_md_content TEXT` 컬럼 추가 (D1 migration)

### D. 테스트
1. SKILL.md 생성 서비스 단위 테스트
2. Deploy API 통합 테스트
3. 리뷰→생성 연동 테스트

## 4. 변경 파일 예상

| 파일 | 동작 |
|------|------|
| `packages/api/src/services/skill-md-generator.ts` | 신규 — SKILL.md 렌더링 |
| `packages/api/src/routes/skill-registry.ts` | POST /:skillId/deploy 추가 |
| `packages/api/src/services/derived-review.ts` | 승인 시 SKILL.md 생성 연동 |
| `packages/api/src/services/captured-review.ts` | 승인 시 SKILL.md 생성 연동 |
| `packages/api/src/schemas/skill-registry.ts` | deploySkillSchema 추가 |
| `packages/api/src/db/migrations/0089_skill_md_content.sql` | skill_md_content 컬럼 |
| `packages/api/src/__tests__/skill-md-generator.test.ts` | 신규 — 생성 테스트 |
| `packages/api/src/__tests__/skill-deploy.test.ts` | 신규 — 배포 테스트 |

## 5. 성공 기준

- [ ] 승인된 DERIVED candidate → SKILL.md 자동 생성
- [ ] `GET /api/skills/registry/:skillId/deploy` SKILL.md 다운로드
- [ ] 생성된 SKILL.md가 ax-marketplace 포맷 호환
- [ ] typecheck + lint + test 통과
