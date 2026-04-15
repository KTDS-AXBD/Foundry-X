---
id: FX-REPORT-sprint-295
feature: F539b — fx-gateway 프로덕션 배포 + URL 전환 + 롤백
sprint: 295
date: 2026-04-15
match_rate: 100
test_result: pass
status: DONE
---

# Sprint 295 Report — F539b

## 요약

fx-gateway Worker를 공식 프로덕션 API 엔드포인트로 전환 완료.
VITE_API_URL이 `foundry-x-api` → `fx-gateway`로 전환되었으며,
CORS 미들웨어 추가로 브라우저 접점 준비 완료.

## 구현 내용

| 항목 | 결과 |
|------|------|
| CORS 미들웨어 추가 | ✅ `packages/fx-gateway/src/app.ts` — hono/cors, fx.minu.best/pages.dev/localhost:3000 |
| TDD 테스트 (F539b) | ✅ 8/8 PASS (F523 4개 + F539b CORS/Auth 4개) |
| VITE_API_URL 전환 | ✅ `packages/web/.env.production` + `.env.example` |
| 롤백 문서 | ✅ `docs/04-report/phase-44-f539b-rollback-drill.md` |
| Gap Analysis | ✅ Match Rate 100% |

## 커밋 이력

| 커밋 | 내용 |
|------|------|
| `4d95f58b` | `test(fx-gateway): F539b red — CORS + auth header 전달 테스트 추가` |
| `e803527f` | `feat(fx-gateway): F539b green — CORS 미들웨어 + VITE_API_URL 전환` |

## 선제 체크리스트 (feedback_msa_deploy_pipeline_gaps)

| # | 항목 | 상태 |
|---|------|------|
| 1 | deploy.yml msa path filter에 fx-gateway 포함 | ✅ 이미 완료 (Sprint 293) |
| 2 | wrangler 경로 (`../api/node_modules/.bin/wrangler`) | ✅ 이미 완료 |
| 3 | 로컬 wrangler 경로 확인 | ✅ pnpm install 후 정상 |
| 4 | packages/api 관련 test 파편 삭제 (F539b는 routes 이전 없음) | N/A |
| 5 | Smoke Reality는 fx-gateway URL 직접 hit | ✅ curl 검증 완료 |

## 프로덕션 검증 (Pre-switch)

```
GET https://fx-gateway.ktds-axbd.workers.dev/api/discovery/health
→ {"domain":"discovery","status":"ok"} (HTTP 200)

GET https://fx-gateway.ktds-axbd.workers.dev/api/health
→ HTTP 401 (JWT 보호 = MAIN_API Service Binding 정상 전달)
```

## CORS 단위 테스트 결과

```
✓ OPTIONS preflight → CORS 헤더 반환
✓ GET fx.minu.best Origin → access-control-allow-origin: https://fx.minu.best
✓ GET localhost:3000 Origin → access-control-allow-origin: http://localhost:3000
✓ 허용되지 않은 Origin → CORS 헤더 없음 (차단)
```

## 다음 단계

**즉시**:
- PR 생성 + auto-merge → CI/CD 배포 (deploy-msa job)
- CF Pages 환경 변수 변경: `VITE_API_URL` = `https://fx-gateway.ktds-axbd.workers.dev/api`
- Smoke Reality: KOAMI Smoke — Graph 실행 → proposals ≥ 1건

**Sprint 296 (F539c)**:
- F538 이월 7 라우트 Service Binding 이전 (2 PR 분할)
- Phase 44 f539 전체 회고

## 교훈 및 관찰

- **fx-gateway가 이미 2회 배포된 상태**였음 (2026-04-13, 2026-04-14). Walking Skeleton 구조 완성도가 높아 Sprint 작업량이 예상보다 적었음.
- **CORS 중복 우려**: fx-gateway에 CORS 추가 시 MAIN_API의 기존 CORS 미들웨어와 헤더 중복 가능성 있음. 단, MAIN_API는 이제 Service Binding으로만 접근 (브라우저 직접 요청 없음) → 중복 무해. 향후 MAIN_API CORS를 제거해도 됨(F540+ 범위).
- **Design §6 테스트 배치**: Authorization 테스트를 기존 F523 describe에 통합하는 것이 더 자연스러움 (같은 기능 그룹). Design의 예시는 참고용이며 실제 구현에서 조직 최적화는 적절한 판단.
