---
id: FX-PLAN-SPRINT-300
title: Sprint 300 Plan — Dual-AI Verification 착수 (F550 + F551)
sprint: 300
phase: 46
features: [F550, F551]
req: [FX-REQ-587, FX-REQ-588]
prd: docs/specs/fx-codex-integration/prd-final.md
created: 2026-04-16
---

# Sprint 300 Plan — Dual-AI Verification 착수

Phase 46 `Dual-AI Verification` 첫 Sprint. Claude Drafter + Codex Reviewer 듀얼 AI 파이프라인의 **설치·프로파일·autopilot 훅** 까지를 Option B 압축 배치로 한 Sprint에 통합.

## 1. 목표

Sprint autopilot Verify 단계에 Codex cross-review가 **실제로 1회 이상 호출되어** BLOCK/WARN/PASS verdict를 `.claude/reviews/sprint-{N}/codex-review.json`에 남기는 상태.

- **자체 dogfood**: 본 Sprint 300의 PR 자체가 Phase 5b를 거쳐 Codex 리뷰를 받는다 (meta 검증)
- **Degraded fallback**: Codex 장애 시 Claude 단독 결과로 진행 + 플래그 기록

## 2. F-item 요약

| F-item | 제목 | REQ | 규모 | 예상 |
|--------|------|-----|------|------|
| F550 | Codex CLI 설치 + 리뷰어 프로파일 | FX-REQ-587 | S | 2~3h |
| F551 | autopilot Phase 5b 훅 + Composite Verify | FX-REQ-588 | M | 4~6h |

## 3. Open Issues 선결 상태 (2026-04-16 검증)

| ID | 상태 | 비고 |
|----|------|------|
| O1 공식 Codex CLI 명칭 | ✅ 해소 | `@openai/codex` v0.120.0 (npm), `brew install --cask codex` 대안 |
| O2 OpenAI 결제 계정 | ⚠️ **Sinclair 결정 필요** | 개인 계정 vs 법인(kt ds IT 정책). Sprint 착수 직전 최종 확정 |
| O3 Codex 리뷰 PR 노출 | 🔄 F551 구현 시 결정 | 기본값: 내부 기록만 (PR 본문 자동 주입 없음), 옵션으로 Sinclair 수동 복붙 |

## 4. F550 — 설치 + 프로파일 (S, 2~3h)

### 4.1 산출물
- `scripts/setup/install-codex.sh` — npm 전역 설치 + 버전 pin(`@openai/codex@0.120.0`) + 로그인 안내
- `~/.config/codex/config.toml` 템플릿 문서 (시크릿 아님, placeholder만)
- `~/.claude-squad/profiles/codex-reviewer.md` (신규 디렉터리 포함) — read-only 리뷰어 프로파일
- `docs/guides/codex-setup.md` — OpenAI API 키 발급 → `codex login` → 검증 절차

### 4.2 리뷰어 프로파일 요건
```markdown
Role: Read-only reviewer for Foundry-X Sprint PRs
Forbidden: any file edit, any git operation, any shell execution
Input: PRD path + PR diff + CLAUDE.md + 변경 파일 목록
Output: JSON (verdict + prd_coverage + phase_exit_checklist + code_issues + over_engineering)
Language: 한국어 우선, 필요 시 영어
```

### 4.3 TDD Red
- `scripts/setup/install-codex.test.sh` (bash 테스트) — 버전 pin 존재 확인, 환경변수 격리 확인
- 프로파일 파일 존재 + 필수 섹션 확인

## 5. F551 — autopilot 5b 훅 + Composite Verify (M, 4~6h)

### 5.1 산출물
- `scripts/autopilot/codex-review.sh` — PRD+diff+PR본문 수집 → `codex exec` CLI 호출 → JSON 결과 저장
- `.claude/reviews/sprint-{N}/codex-review.json` 스키마 문서
- `scripts/autopilot/composite-verify.sh` — `/ax:code-verify` 결과 + Codex JSON merge → verdict 확정
- `/ax:sprint-autopilot` Phase 5b 훅 삽입점 — 기존 Phase 5(Verify) 종료 직후 호출
- `tmux send-keys` alert 시 BLOCK 시 사용자 개입 대기

### 5.2 Composite 판정 로직
| Claude | Codex | Composite |
|--------|-------|-----------|
| PASS | PASS | **PASS** → Phase 6 진행 |
| PASS | WARN | **WARN** → 사용자 확인 후 진행 |
| PASS | BLOCK | **BLOCK** → autopilot 중단 + alert |
| FAIL | * | **BLOCK** (Claude 자체 실패) |
| * | unavailable | **PASS-degraded** → 진행 + 플래그 |

### 5.3 Divergence 지표 (F552 준비)
- `divergence_score` = Codex code_issues 중 Claude도 언급한 건수 / 전체 Codex issues
- 본 Sprint에서는 계산만 하고 저장 위치는 JSON만 (D1은 F552)

### 5.4 TDD Red
- `scripts/autopilot/codex-review.test.sh` — mock Codex 응답으로 JSON 저장·파싱 검증
- `composite-verify.test.sh` — 표 매트릭스 5가지 경우 전부 커버

## 6. Phase Exit 체크리스트

| # | 항목 | 검증 |
|---|------|------|
| D1 | F551 주입 사이트 전수 검증 | `autopilot` 호출 체인 grep — Phase 5 → 5b → 6 순서 확인 |
| D2 | 식별자 계약 | sprint_id(N) → `.claude/reviews/sprint-{N}/` 경로 일치 |
| D3 | Breaking change | `/ax:sprint-autopilot` 기존 시그니처 유지 확인 |
| D4 | TDD Red 커밋 | 2 테스트 파일 FAIL 로그 |
| P1 | Dogfood 1회 이상 | 본 Sprint 300 PR이 Phase 5b를 거침 |
| P2 | 실측 산출물 | `.claude/reviews/sprint-300/codex-review.json` 존재 + verdict 필드 비어있지 않음 |
| P3 | 6축 메트릭 | K2 BLOCK hit rate 측정 시작 (4주 관측 F553에서 종결) |
| P4 | 회고 | `docs/04-report/features/phase-46-sprint-300.md` — 첫 Codex 응답 후기 + 문제점 |

## 7. 리스크 + 완화

| 리스크 | 완화 |
|--------|------|
| Codex CLI 로그인 OAuth 브라우저 필요 | WSL → Windows 브라우저 open 검증, 실패 시 token-based 인증 fallback |
| Codex 응답 장황 (R1) | 프로파일에 출력 글자 수 상한 + JSON 강제 |
| 이중 비용 (R5) | 월 $5 상한으로 Sprint 300 1개월 pilot, K5 비용 계측 시작 |

## 8. 실행 순서

```
1. [사전] Sinclair O2 결정 (개인/법인 OpenAI 계정)
2. sprint 300 WT 생성 (bash -i -c "sprint 300")
3. F550 Red → 설치 스크립트 + 프로파일 테스트 FAIL 확인
4. F550 Green → install-codex.sh, profile 작성
5. Sinclair codex login 1회 (수동)
6. F551 Red → codex-review.sh + composite-verify.sh 테스트 FAIL
7. F551 Green → autopilot 훅 구현
8. Verify (Phase 5) — 자기 PR이 Phase 5b 통과 (self-dogfood)
9. PR → gap analysis → merge
10. Phase Exit 회고 작성
```

## 9. 의존성

- **선행**: 없음 (F541 Offering과 독립 도메인)
- **후행**: F552(D1+대시보드)는 Sprint 301에서 본 Sprint 산출 JSON 스키마 기반

## 10. 참고

- PRD: `docs/specs/fx-codex-integration/prd-final.md`
- Codex 공식 CLI: [@openai/codex on npm](https://www.npmjs.com/package/@openai/codex), [openai/codex GitHub](https://github.com/openai/codex), [developers.openai.com/codex/cli](https://developers.openai.com/codex/cli)
- 내부 보완: `docs/specs/fx-multi-agent-session/prd-final.md` (Claude Squad)
- 규칙: `.claude/rules/tdd-workflow.md`, `.claude/rules/process-lifecycle.md`
