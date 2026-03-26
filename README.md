# Foundry-X

> AX 사업개발 AI 오케스트레이션 플랫폼

## 무엇을 하나요?

AX BD팀의 사업개발 전체 라이프사이클을 AI 에이전트로 자동화해요.
수집→발굴→형상화→검증→제품화→GTM→평가 7단계를 한 곳에서.

## 왜 만들었나요?

사업기회 발굴부터 PoC/MVP 구축까지 2~4주 걸리던 과정을 3일 이내로 단축.
"Git이 진실, Foundry-X는 렌즈" — 모든 명세/코드/테스트/결정 이력이 Git에 존재하고,
Foundry-X가 이를 읽고 분석하고 동기화를 강제해요.

## 현재 상태

| 항목 | 수치 |
|------|------|
| Phase | 5d — AX BD Ideation MVP |
| Sprints | 64 완료 |
| API Endpoints | 192 |
| Services | 116 |
| Tests | 1,481+ (API) + 125 (CLI) + 121 (Web) |
| D1 Migrations | 50 |

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Commander, Ink TUI |
| API | Hono on Cloudflare Workers |
| Web | Next.js 14, React 18, Zustand |
| DB | Cloudflare D1 (SQLite) |
| AI | Anthropic + OpenAI + Gemini + DeepSeek |

## 시작하기

```bash
pnpm install
turbo build
turbo test
```

## 링크

- [Dashboard](https://fx.minu.best/dashboard)
- [API Docs](https://foundry-x-api.ktds-axbd.workers.dev)
- [npm](https://www.npmjs.com/package/foundry-x)
