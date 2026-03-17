---
code: FX-PLAN-008
title: Sprint 8 (v0.8.0) — API 실데이터 완성 + SSE + NL→Spec + Wiki Git 동기화
version: 0.1
status: Draft
category: PLAN
system-version: 0.8.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# Sprint 8 (v0.8.0) Planning Document

> **Summary**: Sprint 7에서 구축한 OpenAPI+D1+shadcn/ui 기반 위에, 남은 API 실데이터를 완성하고 Foundry-X 핵심 차별화 기능(NL→Spec, SSE 실시간, Wiki Git 동기화)을 구현한다.
>
> **Project**: Foundry-X
> **Version**: 0.8.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-17
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | requirements/health/integrity/freshness API가 여전히 mock이며, 에이전트 상태는 실시간 반영 안 되고, 자연어→명세 변환이 없어 비기술자 참여가 불가능하다 |
| **Solution** | F41 잔여: GitHub API+KV 캐시로 실데이터 완성 + F44: D1 기반 SSE 실시간 스트리밍 + F45: LLM 통합 NL→Spec 파이프라인 + F46: Wiki↔Git 양방향 동기화 |
| **Function/UX Effect** | requirements가 SPEC.md 실데이터 반영, 에이전트 활동이 대시보드에 실시간 표시, 자연어 입력만으로 구조화된 명세 생성, Wiki 편집이 Git 커밋으로 추적 |
| **Core Value** | Foundry-X 핵심 철학 "Git이 진실, Foundry-X는 렌즈"를 실현 — 모든 데이터가 실제 소스(Git/D1)에서 흐르고, 비기술자도 자연어로 참여 가능 |

---

## 1. Overview

### 1.1 Purpose

Sprint 8은 Foundry-X를 **프로토타입에서 실서비스로** 전환하는 마지막 인프라 스프린트예요:

- **F41 잔여**: mock 데이터 → GitHub API + KV 캐시로 실데이터 완성
- **F44 SSE 실시간**: mock SSE → D1 기반 에이전트 활동 실시간 스트리밍
- **F45 NL→Spec**: Foundry-X 핵심 차별화 — 자연어 → 구조화 명세 변환 (LLM 통합)
- **F46 Wiki Git 동기화**: Wiki CRUD ↔ Git 리포 양방향 동기화
- **릴리스**: Workers 프로덕션 재배포 + npm publish v0.8.0

### 1.2 Background

- **Sprint 7 성과**: OpenAPI 17 endpoints + D1 실데이터(wiki/auth/token/agent) + shadcn/ui (Match Rate 89%)
- **현재 한계**:
  - requirements: `node:fs` mock 잔존 → Workers에서 동작 불가
  - health/integrity/freshness: 하드코딩 mock 반환
  - SSE: 5초 간격 mock 데이터 전송 (agent.ts 117~156행)
  - NL→Spec: 미구현 (PRD §7.11에 정의, Phase 2 핵심 기능)
  - Wiki: D1 CRUD 동작하나 Git 동기화 없음
- **프로덕션 배포**: Sprint 7 코드가 Workers에 미배포 상태

### 1.3 Prerequisites (Sprint 7 완료 항목)

| 항목 | 상태 | 비고 |
|------|:----:|------|
| OpenAPI 17 endpoints | ✅ | createRoute + Zod 21스키마 |
| D1 실데이터 (wiki/auth/token/agent) | ✅ | D1 쿼리 동작 |
| shadcn/ui + 다크모드 + 반응형 | ✅ | 9개 컴포넌트 |
| 테스트 스위트 (176건) | ✅ | CLI 106 + API 43 + Web 27 |
| Workers 배포 파이프라인 | ✅ | wrangler-action + deploy.yml |
| JWT 인증 + RBAC | ✅ | signup/login/refresh |

### 1.4 Related Documents

- Sprint 7 Plan: [[FX-PLAN-007]] (`docs/01-plan/features/sprint-7.plan.md`)
- Sprint 7 Design: [[FX-DSGN-007]] (`docs/02-design/features/sprint-7.design.md`)
- Sprint 7 Analysis: [[FX-ANLS-007]] (`docs/03-analysis/features/sprint-7.analysis.md`)
- SPEC: [[FX-SPEC-001]] (`SPEC.md`) v1.9
- PRD: [[FX-SPEC-PRD-V4]] (`docs/specs/prd-v4.md`)

---

## 2. Scope

### 2.1 F-items

| F# | 제목 | REQ | Priority | 설명 | 예상 |
|----|------|-----|:--------:|------|:----:|
| F41 잔여 | API 실데이터 완성 | FX-REQ-041 | P0 | requirements GitHub API + KV 캐시 + health/integrity/freshness | 6h |
| F44 | SSE 실시간 통신 | FX-REQ-044 | P1 | Agent/Sync 상태 D1 기반 실시간 스트리밍 + Web EventSource | 4h |
| F45 | NL→Spec 변환 | FX-REQ-045 | P0 | 자연어 → 구조화 명세 변환 LLM 파이프라인 | 8h |
| F46 | Wiki Git 동기화 | FX-REQ-046 | P2 | Wiki CRUD ↔ Git 리포 양방향 동기화 | 6h |
| — | 프로덕션 배포 + 릴리스 | — | P0 | Workers 재배포 + npm publish v0.8.0 | 2h |

**총 예상**: 26h (1인 기준, 4~5 세션)

### 2.2 F41 잔여 — API 실데이터 완성

**Sprint 7에서 미완료된 항목** (72% Match Rate, mock 잔존):

| 서브태스크 | 설명 | 데이터 소스 | Sprint 7 상태 |
|-----------|------|:----------:|:------------:|
| F41-R1 | requirements → SPEC.md F-items 파싱 | GitHub API | ❌ mock |
| F41-R2 | KV 캐시 레이어 (5분 TTL) | Cloudflare KV | ❌ 미구현 |
| F41-R3 | health → 실 계산 로직 | D1 + 계산 | ❌ mock |
| F41-R4 | integrity → Git diff 기반 | GitHub API | ❌ mock |
| F41-R5 | freshness → 파일 수정 시점 비교 | GitHub API | ❌ mock |

**데이터 소스 전략 (최종)**:

| Endpoint | Sprint 7 | Sprint 8 | 비고 |
|----------|:--------:|:--------:|------|
| `/api/requirements` | mock | GitHub API → KV 캐시 | SPEC.md F-items 파싱 |
| `/api/health` | mock | D1 기반 계산 | 테스트 통과율 + lint 에러 수 |
| `/api/integrity` | mock | GitHub API 기반 | Git diff로 CLAUDE.md 일치 검증 |
| `/api/freshness` | mock | GitHub API 기반 | 파일 lastModified 비교 |

### 2.3 F44 — SSE 실시간 통신

**현재 상태**: `/api/agents/stream`에 mock SSE 존재 (5초 간격, 하드코딩 agent ID)

**Sprint 8 범위**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F44-1 | D1 `agent_sessions` 기반 SSE 스트림 | 실제 세션 상태 변경이 SSE로 전달 |
| F44-2 | 이벤트 타입 확장 (activity, status, error, sync) | 4개 이벤트 타입 구분 |
| F44-3 | Web EventSource 클라이언트 | `sse-client.ts` — 자동 재연결 + 에러 핸들링 |
| F44-4 | AgentCard 실시간 업데이트 | SSE 이벤트 → Zustand store → UI 반영 |

**SSE 이벤트 스키마**:

```
event: activity
data: {"agentId":"a1","status":"active","progress":75,"task":"code-review"}

event: status
data: {"agentId":"a1","status":"completed","result":"3 issues found"}

event: error
data: {"agentId":"a1","error":"timeout","message":"Task exceeded 30s limit"}

event: sync
data: {"type":"spec-code","status":"syncing","progress":50}
```

### 2.4 F45 — NL→Spec 변환

**PRD 참조**: §7 핵심 기능 — "비기술자도 자연어로 참여"

**Sprint 8 범위 (MVP)**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F45-1 | NL→Spec API 엔드포인트 | `POST /api/spec/generate` — 자연어 입력 → 구조화 명세 |
| F45-2 | LLM 통합 서비스 | Workers AI (또는 외부 API) 호출 래퍼 |
| F45-3 | 프롬프트 엔지니어링 | 시스템 프롬프트 + few-shot 예제로 일관된 출력 |
| F45-4 | 명세 스키마 정의 | Zod 스키마: title, description, acceptance criteria, priority |
| F45-5 | Web UI — 입력 폼 + 결과 미리보기 | Spec Generator 페이지 |

**NL→Spec 파이프라인**:

```
사용자 입력 (자연어)
  ↓
POST /api/spec/generate
  ↓
LLM 서비스 (Workers AI / Anthropic API)
  ↓ system prompt + few-shot
구조화 출력 (JSON)
  ↓
Zod 검증
  ↓
명세 문서 (Markdown)
  ↓
(선택) Git 커밋 → SPEC.md 반영
```

**LLM 선택 (Open Question)**:

| 옵션 | 장점 | 단점 |
|------|------|------|
| Workers AI (Llama 3) | 무료, 같은 인프라, 지연 시간 짧음 | 품질 한계, 한국어 약함 |
| Anthropic Claude API | 최고 품질, 한국어 우수 | 비용 발생, API 키 관리 |
| Hybrid | Workers AI로 시작, 품질 불충분 시 Claude fallback | 복잡도 증가 |

### 2.5 F46 — Wiki Git 동기화

**현재 상태**: Wiki CRUD가 D1 `wiki_pages` 테이블에서 동작 (Git 연동 없음)

**Sprint 8 범위**:

| 서브태스크 | 설명 | 완료기준 |
|-----------|------|---------|
| F46-1 | Wiki → Git 동기화 | Wiki 수정 시 GitHub API로 커밋 |
| F46-2 | Git → Wiki 동기화 | Git push webhook → D1 wiki_pages 갱신 |
| F46-3 | 충돌 해결 전략 | "Git이 진실" — Git 버전 우선 (Last Write Wins) |
| F46-4 | 동기화 상태 표시 | Wiki 페이지에 sync 상태 뱃지 |

**동기화 아키텍처**:

```
Wiki 편집 (Web UI)
  ↓ PUT /api/wiki/:slug
D1 wiki_pages 갱신
  ↓ (비동기)
GitHub API: 파일 커밋
  ↓
docs/wiki/{slug}.md 갱신

Git Push (외부)
  ↓ GitHub Webhook → /api/webhook/git
docs/wiki/{slug}.md 변경 감지
  ↓
D1 wiki_pages 갱신
```

### 2.6 Out of Scope

- E2E 테스트 — Playwright (Sprint 9+)
- 에이전트 오케스트레이션 — 병렬 작업 관리 (Sprint 9+)
- Cloudflare Workers Paid plan 전환
- 멀티 리포 지원

---

## 3. Architecture

### 3.1 서비스 레이어 도입

Sprint 8에서 라우트 인라인 로직을 서비스 레이어로 추출해요:

```
packages/api/src/
├── routes/           # OpenAPI 라우트 (얇은 레이어)
├── services/         # 비즈니스 로직 (신규)
│   ├── github.ts     # GitHub API 래퍼 (octokit)
│   ├── kv-cache.ts   # KV 캐시 유틸
│   ├── spec-parser.ts # SPEC.md F-items 파서
│   ├── llm.ts        # LLM 통합 (NL→Spec)
│   ├── wiki-sync.ts  # Wiki ↔ Git 동기화
│   └── sse.ts        # SSE 스트림 매니저
├── schemas/          # Zod 스키마 (기존)
├── middleware/       # JWT + RBAC (기존)
└── db/               # Drizzle ORM (기존)
```

### 3.2 GitHub API 통합 아키텍처

```
┌───────────────┐     ┌──────────────┐
│ API Routes    │────→│ GitHubService│
│ (requirements,│     │ (octokit)    │
│  integrity,   │     └──────┬───────┘
│  freshness)   │            │
└───────────────┘     ┌──────┴───────┐
                      │ KV Cache     │
                      │ (5min TTL)   │
                      └──────────────┘
```

**KV 네임스페이스**: `FOUNDRY_CACHE` — wrangler.toml에 바인딩 추가

### 3.3 NL→Spec 아키텍처

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Web UI       │────→│ POST         │────→│ LLM Service  │
│ (입력 폼)    │     │ /api/spec/   │     │ (Workers AI  │
│              │     │ generate     │     │  or Claude)  │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                            │                     │
                     ┌──────┴───────┐     ┌──────┴───────┐
                     │ Zod 검증     │     │ Prompt       │
                     │ (출력 스키마)│     │ Template     │
                     └──────────────┘     └──────────────┘
```

### 3.4 Web 신규 페이지/컴포넌트

```
packages/web/src/
├── app/
│   └── spec-generator/    # F45: NL→Spec 페이지 (신규)
│       └── page.tsx
├── components/
│   ├── SpecGeneratorForm.tsx   # F45: 입력 폼
│   ├── SpecPreview.tsx         # F45: 결과 미리보기
│   └── AgentActivity.tsx       # F44: SSE 실시간 피드
└── lib/
    ├── sse-client.ts           # F44: EventSource 래퍼 (신규)
    └── api-client.ts           # 기존 + spec/generate 추가
```

---

## 4. Implementation Plan

### 4.1 구현 순서 (의존성 기반)

```
Phase A: 인프라 기반 (F41 잔여) — 선행
├── A1: GitHubService + octokit 설치
├── A2: KV 캐시 레이어 (wrangler.toml + kv-cache.ts)
├── A3: requirements 라우트 → GitHub API + KV
├── A4: health/integrity/freshness 실데이터 전환
└── A5: Workers 프로덕션 재배포 (Sprint 7 + A1~A4)

Phase B: SSE 실시간 (F44) — Phase A 병렬 가능
├── B1: SSE 스트림 매니저 (services/sse.ts)
├── B2: agent.ts SSE → D1 기반 전환
├── B3: 이벤트 타입 확장 (activity/status/error/sync)
├── B4: Web EventSource 클라이언트 (sse-client.ts)
└── B5: AgentCard 실시간 업데이트

Phase C: NL→Spec (F45) — Phase A 완료 후
├── C1: LLM 서비스 래퍼 (services/llm.ts)
├── C2: 프롬프트 템플릿 + 출력 스키마
├── C3: POST /api/spec/generate 엔드포인트
├── C4: Web UI — SpecGeneratorForm + Preview
└── C5: 생성된 명세 → Git 커밋 (선택)

Phase D: Wiki Git 동기화 (F46) — Phase A 완료 후
├── D1: Wiki → Git (wiki-sync.ts + GitHub API)
├── D2: Git → Wiki (Webhook 엔드포인트)
├── D3: 충돌 해결 (Git 우선)
└── D4: 동기화 상태 UI

Phase E: 테스트 + 릴리스
├── E1: 신규 서비스 테스트 (GitHub mock + KV mock)
├── E2: SSE 테스트 (D1 mock)
├── E3: NL→Spec 테스트 (LLM mock)
├── E4: Wiki 동기화 테스트
├── E5: 전체 검증 (typecheck + build + test)
└── E6: npm publish v0.8.0
```

### 4.2 Agent Teams 구성 (권장)

| Worker | 담당 | 범위 |
|--------|------|------|
| W1 (API Backend) | F41 잔여 + F44 | GitHub API + KV + SSE 실시간 |
| W2 (NL→Spec) | F45 | LLM 통합 + 프롬프트 + API + Web UI |
| W3 (Wiki Sync) | F46 | Wiki ↔ Git 양방향 동기화 |
| Leader | 테스트 + 통합 + 릴리스 | E1~E6 전체 검증 |

**파일 충돌 방지**:
- W1: `routes/{requirements,health,integrity,freshness,agent}.ts`, `services/{github,kv-cache,sse}.ts`
- W2: `routes/spec.ts`, `services/llm.ts`, `schemas/spec.ts`, `web/app/spec-generator/`
- W3: `services/wiki-sync.ts`, `routes/wiki.ts` (동기화 로직만), `routes/webhook.ts`

---

## 5. Risk & Mitigation

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | GitHub API Rate Limit (60회/h 비인증, 5000회/h 인증) | requirements/integrity/freshness 호출 빈도 제한 | KV 캐시 5분 TTL + PAT 인증 (5000회/h) |
| R2 | Workers AI 한국어 품질 부족 | NL→Spec 출력 품질 저하 | Claude API fallback + 프롬프트 영어화 옵션 |
| R3 | KV 바인딩 추가 시 wrangler.toml 변경 | 기존 배포 영향 | 로컬 테스트 후 스테이징 배포 검증 |
| R4 | SSE 연결 장시간 유지 시 Workers CPU 제한 | 무료 플랜 10ms CPU | SSE 간격 10초, 클라이언트 재연결 전략 |
| R5 | Wiki Git 동기화 시 merge conflict | 데이터 불일치 | "Git이 진실" 원칙 — Git 버전 우선 |
| R6 | octokit 번들 사이즈 (Workers 제한) | 배포 실패 가능 | `@octokit/rest` 대신 `@octokit/core` 최소 의존 |
| R7 | NL→Spec LLM 비용 | API 호출당 비용 발생 | Rate limit + 일일 사용량 제한 |
| R8 | Sprint 범위 과대 (26h, 6개 항목) | 일부 미완료 가능 | P0 우선 (F41 잔여 + F45 + 배포), P2(F46) 이관 가능 |

---

## 6. Success Criteria

### Sprint 8 완료 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| SC-1 | requirements API가 SPEC.md 실데이터 반환 | `curl /api/requirements` → F-items 포함 |
| SC-2 | KV 캐시 동작 (5분 TTL) | 2회 연속 호출 시 캐시 HIT 확인 |
| SC-3 | health/integrity/freshness 실데이터 | mock 제거, 계산/GitHub 기반 |
| SC-4 | SSE가 D1 실데이터 기반 스트리밍 | EventSource 연결 → 실제 agent_sessions 이벤트 |
| SC-5 | NL→Spec MVP 동작 | 자연어 입력 → 구조화 명세 JSON 반환 |
| SC-6 | Web Spec Generator 페이지 | 입력 폼 + 결과 미리보기 동작 |
| SC-7 | Wiki → Git 동기화 | Wiki 수정 → Git 커밋 생성 확인 |
| SC-8 | Git → Wiki 동기화 | Git push → D1 wiki_pages 갱신 |
| SC-9 | Workers 프로덕션 배포 성공 | 프로덕션 URL 정상 응답 |
| SC-10 | 테스트 > 190건 | `turbo test` 통과 |
| SC-11 | PDCA Match Rate >= 85% | Gap Analysis |

---

## 7. Dependencies

| 의존성 | 상태 | 비고 |
|--------|:----:|------|
| Sprint 7 완료 (F38/F41/F42/F43) | ✅ | OpenAPI + D1 + shadcn/ui |
| D1 프로덕션 DB | ✅ | `foundry-x-db` |
| Workers 배포 파이프라인 | ✅ | wrangler-action |
| CLOUDFLARE_API_TOKEN | ✅ | GitHub Secret |
| @octokit/core (GitHub API) | 📋 | package.json 추가 필요 |
| KV 네임스페이스 생성 | 📋 | `wrangler kv:namespace create FOUNDRY_CACHE` |
| Workers AI 바인딩 (또는 Anthropic API 키) | 📋 | LLM 선택 후 설정 |

---

## 8. Open Questions

| # | Question | Owner | Deadline |
|---|----------|-------|----------|
| Q12 | NL→Spec LLM 선택: Workers AI vs Anthropic Claude API? | 아키텍트 | F45 착수 전 |
| Q13 | GitHub PAT 관리: Workers Secret vs GitHub App? | 아키텍트 | F41 착수 전 |
| Q14 | Wiki Git 동기화 트리거: Webhook vs 폴링? | 아키텍트 | F46 착수 전 |
| Q15 | Sprint 범위 축소 시 이관 대상: F46(P2)? | PM | Sprint 중반 |
