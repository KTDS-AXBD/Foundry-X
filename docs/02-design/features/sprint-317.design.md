---
id: FX-DESIGN-317
title: Sprint 317 Design — F565 SDD Triangle 동기화 CI 게이트
type: DESIGN
status: ACTIVE
sprint: 317
f_items: [F565]
req_codes: [FX-REQ-608]
created: 2026-04-22
---

# Sprint 317 Design — F565 SDD Triangle 동기화 CI 게이트

## §1 개요

SDD Triangle의 "Spec ↔ Code 동기화" 축을 자동화한다. 구체적으로:
- **Drift 정의**: git commit 메시지에서 F-item 번호를 참조했지만, SPEC.md §5에 해당 F-item row가 존재하지 않는 경우
- **역방향 drift**: SPEC §5에 등록되어 있으나 연관 커밋이 전혀 없는 ✅ F-item (주간 리포트용)

## §2 아키텍처

```
PR push
  └─► sdd-drift-check.yml
        └─► scripts/sdd/check-drift.sh
              ├── SPEC.md §5 파싱 → F-item 번호 Set A
              ├── git log (PR range) 파싱 → F-item 번호 Set B
              ├── Drift Type A: B \ A (커밋 참조 but SPEC 미등록)
              └── exit 0 (drift=0) / exit 1 (drift>0 → PR FAIL)

Weekly cron (월요일 09:00 KST = UTC 00:00)
  └─► sdd-drift-report.yml
        └─► scripts/sdd/check-drift.sh --report
              ├── Full SPEC §5 scan
              ├── git log --since=7days
              └─► drift-report-YYYYMMDD.md → artifact upload
```

## §3 check-drift.sh 로직 상세

### 입력 파라미터

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SPEC_FILE` | `SPEC.md` | SPEC 경로 |
| `COMMIT_RANGE` | `origin/master...HEAD` | git log range (PR 모드) |
| `SINCE_DATE` | — | `--since=` 인자 (주간 모드) |
| `REPORT_MODE` | `false` | `true` 시 전체 리포트 출력 |
| `MOCK_GIT_LOG` | — | 테스트용 mock 파일 경로 |

### F-item 번호 추출 패턴

```bash
# SPEC.md §5에서: | F565 | ... 형태 → "F565"
grep -E "^\| F[0-9]{3,}" "$SPEC_FILE" | grep -oE "F[0-9]{3,}" | sort -u

# git commit messages에서: "feat: F565 green", "F565", "F565+F566" 형태
git log "$COMMIT_RANGE" --format="%s %b" | grep -oE "\bF[0-9]{3,}\b" | sort -u
```

### Drift 판정

```
Set A = SPEC §5 F-item numbers
Set B = git commit F-item references (current range)

Drift Type A (hard fail): B \ A → 커밋이 참조하지만 SPEC에 없음
Drift Type B (report only): ✅ rows in A with no git evidence in SINCE period
```

### Exit 코드

| 코드 | 의미 |
|------|------|
| 0 | drift = 0 (PASS) 또는 SKIP (SPEC 없음 / 커밋 없음) |
| 1 | Drift Type A ≥ 1건 (PR FAIL) |

## §4 테스트 계약 (TDD Red Target)

`scripts/sdd/__tests__/test-sdd-drift.sh`

| # | 시나리오 | 입력 | 기대 exit |
|---|----------|------|-----------|
| T1 | PASS: 커밋이 F565 참조, SPEC에 F565 있음 | fixture_spec_has_f565.md + mock log F565 | 0 |
| T2 | FAIL: 커밋이 F999 참조, SPEC에 F999 없음 | fixture_spec_no_f999.md + mock log F999 | 1 |
| T3 | PASS: 커밋 없음 (no F-ref) | 임의 SPEC + empty log | 0 |
| T4 | PASS: SPEC 파일 없음 → SKIP | NO_SPEC + mock log | 0 |

## §5 파일 매핑 (구현 대상)

| 파일 | 행위 | 비고 |
|------|------|------|
| `scripts/sdd/check-drift.sh` | 신규 생성 | drift 감지 메인 스크립트 |
| `scripts/sdd/__tests__/test-sdd-drift.sh` | 신규 생성 | TDD 테스트 (T1~T4) |
| `.github/workflows/sdd-drift-check.yml` | 신규 생성 | PR CI gate |
| `.github/workflows/sdd-drift-report.yml` | 신규 생성 | 주간 cron 리포트 |
| `docs/dogfood/sprint-317-sdd-drift.md` | 신규 생성 | Phase Exit P1~P4 |

**수정 금지 파일**: deploy.yml, deploy-gate-x.yml, e2e*.yml, msa-lint.yml, preflight.yml, packages/*

## §6 D1~D4 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 — check-drift.sh는 workflow에서 1회 호출, 테스트에서 직접 호출 | PASS |
| D2 | 식별자 계약 — F-item 번호 패턴 `\bF[0-9]{3,}\b` (3자리 이상) 생산/소비 동일 regex | PASS |
| D3 | Breaking change — 신규 파일만, 기존 workflow 변경 없음 | N/A |
| D4 | TDD Red 파일 — test-sdd-drift.sh (Red commit 예정) | 이 문서 기준 진행 |
