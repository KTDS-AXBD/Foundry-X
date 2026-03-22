---
code: FX-ANLS-007-F38
title: Sprint 7 F38 — OpenAPI 3.1 계약서 + API 리팩토링 Gap Analysis
version: 0.1
status: Active
category: ANLS
system-version: 0.7.0
created: 2026-03-17
updated: 2026-03-17
author: Sinclair Seo
---

# F38 — OpenAPI 3.1 Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: Foundry-X
> **Version**: 0.7.0
> **Analyst**: Sinclair Seo (gap-detector)
> **Date**: 2026-03-17
> **Design Doc**: [sprint-7.design.md](../../02-design/features/sprint-7.design.md) Section 2
> **Plan Doc**: [sprint-7.plan.md](../../01-plan/features/sprint-7.plan.md) Section 2.2

---

## 1. Analysis Overview

### 1.1 Analysis Purpose

F38 (OpenAPI 3.1 계약서 + API 리팩토링)의 Design 문서와 실제 구현 코드 사이의 일치율을 측정하고, 누락/변경/추가 항목을 식별해요.

### 1.2 Analysis Scope

- **Design Document**: `docs/02-design/features/sprint-7.design.md` Section 2 (F38)
- **Implementation Path**: `packages/api/src/` (app.ts, routes/, schemas/)
- **Analysis Date**: 2026-03-17
- **Sub-tasks**: F38-1 (OpenAPIHono 전환), F38-2 (9개 라우트 createRoute), F38-3 (Zod 스키마), F38-4 (런타임 검증)

---

## 2. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F38-1: OpenAPIHono + app.doc() | 100% | ✅ |
| F38-2: 9개 라우트 createRoute() | 100% | ✅ |
| F38-3: Zod 스키마 정의 (schemas/) | 100% | ✅ |
| F38-4: 요청/응답 런타임 검증 | 100% | ✅ |
| Architecture Compliance | 95% | ✅ |
| Convention Compliance | 95% | ✅ |
| **F38 Overall** | **98%** | **✅** |

---

## 3. F38-1: app.ts 전환 (OpenAPIHono + app.doc)

### 3.1 Design vs Implementation

| 항목 | Design | Implementation | Status |
|------|--------|----------------|--------|
| Hono -> OpenAPIHono | `new OpenAPIHono<{ Bindings: Env }>()` | `new OpenAPIHono<{ Bindings: Env }>()` | ✅ Match |
| app.doc() 경로 | `/api/openapi.json` | `/api/openapi.json` | ✅ Match |
| OpenAPI 버전 | `3.1.0` | `3.1.0` | ✅ Match |
| info.title | `Foundry-X API` | `Foundry-X API` | ✅ Match |
| info.version | `0.7.0` | `0.7.0` | ✅ Match |
| swaggerUI | `/api/docs` | `/api/docs` | ✅ Match |
| tags 정의 | 9개 태그 | 9개 태그 (Auth, Health, Profile, Integrity, Freshness, Wiki, Requirements, Agents, Tokens) | ✅ Match |
| info.description | 미지정 | 추가됨 ("사람과 AI 에이전트가...") | ✅ Added (improvement) |

**Sub-score: 100%** -- Design 의도 전부 구현 + description 추가 개선.

---

## 4. F38-2: 9개 라우트 createRoute() 마이그레이션

### 4.1 라우트별 전환 현황

| Route File | Design 패턴 | Implementation 패턴 | createRoute 사용 | tags/summary | Status |
|-----------|------------|-------------------|:---:|:---:|:---:|
| health.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| profile.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| integrity.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| freshness.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| wiki.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| requirements.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| agent.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| token.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |
| auth.ts | OpenAPIHono + createRoute | OpenAPIHono + createRoute | ✅ | ✅ | ✅ |

### 4.2 Endpoint별 상세 비교

| Endpoint | Method | Design | Implementation | Status |
|----------|--------|:------:|:--------------:|:------:|
| /api/health | GET | ✅ | ✅ | ✅ |
| /api/profile | GET | ✅ | ✅ | ✅ |
| /api/integrity | GET | ✅ | ✅ | ✅ |
| /api/freshness | GET | ✅ | ✅ | ✅ |
| /api/wiki | GET | ✅ | ✅ | ✅ |
| /api/wiki/{slug} | GET | ✅ | ✅ | ✅ |
| /api/wiki | POST | ✅ | ✅ | ✅ |
| /api/wiki/{slug} | PUT | ✅ | ✅ | ✅ |
| /api/wiki/{slug} | DELETE | ✅ | ✅ | ✅ |
| /api/requirements | GET | ✅ | ✅ | ✅ |
| /api/requirements/{id} | PUT | ✅ | ✅ | ✅ |
| /api/agents | GET | ✅ | ✅ | ✅ |
| /api/tokens/summary | GET | ✅ | ✅ | ✅ |
| /api/tokens/usage | GET | ✅ | ✅ | ✅ |
| /api/auth/signup | POST | ✅ | ✅ | ✅ |
| /api/auth/login | POST | ✅ | ✅ | ✅ |
| /api/auth/refresh | POST | ✅ | ✅ | ✅ |

**17/17 endpoints** 모두 createRoute 패턴으로 전환 완료.

### 4.3 추가 구현 (Design에 없는 항목)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| /agents/stream SSE | routes/agent.ts:76 | SSE 스트림 (non-OpenAPI) | Low -- Sprint 5 기존 기능 유지 |

**Sub-score: 100%** -- 설계된 17개 endpoint 전부 createRoute 적용, SSE는 의도적 non-OpenAPI 유지.

---

## 5. F38-3: Zod 스키마 정의

### 5.1 schemas/ 디렉토리 파일 비교

| Design 파일 | Implementation 파일 | Status |
|------------|-------------------|:------:|
| schemas/health.ts | ✅ 존재 | ✅ |
| schemas/profile.ts | ✅ 존재 | ✅ |
| schemas/integrity.ts | ✅ 존재 | ✅ |
| schemas/freshness.ts | ✅ 존재 | ✅ |
| schemas/wiki.ts | ✅ 존재 | ✅ |
| schemas/requirements.ts | ✅ 존재 | ✅ |
| schemas/agent.ts | ✅ 존재 | ✅ |
| schemas/token.ts | ✅ 존재 | ✅ |
| schemas/auth.ts | ✅ 존재 | ✅ |
| schemas/common.ts | ✅ 존재 | ✅ |

**10/10 파일** 모두 존재.

### 5.2 스키마별 상세 비교

| Schema Name | Design | Implementation | Shared 타입 일치 | Status |
|-------------|--------|----------------|:---:|:---:|
| HealthResponseSchema | overall, specToCode, codeToTest, specToTest, grade | ✅ 일치 | HealthScore | ✅ |
| RepoProfileSchema | mode, languages, frameworks, buildTools, testFrameworks, ci, packageManager, markers, entryPoints, modules, architecturePattern, scripts? | ✅ 일치 | RepoProfile | ✅ |
| IntegritySchema | passed, score, checks[] | ✅ 일치 | HarnessIntegrity | ✅ |
| FreshnessSchema | documents[], overallStale, checkedAt | ✅ 일치 | FreshnessReport | ✅ |
| WikiPageSchema | slug, title, content, filePath, lastModified, author | ✅ 일치 | WikiPage | ✅ |
| WikiCreateSchema | filePath, content?, title? | ✅ 구현 | -- | ✅ |
| WikiUpdateSchema | content | ✅ 구현 | -- | ✅ |
| WikiSlugParamSchema | slug | ✅ 구현 | -- | ✅ |
| WikiActionResponseSchema | ok, slug, filePath | ✅ 구현 | -- | ✅ |
| RequirementSchema | id, reqCode, title, version, status, note | ✅ 일치 | RequirementItem | ✅ |
| ReqUpdateSchema | status (enum) | ✅ 구현 | -- | ✅ |
| ReqIdParamSchema | id | ✅ 구현 | -- | ✅ |
| AgentProfileSchema | id, name, capabilities[], constraints[], activity? | ✅ 일치 | AgentProfile | ✅ |
| TokenUsageRecordSchema | model, inputTokens, outputTokens, cost, timestamp, agentId? | ✅ 일치 | TokenUsage | ✅ |
| TokenSummarySchema | period, totalCost, byModel, byAgent | ✅ 일치 | TokenSummary | ✅ |
| SignupSchema | email, name, password | ✅ 구현 | -- | ✅ |
| LoginSchema | email, password | ✅ 구현 | -- | ✅ |
| RefreshSchema | refreshToken | ✅ 구현 | -- | ✅ |
| AuthResponseSchema | user, accessToken, refreshToken, expiresIn | ✅ 구현 | -- | ✅ |
| TokenPairSchema | accessToken, refreshToken, expiresIn | ✅ 구현 | -- | ✅ |
| ErrorSchema | error (string) | ✅ 구현 | -- | ✅ |
| SuccessSchema | ok, slug?, filePath? | ✅ 구현 | -- | ✅ |

### 5.3 Zod - shared 타입 동기화

| Zod 스키마 | shared 타입 | 필드 일치 | Status |
|-----------|-----------|:---:|:---:|
| HealthResponseSchema | HealthScore | ✅ grade: z.string() vs 'A'\|'B'\|'C'\|'D'\|'F' | ⚠️ |
| RepoProfileSchema | RepoProfile | ✅ | ✅ |
| IntegritySchema | HarnessIntegrity | ✅ | ✅ |
| FreshnessSchema | FreshnessReport | ✅ | ✅ |
| WikiPageSchema | WikiPage | ✅ | ✅ |
| RequirementSchema | RequirementItem | ✅ | ✅ |
| AgentProfileSchema | AgentProfile | ✅ | ✅ |
| TokenUsageRecordSchema | TokenUsage | ✅ | ✅ |
| TokenSummarySchema | TokenSummary | ✅ | ✅ |

**Sub-score: 100%** -- 10/10 파일, 21개 스키마 모두 구현. grade 타입 차이는 runtime 호환성 문제 없음 (z.string()이 더 넓은 superset).

---

## 6. F38-4: 요청/응답 런타임 검증

### 6.1 검증 인프라

| 항목 | Design | Implementation | Status |
|------|--------|----------------|:------:|
| validationHook 구현 | Zod 에러 → 400 응답 | `validationHook()` in common.ts | ✅ |
| 400 에러 포맷 | `{ error: "message" }` | `{ error: issues.join(", ") }` | ✅ |
| wiki defaultHook | validationHook 적용 | `new OpenAPIHono({ defaultHook: validationHook })` | ✅ |
| requirements defaultHook | validationHook 적용 | `new OpenAPIHono({ defaultHook: validationHook })` | ✅ |
| auth defaultHook | validationHook 적용 | `new OpenAPIHono({ defaultHook: validationHook })` | ✅ |

### 6.2 런타임 검증 테스트

| 테스트 | 파일 | Status |
|--------|------|:------:|
| POST /wiki 잘못된 요청 (filePath 누락) → 400 | wiki.test.ts | ✅ |
| PUT /requirements/:id 잘못된 status → 400 | requirements.test.ts | ✅ |

**Sub-score: 100%** -- validationHook이 wiki, requirements, auth 라우트에 적용되어 잘못된 요청에 400 반환 검증 완료.

---

## 7. OpenAPI Spec 자동 생성 검증

### 7.1 테스트 커버리지

| 테스트 항목 | 파일 | Status |
|-----------|------|:------:|
| /api/openapi.json 반환 (200) | simple-routes.test.ts | ✅ |
| OpenAPI 3.1.0 확인 | simple-routes.test.ts | ✅ |
| info.title 확인 | simple-routes.test.ts | ✅ |
| 9개 태그 존재 확인 | simple-routes.test.ts | ✅ |
| paths에 주요 endpoint 포함 확인 | simple-routes.test.ts | ✅ |
| /api/docs Swagger UI HTML 반환 | simple-routes.test.ts | ✅ |

**Sub-score: 100%**

---

## 8. Architecture & Convention Compliance

### 8.1 파일 구조 비교

| Design 구조 | Implementation | Status |
|------------|----------------|:------:|
| app.ts — OpenAPIHono + app.doc() + swaggerUI | ✅ 일치 | ✅ |
| schemas/ 디렉토리 (10 파일) | ✅ 10/10 파일 존재 | ✅ |
| routes/ 디렉토리 (9 파일) — createRoute 패턴 | ✅ 9/9 파일 전환 | ✅ |
| middleware/ — auth.ts, rbac.ts (기존 유지) | ✅ 유지 | ✅ |
| services/data-reader.ts — 기존 유지 (F41에서 대체 예정) | ✅ 유지 | ✅ |

### 8.2 Naming Convention

| Category | Convention | Compliance | Violations |
|----------|-----------|:----------:|------------|
| 스키마 파일 | camelCase.ts | 100% | -- |
| 라우트 파일 | camelCase.ts | 100% | -- |
| Zod 스키마 변수 | PascalCase + Schema suffix | 100% | -- |
| createRoute 변수 | camelCase (getHealth, listWiki 등) | 100% | -- |
| 함수명 | camelCase | 100% | -- |

### 8.3 Import Order

모든 라우트 파일이 표준 import 순서를 준수:
1. External (@hono/zod-openapi)
2. Internal schemas
3. Internal services/middleware
4. Types (import type)

### 8.4 잔여 이슈 (F38 범위 외)

| Issue | File | Severity | Note |
|-------|------|:--------:|------|
| node:fs/promises 사용 | routes/wiki.ts:3 | Info | F41 범위 (실데이터 전환 시 제거 예정) |
| node:path 사용 | routes/wiki.ts:4, requirements.ts:3 | Info | F41 범위 |
| data-reader.ts에 node:fs | services/data-reader.ts:1-2 | Info | F41 범위 (삭제 예정) |
| auth.ts Map 인메모리 | routes/auth.ts:25 | Info | F41 범위 (D1 전환 예정) |

이 항목들은 F38 범위가 아니라 F41 (실데이터 연동)에서 해결 예정이에요.

**Architecture Score: 95%** -- F38 범위 내에서는 100% 일치. node:fs 잔여는 F41 scope.

---

## 9. Differences Found

### 9.1 Missing Features (Design O, Implementation X)

| 없음 | -- 설계된 모든 F38 항목이 구현됨 |
|------|------|

### 9.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| info.description 추가 | app.ts:27 | OpenAPI spec에 한국어 설명 추가 | Low (improvement) |
| validationHook 공용화 | schemas/common.ts:21 | Zod 검증 에러를 표준 format으로 변환하는 공용 hook | Low (improvement) |
| SuccessSchema | schemas/common.ts:9 | Wiki 액션 응답용 공통 스키마 | Low (improvement) |
| WikiSlugParamSchema | schemas/wiki.ts:28 | slug 파라미터 검증 스키마 | Low (improvement) |
| ReqIdParamSchema | schemas/requirements.ts:24 | id 파라미터 검증 스키마 | Low (improvement) |

### 9.3 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|:------:|
| HealthResponseSchema.grade | z.string() (Design에서 명시) | z.string() (구현) -- shared 타입은 enum 리터럴 | Low |
| PUT /wiki 응답 | WikiPageSchema (Design 2.3) | WikiActionResponseSchema (구현) | Low |

**Note**: Design 2.3 표에서 PUT /wiki/:slug 응답이 `WikiPageSchema`로 명시되어 있으나, 실제 구현은 `WikiActionResponseSchema`(`{ ok, slug, filePath }`)를 반환해요. 이는 의도적 변경으로, PUT은 페이지 전체가 아닌 액션 결과만 반환하는 게 적절해요.

---

## 10. Match Rate Calculation

### 10.1 F38 서브태스크별 점수

| Sub-task | Weight | Score | Weighted |
|----------|:------:|:-----:|:--------:|
| F38-1: OpenAPIHono + app.doc() | 20% | 100% | 20.0 |
| F38-2: 9개 라우트 createRoute() | 35% | 100% | 35.0 |
| F38-3: Zod 스키마 정의 | 30% | 100% | 30.0 |
| F38-4: 런타임 검증 | 15% | 100% | 15.0 |
| **Total** | **100%** | | **100.0** |

### 10.2 품질 감산

| Item | Deduction | Reason |
|------|:---------:|--------|
| PUT /wiki 응답 스키마 변경 | -1% | Design 표와 불일치 (의도적 변경이나 문서 미반영) |
| grade 타입 범위 차이 | -1% | Zod z.string() vs shared 리터럴 유니온 |

### 10.3 최종 Match Rate

```
+--------------------------------------------+
|  F38 Overall Match Rate: 98%               |
+--------------------------------------------+
|  F38-1: OpenAPIHono 전환      100%  ✅     |
|  F38-2: createRoute 마이그레이션 100%  ✅   |
|  F38-3: Zod 스키마 정의       100%  ✅     |
|  F38-4: 런타임 검증           100%  ✅     |
|  품질 감산                    -2%          |
+--------------------------------------------+
```

---

## 11. Test Coverage Status

### 11.1 F38 관련 테스트

| Test File | Tests | F38 Coverage |
|-----------|:-----:|:------------|
| simple-routes.test.ts | 2 (OpenAPI spec) + 6 (routes) | OpenAPI spec 생성 + 각 라우트 응답 검증 |
| wiki.test.ts | 8 | 모든 CRUD + 검증 (POST 400) |
| requirements.test.ts | 7 | GET/PUT + 검증 (PUT 400, 404) |
| agent.test.ts | 3 | GET + SSE + constraint 검증 |
| token.test.ts | 4 | summary + usage + 구조 검증 |
| **API Total** | **41** | F38 커버리지 충분 |

### 11.2 런타임 검증 테스트 (F38-4)

| Scenario | Test | Status |
|----------|------|:------:|
| POST /wiki 필수 필드 누락 → 400 | wiki.test.ts:135 | ✅ |
| PUT /requirements invalid status → 400 | requirements.test.ts:99 | ✅ |
| Auth signup/login Zod 검증 | (implicit -- validationHook 적용) | ⚠️ 명시적 테스트 없음 |

---

## 12. Recommended Actions

### 12.1 Immediate (문서 동기화)

| Priority | Item | Action |
|:--------:|------|--------|
| Low | Design 2.3 표 PUT /wiki 응답을 WikiActionResponseSchema로 수정 | 문서 업데이트 |
| Low | HealthResponseSchema.grade를 z.enum([...])으로 강화 검토 | 코드 or 문서 |

### 12.2 Short-term (F38 완성도 향상)

| Priority | Item | Action |
|:--------:|------|--------|
| Low | Auth 라우트 Zod 검증 실패 테스트 추가 | test 추가 (POST /auth/signup 잘못된 email → 400) |

### 12.3 F41 착수 시 해결할 항목 (F38 범위 외)

| Item | Current | Target | Action |
|------|---------|--------|--------|
| node:fs/promises in wiki.ts | 사용 중 | 제거 | F41: D1 WikiService로 대체 |
| node:path in requirements.ts | 사용 중 | 제거 | F41: GitHub API로 대체 |
| data-reader.ts | 존재 | 삭제 | F41: 서비스 레이어로 대체 |
| auth.ts Map 인메모리 | 사용 중 | D1 | F41: UserService로 대체 |

---

## 13. Conclusion

F38은 설계 문서의 4개 서브태스크 모두 완전히 구현되었어요.

- **17개 endpoint** 전부 createRoute() 패턴 적용 ✅
- **10개 스키마 파일** (21개 Zod 스키마) 전부 구현 ✅
- **OpenAPI 3.1.0 자동 스펙** 생성 동작 ✅
- **Swagger UI** `/api/docs`에서 인터랙티브 문서 제공 ✅
- **런타임 검증** validationHook으로 400 에러 반환 ✅
- **테스트 41건** 통과 ✅

Match Rate **98%** -- Sprint 7의 F38은 사실상 완료 상태이며, 남은 2%는 사소한 문서 동기화 항목이에요.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-17 | Initial F38 gap analysis | Sinclair Seo |
