---
id: FX-DESIGN-342
sprint: 342
feature: F608
req: FX-REQ-672
status: approved
date: 2026-05-05
---

# Sprint 342 Design — F608: MSA 룰 강제 교정 Pass 1

## 목표

`pnpm lint` 스코프를 `src/eslint-rules/` → `src/` 전체로 확장하고, 기존 160건 위반을 Forward-only baseline으로 등록하여 신규 위반만 CI fail로 차단.

## §1 변경 요약

| 항목 | 파일 | 변경 유형 |
|------|------|----------|
| (a) lint script 확장 | `packages/api/package.json` | 수정 |
| (b) baseline JSON | `packages/api/.eslint-baseline.json` | 신규 |
| (c) baseline check script | `scripts/lint-baseline-check.sh` | 신규 |
| (d) CI step 추가 | `.github/workflows/msa-lint.yml` | 수정 |
| (e) TDD test | `packages/api/src/eslint-rules/lint-baseline.test.ts` | 신규 |

## §2 설계 결정

### lint script wrapper vs separate script
`pnpm lint` 직접 실행 시 src/ 전체를 검사하지만 exit code 처리 방식:
- **선택**: `pnpm lint` = `eslint src/` (exit 0 보장 안 됨, 130 errors 있어 fail)
- **해결**: `lint:msa-baseline` 별도 + `lint` 기본은 `src/` + baseline check 묶음 (`lint:ci`)

실제 `pnpm lint` 직접 실행 시 src/ 전체 스캐닝 확인용으로는 `lint:check-scope` 추가.

### baseline 파일 위치
`packages/api/.eslint-baseline.json` — ESLint 설정과 동일 위치. scripts/에서도 `cd packages/api`로 접근.

## §3 데이터 플로우

```
pnpm lint:msa-baseline
  └─ scripts/lint-baseline-check.sh
       ├─ cd packages/api
       ├─ eslint src/**/*.ts -f json (full scan)
       ├─ extract fingerprints (file:line:rule) → current_set
       ├─ read .eslint-baseline.json → baseline_set
       ├─ new = current_set - baseline_set
       └─ if new > 0 → exit 1 + print new violations
                      → else exit 0
```

## §4 테스트 계약 (TDD Red Target)

`packages/api/src/eslint-rules/lint-baseline.test.ts`:

- **Case 1**: baseline에 있는 fingerprint만 current에 있으면 → new violations = 0 → exit 0 simulation
- **Case 2**: baseline에 없는 fingerprint가 current에 추가되면 → new violations = 1 → exit 1 simulation
- **Case 3**: current가 baseline 일부 subset이면 → new violations = 0 (fix된 것은 OK)

## §5 파일 매핑 (구현 대상)

| 파일 | 작업 | 비고 |
|------|------|------|
| `packages/api/package.json` | `lint` script 수정 + `lint:msa-baseline`, `lint:ci` 추가 | (a) |
| `packages/api/.eslint-baseline.json` | 160 fingerprints JSON (이미 생성됨) | (b) |
| `scripts/lint-baseline-check.sh` | baseline check script 신규 | (c) |
| `.github/workflows/msa-lint.yml` | MSA Baseline Check step 추가 | (d) |
| `packages/api/src/eslint-rules/lint-baseline.test.ts` | TDD 케이스 3개 | (e) |

## §6 Phase Exit P-a~P-i

| # | 항목 | 목표 |
|---|------|------|
| P-a | `pnpm lint:ci` 직접 실행 시 src/ 전체 적용 확증 | 오류 목록에 `src/core/...` 경로 포함 |
| P-b | `.eslint-baseline.json` fingerprint count | **160** |
| P-c | baseline check 정상 케이스 | exit 0 |
| P-d | 인위적 신규 위반 1건 추가 시 | exit 1 + 신규 fingerprint 출력 |
| P-e | typecheck + tests | GREEN 회귀 0건 |
| P-f | dual_ai_reviews sprint 342 INSERT | ≥1건 |
| P-g | F560 회귀 (fx-discovery 401) | 0 |
| P-h | F582 회귀 (DiagnosticCollector grep 21건) | 0 |
| P-i | Match | ≥90% |
