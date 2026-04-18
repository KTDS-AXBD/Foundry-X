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

<!-- README_SYNC_START: daily-check가 SPEC.md 실측값 기준으로 자동 동기화 -->
| 항목 | 수치 |
|------|------|
| Phase | 46 (Sprint 308) |
| Sprints | 308 완료 |
| API Routes | ~11 |
| API Services | ~31 |
| API Schemas | ~14 |
| Tests | ~3,473 + E2E 273 |
| D1 Migrations | 149 (latest: 0138) |
<!-- README_SYNC_END -->

## 주요 기능

- **SDD Triangle** — Spec ↔ Code ↔ Test 상시 동기화 (Plumb 엔진)
- **에이전트 오케스트레이션** — Sprint 병렬 실행, 충돌 감지, 자동 merge
- **BD 파이프라인** — 발굴→형상화 자동 전환 (O-G-D Agent Loop)
- **Skill Unification** — 3개 스킬 시스템(CLI/Web/Plugin) 통합 관리
- **비주얼 협업** — Marker.io 피드백 + TinaCMS 콘텐츠 관리

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Commander, Ink TUI |
| API | Hono on Cloudflare Workers |
| Web | Vite 8, React 18, React Router 7, Zustand |
| DB | Cloudflare D1 (SQLite) |
| AI | Anthropic + OpenRouter (Claude, GPT, Gemini, DeepSeek) |
| Infra | Cloudflare Workers + Pages + D1 + KV |
| CI/CD | GitHub Actions (D1 migration → Workers deploy → smoke test) |

## 시작하기

```bash
pnpm install
turbo build
turbo test
```

## Phase 이력

| Phase | 범위 | Sprint |
|-------|------|--------|
| 1~5 | CLI + API + Web + 멀티테넌시 + SSO + Agent Evolution | 1~74 |
| 6 | Ecosystem Integration (BMAD/OpenSpec) | 75~78 |
| 7 | BD Pipeline E2E 통합 | 79~81 |
| 8 | IA 구조 개선 + 인증 강화 | 82~86 |
| 9 | 팀 온보딩 + BD 스킬 + 발굴 UX | 87~100 |
| 10 | O-G-D Agent Loop + Skill Evolution + BD 형상화 | 101~112 |
| 11 | IA 대개편 (12 F-items) | 113~121 |
| 12 | Skill Unification (D1~D4 단절 해소) | 125~128 |

## 링크

- [Dashboard](https://fx.minu.best/dashboard)
- [API](https://foundry-x-api.ktds-axbd.workers.dev)
- [npm](https://www.npmjs.com/package/foundry-x)
