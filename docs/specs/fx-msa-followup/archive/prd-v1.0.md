# Foundry-X MSA Follow-up PRD — Structural Gaps & 3rd Separation Plan

> **버전**: v1.0 (Final)
> **작성일**: 2026-04-18 (v1.0 Draft)
> **승격일**: 2026-04-19 (Final, S302)
> **작성자**: Sinclair (kt ds AX BD팀 리드)
> **근거 PRD**: `docs/specs/fx-msa-roadmap/prd-final.md` (Phase 39 Walking Skeleton) + `docs/specs/ax-bd-msa/prd-final.md` (Phase 20 재조정)
> **상위 Phase**: Phase 45 "MSA 3rd Separation & Hardening" (제안 → 확정 대기)
> **관련 SPEC**: F520~F523 (Phase 39 ✅), F538~F544 (Phase 44 🔧 — F541 MERGED로 MSA 4 Worker live)
> **상태**: 📋(plan) — Phase 45 F-item 등록 대기. S302 시점 Phase 44 현행 유지 결정으로 Phase 45 PRD를 Final 단계로 고정

---

## 0. 왜 이 문서가 필요한가

Phase 39 MSA Walking Skeleton(F520~F523)은 2026-04-12에 착수하여 fx-gateway + fx-discovery Worker를 띄우고 "proof-of-concept" 단계까지 도달했다. 이후 Phase 44 MSA 2nd Separation(F538~F541)에서 실제 도메인 이관이 시작되었으나, **2026-04-18 시점 검증 결과 다수의 구조적 미비점이 누적되어 있다.**

원 PRD(fx-msa-roadmap, ax-bd-msa)는 "끝까지 가는 길"이 아니라 "걸을 수 있는지 보는 길"을 설계했다. 따라서 이 문서는 **원 계획의 미완결 지점을 식별하고, Phase 45에서 다룰 구조적 보강 항목을 명문화**하기 위한 후속 PRD이다.

### 검증 범위

| 축 | 방법 | 산출 |
|----|------|-----|
| 문서 | SPEC.md §5, fx-msa-roadmap PRD, ax-bd-msa PRD, CHANGELOG.md 교차 검토 | §1 현황 |
| 코드 | packages/fx-gateway, packages/fx-discovery, packages/fx-shaping, packages/api/src/core/* 디렉토리 파일 수 실측 | §2 gap |
| PR 이력 | origin/master SPEC.md, GitHub PR #535/#544/#588/#595/#596/#597/#598 상태 | §2 partial 누적 |

---

## 1. 현재 상태 스냅샷 (2026-04-18)

### 1-1. Phase 39 Walking Skeleton (완료)

| F-item | Sprint | PR | 상태 | 실측 |
|--------|--------|----|----|------|
| F520 API 게이트웨이 Worker | 268 | #535 | ✅ | fx-gateway 생성, 3-track deploy.yml |
| F521 Discovery 도메인 분리 (Walking Skeleton) | 268 | #535 | ✅ | fx-discovery Worker 생성. **route 1개, service 1개** |
| F522 shared 슬리밍 | 277 | #544 | ✅ | types/web/agent/plugin/sso/methodology/discovery-x/ax-bd/kg 분할 |
| F523 D1 격리 | 277 | #544 | ✅ (partial) | **Option B 채택**: fx-discovery도 `foundry-x-db` 공유 (별도 DB 아님) |

### 1-2. Phase 44 MSA 2nd Separation (진행 중)

| F-item | Sprint | PR | 상태 | 비고 |
|--------|--------|----|----|------|
| F538 Discovery 완전 분리 | 293 | #588 | ✅ partial | **3/10 route 순수 이관**, 7 route는 Service Binding proxy 잔존 |
| F539a k6 벤치마크 Go decision | 294 | #595 | ✅ | local 1226 samples, p50 +5ms |
| F539b fx-gateway 프로덕션 + CORS + VITE_API_URL 전환 | 295 | #596 | ✅ partial | **Web ✅, CLI 미전환** |
| F539c 7 routes Service Binding 이관 | 296 | #597 | ✅ partial | Group A+B Match 95%, **KOAMI Smoke P2 deferred** |
| F540 Shaping 도메인 분리 | 297 | #598 | ✅ partial | fx-shaping Worker 생성, **E2E 검증 미완료** (ESLint hotfix 2efc06f3) |
| F541 Offering 분리 | 299 | — | 📋 deferred | Phase 44 범위 밖 |
| F543 Service Binding latency benchmark | — | — | CONDITIONAL GO | curl p50 **+10~14ms** 관측 |

### 1-3. 패키지별 실측 (2026-04-18 HEAD 기준, api 잔류 코드량)

| 도메인 | api/src/core/*/routes | api/src/core/*/services | 이관 여부 |
|--------|-----------------------|------------------------|----------|
| discovery | 10 | 26 | partial (3 이관, 7 proxy) |
| shaping | 13 | 22 | Worker 생성만 (E2E ❌) |
| offering | 12 | 29 | 미착수 |
| agent | 15 | 62 | 미착수 |
| harness | 22 | 49 | 미착수 |
| modules/auth | 5 | 5 | 미착수 |
| modules/portal | 19 | 23 | 미착수 |
| modules/gate | 7 | 8 | 미착수 |
| modules/launch | 8 | 14 | 미착수 |
| **합계** | **111** | **238** | **~3%만 분리됨** |

- D1 migrations: 133개 (2026-04-18 기준, 0133_agent_improvement_proposals.sql까지). 모든 migration이 단일 `foundry-x-db`에 적용됨.

---

## 2. 구조적 미비점 (Structural Gaps)

원 PRD가 설계한 Walking Skeleton은 "걸을 수 있음"을 증명했지만, **"어떻게 끝까지 갈 것인가"는 공백이다.** 아래 10개 gap이 현재 아키텍처의 구조적 부채로 누적되어 있다.

### Gap 1. Discovery 분리가 partial — "이관"이 아닌 "프록시"

**증상**: F538에서 Discovery 10개 route 중 3개만 fx-discovery Worker로 순수 이관되었고, 7개는 fx-gateway → foundry-x-api → core/discovery/routes/* 경로로 Service Binding proxy 중이다.

**근거**: 
- `packages/fx-discovery/src/routes/items.ts` 1개 파일 (limit/offset 페이지네이션만)
- `packages/api/src/core/discovery/routes/` 10개 파일 잔존
- F538 PR #588 "partial" 표시

**구조적 문제**: Service Binding proxy는 latency +10~14ms (F543 실측) 비용을 유발하면서도 **도메인 소유권은 여전히 foundry-x-api에 있다.** "분리되었다"는 외관만 만들고 "소유권"은 이전되지 않은 상태. 원 PRD §2.2 "Split Boundary" 원칙에 위배된다.

**영향**: 향후 Discovery 도메인 변경 시 두 Worker를 동시에 배포/테스트해야 하는 **이중 배포 부채** 발생.

### Gap 2. D1 Option B 유지 — 데이터 소유권 미분리

**증상**: fx-discovery, fx-shaping 모두 `foundry-x-db` (6338688e-b050-4835-98a2-7101f9215c76)를 공유 바인딩한다. 원 PRD §7c는 Option A(별도 DB)를 "권장"했으나 F523에서 Option B(공유 DB + re-export)가 선택되었다.

**근거**:
- `packages/fx-discovery/wrangler.toml`의 `[[d1_databases]]` database_id가 foundry-x-db와 동일
- 133개 migration 전체가 단일 DB에 적용됨
- Option A 전환 계획/일정 부재

**구조적 문제**: "스키마는 공유, Worker만 분리"는 **데이터 경계 없는 MSA**이다. biz_items 테이블에 Discovery/Shaping/Offering이 모두 직접 접근 가능하므로, 실질적 격리 효과 없음. 장애 전파 시 블라스트 레디우스 축소도 없다.

**영향**: 
- 한 도메인의 migration 실패가 전체 Worker를 500으로 내림
- 데이터 계약(schema contract)이 없어 도메인별 독립 진화 불가
- 멀티 테넌트/리전 분리 향후 불가능

### Gap 3. Shared 타입 cross-domain contract 미분리

**증상**: F522에서 shared를 types/web/agent/plugin/sso/methodology/discovery-x/ax-bd/kg 9개 서브패키지로 분할했으나, **도메인 간 contract를 담당할 "shared-contracts" 레이어가 없다.**

**근거**: shared/discovery-x와 shared/ax-bd는 domain-internal 타입 위주. cross-domain Event/DTO 정의가 각 서비스에 중복 선언됨.

**구조적 문제**: Discovery → Shaping으로 biz_item을 넘길 때 타입이 shared/ax-bd의 `AxBdDiscoveryItem`을 재활용 중. 이는 **제공자(Discovery)가 소비자(Shaping)의 타입을 정의**하는 역 의존. 향후 Discovery가 내부 타입을 바꾸면 Shaping이 깨진다.

**영향**: "독립 배포" 원칙 붕괴 — 두 도메인 동시 배포 필수.

### Gap 4. fx-shaping E2E 검증 부재

**증상**: F540(Sprint 297, PR #598)에서 fx-shaping Worker는 생성되었으나 "partial" 상태. ESLint hotfix(2efc06f3)까지는 들어갔으나 end-to-end 스모크 테스트가 없다.

**근거**: `docs/03-report/` 하위에 F540 sprint report 없음 (확인 필요). `packages/fx-shaping/` 구조가 fx-discovery 수준 skeleton.

**구조적 문제**: "생성"과 "운영 가능"은 별개. Shaping 관련 13 route가 여전히 api에 있고 fx-shaping으로 가는 traffic은 0에 수렴. Walking Skeleton이 2번째로 걷기만 하고 실제 트래픽을 못 받는 상태.

**영향**: 배포는 됐으나 사용되지 않는 **좀비 Worker** 증가 → Cloudflare account 내 서비스 갯수만 늘어남.

### Gap 5. CLI URL 전환 pending

**증상**: F539b에서 Web은 `VITE_API_URL`을 fx-gateway로 전환했으나 CLI는 여전히 `foundry-x-api.ktds-axbd.workers.dev` 직결.

**근거**: 
- `packages/web/.env.production`: `https://foundry-x-api.ktds-axbd.workers.dev/api` (로컬 HEAD 기준, master에서는 전환됐을 수 있음 — 검증 필요)
- `packages/cli/src/` 에서 API_URL 기본값 확인 필요

**구조적 문제**: 이중 엔드포인트 정책은 gateway 우회 경로를 살려두어 "MSA는 옵션, foundry-x-api는 여전히 기본"이 됨. CLI 유저는 분리의 혜택을 못 받음.

**영향**: Strangler Fig 패턴의 핵심인 "단일 진입점"이 깨짐 → 장애 시 두 경로 모두 봐야 함.

### Gap 6. KOAMI Smoke P2 deferred — 운영 검증 공백

**증상**: F539c에서 KOAMI(핵심 사용자 여정) 스모크 테스트 중 P2 케이스가 연기됨.

**근거**: F539c PR #597 "Match 95%, KOAMI Smoke P2 deferred" 표기.

**구조적 문제**: P2 deferred는 "production에서 깨질지도 모르는 엣지 케이스"를 그대로 배포에 올린 것. 원 PRD §4 "Success Criteria"의 "E2E functional assertion 통과"를 충족 못 함.

**영향**: 실사용자 클레임이 들어와야 발견되는 형태의 결함. 사후 대응 비용이 사전 테스트보다 큼.

### Gap 7. SDD Triangle 위반 — SPEC drift

**증상**: 로컬 workspace(HEAD 5cf2131f)는 Sprint 261이나, origin/master는 Sprint 297+. SPEC.md §5의 F-item 상태 갱신이 배포보다 뒤처져 있다.

**근거**: MEMORY.md에 Sprint 283 기록. 실제 master는 F555까지 등록됨.

**구조적 문제**: `.claude/rules/sdd-triangle.md`의 "SPEC.md = SSOT" 원칙 위반. Spec이 Code에 뒤처지면 Gap Analysis 기준점이 무의미해짐.

**영향**: /ax:daily-check 결과가 신뢰 불가 → 다음 sprint 계획이 잘못된 baseline 위에 세워짐.

### Gap 8. 남은 6 도메인 이관 로드맵 부재

**증상**: offering(12/29), agent(15/62), harness(22/49), modules/portal(19/23), modules/gate(7/8), modules/launch(8/14) 총 83 routes / 185 services가 미착수. **원 PRD에 이 6 도메인의 이관 순서/우선순위가 명시되지 않았다.**

**근거**: fx-msa-roadmap PRD §5 "Milestone" 섹션은 Week 1(Gateway+Discovery), Week 2(Discovery 완결)까지만 정의. 이후는 "Phase 40+"로 모호하게 참조.

**구조적 문제**: 10 도메인 중 3%(Discovery 3/10) 만 분리된 상태에서 "Walking Skeleton 완료"를 선언하면, 나머지 97%는 언제 어떻게 분리되는지 공백. Phase 44도 Shaping까지만 다룸.

**영향**: MSA 목표 달성일자 예측 불가. 투자 회수(ROI) 논증 어려움.

### Gap 9. Service Binding latency 누적 영향 미평가

**증상**: F543에서 Service Binding 1-hop 기준 p50 +10~14ms. 그러나 Gateway → API → Discovery Worker 같은 2-hop 또는 3-hop 경로의 누적 latency는 미측정.

**근거**: F543 "CONDITIONAL GO" 판정. 측정 스크립트는 단일 hop만.

**구조적 문제**: 7 routes Service Binding proxy(F539c)는 **3-hop 경로**: browser → fx-gateway → foundry-x-api → fx-discovery (실제로는 core/discovery). 누적 latency 30~42ms 가능성. PRD 목표 <500ms는 만족하나 사용자 체감은 "느려졌다"일 수 있음.

**영향**: 원 PRD §4 성공 기준에 "latency 저하 없음"이 명시되지 않아 판정 기준 불명확 → 누적 손실 방치.

### Gap 10. EventBus/비동기 통신 PoC 부재

**증상**: 원 PRD §7b "Event-driven communication"은 "Cloudflare Queue 또는 D1 Event Table + Cron Trigger"를 언급하나, PoC 미착수.

**근거**: `packages/api/src/db/migrations/*event*` 검색 결과 관련 테이블 없음. Queue 바인딩 wrangler.toml 전무.

**구조적 문제**: 모든 cross-domain 통신이 sync Service Binding으로 처리됨. Discovery에서 Shaping 트리거 같은 장기 작업도 동기 호출 → timeout 위험.

**영향**: 향후 AX BD 발굴→형상화 자동 파이프라인 구축 시 재설계 필요.

### Gap 11 (보조). harness-kit 표준화 미완

**증상**: 원 PRD가 제안한 "harness-kit 공통 패키지(Workers scaffold + JWT + CORS + EventBus)" 도입이 부분만 진행됨.

**근거**: `packages/harness-kit/` 존재 여부와 실제 fx-gateway/fx-discovery/fx-shaping 의존 여부 검증 필요. 현재 각 Worker가 개별 Hono app 세팅.

**구조적 문제**: scaffold 중복 → 세 Worker의 CORS/JWT 동작이 drift 가능.

**영향**: 새 Worker 생성 시 boilerplate 비용 유지 → 분리 속도 저하.

---

## 3. Phase 45 "MSA 3rd Separation & Hardening" 제안

위 11개 gap을 해소할 Phase 45를 제안한다. 범위는 **남은 6 도메인 분리 + 경계 강화(hardening)** 두 축.

### 3-1. F-item 후보 (Draft)

| F# | 제목 | 목적 | 예상 Sprint | 우선순위 |
|----|------|-----|------------|---------|
| **F560** | Discovery 완전 이관 (7 routes 순수 분리) | Gap 1 해소. Service Binding proxy → 순수 이관 | 300 | P0 |
| **F561** | D1 Option A 전환 PoC (discovery_db 분리) | Gap 2 해소. 데이터 소유권 분리 첫 단계 | 301 | P0 |
| **F562** | shared-contracts 레이어 신설 | Gap 3 해소. cross-domain DTO/Event 계약 분리 | 301 | P1 |
| **F563** | fx-shaping E2E + KOAMI P2 완결 | Gap 4, 6 해소. 실제 트래픽 수용 | 302 | P0 |
| **F564** | CLI VITE_API_URL 전환 + Strangler 완결 | Gap 5 해소. 단일 진입점 원칙 복귀 | 302 | P1 |
| **F565** | SDD Triangle 동기화 CI 게이트 | Gap 7 해소. SPEC drift 방지 자동화 | 303 | P2 |
| **F566** | MSA Separation Roadmap v2 (6 도메인) | Gap 8 해소. 분리 우선순위 + 일정 명문화 | 300 | P0 |
| **F567** | Multi-hop latency benchmark | Gap 9 해소. 누적 latency 측정 + SLO 설정 | 303 | P1 |
| **F568** | EventBus PoC (D1 Event Table + Cron) | Gap 10 해소. 비동기 파이프라인 가능성 확보 | 304 | P1 |
| **F569** | harness-kit 표준화 (Workers scaffold) | Gap 11 해소. 새 Worker 생성 비용 절감 | 304 | P2 |
| **F570** | Offering 도메인 분리 (Walking Skeleton) | §1-3 table의 agent(29 services) 대비 규모가 제일 큼 | 305 | P1 |
| **F571** | Agent 도메인 분리 (Walking Skeleton) | 62 services — 가장 복잡, 마지막에 배치 | 307 | P1 |
| **F572** | modules/portal·gate·launch 통합 분리 | 모듈 계열 묶어서 한번에 분리 | 306 | P2 |

### 3-2. Phase 순서 (우선순위 기반)

```
Sprint 300 (P0 집중):
  F560 Discovery 완전 이관 → F566 Roadmap v2 초안
Sprint 301 (P0 구조 작업):
  F561 D1 Option A PoC → F562 shared-contracts 신설
Sprint 302 (P0 완결):
  F563 fx-shaping E2E → F564 CLI 전환
Sprint 303 (P1/P2 보강):
  F565 SDD CI 게이트 → F567 multi-hop benchmark
Sprint 304 (인프라):
  F568 EventBus PoC → F569 harness-kit 표준화
Sprint 305~307 (도메인 확장):
  F570 Offering → F572 modules 통합 → F571 Agent (마지막)
```

### 3-3. 성공 기준 (Phase 45 Exit Criteria)

1. **도메인 소유권 분리율**: Discovery/Shaping/Offering 각각 routes 100% 순수 이관 (proxy 0%)
2. **데이터 경계**: 최소 1개 도메인(Discovery)이 별도 D1 DB 보유
3. **Contract 분리**: shared-contracts 패키지 v1.0 publish
4. **E2E 통과율**: KOAMI P0/P1/P2 전체 100% (deferred 0건)
5. **Strangler 완결**: CLI/Web 모두 fx-gateway 단일 진입점
6. **Latency SLO**: multi-hop p95 < 300ms (1-hop p50 기준 +30ms 이내)
7. **SDD Triangle**: SPEC drift CI 게이트 통과 — sprint 종료 시 자동 동기화
8. **비동기 PoC**: Discovery→Shaping 트리거 1건이 EventBus로 동작

---

## 4. 원 PRD와의 차이 요약

| 항목 | 원 PRD (fx-msa-roadmap v2) | 본 후속 PRD (v1) |
|------|--------------------------|-----------------|
| 범위 | Walking Skeleton (Gateway + Discovery 1개) | 6 도메인 완전 분리 + 경계 강화 |
| D1 전략 | Option A 권장, Option B 허용 | Option A 전환 **PoC 의무화** (F561) |
| Contract | shared 슬리밍까지 | shared-contracts **신규 레이어** 추가 |
| Latency | 1-hop <500ms | multi-hop p95 <300ms (SLO 명문화) |
| EventBus | "향후 도입" 언급 | PoC **Sprint 304에 배정** |
| 이관 순서 | 명시 없음 | Sprint 300~307 **우선순위 배치** |
| SDD drift | 운영 수칙으로만 | CI 게이트 **자동화** (F565) |

---

## 5. 리스크 & 오픈 이슈

### 리스크

| R# | 설명 | 완화책 |
|----|------|-------|
| R1 | D1 Option A 전환 시 FK 참조 끊어짐 | F561을 PoC 단위로 한정, biz_items만 먼저 이동 |
| R2 | Agent 도메인(62 services)은 단일 분리 시 리그레션 위험 | F571을 Phase 45 **마지막**에 배치, 사전 모듈화 |
| R3 | shared-contracts 레이어가 또 다른 monolith 될 위험 | v1은 Event/DTO만, 구현 로직 금지 |
| R4 | EventBus PoC가 지연되면 비동기 플로우 설계 계속 미뤄짐 | F568에 타임박스 2주 고정 |
| R5 | Phase 44 partial 항목이 Phase 45에 끌려옴 (F538, F540) | F560, F563에서 선 해결 |

### 오픈 이슈

1. Option A 전환 시 기존 133 migration을 어떻게 분리할 것인가? (migration 재번호? 재적용?)
2. fx-ai-foundry-os(F545~F549)와의 관계 — 별도 프로젝트인가, Foundry-X의 dashboard 레이어인가?
3. Codex 통합(F550~F555)이 Phase 45 전/후 어디에 위치하는가?
4. harness-kit의 버전 관리 전략 — npm publish? workspace internal?
5. EventBus 선택지 — D1 Event Table vs Cloudflare Queue vs Durable Object 중 어느 것?
6. KOAMI P2 deferred 케이스의 구체적 내용 확인 필요 (F539c 보고서)
7. CLI가 fx-gateway로 전환되면 기존 SSO Hub Token 경로 호환성 검증 필요

---

## 6. 다음 단계 (This PRD → Implementation)

1. **SPEC.md §5에 F560~F572 등록** (master 직접 commit, meta-only 규칙)
2. **이 PRD를 `docs/specs/fx-msa-followup/prd-final.md`로 승격** (현재 draft)
3. **Sprint 300 WT 생성**: `bash -i -c "sprint 300"` → F560 + F566 착수
4. **원 PRD 갱신**: `fx-msa-roadmap/prd-final.md` §Appendix에 "본 문서의 미비점은 fx-msa-followup PRD에서 해소" 링크 추가
5. **MEMORY.md 업데이트**: project_multi_agent_tools_plan.md에 Phase 45 참조 추가

---

## 7. 관련 문서 & 참조

- `docs/specs/fx-msa-roadmap/prd-final.md` — 원 Walking Skeleton PRD
- `docs/specs/ax-bd-msa/prd-final.md` — AX BD 재조정 PRD
- `docs/specs/fx-work-unit-taxonomy/taxonomy.md` — F/C/X 택소노미
- `.claude/rules/sdd-triangle.md` — SDD 원칙
- `.claude/rules/tdd-workflow.md` — TDD Red-Green
- `.claude/rules/task-promotion.md` — Backlog → F 승격 기준
- `SPEC.md §5` — F-item SSOT
- GitHub PRs: #535 (F520/F521), #544 (F522/F523), #588 (F538), #595/#596/#597 (F539), #598 (F540)

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 | 작성자 |
|------|-----|------|--------|
| 2026-04-18 | v1.0 draft | 초안 작성 (Phase 39/44 검증 + Phase 45 제안) | Sinclair |
