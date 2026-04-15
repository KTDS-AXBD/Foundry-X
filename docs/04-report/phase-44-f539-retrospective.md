---
id: FX-REPORT-phase-44-f539
feature: Phase 44 F539 — fx-gateway Production Cutover
phase: 44
f_items: F539a, F539b, F539c
sprints: 294, 295, 296
prs: "#595, #596, #597"
req: FX-REQ-576, FX-REQ-577, FX-REQ-578
date: 2026-04-15
author: Sinclair Seo
status: COMPLETE
---

# Phase 44 F539 — fx-gateway Production Cutover 회고

## 요약

| 항목 | 값 |
|------|------|
| **기간** | 2026-04-15 11:08 ~ 15:42 (약 4시간 34분) |
| **Sprint** | 294 → 295 → 296 (순차 3개) |
| **F-items** | F539a (k6 재측정) / F539b (URL 전환) / F539c (7 라우트 + CLI scripts) |
| **PR** | #595 (92%) / #596 (100%) / #597 (95%) |
| **Phase Exit 전체 판정** | ✅ **PASS (부분)** — 기능 목표 달성, 실측 3건 drift |
| **Smoke Reality P2** | ⚠️ **Sprint 297 F540 Shaping Dogfood에 통합 이월** |

---

## 1. 달성 사항

### 1.1 F539a (Sprint 294, PR #595)

- k6 로컬 1226샘플/endpoint × 3 endpoints 측정
- **증분 p50 = +5ms** (Sprint 291 curl 벤치마크 +10ms과 일관)
- 판정: ✅ **GO** — F539b 착수 승인
- F543 CONDITIONAL GO 조건 A2 실용 해소

### 1.2 F539b (Sprint 295, PR #596)

- fx-gateway Worker에 CORS 미들웨어(hono/cors) 추가
- `VITE_API_URL` → `https://fx-gateway.ktds-axbd.workers.dev/api` 전환 (Web .env.production)
- 롤백 드릴 1회 완료 (`docs/04-report/phase-44-f539b-rollback-drill.md`)
- 선제 체크리스트 4/5 PASS

### 1.3 F539c (Sprint 296, PR #597)

- **Group A**: biz-items CRUD 3 routes → fx-discovery
- **Group B**: discovery-stages / discovery-pipeline 4 routes → fx-discovery
- **packages/api**: 7 handlers 제거 + migration comments
- **CLI URL 전환 (F539b 이월 흡수)**: `scripts/*.sh` 7개 fx-gateway URL 전환
- fx-discovery 11 new tests GREEN, fx-gateway 8 tests, typecheck 13 packages PASS

### 1.4 Pipeline 고도화 효과

- Service Binding 기반 cross-domain 호출 프로덕션 검증
- packages/api ↔ fx-discovery 경계 실질 분리 완성 (F538 이월 7 routes 해소)
- 도메인 간 JWT/CORS 전파 메커니즘 확립

---

## 2. Phase Exit Drift 3건

### D1. 2 PR 분할 미이행 (F539c)

**계획** (PRD §4.3):
- PR 1 — Group A (biz-items 3)
- PR 2 — Group B (discovery-stages/pipeline 4)

**실제**:
- 단일 PR #597로 통합

**판단**: 수용
- 결과 커버리지 동일
- fx-gateway routing rules + fx-discovery tests + packages/api handler 삭제가 원자적(atomic)으로 필요
- 분할 시 중간 상태(Group A만 적용)에서 E2E 깨짐 가능성

**교훈**: PRD의 "2 PR 분할" 요구는 이상적 설계였으나, 실제 코드 구조상 atomic이 더 안전. **향후 유사 PRD 작성 시 "분할 가능 경계"를 설계 단계에서 확인**.

### D2. KOAMI Smoke Reality P2 미실측

**계획** (PRD §4.2 F539b-6 + §4.3 F539c):
- bi-koami-001 Graph 1회 실행 → proposals ≥ 1건 저장 실측

**실제**:
- F539b PR #596: "PR merge + CF Pages 배포 후 실행 예정"으로 이월
- F539c PR #597: `packages/web/e2e/prod/smoke.spec.ts` 추가만, Graph 실행 증거 없음

**근본 원인**:
- KOAMI Graph 실행은 로그인된 세션(JWT) 필요 → curl/CI 자동화 어려움
- autopilot은 코드 변경 + 테스트 + PR 생성까지만 커버, 실측 Dogfood는 범위 밖

**이월 전략**: **Sprint 297 F540 Shaping Dogfood에 통합**
- F540에서 bi-koami-001 Shaping 단계 Graph 실행 시 fx-gateway → fx-discovery 경로가 자동 사용됨
- F540 Smoke Reality가 F539 전체 라우팅 회귀까지 간접 검증
- 별도 F539 Smoke 실측 Sprint는 생성하지 않음 (효율)

### D3. Retrospective 누락 (F539c)

**계획** (PRD §4.3 F539c-5): `docs/04-report/phase-44-f539-retrospective.md` 작성

**실제**: PR #597에 포함되지 않음

**해소**: **본 문서**로 해소 (Master pane 후속 작업 2026-04-15 15:45~)

---

## 3. 주요 교훈 (Lessons)

### L1. autopilot의 범위와 한계

**관찰**:
- autopilot은 기능 구현 + 테스트 + typecheck + PR 생성 + auto-merge까지 **자율 실행**
- 그러나 (a) 실측 Dogfood (사용자 세션 필요), (b) 회고 문서 작성 (컨텍스트 요약), (c) 전략적 drift 판단은 **사람 개입 필요**

**적용**: 
- autopilot을 "Impl + Verify + Merge" 전담으로 범위 한정
- Smoke Reality + Retrospective는 Master pane에서 별도 task (본 Sprint처럼)

### L2. 선제 체크리스트 효과 (feedback_msa_deploy_pipeline_gaps 5항목)

**효과**:
- Sprint 293 F538에서 배포 연쇄 5건 장애 발생 → feedback 기록 → F539에 선제 적용 → **동일 장애 0건** 재발
- Sprint 295 F539b PR 본문에 5항목 명시적 체크 기록 (4/5 PASS, test 파편 N/A)

**미흡**:
- 체크리스트는 PRD §6.1에 명시했으나 **자동화되지 않음** — autopilot이 수동 확인
- **C69 preflight 자동화**로 후속 개선 예정 (F540/F541 착수 전)

### L3. PRD drift 수용 vs 재작업

**이번 Phase에서의 drift**:
- D1 (2 PR 분할) → 수용 (atomic이 안전)
- D2 (Smoke 미실측) → 다음 Phase 통합 이월
- D3 (Retrospective 누락) → 별도 task 처리

**원칙 도출**:
- drift가 **결과 동일**이면 수용 + 기록
- drift가 **Phase Exit 미달**이면 별도 task 처리
- drift가 **기능 미달**이면 hotfix PR

### L4. k6 Cloud vs 로컬 Fallback

**F539a 경험**: k6 Cloud account 미설정 → 로컬 Fallback 선택 → PRD "Seoul 리전" 요구 미달

**수용 근거**: 증분 p50 지표는 지리 무관 → 판정 유효
**엄격 복원 경로**: F543 A2 후속 Sprint(미확정) or F540/F541 k6 CI 자동화 시점

---

## 4. 향후 조치

### 4.1 Phase 44 잔여 (Sprint 297~)

| # | Task | 담당 | 타이밍 |
|---|------|------|--------|
| 1 | C69 배포 preflight 자동화 | Master pane | F540 착수 전 |
| 2 | Sprint 297 F540 Shaping 분리 | Sprint WT | C69 완료 후 |
| 3 | F540 Smoke Reality 내 F539 간접 검증 | Sprint WT | F540 autopilot |
| 4 | C56 D1 격리 ESLint 룰 | Master pane | F540 Design 단계 |
| 5 | Sprint 298 F541 Offering 분리 | Sprint WT | F540 완료 후 |
| 6 | C57 shared 슬리밍 | Master pane | F541 완료 후 |

### 4.2 기록된 교훈 feedback 후보

- [ ] `feedback_autopilot_scope.md` — autopilot 범위 + 사람 개입 경계
- [ ] `feedback_phase_exit_smoke_integration.md` — Smoke Reality 다음 Phase 통합 전략

---

## 5. 지표

### 5.1 시간 투입

| Sprint | WT 시작 | MERGED | 소요 |
|:---:|:---:|:---:|:---:|
| 294 | 11:08 | 11:33 | **25분** |
| 295 | 13:13 | 13:31 | **18분** |
| 296 | 13:43 | 15:41 | **118분** |

### 5.2 Phase Exit P1~P4

| P | 체크 | 결과 |
|:---:|------|:---:|
| P1 | 실전 Dogfood — fx-gateway URL 직접 hit | ✅ `/api/discovery/health` 200 |
| P2 | 실측 산출물 — KOAMI proposals ≥ 1건 | ⚠️ F540 이월 |
| P3 | 6축 메트릭 or 도메인 KPI 실측 | ⚠️ F540 이월 (Graph 실행 시 자동 수집) |
| P4 | 회고 작성 | ✅ **본 문서** |

**판정**: **부분 PASS** — P1+P4 충족, P2+P3 F540에서 통합 확증.

---

## 6. 관련 문서

- `docs/specs/fx-gateway-cutover/prd-final.md` — PRD (Round 1 95/100 Ready)
- `docs/04-report/phase-44-f539a-k6-cloud.md` — k6 판정 리포트
- `docs/04-report/phase-44-f539b-rollback-drill.md` — 롤백 드릴
- `docs/04-report/phase-44-latency-decision.md` — F543 Sprint 291 벤치마크
- MEMORY `feedback_msa_deploy_pipeline_gaps.md` — 5항목 체크리스트
- SPEC.md §5 F539a/b/c, F543, F538
