---
sprint: 297
feature: F540
req: FX-REQ-579
match_rate: 96
test_result: pass
date: 2026-04-15
---

# Sprint 297 Report — F540: Shaping 도메인 분리

## 요약

fx-shaping 독립 Worker 생성 완료. 13 routes, 22 services, 15 schemas를 packages/api에서 분리.
fx-gateway Service Binding 연동 + CI/CD 파이프라인 통합. Match Rate 96%.

## 구현 통계

| 항목 | 수치 |
|------|------|
| 신규 파일 | 89개 (fx-shaping 전체) |
| 수정 파일 | 5개 (gateway 3 + api 2 + deploy.yml 1) |
| TDD 테스트 | 4개 (health 1 + auth 3) PASS |
| Match Rate | 96% |
| 의존 서비스 내재화 | 17개 (agent 8 + harness 8 + collection 1 + discovery 1) |

## 주요 변경

### packages/fx-shaping (신규)
- `wrangler.toml`: D1 + KV(CACHE) + R2(FILES_BUCKET) + ANTHROPIC_API_KEY
- 13 routes: shaping, ax-bd-bmc/agent/comments/history/links/viability/prototypes/skills/persona-eval/progress, persona-configs/evals
- `ShapingEnv` — Env 타입 분리 (packages/api Env에서 독립)
- middleware: JWT auth + tenant guard (fx-discovery 패턴 재사용)

### fx-gateway
- SHAPING Service Binding 추가
- /api/shaping/* + /api/ax-bd/* → fx-shaping 라우팅
- /api/ax-bd/discovery-report* 선행 등록으로 DISCOVERY 우선 처리 유지
- /api/ideas/:id/bmc + bmc/* → fx-shaping (BMC 연동)

### packages/api
- shaping 13개 app.route() 제거 (주석으로 이전 사유 표시)
- core/index.ts shaping exports 제거

### deploy.yml
- msa paths-filter에 `packages/fx-shaping/**` 추가
- deploy-msa에 fx-shaping deploy step 추가 (fx-gateway 직전 배포)

## 의존 서비스 내재화 관찰

shaping 서비스들이 agent(prompt-gateway 등), harness(prototype-service 등), collection(idea-service) 도메인을 cross-import하고 있었음. 현재 MSA 분리는 이들을 fx-shaping 내부에 복사(내재화)하여 Worker 자기완결성 확보.

후속 검토:
- C57 shared 슬리밍 (F541 완료 후) 시 이 내재화된 파일들을 fx-shaping 전용 내부 타입으로 정리
- C56 D1 격리 ESLint 룰은 F541 전에 적용 권장

## Gap Analysis

Match Rate: 96%

미명시 추가 구현:
- agent/, harness/, launch/, collection/, discovery/ 하위 내재화 모듈 (Design 역동기화 완료)
- schemas 15개 (Design 텍스트 16개 오기 — 실수정)

## Phase Exit 체크리스트 (F540)

- [x] pnpm typecheck (fx-shaping, fx-gateway) PASS
- [x] pnpm test (4 tests) PASS
- [x] msa-lint: cross-domain import 위반 없음
- [x] deploy.yml fx-shaping paths + deploy step 추가
- [ ] Smoke Reality: KOAMI bi-koami-001 Shaping 단계 Graph proposals >= 1건 (배포 후 검증 필요)

## 다음 Sprint

- Sprint 298: F541 Offering 도메인 분리 (F540 선례 활용)
- C56: D1 격리 ESLint 룰 (F541 착수 전 선행 권장)
