---
code: FX-PLAN-S126
title: "Sprint 126 Plan — F305 스킬 실행 메트릭 수집 (D4 해소)"
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

# Sprint 126 Plan — F305 스킬 실행 메트릭 수집

## 1. 목표

D4 단절 해소 — ax 스킬 실행 시 메트릭이 자동으로 API에 기록되어 ROI 데이터 축적 시작.

| F-item | 제목 | REQ | 단절 |
|--------|------|-----|:----:|
| F305 | 스킬 실행 메트릭 수집 | FX-REQ-297 | D4 |

## 2. 현재 상태

**이미 구현된 것 (Phase 10, F274)**:
- `SkillMetricsService.recordExecution(params)` — D1 skill_executions INSERT + audit log
- `GET /api/skills/metrics` — 전체 메트릭 요약
- `GET /api/skills/:skillId/metrics` — 상세 메트릭
- `skill_executions` D1 테이블 존재
- `RecordSkillExecutionParams` 인터페이스 정의됨

**없는 것 (D4 단절)**:
- `POST /api/skills/metrics/record` 라우트 없음 (GET만 5개)
- `recordSkillExecutionSchema` Zod 스키마 없음
- ax-marketplace usage-tracker → API 연동 없음
- CC PostToolUse hook 연동 없음

## 3. 구현 계획

### A. API 측 (POST 라우트 추가)
1. `recordSkillExecutionSchema` Zod 스키마 추가 (`packages/api/src/schemas/skill-metrics.ts`)
2. `POST /api/skills/metrics/record` 라우트 추가 (`packages/api/src/routes/skill-metrics.ts`)
   - 서비스 토큰 또는 인증된 사용자만 호출 가능
   - 기존 `recordExecution()` 서비스 메서드 활용
3. 응답: `{ id, skillId, status }`

### B. usage-tracker 훅 스크립트
1. `scripts/usage-tracker-hook.sh` — CC PostToolUse 스킬 실행 감지 + API 호출
   - 스킬 실행 감지: `/ax:` 접두사 스킬 실행 완료 시
   - 메트릭 수집: duration, tokens (추정), status
   - API 호출: `POST /api/skills/metrics/record`
   - 비동기: `curl ... &` background 전송 (CC 성능 영향 최소화)

### C. 테스트
1. recordSkillExecution 라우트 테스트
2. usage-tracker-hook.sh 단위 테스트 (mock curl)

## 4. 변경 파일 예상

| 파일 | 동작 |
|------|------|
| `packages/api/src/schemas/skill-metrics.ts` | recordSkillExecutionSchema 추가 |
| `packages/api/src/routes/skill-metrics.ts` | POST /skills/metrics/record 추가 |
| `scripts/usage-tracker-hook.sh` | 신규 — CC 스킬 실행 메트릭 수집 |
| `packages/api/src/__tests__/skill-metrics-record.test.ts` | 신규 — POST 라우트 테스트 |

## 5. 성공 기준

- [ ] `POST /api/skills/metrics/record` 호출 성공
- [ ] `skill_executions` 테이블에 레코드 생성 확인
- [ ] usage-tracker-hook.sh가 스킬 실행 후 API 호출
- [ ] typecheck + lint + test 통과
