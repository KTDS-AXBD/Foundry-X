---
id: FX-GUIDE-CODEX-SETUP
title: Codex CLI 설치 및 설정 가이드
version: 1.0
created: 2026-04-16
---

# Codex CLI 설치 및 설정 가이드

Sprint autopilot Phase 5b(Dual-AI Verification)에서 Codex CLI를 사용한다.

## 1. 사전 조건

- Node.js 20+, npm
- OpenAI 계정 (개인 또는 법인)
- 인터넷 연결 (설치 및 로그인 시)

## 2. 설치

```bash
# 자동 설치 (버전 pin 포함)
bash scripts/setup/install-codex.sh

# 또는 수동
npm install -g @openai/codex@0.120.0

# 설치 확인
codex --version
```

## 3. 인증 (1회 수동)

### 방법 A: OAuth 로그인 (권장)
```bash
codex login
# → 브라우저 열림 (WSL에서는 Windows 브라우저)
# → OpenAI 계정으로 로그인
# → 완료 후 터미널로 복귀
```

### 방법 B: API 키 직접 설정
```bash
export OPENAI_API_KEY=sk-...   # ~/.bashrc 또는 ~/.zshrc에 추가
```

> ⚠️ API 키는 코드에 하드코딩 금지 (security.md 참조)

## 4. 리뷰어 프로파일 위치

```
~/.claude-squad/profiles/codex-reviewer.md
```

설치 스크립트(`install-codex.sh`)가 자동으로 복사한다.
수동으로 복사하려면:

```bash
mkdir -p ~/.claude-squad/profiles
cp docs/guides/codex-reviewer-profile.md ~/.claude-squad/profiles/codex-reviewer.md
```

## 5. 동작 확인

```bash
# dry-run으로 현재 상태 점검
bash scripts/setup/install-codex.sh --dry-run

# 실제 리뷰 테스트 (mock 모드)
MOCK_CODEX=1 bash scripts/autopilot/codex-review.sh --sprint 300 --dry-run
```

## 6. Composite Verify 흐름

```
sprint-autopilot Phase 5 (ax:code-verify)
  → Phase 5b (scripts/autopilot/codex-review.sh)
      → Codex 리뷰 → .claude/reviews/sprint-{N}/codex-review.json
  → scripts/autopilot/composite-verify.sh
      → PASS / WARN / BLOCK / PASS-degraded
  → Phase 6 (Report) 또는 중단
```

## 7. Degraded 모드

Codex 미설치 또는 `OPENAI_API_KEY` 미설정 시 자동으로 `PASS-degraded`로 처리된다.
autopilot은 계속 진행되며 JSON에 `"degraded": true`가 기록된다.

## 8. 비용 관리

- 기본값: 월 $5 상한 (Sprint 300 pilot 기간)
- K5 지표(비용/Sprint)는 F552에서 D1 테이블에 기록 시작
- 비용 초과 시 `OPENAI_BUDGET_LIMIT=5` 환경변수로 제한

## 참고 링크

- npm: `@openai/codex`
- GitHub: `openai/codex`
- Foundry-X 리뷰어 프로파일: `docs/guides/codex-reviewer-profile.md`
