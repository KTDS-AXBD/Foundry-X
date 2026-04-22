---
id: FX-PLAN-317
title: Sprint 317 Plan — F565 SDD Triangle 동기화 CI 게이트
type: PLAN
status: ACTIVE
sprint: 317
f_items: [F565]
req_codes: [FX-REQ-608]
created: 2026-04-22
---

# Sprint 317 Plan — F565 SDD Triangle 동기화 CI 게이트

## 목적

Phase 45 Gap 7 해소. SPEC.md §5 F-item 등록 상태와 git commit 이력이 일치하지 않는 "SDD drift"를 CI에서 자동 감지하여 PR merge 전에 차단한다.

## F565 범위

| 항목 | 내용 |
|------|------|
| (a) CI gate | `.github/workflows/sdd-drift-check.yml` — PR 시 SPEC §5 F-item vs git commit 교차 검증, drift > 0건 exit 1 |
| (b) 교차 검증 로직 | `scripts/sdd/check-drift.sh` — F-item 번호 추출 + 상호 존재 여부 대조 |
| (c) TDD 테스트 | `scripts/sdd/__tests__/test-sdd-drift.sh` — drift=0 PASS / 고의 drift FAIL 시나리오 |
| (d) 주간 리포트 | `.github/workflows/sdd-drift-report.yml` — 월요일 09:00 KST cron, artifact upload |
| (e) Phase Exit | `docs/dogfood/sprint-317-sdd-drift.md` — P1~P4 회고 |

## 의존성

- 선행 필수: 없음 (CI-only, DB 변경 없음)
- 참조: `scripts/preflight/check-scope-drift.sh` (C81) — 다른 레이어의 drift check, 패턴 참조용

## Out of Scope

- F569 잔여 (c) 버전관리 전략 / (e) CI turbo 전환 / (f) Remote cache
- 기존 workflow 수정: deploy.yml / deploy-gate-x.yml / e2e*.yml / msa-lint.yml / preflight.yml
- packages/*/src 프로덕션 코드 변경

## 성공 기준

| 기준 | 측정 방법 |
|------|----------|
| sdd-drift-check CI job PASS | PR CI run URL 증거 |
| drift=0 → PASS, drift>0 → FAIL | 테스트 fixture 시나리오 2종 |
| 주간 리포트 artifact 생성 | `.github/workflows/sdd-drift-report.yml` cron 확인 |
| Match Rate ≥ 90% | Gap Analysis |
