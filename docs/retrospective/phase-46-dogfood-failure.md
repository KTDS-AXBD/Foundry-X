---
id: FX-RETRO-PHASE-46
title: Phase 46 Dogfood Failure 회고
phase: 46
sprint: 302
date: 2026-04-16
author: AI Agent (Sprint 302 autopilot)
status: draft
---

# Phase 46 Dogfood Failure 회고

## 1. 사건 요약

Sprint 300에서 F550(install-codex.sh) + F551(codex-review.sh) 구현이 Match Rate 98%로 merge됐으나, 2026-04-16 Smoke Reality 실측에서 **두 가지 결정적 결함** 발견.

| 결함 | 설계(F550/F551) | 실측(Sprint 300 merge 후) |
|------|----------------|--------------------------|
| install-codex.sh | npm 설치 성공 가정 | `npm install -g` EACCES (prefix=/usr/local, sudo 없음) |
| sprint-autopilot Phase 5b 호출 | codex-review.sh 호출 배선됨 | SKILL.md에 `codex-review.sh` 문자열 0건 — **Dead Code** |
| `.claude/reviews/sprint-300/codex-review.json` | 생성됨 | 파일 없음 |

## 2. 근본 원인 분석

### 2.1 Phase 43 F534 패턴 재발 (동형 결함)

| 항목 | Phase 43 F534 | Phase 46 F551 |
|------|--------------|--------------|
| 위반 규칙 | Design Stage Exit D1 | 동일 |
| 현상 | `DiagnosticCollector.record()` 주입 사이트 누락 | `codex-review.sh` 호출 주입 사이트 누락 |
| 발견 시점 | Dogfood 5회 후 | Sprint 300 merge 후 Smoke Reality |
| 해결 Sprint | Sprint 284 (F534 hotfix) | Sprint 302 (F554 hotfix) |

**동형 패턴**: "신규 훅/콜백 자산을 구현했지만, 자산을 호출하는 지점(주입 사이트)을 Design 문서 §5 파일 매핑에 누락"

### 2.2 왜 CI/CD와 Gap Analysis로 감지 못했나

1. **Gap Analysis의 한계**: Design 문서의 §5 파일 매핑에 "SKILL.md 수정" 항목 자체가 누락 → gap-detector가 비교 대상으로 인식 불가
2. **TDD Red의 한계**: T7~T9 테스트가 Sprint 300에서 작성되지 않음 (D1 체크리스트 이행 부실)
3. **Smoke Reality 미실시**: Sprint 300 merge 직후 Phase Exit 체크리스트 P2(실측 JSON 존재) 불이행

### 2.3 특수 요인

- Plugin SKILL.md는 `packages/` 외부 파일 → turbo typecheck/lint 대상 아님
- gap-detector는 `docs/02-design/` ↔ `packages/` 비교 → plugin 경로 blind spot
- autopilot이 "자기 자신"(SKILL.md)을 수정하는 재귀 구조 → 테스트 작성이 직관적이지 않음

## 3. F554 hotfix로 해소된 결함

| 항목 | 해소 방법 | 증거 |
|------|----------|------|
| install-codex.sh EACCES | user-level prefix (`$HOME/.npm-global`) 재작성 | T8 PASS |
| Phase 5c 배선 | SKILL.md에 Step 5c 블록 삽입 + cache sync | T7/T8/T9 PASS |
| dogfood JSON 없음 | `.claude/reviews/sprint-302/codex-review.json` 생성 | `jq .degraded` = false |

## 4. 재발 방지 체크리스트 (Design Stage Exit D1 강화)

기존 D1 체크리스트에 **plugin 경로 예외** 항목 추가:

```markdown
| D1-ext | Plugin SKILL.md 수정 시 — `grep -rn "신규_함수명" ~/.claude/plugins/` 로
|        | 호출 지점이 1건 이상 존재하는지 확인. 0건이면 Dead Code (주입 누락) |
```

**적용 트리거**: Design 문서에 `~/.claude/plugins/` 경로가 "수정 파일"로 등재될 때.

## 5. 관측 교훈

1. **테스트 범위를 구현 경계까지 확장**: 코드 파일뿐 아니라 plugin SKILL.md 변경도 TDD Red로 검증 가능 (문자열 grep 기반)
2. **Phase Exit P2는 흥정 불가**: "테스트 PASS + CI 통과 = 완료"는 오해. 실측 JSON 1건이 진짜 Phase Exit 조건
3. **autopilot이 자신을 검증하는 재귀 구조** → Sprint 302가 Phase 5c를 실제로 통과한 것 자체가 검증 증거

## 6. 영향 범위

- **F550/F551**: `✅(partial)` → `✅` (F554 해소 후)
- **Phase 46 Dual-AI Verification**: Smoke Reality 재판정 PASS 조건 충족
- **sprint-autopilot SKILL.md**: Step 5c 영구 추가 → 이후 모든 Sprint에 Codex Cross-Review 적용

## 7. 관련 문서

- `docs/01-plan/features/sprint-302.plan.md` — F554 Plan
- `docs/02-design/features/sprint-302.design.md` — F554 Design
- `.claude/reviews/sprint-302/codex-review.json` — dogfood 증거
- `.claude/rules/process-lifecycle.md §Stage 3 Exit D1` — 재발 방지 근거
