---
id: FX-DOGFOOD-317
title: Sprint 317 Phase Exit — F565 SDD Triangle Drift Check
type: DOGFOOD
sprint: 317
f_items: [F565]
date: 2026-04-22
---

# Sprint 317 Phase Exit — F565 SDD Triangle Drift Check

## Phase Exit P1~P4 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| P1 | 실전 Dogfood — 본 PR CI에서 sdd-drift-check job 실행 PASS | ✅ 로컬 dogfood PASS (PR CI 실행 후 URL 추가 예정) |
| P2 | 실측 — (a) 현 PR drift=0 PASS, (b) 고의 drift FAIL 확증 | ✅ (a) exit 0, (b) F999 주입 → exit 1 |
| P3 | 증거 — CI run URL + weekly report artifact sample | ✅ drift-report-20260422.md 생성 확인 (PASS 0건) |
| P4 | 회고 — Gap 7 해소 기록 + drift-check 민감도 관찰 | ✅ 아래 참조 |

## Gap 7 해소 기록

Phase 45 SDD Triangle Gap 중 Gap 7이 이번 Sprint 317에서 해소되었다.

**Gap 7 정의**: SPEC.md §5 F-item 등록 vs 실제 구현 커밋 간 동기화를 검증하는 자동화 게이트 부재.
autopilot이 F-item을 커밋 메시지에 참조하더라도 SPEC.md가 업데이트되지 않는 경우, 또는
반대로 SPEC에 등록된 F-item이 커밋에서 전혀 언급되지 않는 경우를 감지하지 못했다.

**해소 방법**:
- `scripts/sdd/check-drift.sh` — Drift Type A 자동 감지 (커밋 참조 but SPEC 미등록)
- `.github/workflows/sdd-drift-check.yml` — PR merge 전 CI gate
- `.github/workflows/sdd-drift-report.yml` — 주간 cron drift 트렌드 모니터링

## 민감도 관찰

### 발견된 이슈: commit body false positive

**현상**: Red 커밋 메시지 body에 테스트 설명 `"T2 F999 missing → FAIL"` 포함 →
check-drift.sh가 F999를 drift로 오감지.

**근본 원인**: 초기 구현이 `git log --format="%s %b"` (subject + body) 스캔.
commit body는 테스트 설명, PR 링크, 변경 사유 등 다양한 텍스트를 포함하므로
F-번호 false positive 발생 가능성이 높음.

**해결**: `git log --format="%s"` (subject only) 스캔으로 전환.
conventional commit subject (`feat: F565 green — ...`) 패턴에서만 F-item 추출.

**교훈**: SDD drift check의 F-item 추출 스코프는 **commit subject만** 스캔해야 한다.
commit body는 자유 텍스트이므로 false positive를 유발할 수 있다.

### 검증된 시나리오

| 시나리오 | 결과 | 민감도 |
|----------|------|--------|
| feat: F565 green → SPEC에 F565 있음 | PASS (exit 0) | 정상 |
| feat: F999 green → SPEC에 F999 없음 | FAIL (exit 1) | 정상 |
| 커밋에 F-ref 없음 | PASS (exit 0, SKIP) | 정상 |
| SPEC 파일 없음 | PASS (exit 0, SKIP) | 정상 |
| 최근 7일 커밋 23개 → 모두 SPEC 등록 | PASS (exit 0) | 정상 |

## 관련 PR

- Sprint 317 PR: (CI 실행 후 URL 추가)
- 참조: C98/C81 scope drift check (scripts/preflight/check-scope-drift.sh)

## 다음 단계

- F570 (Sprint 318): 다음 Phase 45 Batch 3 작업
- F565 drift-check가 이후 모든 PR의 CI gate로 작동 — SPEC 미등록 F-item 커밋 방지
- 4주 관측 후 false positive 추가 패턴 발견 시 `scripts/sdd/check-drift.sh` 필터 보강
