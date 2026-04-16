---
id: FX-DESIGN-SPRINT-302
title: Sprint 302 Design — F554 Phase 46 hotfix
sprint: 302
phase: 46
features: [F554]
req: [FX-REQ-591]
created: 2026-04-16
status: design
---

# Sprint 302 Design — F554 Phase 46 hotfix

## 1. 문제 진단 (Stage 3 Entry)

Sprint 300 Smoke Reality 실패 근본 원인:
- `install-codex.sh`: `npm install -g` 사용 시 `/usr/local/lib/node_modules` EACCES 발생 (sudo 없음)
- `sprint-autopilot` SKILL.md: Phase 5b에 `codex-review.sh` 호출 코드 없음 → Dead Code
- Design Stage Exit D1 위반: autopilot skill이 신규 훅 주입 사이트인데 §5 파일 매핑에 미기재

## 2. 변경 범위

### 2.1 `scripts/setup/install-codex.sh` 재작성
**문제**: `npm install -g` → EACCES (npm prefix = `/usr/local`)  
**해결**: user-level prefix 설정 후 설치

```bash
# 핵심 변경: sudo 제거, user prefix 강제
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g "@openai/codex@0.120.0"
```

**추가 기능**: OpenRouter base_url 오버라이드 검증
```bash
# ~/.config/codex/config.toml에 base_url 설정 확인
check_openrouter_override() {
  CONFIG_FILE="$HOME/.config/codex/config.toml"
  if [ -f "$CONFIG_FILE" ] && grep -q "openrouter" "$CONFIG_FILE"; then
    log "✅ OpenRouter base_url 설정 확인됨"
  else
    log "ℹ️  OpenRouter 미설정 (OpenAI 직접 키 모드)"
  fi
}
```

### 2.2 `sprint-autopilot` SKILL.md — Phase 5c 삽입

**위치**: Step 5b(E2E Verify) **직후**, Step 6(Report) **직전**

```markdown
### Step 5c: Codex Cross-Review (Dual-AI Verification, F554)

1. `bash scripts/autopilot/codex-review.sh --sprint $N`
2. 결과 파싱: `.claude/reviews/sprint-$N/codex-review.json`
3. verdict == BLOCK → autopilot 중단 + Signal STATUS=BLOCKED
4. verdict == WARN  → 경고 로그 + Report 진행
5. verdict == PASS  → Report 단계로
6. degraded=true   → PASS-degraded 처리 (관측 로그만)
```

**파일 동기화 필요** (development-workflow.md §ax plugin 스킬 내용 수정):
- source: `~/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md`
- cache: `~/.claude/plugins/cache/ax-marketplace/ax/*/skills/sprint-autopilot/SKILL.md`

### 2.3 `.claude/reviews/sprint-302/codex-review.json` — dogfood 증거

Sprint 302 autopilot 자체 실행 결과. `degraded: false` 확증이 Phase Exit P2 조건.
- MOCK_CODEX 모드가 아닌 실제 Codex 실행 or OpenRouter fallback
- 단, Codex/OpenAI 키 미설정 → degraded=true 허용 + Phase 46 R1 리스크로 기록

### 2.4 `docs/retrospective/phase-46-dogfood-failure.md`

Phase 43 F534/F536 패턴 재발에 대한 분석 + Design Stage Exit D1 재발 방지.

## 3. 테스트 계약 (TDD Red Target)

### 3.1 `scripts/setup/install-codex.test.sh` 추가 (F554)
```
T8: install-codex.sh에 "npm-global" 또는 "npm config set prefix" 문자열 포함
T9: install-codex.sh에 "sudo" 문자열 없음 (EACCES 방지 검증)
T10: --dry-run 실행 시 npm prefix 출력 포함
```

### 3.2 `scripts/autopilot/codex-review.test.sh` 추가 (F554)  
```
T7: sprint-autopilot SKILL.md에 "codex-review.sh" 문자열 존재
T8: sprint-autopilot SKILL.md에 "BLOCK" verdict 처리 문자열 존재
T9: sprint-autopilot SKILL.md에 "5c" 또는 "Codex Cross-Review" 섹션 존재
T10: sprint-302 dogfood JSON 생성 (MOCK_CODEX=1로 검증)
```

## 4. 파일 매핑 §5 (D1 주입 사이트 전수 검증)

| 파일 | 변경 유형 | 이유 |
|------|----------|------|
| `scripts/setup/install-codex.sh` | 수정 | user prefix + OpenRouter 검증 추가 |
| `scripts/setup/install-codex.test.sh` | 수정 | T8~T10 추가 (F554 Red) |
| `scripts/autopilot/codex-review.test.sh` | 수정 | T7~T10 추가 (F554 Red) |
| `~/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md` | 수정 | Phase 5c 삽입 (D1 주입 사이트) |
| `~/.claude/plugins/cache/ax-marketplace/ax/1.1.0/skills/sprint-autopilot/SKILL.md` | 수정 | cache sync (development-workflow.md 3단계) |
| `.claude/reviews/sprint-302/codex-review.json` | 생성 | dogfood 증거 (Phase Exit P2) |
| `docs/retrospective/phase-46-dogfood-failure.md` | 생성 | Phase Exit P4 |

**D1 주입 사이트**: SKILL.md Step 5b 직후 → Step 5c 블록  
**D2 식별자 계약**: `sprint-$N` → `sprint-{N}` (숫자) 포맷 일관성 확인됨  
**D3 Breaking change**: SKILL.md는 plugin cache 양쪽 동기화 필수 (실행 중인 다른 pane 영향 없음 — symlink 공유)  
**D4 TDD Red**: 위 test 파일 수정 후 FAIL 확인 필요

## 5. Phase Exit 체크리스트

| # | 항목 | 판정 |
|---|------|------|
| P1 | Sprint 302 autopilot 1회 실행 | signal STATUS=DONE 확인 |
| P2 | `.claude/reviews/sprint-302/codex-review.json` 존재 | `jq '.verdict'` 유효 |
| P3 | install-codex.sh 재작성 완료 | T8~T9 PASS |
| P4 | 회고 문서 생성 | `docs/retrospective/phase-46-dogfood-failure.md` |
