---
id: FX-PLAN-fx-gateway-cutover-interview
feature: F539 fx-gateway Production Cutover
related_sprint: Sprint 294
date: 2026-04-15
author: Sinclair Seo
status: COMPLETE
---

# F539 fx-gateway Production Cutover — 인터뷰 로그

## 배경

Phase 44 MSA 2차 분리 일환. F538(Discovery 도메인 분리)로 fx-discovery Worker + 3 routes(/discovery, /discovery-report, /discovery-reports)는 이미 분리 완료(✅, PR #588). 그러나:

1. **F543 CONDITIONAL GO 미해소**: Service Binding 증분 p50 +10~14ms는 측정됐으나 p99 <100ms는 WSL Korea 지리 제약으로 미증명. F539 착수 전 k6 Cloud 인-리전 재측정 필요.
2. **fx-gateway는 개발 환경만 존재**: 프로덕션 트래픽이 여전히 `foundry-x-api.ktds-axbd.workers.dev`(packages/api)로 흐름.
3. **F538 이월 7 라우트**: `bizItems/axBd*/discoveryPipeline/*/stages/*` 7 cross-domain routes는 F538에서 Service Binding 호출 미통합 상태로 packages/api에 잔존.

이 3축을 F539로 묶어 Phase 44 MSA 2차 분리를 "실제 프로덕션 트래픽 분리" 단계로 완성한다.

## 전제 제약

### 선제 체크리스트 5항목 (feedback_msa_deploy_pipeline_gaps.md — Sprint 293 교훈)

F538 배포 시 연쇄 장애 5건 발생. F540/F541 착수 전 체크리스트였으나 F539(fx-gateway 프로덕션 배포 포함)에 동일 적용:

- [ ] deploy.yml `msa` path filter에 fx-gateway 프로덕션 경로 포함 확인
- [ ] fx-gateway package.json에 wrangler devDependency 포함 (또는 deploy.yml 절대경로)
- [ ] 로컬 `pnpm --filter @foundry-x/fx-gateway deploy` dry-run 성공 확인
- [ ] routes 이전 시 packages/api의 관련 test 파편 동시 삭제 체크리스트 (autopilot 프롬프트)
- [ ] Phase Exit Smoke Reality는 fx-gateway URL **직접** hit으로 검증

### 참조 문서

- `docs/specs/fx-msa-roadmap-v2/prd-final.md` — MSA 로드맵 v2 (F538 완료, F539 후속)
- `docs/specs/fx-msa-roadmap-v2/f543-a2-k6-cloud-plan.md` — k6 Cloud 측정 플랜 (Sprint 294 착수 전 1회 실행 필수)
- `docs/04-report/phase-44-latency-decision.md` — F543 Sprint 291 WSL Korea 측정 (CONDITIONAL GO)
- MEMORY: `feedback_msa_deploy_pipeline_gaps.md` (5 체크리스트)

## Phase 1 인터뷰 — 핵심 결정

> 반복 세션 컨텍스트가 이미 명확하여 5파트 풀 인터뷰 대신 핵심 결정 포인트 7개를 배치로 수집.

### Q1. 프로젝트 코드네임

**답변**: `fx-gateway-cutover`

- fx-gateway 프로덕션 전환이 가장 핵심 내러티브
- `docs/specs/fx-gateway-cutover/` 경로 (본 파일 포함)

### Q2. F539 분할 여부

**답변**: F539a / F539b / F539c 3개 분할

- **F539a** (k6 재측정 / FX-REQ-576) — k6 Cloud 인-리전 p99 측정 + Go/No-Go 판정 리포트
- **F539b** (URL 전환 + 롤백 / FX-REQ-577) — fx-gateway 프로덕션 배포 + VITE_API_URL 전환 + 롤백 스위치
- **F539c** (7 라우트 이전 / FX-REQ-578) — cross-domain 7 routes를 Service Binding 호출로 재구성

각 Sprint는 독립 Smoke Reality로 검증. F539a No-Go 시 F539b/c 중단 가능.

### Q3. k6 No-Go 시 행동

**답변**: URL 전환 중단 + 원인 분석 후 재시도

- 증분 p99 > 150ms → Sprint 294를 F539a 완료 후 중단
- 원인(캐싱 미적용/D1 RTT/지리) 분석 리포트 작성
- 개선 Sprint 별도 진행 (VITE_API_URL 전환 금지)

### Q4. URL 전환 롤백 스위치

**답변**: VITE_API_URL env 전환

- Web: Cloudflare Pages env variable (Preview/Production 분리)
- CLI: config file `.foundry-x/config.json` or env var
- 재배포 1회 필요 (수초 내 전파)
- 구현 단순, 테스트 쉬움

### Q5. F539c 7 라우트 이전 단위

**답변**: 점진적 이전 2번 PR

- **PR 1 (Group A)**: bizItems 계열 3개 (`GET/POST /api/bizItems`, `GET /api/bizItems/:id`)
- **PR 2 (Group B)**: discoveryPipeline / stages 4개 (`/api/discoveryPipeline/*`, `/api/stages/*`)
- 각 PR 완료 직후 KOAMI Smoke Reality 검증

### Q6. Phase Exit Smoke Reality 시나리오

**답변**: KOAMI Dogfood 재사용

- 대상: `bi-koami-001` (F534~F542 Dogfood 경로)
- 검증 경로: fx-gateway URL 직접 hit → Graph 실행 → Discovery + MetaAgent proposals 저장
- 판정:
  - P1: bi-koami-001 Graph 세션 1회 실행 성공
  - P2: proposals ≥ 1건 저장 (F544 P3에서 3건 확인)
  - P3: `/api/agent-run-metrics` 응답 6축 수치 실측
  - P4: 회고 기록 (`docs/04-report/phase-44-f539-retrospective.md`)

### Q7. k6 측정 환경

**답변**: k6 Cloud

- Grafana 관리형 (무료 50 VU × 50min/월)
- 리전 선택: Seoul (`ap-northeast-2`) 우선, Tokyo fallback
- 플랜 문서 재활용: `docs/specs/fx-msa-roadmap-v2/f543-a2-k6-cloud-plan.md`

## 결정 요약

| # | 결정 | 근거 |
|---|------|------|
| D1 | 3축 분할 F539a/b/c | Smoke Reality 독립 검증 + 롤백 범위 축소 |
| D2 | k6 Cloud Seoul 리전 | 무료 티어 + 인-리전 신뢰도 + 1시간 내 완료 |
| D3 | VITE_API_URL env 전환 | 재배포 1회 수초 롤백, 구현 단순 |
| D4 | 7 라우트 2 PR 분할 | 점진적 + 각 PR Smoke Reality |
| D5 | KOAMI Dogfood 재사용 | F534~F542 검증된 실전 경로 |
| D6 | No-Go 시 URL 전환 중단 | 성능 미증명 상태 배포 회피 |
| D7 | 선제 체크리스트 5항목 | Sprint 293 F538 연쇄 장애 방지 |

## 다음 단계

1. PRD v1 작성 (`prd-v1.md`) — 본 인터뷰 결정 반영
2. Phase 2 API 검토 (또는 skip — 사용자 결정)
3. Phase 4 충분도 평가
4. prd-final.md 승격 → SPEC F539 → F539a/b/c 분할 등록
5. Sprint 294 (F539a) WT 생성 + autopilot
