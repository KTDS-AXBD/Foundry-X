---
id: FX-DESIGN-SPRINT-300
title: Sprint 300 Design — Dual-AI Verification 착수 (F550 + F551)
sprint: 300
phase: 46
features: [F550, F551]
req: [FX-REQ-587, FX-REQ-588]
status: in-progress
created: 2026-04-16
---

# Sprint 300 Design — Dual-AI Verification 착수

## 1. 전체 아키텍처

```
[sprint-autopilot Phase 5]
        ↓ (Phase 5 완료 후)
[Phase 5b: codex-review.sh]  ←── PRD diff PR본문
        ↓
  codex exec → stdout JSON
        ↓
[composite-verify.sh]
  Claude result + Codex JSON → verdict
        ↓
  PASS → Phase 6  /  WARN → 사용자 확인  /  BLOCK → alert+중단
```

### Codex 의존성 경로
```
@openai/codex@0.120.0 (npm global)
  → codex login (OpenAI OAuth, 1회 수동)
  → ~/.config/codex/config.toml (프로파일 경로 지정)
  → ~/.claude-squad/profiles/codex-reviewer.md (리뷰어 instruction)
```

## 2. O2 상태 (OpenAI 계정)

> ⚠️ O2(OpenAI 계정 결정)는 사전 조건. 스크립트 구현은 계정 독립적이나,
> `codex login` + 실제 실행은 Sinclair가 수동으로 1회 수행 필요.

Degraded fallback 구현 포함 — Codex 미설치/미로그인 시 `PASS-degraded` 자동 처리.

## 3. 모듈 구성

### F550 산출물
| 파일 | 역할 |
|------|------|
| `scripts/setup/install-codex.sh` | npm 전역 설치 + 버전 pin + OPENAI_API_KEY 체크 |
| `scripts/setup/install-codex.test.sh` | 설치 스크립트 검증 (dry-run 모드) |
| `docs/guides/codex-setup.md` | OpenAI 키 발급 → `codex login` → 검증 절차 |
| `~/.claude-squad/profiles/codex-reviewer.md` | 리뷰어 instruction (read-only enforced) |

### F551 산출물
| 파일 | 역할 |
|------|------|
| `scripts/autopilot/codex-review.sh` | PRD+diff 수집 → `codex exec` → JSON 저장 |
| `scripts/autopilot/composite-verify.sh` | Claude + Codex verdict merge → 최종 판정 |
| `scripts/autopilot/codex-review.test.sh` | mock Codex 응답으로 JSON 파싱 검증 |
| `scripts/autopilot/composite-verify.test.sh` | 5가지 매트릭스 케이스 검증 |

## 4. 인터페이스 계약 (D2 식별자 계약)

### codex-review.sh 입출력
```bash
# 입력
SPRINT_NUM=300
PRD_PATH=docs/specs/fx-codex-integration/prd-final.md
# 출력 경로: .claude/reviews/sprint-{N}/codex-review.json

# JSON 스키마
{
  "verdict": "PASS" | "WARN" | "BLOCK",
  "prd_coverage": {
    "covered": ["FX-REQ-587", "FX-REQ-588"],
    "missing": []
  },
  "phase_exit_checklist": {
    "D1": "PASS" | "FAIL" | "SKIP",
    "D2": "PASS" | "FAIL" | "SKIP",
    "D3": "PASS" | "FAIL" | "SKIP",
    "D4": "PASS" | "FAIL" | "SKIP"
  },
  "code_issues": [],
  "over_engineering": [],
  "divergence_score": 0.0,
  "model": "codex-cli",
  "timestamp": "ISO8601",
  "degraded": false
}
```

### composite-verify.sh 입출력
```bash
# 입력: CODEX_JSON_PATH, CLAUDE_VERIFY_STATUS (PASS/FAIL)
# 출력: COMPOSITE_VERDICT (PASS/WARN/BLOCK/PASS-degraded)
# 판정 매트릭스:
#   Claude=PASS  + Codex=PASS        → PASS
#   Claude=PASS  + Codex=WARN        → WARN
#   Claude=PASS  + Codex=BLOCK       → BLOCK
#   Claude=FAIL  + Codex=*           → BLOCK
#   Claude=*     + Codex=unavailable → PASS-degraded
```

## 5. 파일 매핑 (D1 주입 사이트 전수)

| 파일 | 수정/신규 | 설명 |
|------|-----------|------|
| `scripts/setup/install-codex.sh` | 신규 | F550 핵심 |
| `scripts/setup/install-codex.test.sh` | 신규 | F550 TDD Red |
| `scripts/autopilot/codex-review.sh` | 신규 | F551 핵심 |
| `scripts/autopilot/composite-verify.sh` | 신규 | F551 핵심 |
| `scripts/autopilot/codex-review.test.sh` | 신규 | F551 TDD Red |
| `scripts/autopilot/composite-verify.test.sh` | 신규 | F551 TDD Red |
| `docs/guides/codex-setup.md` | 신규 | F550 가이드 |
| `.claude/reviews/sprint-300/` | 신규 디렉터리 | 리뷰 결과 저장 |

> **D3 Breaking change**: 기존 `scripts/autopilot/` 없음 → 신규 디렉터리. 기존 autopilot 시그니처 무영향.

## 6. TDD Red Target

### F550 Red
```bash
# install-codex.test.sh 실행 시 FAIL 확인
# - scripts/setup/install-codex.sh 없음 → exit 1
# - 프로파일 ~/.claude-squad/profiles/codex-reviewer.md 없음 → exit 1
```

### F551 Red
```bash
# codex-review.test.sh 실행 시 FAIL 확인
# - scripts/autopilot/codex-review.sh 없음 → exit 1
# composite-verify.test.sh FAIL
# - scripts/autopilot/composite-verify.sh 없음 → exit 1
```

## 7. Phase Exit 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| D1 | 주입 사이트 전수 — §5 파일 매핑 전부 신규/수정 반영 | 완료 후 grep 확인 |
| D2 | sprint_id 경로 계약 — `.claude/reviews/sprint-{N}/` 일치 | codex-review.sh 하드코딩 없음 확인 |
| D3 | Breaking change — 기존 scripts/ 신규 디렉터리만 | 기존 스크립트 grep 불변 확인 |
| D4 | TDD Red 파일 존재 | 4개 test.sh FAIL 확인 |
