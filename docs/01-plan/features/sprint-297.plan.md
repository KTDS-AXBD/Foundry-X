---
id: FX-PLAN-297
feature: F540
req: FX-REQ-579
sprint: 297
status: approved
created: 2026-04-15
---

# Sprint 297 Plan — F540: Shaping 도메인 분리

## 목표

packages/api의 core/shaping 도메인을 독립 Cloudflare Worker(fx-shaping)로 분리한다.
F539(Discovery 분리) 선례를 따라 Service Binding 기반 MSA 패턴 적용.

## 범위

| # | 작업 | 파일 수 |
|---|------|--------|
| (a) | packages/fx-shaping Worker 신규 생성 | ~55 (routes 13 + schemas 16 + services 22 + infra 4) |
| (b) | fx-gateway: SHAPING Service Binding 추가 + 라우트 위임 | 3 |
| (c) | packages/api: shaping 마운트 제거 | 1 |
| (d) | deploy.yml: fx-shaping paths-filter + deploy step | 1 |
| (e) | TDD: health + route smoke tests | 2 |
| (f) | Smoke Reality: KOAMI bi-koami-001 Shaping 단계 Graph proposals 1건 이상 | — |

## 전제 조건

- F539a/b/c DONE (Sprint 294~296 완료)
- C69 preflight 초판 완료 (Master pane, 2026-04-15)
- D1 동일 DB 공유 (foundry-x-db) — Phase 44에서 독립 DB로 전환 예정

## 구현 전략

1. packages/fx-shaping 폴더 생성 (fx-discovery 선례 그대로 복사)
2. core/shaping/routes/*.ts → fx-shaping 포팅 (Env 타입만 교체)
3. core/shaping/schemas/*.ts → fx-shaping 복사
4. core/shaping/services/*.ts → fx-shaping 복사
5. Gateway app.ts에 /api/shaping/*, /api/ax-bd/* → SHAPING binding 라우팅
6. packages/api/src/app.ts에서 shaping import/mount 제거
7. deploy.yml에 packages/fx-shaping/** paths + deploy step 추가

## ShapingEnv 바인딩 요구사항

```typescript
export interface ShapingEnv {
  DB: D1Database;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY?: string;
  CACHE: KVNamespace;        // ax-bd-agent(rate limit) + ax-bd-persona-eval(rate limit)
  FILES_BUCKET: R2Bucket;    // ax-bd-prototypes(HTML 제공)
  MARKER_PROJECT_ID?: string; // ax-bd-prototypes(Marker.io snippet)
}
```

## Gateway 라우팅 패턴

```
/api/shaping/* → fx-shaping
/api/ax-bd/* → fx-shaping
```

## TDD 계획

- Red: health.test.ts + shaping-routes.test.ts (route smoke — 401 응답 확인)
- Green: fx-shaping Worker 전체 구현
- 검증: cd packages/fx-shaping && pnpm typecheck && pnpm test

## 완료 기준 (Phase Exit 체크리스트)

- [ ] pnpm typecheck (packages/fx-shaping, fx-gateway, api) PASS
- [ ] pnpm test (packages/fx-shaping) PASS
- [ ] msa-lint CI PASS (cross-domain import 0건)
- [ ] Smoke Reality: KOAMI bi-koami-001 Shaping proposals 1건 이상
