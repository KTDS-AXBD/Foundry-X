---
code: FX-PLAN-103
title: "Sprint 103 — 스킬 실행 메트릭 수집 (F274)"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Claude
---

# Sprint 103 Plan — 스킬 실행 메트릭 수집 (F274)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F274: Track A — 스킬 실행 메트릭 수집 |
| Sprint | 103 |
| 기간 | 2026-04-02 |
| 선행 | F270~F272 (O-G-D Agent Loop) |
| PRD | [[FX-PLAN-SKILLEVOL-001]] |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 실행 결과가 artifact에만 저장, 스킬별 성공률/비용/버전 이력 추적 불가 |
| Solution | D1 4테이블(skill_executions/versions/lineage/audit_log) + 메트릭 API + 대시보드 연동 |
| Function UX Effect | 스킬별 성공률·비용·토큰 효율성 대시보드 조회, 버전별 비교, lineage 추적 |
| Core Value | BD 스킬 투자 대비 효과 정량화 → 스킬 최적화 근거 확보 |

## §1 범위

### 포함
1. **D1 마이그레이션 4개 테이블** (0080)
   - `skill_executions` — 스킬 실행 이력 (실행 시간, 토큰, 비용, 상태)
   - `skill_versions` — 스킬 버전 메타데이터 (프롬프트 해시, 모델, 변경 사유)
   - `skill_lineage` — 스킬 간 파생 관계 (parent→child)
   - `skill_audit_log` — 감사 로그 (누가, 언제, 무엇을 변경)
2. **SkillMetricsService** — 메트릭 기록 + 집계 서비스
3. **API 엔드포인트** — 스킬 메트릭 조회 (5개)
4. **BdSkillExecutor 통합** — 실행 시 자동 메트릭 기록
5. **Zod 스키마 + shared 타입**
6. **테스트** — 서비스 + 라우트 단위 테스트

### 제외
- Web 대시보드 UI (F275에서 구현)
- DERIVED/CAPTURED 엔진 (F276/F277)
- BD ROI 벤치마크 (F278)

## §2 기술 접근

### 데이터 모델
기존 `model_execution_metrics`(0021)의 모델 관점을 **스킬 관점**으로 확장.

| 테이블 | 역할 | 주요 필드 |
|--------|------|----------|
| `skill_executions` | 실행 이력 | skill_id, version, model, status, tokens, cost, duration |
| `skill_versions` | 버전 관리 | skill_id, version, prompt_hash, model, changelog |
| `skill_lineage` | 파생 관계 | parent_skill_id, child_skill_id, derivation_type |
| `skill_audit_log` | 감사 로그 | entity_type, entity_id, action, actor_id, details |

### API 설계 (5 endpoints)
```
GET  /skills/metrics                    — 전체 스킬 메트릭 요약
GET  /skills/:skillId/metrics           — 특정 스킬 상세 메트릭
GET  /skills/:skillId/versions          — 스킬 버전 이력
GET  /skills/:skillId/lineage           — 스킬 파생 관계
GET  /skills/audit-log                  — 감사 로그 조회
```

### 통합 포인트
- `BdSkillExecutor.execute()` 완료 시 `SkillMetricsService.recordExecution()` 호출
- F143 `ModelMetricsService`와 병행 — 모델 관점 + 스킬 관점 이중 기록

## §3 작업 분해

| # | 작업 | 산출물 | 예상 |
|---|------|--------|------|
| 1 | D1 마이그레이션 생성 | `0080_skill_metrics.sql` | S |
| 2 | Shared 타입 정의 | `types.ts` 확장 | S |
| 3 | Zod 스키마 정의 | `skill-metrics.ts` 스키마 | S |
| 4 | SkillMetricsService 구현 | 메트릭 기록 + 집계 | M |
| 5 | API 라우트 구현 | `skill-metrics.ts` 라우트 | M |
| 6 | BdSkillExecutor 통합 | execute() 후 메트릭 기록 | S |
| 7 | 테스트 작성 | 서비스 + 라우트 테스트 | M |

## §4 리스크

| 리스크 | 확률 | 대응 |
|--------|------|------|
| 기존 model_execution_metrics와 중복 기록 | 중 | 역할 명확 분리: 모델 관점 vs 스킬 관점 |
| D1 마이그레이션 번호 충돌 (0080) | 저 | Sprint worktree 전용, merge 시 renumber |

## §5 성공 기준

- [ ] 4테이블 D1 마이그레이션 적용 (로컬)
- [ ] 5개 API 엔드포인트 동작 확인
- [ ] BdSkillExecutor 실행 시 skill_executions 자동 기록
- [ ] 감사 로그 기록 확인
- [ ] typecheck + lint + test 통과
