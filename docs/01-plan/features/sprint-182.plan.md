---
code: FX-PLAN-S182
title: "Sprint 182 — F396 Portal 모듈 분리 (modules/portal/)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 182 Plan — Portal 모듈 분리

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 181에서 Auth 5개 라우트를 `modules/auth/`로 분리했으나, Portal 19개 라우트(Dashboard/KPI/Wiki/통합 등)가 여전히 flat `routes/`에 혼재 |
| **Solution** | 19개 Portal 라우트/서비스/스키마를 `modules/portal/`로 이동 + 인덱스 파일로 단일 진입점 제공 + app.ts 리팩토링 |
| **Function/UX Effect** | Portal 도메인 독립 개발/테스트 가능, 기존 API 경로 100% 호환 유지 |
| **Core Value** | MSA 전환 2단계 완성 — Portal 모듈을 AI Foundry 서비스로 즉시 분리 가능한 기반 |

---

## 1. Scope

### 1.1 F-item

| F-item | 설명 | Sprint 범위 |
|--------|------|-------------|
| F396 (계속) | Dashboard/KPI/Wiki → `modules/portal/` | Sprint 182 |

> Sprint 181: Auth/SSO 5 routes → `modules/auth/` ✅
> Sprint 182: Portal 19 routes → `modules/portal/` (본 Sprint)

### 1.2 이동 대상 (19 routes)

| # | Route File | 미들웨어 특성 |
|---|-----------|--------------|
| 1 | org | auth 내부 적용 (자체 미들웨어) |
| 2 | org-shared | protected (JWT + tenant) |
| 3 | kpi | public (인증 선택적) |
| 4 | metrics | protected |
| 5 | wiki | protected |
| 6 | onboarding | protected |
| 7 | inbox | protected |
| 8 | notifications | protected |
| 9 | nps | protected |
| 10 | feedback | protected |
| 11 | feedback-queue | Webhook Secret 인증 (JWT 면제) |
| 12 | slack | public (Slack 서명) |
| 13 | github | auth + tenant (자체 미들웨어) |
| 14 | jira | protected |
| 15 | webhook | public (HMAC-SHA256) |
| 16 | webhook-registry | protected + webhookInboundRoute (public) |
| 17 | project-overview | protected |
| 18 | party-session | protected |
| 19 | reconciliation | protected |

### 1.3 Out of Scope

- Gate/Launch 모듈 이동 → Sprint 183
- Infra 모듈 이동 → Sprint 184
- Core 정리 (discovery/shaping) → Sprint 183~184
- 물리적 서비스 분리 → Phase 20 이후

---

## 2. Approach

### 2.1 전략

Sprint 181과 동일한 점진적 이동 패턴:
1. 라우트/서비스/스키마 파일을 `modules/portal/` 하위로 이동
2. 각 파일의 import 경로 수정 (상대 경로 조정)
3. `modules/portal/index.ts`에서 re-export
4. `modules/index.ts`에 portal export 추가
5. `app.ts`에서 import 경로를 `modules/portal/`로 변경
6. **미들웨어 등록 순서 100% 유지** (공개/보호 순서 변경 불가)

### 2.2 미들웨어 주의사항

Portal 라우트 중 일부는 auth middleware 이전에 등록되어 특수 인증을 사용:
- `slackRoute`: Slack 서명 보호 (public)
- `kpiRoute`: 인증 선택적 (public)
- `webhookRoute`: HMAC-SHA256 (public)
- `webhookInboundRoute`: 서명 검증 (public)
- `feedbackQueueRoute`: Webhook Secret (JWT 면제)
- `orgRoute`: 자체 auth middleware 적용
- `githubRoute`: 자체 auth + tenant middleware 적용

→ **이동 후에도 app.ts에서의 등록 위치(auth middleware 전/후)는 변경하지 않는다.**

### 2.3 대응 서비스/스키마 파일

| 카테고리 | 예상 파일 수 |
|----------|-------------|
| routes/ | 19 |
| services/ | ~20 (중복 제외) |
| schemas/ | ~17 (중복 제외) |
| **합계** | ~56 파일 이동 |

---

## 3. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Import 경로 오류 | 빌드 실패 | typecheck 통과 확인 |
| 미들웨어 순서 변경 | 인증 우회 보안 취약점 | app.ts 등록 순서 변경 금지 |
| 테스트 import 깨짐 | CI 실패 | 테스트 파일 import 경로도 수정 |
| ESLint no-cross-module 위반 | lint 실패 | 모듈 간 직접 import 확인 |

---

## 4. Verification

1. `turbo typecheck` — 전체 타입체크 통과
2. `turbo test` — 전체 테스트 통과 (3161+ tests)
3. `turbo lint` — ESLint 통과 (no-cross-module-import 포함)
4. 수동 확인: app.ts 미들웨어 등록 순서 원본과 동일

---

## 5. Timeline

| Step | 내용 | 예상 |
|------|------|------|
| 1 | 파일 이동 (routes → modules/portal/routes/) | 5분 |
| 2 | 파일 이동 (services → modules/portal/services/) | 5분 |
| 3 | 파일 이동 (schemas → modules/portal/schemas/) | 3분 |
| 4 | Import 경로 수정 + index.ts 작성 | 10분 |
| 5 | app.ts 리팩토링 | 5분 |
| 6 | typecheck + test + lint | 5분 |
| **Total** | | **~33분** |
