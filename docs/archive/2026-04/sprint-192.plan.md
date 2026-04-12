---
code: FX-PLAN-S192
title: Sprint 192 — F407 Gate-X Web UI + F408 다중 AI 모델 지원
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 192
f-items: [F407, F408]
---

# Sprint 192 Plan — Gate-X Web UI + 다중 AI 모델

## 1. 목표

| F-item | 제목 | REQ | 우선순위 |
|--------|------|-----|---------|
| F407 | Gate-X Web UI 대시보드 — 검증 파이프라인 운영 + 리포트 | FX-REQ-399 | P1 |
| F408 | 다중 AI 모델 지원 — LLM 추상화 레이어 + 모델별 폴백 전략 | FX-REQ-400 | P1 |

**Sprint 배경**: Sprint 189/190에서 gate-x 핵심 API(라우트 7개, 서비스 7개, 스키마 6개)와 JWT/RBAC, DO, Queue 비동기 파이프라인을 구축 완료했어요. Sprint 192는 그 위에 (1) Web UI 대시보드와 (2) 실제 LLM 호출 추상화를 추가해요.

## 2. 현재 상태 분석

### gate-x 패키지 현황 (Sprint 190 기준)
- `packages/gate-x/src/` — 완성된 API Workers
  - routes: 8개 (api-keys, ax-bd-evaluations, decisions, evaluation-report, gate-package, ogd-poc, team-reviews, validation-meetings, validation-tier)
  - services: 8개 (api-key, async-ogd, decision, evaluation-criteria, evaluation-report, evaluation, gate-package, meeting, validation)
  - middleware: 3개 (api-key, auth, tenant)
  - workers: ogd-queue-worker (LLM stub 상태 — F408 대상)
  - durable-objects: ogd-coordinator

### Gap (Sprint 192 대상)
1. **Web UI 없음**: gate-x는 API만 있고 Web UI가 없어요. BD팀이 브라우저로 검증 파이프라인을 운영할 UI가 필요해요.
2. **LLM stub**: `ogd-queue-worker.ts:28`에서 LLM 호출이 `phaseResult = Phase N result for evaluation...` 하드코딩으로 stub됨. 실제 LLM 호출 레이어가 없어요.

## 3. 구현 범위

### F407 — Gate-X Web UI 대시보드

**접근**: 별도 `packages/gate-x-web/` 패키지 생성 (기존 FX web과 분리, Vite + React 18)

**화면 구성** (5개 라우트):
1. `/` — 대시보드 홈 (검증 현황 요약: 총 건수, 상태별 분포, 최근 활동)
2. `/pipelines` — 파이프라인 목록 (evaluation 목록 + 상태 필터)
3. `/pipelines/:id` — 파이프라인 상세 (O-G-D 단계 진행, 리포트 뷰)
4. `/reports` — 리포트 목록 (evaluation-report 목록 + 다운로드)
5. `/settings` — 설정 (API Key 관리, 모델 선택)

**API 연동**: gate-x Workers API (`VITE_GATE_X_API_URL`)

**배포**: Cloudflare Pages (`gate-x-web` 프로젝트)

### F408 — 다중 AI 모델 지원

**접근**: `packages/gate-x/src/services/llm/` 하위에 LLM 추상화 레이어 구현

**파일 구조**:
```
src/services/llm/
  types.ts          — LLMProvider 인터페이스 + LLMRequest/Response 타입
  providers/
    anthropic.ts    — Claude (claude-sonnet-4-5 기본)
    openai.ts       — GPT-4o
    google.ts       — Gemini Pro
  registry.ts       — 모델 레지스트리 + 폴백 체인 관리
  index.ts          — callLLM() 팩토리 함수
```

**폴백 전략**: 주 모델 실패(timeout/rate-limit/error) 시 다음 모델로 자동 fallback
- 기본 순서: Anthropic → OpenAI → Google
- `LLMConfig`로 순서 커스터마이즈 가능

**ogd-queue-worker 연동**: stub → 실제 `callLLM()` 호출로 교체

## 4. 작업 분해

### Phase A: LLM 추상화 레이어 (F408 — gate-x 패키지)
- [ ] `src/services/llm/types.ts` — 인터페이스 정의
- [ ] `src/services/llm/providers/anthropic.ts` — Claude 호출
- [ ] `src/services/llm/providers/openai.ts` — GPT-4o 호출
- [ ] `src/services/llm/providers/google.ts` — Gemini 호출
- [ ] `src/services/llm/registry.ts` — 폴백 체인 로직
- [ ] `src/services/llm/index.ts` — callLLM() 진입점
- [ ] `src/env.ts` — LLM API Key 환경변수 추가
- [ ] `ogd-queue-worker.ts` — stub → callLLM() 교체
- [ ] `wrangler.toml` — OPENAI_API_KEY, GOOGLE_AI_API_KEY secret 추가
- [ ] 테스트 4개 (각 provider mock + registry fallback)

### Phase B: Gate-X Web UI (F407 — 신규 패키지)
- [ ] `packages/gate-x-web/` 패키지 스캐폴드 (vite.config.ts, tsconfig.json, package.json)
- [ ] `src/main.tsx` — 앱 진입점
- [ ] `src/App.tsx` — React Router 설정
- [ ] `src/lib/api.ts` — gate-x API 클라이언트
- [ ] `src/routes/dashboard.tsx` — 홈 대시보드
- [ ] `src/routes/pipelines.tsx` — 파이프라인 목록
- [ ] `src/routes/pipeline-detail.tsx` — 상세 뷰
- [ ] `src/routes/reports.tsx` — 리포트 목록
- [ ] `src/routes/settings.tsx` — 설정
- [ ] `wrangler.pages.toml` — Pages 배포 설정
- [ ] `pnpm-workspace.yaml` 갱신 (gate-x-web 추가)
- [ ] 테스트 5개 (라우트 렌더링 기본 + API client)

## 5. 의존성 및 제약

- gate-x API가 이미 배포된 `gate-x-api.ktds-axbd.workers.dev`를 사용
- LLM API Key는 `wrangler secret put`으로 등록 (ANTHROPIC_API_KEY 이미 존재)
- Cloudflare Workers CPU time 제약 — LLM 호출은 Queue + DO 비동기 패턴 유지
- gate-x-web은 별도 Pages 배포 (`gate-x-web` 프로젝트명)

## 6. 완료 기준

- [ ] F407: gate-x-web 빌드 성공 + 5개 라우트 렌더링 확인 + API 연동 동작
- [ ] F408: LLM 추상화 레이어 구현 + 폴백 테스트 통과 + ogd-queue-worker 연동
- [ ] typecheck 통과 (gate-x + gate-x-web)
- [ ] 테스트 9개 이상 통과
- [ ] Match Rate ≥ 90%
