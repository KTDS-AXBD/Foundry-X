---
id: FX-PLAN-fx-gateway-cutover
feature: F539 fx-gateway Production Cutover (F539a/b/c 3분할)
related_sprint: Sprint 294 → 295 → 296
date: 2026-04-15
author: Sinclair Seo
version: final
status: ACTIVE
---

# fx-gateway Production Cutover — PRD Final (Round 1, 95/100 + Amb 0.11, Ready)

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Phase 44 MSA 2차 분리의 마지막 단계로, fx-gateway Worker를 실제 프로덕션 트래픽 경로로 전환하고 F538 이월 7 라우트를 Service Binding 호출로 재구성한다.

**배경:**
- Phase 39 Walking Skeleton(F520/F521)로 구조 증명 완료.
- F538(Sprint 293)에서 Discovery 도메인 3 routes가 fx-discovery Worker로 분리(✅, PR #588).
- 그러나 **프로덕션 트래픽은 여전히 packages/api (foundry-x-api.ktds-axbd.workers.dev) 경유**.
- F543(Sprint 291) 벤치마크: Service Binding p50 +10~14ms는 측정됐으나 WSL Korea 지리 한계로 p99 SLO 미증명. CONDITIONAL GO.
- F538은 cross-domain 7 routes(bizItems/axBd*/discoveryPipeline/*/stages/*)를 Service Binding 호출로 통합하지 못하고 packages/api 잔존.

**목표:**
1. **성능 확증**: k6 Cloud Seoul 인-리전 재측정으로 Service Binding 증분 p99 판정 완결.
2. **프로덕션 경로 전환**: fx-gateway Worker를 실제 사용자 트래픽 경로로 승격 + 롤백 스위치 구비.
3. **도메인 경계 완성**: 7 라우트 Service Binding 재구성으로 F538 이월 부채 해소.

**Phase 44 맥락:**
F539 완료 후 F540(Shaping 도메인 분리) / F541(Offering 도메인 분리)가 이어지며, F539에서 확립된 fx-gateway 프로덕션 패턴을 재활용한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **fx-gateway 개발만 존재**: Walking Skeleton 수준, 실제 트래픽 없음.
- **프로덕션 URL = packages/api**: `https://foundry-x-api.ktds-axbd.workers.dev` (`VITE_API_URL`).
- **F543 CONDITIONAL GO**: p99 측정 미완, F538 착수 승인되었으나 F539 착수 전 재검증 필요.
- **7 cross-domain routes 잔존**: `packages/api/src/routes/` 내 bizItems(3개) / discoveryPipeline·stages(4개)가 Service Binding 미통합.
- **배포 파이프라인 drift 5건 해소 완료(Sprint 293)**: 그러나 fx-gateway 프로덕션 배포 경로는 미검증.

### 2.2 목표 상태 (To-Be)

- **k6 Cloud Seoul 리전 p99 판정**: 증분 p99 < 50ms Go / 50~150ms 조건부 Go / >150ms No-Go.
- **fx-gateway 프로덕션 배포**: `foundry-x-gateway.ktds-axbd.workers.dev` (가칭) 독립 URL + routes 설정.
- **VITE_API_URL 전환**: Web(CF Pages) + CLI(config/env)가 fx-gateway로 지향.
- **롤백 스위치**: env 1회 수정 + 재배포(수초)로 packages/api 복귀 가능.
- **7 라우트 Service Binding 재구성**: 2 PR 분할(Group A: bizItems 3개 / Group B: discoveryPipeline·stages 4개).
- **Smoke Reality 확증**: KOAMI `bi-koami-001` Graph 실행 → proposals 저장 실측.

### 2.3 시급성

- Phase 44 로드맵: F540/F541이 F539의 프로덕션 패턴을 참조.
- F543 CONDITIONAL GO 장기 유지는 MSA 로드맵 신뢰성 훼손.
- packages/api 7 라우트 잔존 = F538 이월 부채 + 도메인 경계 미완성.

---

## 3. 사용자 및 이해관계자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (개발자) | 단독 개발자 | 프로덕션 안전한 MSA 전환 + 롤백 확보 |
| AI 에이전트 (autopilot) | Sprint WT 실행자 | 명확한 Go/No-Go 기준 + 롤백 절차 |
| KOAMI Dogfood 사용자 | bi-koami-001 세션 | 전환 전후 응답 지연 없음 |
| Type 1 SKU 첫 고객 (간접) | 향후 프로덕션 사용자 | fx-gateway 경유 시 SLO 보장 |

---

## 4. 기능 요구사항

### 4.1 F539a — k6 Cloud 재측정 (FX-REQ-576) — Must Have

**목적**: F543 A2 조건 해소 + F539b 착수 Go/No-Go 판정.

| ID | 요구사항 | AC |
|----|---------|-----|
| F539a-1 | k6 Cloud Seoul 리전에서 4 엔드포인트(E1~E4) 측정 | `benchmarks/phase-44-latency/k6-items.js` 재실행, Grafana report 링크 확보 |
| F539a-2 | 부하 프로파일: 30s ramp-up → 2m×20 VU → 30s×50 VU spike → 1m recover → 30s ramp-down | k6 Cloud run 완료 로그 |
| F539a-3 | Go/No-Go 판정 리포트 작성 (`docs/04-report/phase-44-f539a-k6-cloud.md`) | 증분 p99 수치 + 판정 기록 |
| F539a-4 | 판정 결과를 F543 비고에 역동기화 | SPEC.md F543 수치 추가 |

**Go 기준 (Service Binding 증분 p99 = E2 - E1)**:
- < 50ms: **Go** — F539b 즉시 착수
- 50~150ms: **조건부 Go** — 캐싱 최적화 후 F539b 착수
- \> 150ms: **No-Go** — F539b 중단, 개선 Sprint 별도 착수

### 4.2 F539b — fx-gateway 프로덕션 전환 + URL 전환 + 롤백 (FX-REQ-577) — Must Have

**전제**: F539a Go 또는 조건부 Go 판정.

| ID | 요구사항 | AC |
|----|---------|-----|
| F539b-1 | fx-gateway Worker 프로덕션 routes 설정 | wrangler.toml routes 또는 workers.dev 서브도메인 확보 |
| F539b-2 | deploy-msa path filter에 fx-gateway 경로 포함 검증 | `.github/workflows/deploy.yml` diff + dry-run |
| F539b-3 | fx-gateway package.json에 wrangler devDependency 추가 (또는 상대경로 확정) | `pnpm --filter @foundry-x/fx-gateway deploy` 로컬 성공 |
| F539b-4 | `VITE_API_URL`을 fx-gateway URL로 전환 (Web + CLI) | CF Pages env 변경 + CLI config 기본값 변경 |
| F539b-5 | 롤백 스위치 문서화 + 리허설 1회 | `docs/04-report/phase-44-f539b-rollback-drill.md` — 롤백 후 복구 증거 |
| F539b-6 | Smoke Reality: KOAMI Graph 1회 실행 성공 + proposals ≥ 1건 | session_id + proposals count 로그 |

### 4.3 F539c — 7 라우트 Service Binding 이전 (FX-REQ-578) — Must Have

**전제**: F539b 프로덕션 배포 완료.

| ID | 요구사항 | AC |
|----|---------|-----|
| F539c-1 | **PR 1 (Group A)**: bizItems 3 라우트(`GET/POST /api/bizItems`, `GET /api/bizItems/:id`)를 fx-gateway에서 fx-discovery Service Binding 호출로 구성 | PR merge + KOAMI Smoke |
| F539c-2 | **PR 2 (Group B)**: discoveryPipeline/stages 4 라우트를 Service Binding 호출로 구성 | PR merge + KOAMI Smoke |
| F539c-3 | packages/api 해당 7 라우트 + 관련 test 파편 삭제 | `grep -rn "api/bizItems\|api/discoveryPipeline\|api/stages" packages/api/src/` = 0 |
| F539c-4 | ESLint `no-cross-domain-import` 룰 확장 (bizItems를 discovery 도메인으로 고정) | 룰 설정 + 자가 PR 통과 |
| F539c-5 | Phase 44 회고(`docs/04-report/phase-44-f539-retrospective.md`) | Smoke Reality P1~P4 체크리스트 기록 |

---

## 5. 기능 외 요구사항 (Non-Functional)

### 5.1 성능

- fx-gateway 증분 p99 < 50ms (Go 조건, Seoul 리전)
- E3 (D1 포함) p99 < 500ms
- Error rate < 0.5%

### 5.2 롤백

- VITE_API_URL env 변경 + 재배포로 30초 내 복귀
- 롤백 절차는 F539b-5 문서에 step-by-step 기술
- 리허설 1회 필수 (프로덕션 배포 전 staging or 검증 시간대)

### 5.3 관측성

- k6 Grafana report 링크 보존
- fx-gateway Workers analytics 대시보드 확인
- `/api/agent-run-metrics` 응답 비교 (전환 전/후)

### 5.4 보안

- JWT/Session 전파: fx-gateway → fx-discovery Service Binding 시 헤더 전달
- CORS: fx-gateway의 CORS 미들웨어가 Pages 도메인 허용
- Secrets: fx-gateway에도 JWT_SECRET/GITHUB_TOKEN/ANTHROPIC_API_KEY 바인딩 (wrangler secret)

---

## 6. 기술 제약

### 6.1 선제 체크리스트 (feedback_msa_deploy_pipeline_gaps.md)

Sprint 293 F538 배포 연쇄 장애 5건을 F539에서 재발 방지:

1. deploy.yml `msa` path filter에 fx-gateway 프로덕션 경로(`packages/fx-gateway/**`) 포함 확인.
2. fx-gateway package.json에 `wrangler` devDependency 추가 (또는 deploy.yml에 상대경로 `../api/node_modules/.bin/wrangler` 명시).
3. 로컬 `pnpm --filter @foundry-x/fx-gateway deploy --dry-run` 성공.
4. routes 이전 시 packages/api의 관련 `*.test.ts` 파편 동시 삭제 (autopilot 프롬프트에 체크리스트 주입).
5. Smoke Reality는 fx-gateway URL 직접 hit으로 검증 (packages/api 경유 금지).

### 6.2 인프라

- Cloudflare Workers 단일 계정(`ktds-axbd`) 내 Worker 2개(api, gateway) + 1 리전 D1
- Service Binding 설정: fx-gateway → { fx-discovery, packages/api }
- D1 바인딩: fx-gateway는 D1 직접 접근 없음 (항상 fx-discovery 경유)

### 6.3 CI/CD

- deploy.yml에 `fx-gateway` job 확장 (F538 msa 블록 패턴 재활용)
- concurrency 충돌 방지 (기존 paths-ignore + cancel-in-progress:false 유지)
- workflow_dispatch 수동 trigger 옵션 유지

---

## 7. 마일스톤

| Sprint | F-item | 산출 | 기간 | 판정 |
|--------|--------|------|------|------|
| Sprint 294 | F539a | k6 Cloud 재측정 + Go/No-Go 리포트 | 1일 | Go / 조건부 Go / No-Go |
| Sprint 295 | F539b | fx-gateway 프로덕션 배포 + URL 전환 + 롤백 리허설 | 1~2일 | Smoke Reality PASS |
| Sprint 296 | F539c | 7 라우트 Service Binding 이전 (2 PR) | 2일 | Phase 44 f539 전체 PASS |

**의존성**: F539a → F539b → F539c (직렬). F539a No-Go 시 F539b/c 중단.

**병렬 여지**: F540(Shaping)/F541(Offering) 준비는 F539b 완료 후 병행 가능 (F539c와 함께 Sprint).

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| k6 Cloud 무료 티어 제한(50VU/50min) | F539a 재측정 실패 | GCP Seoul VM fallback 준비 (플랜 §2 옵션 2) |
| fx-gateway 프로덕션 배포 시 CI drift 재발 | 배포 실패 | 선제 체크리스트 5항목 PRD 기술 제약에 명시 |
| URL 전환 후 실사용자 이슈 | 서비스 중단 | VITE_API_URL 즉시 롤백 (리허설 필수) |
| Service Binding 세션/JWT 전파 누락 | 인증 실패 | F539b-6 KOAMI Smoke에서 인증 포함 시나리오 검증 |
| F539a No-Go 판정 | F539b/c 진행 불가 | URL 전환 중단 결정 (개선 Sprint 별도 착수) |
| 7 라우트 이전 시 consumer 깨짐 (web/cli) | 프로덕션 500 | 2 PR 각각 KOAMI Smoke + grep으로 consumer 영향 확인 |

---

## 9. 범위 외 (Out-of-Scope)

- **F540 Shaping / F541 Offering 도메인 분리**: F539 완료 후 별도 Phase 44 계속
- **api 전체 MSA 분리**: Phase 44는 fx-discovery + fx-gateway만. 나머지는 W+14~W+16
- **Cloudflare Traffic Manager/DNS 전환**: 본 PRD는 env var 기반 전환만. DNS 전환은 별도 Sprint
- **Feature flag 기반 라우트 스위치**: VITE_API_URL env 단일 경로로 한정
- **성능 튜닝(캐싱 추가, D1 인덱스)**: F539a 조건부 Go 판정 시 별도 Sprint
- **CLI npm 공개 배포**: F539c에서 CLI config 변경은 하되 npm 재배포는 F544+ 범위

---

## 10. 성공 지표 (AC 요약)

### 10.1 F539a
- [x] k6 Cloud Seoul 측정 완료 + Grafana report 링크
- [x] 증분 p99 판정 기록 (Go / 조건부 Go / No-Go)
- [x] F543 비고 역동기화

### 10.2 F539b
- [x] fx-gateway 프로덕션 URL 접근 가능 (curl health check)
- [x] VITE_API_URL 전환 완료 (Web + CLI)
- [x] 롤백 리허설 1회 + 복구 증거
- [x] KOAMI Smoke Reality PASS (proposals ≥ 1건)

### 10.3 F539c
- [x] Group A PR merge + Smoke PASS
- [x] Group B PR merge + Smoke PASS
- [x] packages/api 해당 7 라우트 + test 파편 삭제
- [x] Phase 44 f539 retrospective 작성

### 10.4 전체 Phase Exit

- [x] Phase 44 F539 3개 모두 ✅
- [x] fx-gateway 프로덕션 트래픽 처리 (analytics 확인)
- [x] MEMORY feedback_msa_deploy_pipeline_gaps 5항목 체크 통과

---

## 11. Open Issues (인터뷰 후속)

| # | 항목 | 담당 | 마감 |
|---|------|------|------|
| 1 | fx-gateway 프로덕션 URL 후보(`foundry-x-gateway.ktds-axbd.workers.dev` vs `fx-api.minu.best`) | F539b 착수 시 결정 | Sprint 295 D1 |
| 2 | 7 라우트 Group A/B 구분 시 `GET /api/bizItems/:id` subcollection routes 처리 | F539c Plan 단계 | Sprint 296 D1 |
| 3 | ESLint 룰 확장 시 shared 타입 중복 선언 제거 여부 | F539c-4 | Sprint 296 D2 |
| 4 | KOAMI 세션 이외 추가 Smoke 시나리오 (F540/F541 대비) | F539c 회고에서 판단 | Sprint 296 종료 |

---

## 12. 참조

- `docs/specs/fx-msa-roadmap-v2/prd-final.md` — MSA 로드맵 v2 (SSOT)
- `docs/specs/fx-msa-roadmap-v2/f543-a2-k6-cloud-plan.md` — k6 Cloud 측정 플랜 DRAFT
- `docs/04-report/phase-44-latency-decision.md` — F543 Sprint 291 벤치마크
- `docs/04-report/sprint-293-f538-discovery-split.md` (가칭) — F538 교훈
- MEMORY `feedback_msa_deploy_pipeline_gaps.md` — 선제 체크리스트 5항목
- SPEC.md §5 F538 비고 — 배포 파이프라인 5건 요약

---

**다음 단계**: Phase 2 AI 검토 (skip 가능) → Phase 4 충분도 평가 → prd-final.md 승격 → SPEC.md §5 F539 → F539a/b/c 3분할 등록 (FX-REQ-576/577/578) → Sprint 294 WT 생성.
