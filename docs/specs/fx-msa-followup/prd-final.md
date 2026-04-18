# Foundry-X MSA Follow-up PRD — Structural Gaps & 3rd Separation Plan

> **버전**: v1.1 (Final)
> **작성일**: 2026-04-18 (v1.0 Draft)
> **승격일**: 2026-04-19 (v1.1 Final, S302 — 3-AI Round 3 수용)
> **작성자**: Sinclair (kt ds AX BD팀 리드)
> **근거 PRD**: `docs/specs/fx-msa-roadmap/prd-final.md` (Phase 39 Walking Skeleton) + `docs/specs/ax-bd-msa/prd-final.md` (Phase 20 재조정)
> **상위 Phase**: Phase 45 "MSA 3rd Separation & Hardening" (확정)
> **관련 SPEC**: F520~F523 (Phase 39 ✅), F538~F544 (Phase 44 🔧 — F541 MERGED로 MSA 4 Worker live), F560~F572 (Phase 45 Sprint 311~318)
> **상태**: 📋(plan) — Phase 45 F-item (F560~F572) SPEC 등록 진행. 3-AI 검토 스코어 63→68→76 (3회), Conditional 수용 판정
> **검토 이력**: `archive/review/round-{1,2,3}/` — ChatGPT/Gemini/DeepSeek 각 3회

---

## 0. 왜 이 문서가 필요한가

Phase 39 MSA Walking Skeleton(F520~F523)은 2026-04-12에 착수하여 fx-gateway + fx-discovery Worker를 띄우고 "proof-of-concept" 단계까지 도달했다. 이후 Phase 44 MSA 2nd Separation(F538~F541)에서 실제 도메인 이관이 시작되었으나, **2026-04-18 시점 검증 결과 다수의 구조적 미비점이 누적되어 있다.**

원 PRD(fx-msa-roadmap, ax-bd-msa)는 "끝까지 가는 길"이 아니라 "걸을 수 있는지 보는 길"을 설계했다. 따라서 이 문서는 **원 계획의 미완결 지점을 식별하고, Phase 45에서 다룰 구조적 보강 항목을 명문화**하기 위한 후속 PRD이다.

<!-- CHANGED: 주요 이해관계자(내부 개발팀, 운영팀, 엔드유저) 명시 -->
### 주요 이해관계자(Stakeholders)
- **내부 개발팀/운영팀**: MSA로 전환된 시스템을 개발·운영하는 개발자, SRE, DevOps 엔지니어.
- **Foundry-X 최종 사용자**: AX BD 발굴, 형상화 등 비즈니스 프로세스의 실제 사용자.
- **프로덕트 오너, QA, 보안 담당자**: 분리 및 이관에 따른 품질, 안정성, 보안 책임자.
- **외부 감사/컴플라이언스**: 데이터 소유권, 서비스 분리의 준수 여부 확인자.

### 검증 범위

| 축 | 방법 | 산출 |
|----|------|-----|
| 문서 | SPEC.md §5, fx-msa-roadmap PRD, ax-bd-msa PRD, CHANGELOG.md 교차 검토 | §1 현황 |
| 코드 | packages/fx-gateway, packages/fx-discovery, packages/fx-shaping, packages/api/src/core/* 디렉토리 파일 수 실측 | §2 gap |
| PR 이력 | origin/master SPEC.md, GitHub PR #535/#544/#588/#595/#596/#597/#598 상태 | §2 partial 누적 |

---

## 1. 현재 상태 스냅샷 (2026-04-18)

<!-- CHANGED: CLI 미전환, 실제 ENV 상태 등에 대한 검증 필요성 명시(사실 확인 강조) -->
> **참고:** 일부 측정 데이터(예: CLI 미전환, ENV 값)는 로컬 HEAD 기준이며 master/main 기준 실측 추가 검증 필요.  

<!-- CHANGED: 리소스/규모 산정 관련 부연 -->
> **참고:** 도메인별 route/service 수는 현황 기준이며, 실제 분리·이관에 투입되는 인력/시간 산정은 별도 리소스 섹션 참조.

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
| F539b fx-gateway 프로덕션 + CORS + VITE_API_URL 전환 | 295 | #596 | ✅ partial | **Web ✅, CLI 미전환 (실측 재확인 필요)** |
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

<!-- CHANGED: Gap/해결책 간 종속관계 및 병렬작업 가능성, 기술 난이도, 롤백 시나리오 필요성 명시 -->
> **참고:** Gap 2(데이터 경계), Gap 3(Contract 분리), Gap 9(성능)은 상호 종속성을 가질 수 있으며, 일부 F-item은 병렬 진행이 불가할 수 있음.  
> **대규모 데이터 분리/이관(Gap 2, 8 등) 및 EventBus 도입(Gap 10) 등은 높은 기술 난이도와 조직 저항, 서비스 중단·데이터 손실 리스크가 수반됨.**  
> **추가로, 각 도메인 분리에 대한 단계적 롤백/리커버리 플랜이 필요하며, 운영·관측·보안 영향에 대한 사전 검토가 요구됨.**

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

<!-- CHANGED: 데이터 마이그레이션의 난이도/리스크/롤백 필요성 강조 -->
**추가 리스크**:  
- 133개 migration 중 특정 테이블만 별도 DB로 분리할 때 FK 참조, 데이터 consistency, 다운타임 최소화, 롤백/리커버리 플랜, 운영 중 이중화 등 고난이도 작업이 요구됨.  
- 실서비스 전환 전 Blue-Green 배포, Feature Flag, 복수 데이터 소스 병행 등 단계적 안전장치가 필요.

### Gap 3. Shared 타입 cross-domain contract 미분리

**증상**: F522에서 shared를 types/web/agent/plugin/sso/methodology/discovery-x/ax-bd/kg 9개 서브패키지로 분할했으나, **도메인 간 contract를 담당할 "shared-contracts" 레이어가 없다.**

**근거**: shared/discovery-x와 shared/ax-bd는 domain-internal 타입 위주. cross-domain Event/DTO 정의가 각 서비스에 중복 선언됨.

**구조적 문제**: Discovery → Shaping으로 biz_item을 넘길 때 타입이 shared/ax-bd의 `AxBdDiscoveryItem`을 재활용 중. 이는 **제공자(Discovery)가 소비자(Shaping)의 타입을 정의**하는 역 의존. 향후 Discovery가 내부 타입을 바꾸면 Shaping이 깨진다.

**영향**: "독립 배포" 원칙 붕괴 — 두 도메인 동시 배포 필수.

<!-- CHANGED: consumer-driven contracts 등 대안 패턴, monolith화 리스크 명시 -->
**설계상 주의점**:  
- shared-contracts가 또 다른 monolith가 되지 않도록 Event/DTO만 정의하고 구현 로직 금지.  
- 가능하다면 "consumer-driven contracts" 패턴 도입, 각 도메인이 자체 타입을 정의하고 호환성 검증 주기 운영.

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

<!-- CHANGED: KOAMI P2 deferred의 구체적 내용 분석/사전 해결 필요성 추가 -->
**추가 조치**:  
- KOAMI P2 deferred 케이스(구체적 시나리오, 영향 범위)에 대한 상세 분석이 Phase 45 착수 전 선행되어야 하며, F563에서 이 Deferred 건이 어떻게 완결될지 기술적/운영적 전략을 명확히 수립 필요.

### Gap 7. SDD Triangle 위반 — SPEC drift

**증상**: 로컬 workspace(HEAD 5cf2131f)는 Sprint 261이나, origin/master는 Sprint 297+. SPEC.md §5의 F-item 상태 갱신이 배포보다 뒤처져 있다.

**근거**: MEMORY.md에 Sprint 283 기록. 실제 master는 F555까지 등록됨.

**구조적 문제**: `.claude/rules/sdd-triangle.md`의 "SPEC.md = SSOT" 원칙 위반. Spec이 Code에 뒤처지면 Gap Analysis 기준점이 무의미해짐.

**영향**: /ax:daily-check 결과가 신뢰 불가 → 다음 sprint 계획이 잘못된 baseline 위에 세워짐.

<!-- CHANGED: SDD 자동화 CI의 현실적 난이도/리소스 필요성 명시 -->
**추가 조치**:  
- SDD Triangle의 자동 동기화 CI 게이트는 실제 구현(자동화 스크립트/플러그인, 경험자 투입 등)에 리소스와 기술적 검증이 필요함.

### Gap 8. 남은 6 도메인 이관 로드맵 부재

**증상**: offering(12/29), agent(15/62), harness(22/49), modules/portal(19/23), modules/gate(7/8), modules/launch(8/14) 총 83 routes / 185 services가 미착수. **원 PRD에 이 6 도메인의 이관 순서/우선순위가 명시되지 않았다.**

**근거**: fx-msa-roadmap PRD §5 "Milestone" 섹션은 Week 1(Gateway+Discovery), Week 2(Discovery 완결)까지만 정의. 이후는 "Phase 40+"로 모호하게 참조.

**구조적 문제**: 10 도메인 중 3%(Discovery 3/10) 만 분리된 상태에서 "Walking Skeleton 완료"를 선언하면, 나머지 97%는 언제 어떻게 분리되는지 공백. Phase 44도 Shaping까지만 다룸.

**영향**: MSA 목표 달성일자 예측 불가. 투자 회수(ROI) 논증 어려움.

<!-- CHANGED: 리소스 산정, 현실적 일정/인력 투입 불확실성 명시 -->
**추가 조치**:  
- 83 route / 185 service의 분리·이관은 현실적으로 2~3 sprint 내 실현이 불가할 수 있음.  
- 도메인별 규모에 따라 팀 인력/투입 가능 자원/예상 소요 기간 산정 및 단계적 이관·롤백 플랜이 필요.

### Gap 9. Service Binding latency 누적 영향 미평가

**증상**: F543에서 Service Binding 1-hop 기준 p50 +10~14ms. 그러나 Gateway → API → Discovery Worker 같은 2-hop 또는 3-hop 경로의 누적 latency는 미측정.

**근거**: F543 "CONDITIONAL GO" 판정. 측정 스크립트는 단일 hop만.

**구조적 문제**: 7 routes Service Binding proxy(F539c)는 **3-hop 경로**: browser → fx-gateway → foundry-x-api → fx-discovery (실제로는 core/discovery). 누적 latency 30~42ms 가능성. PRD 목표 <500ms는 만족하나 사용자 체감은 "느려졌다"일 수 있음.

**영향**: 원 PRD §4 성공 기준에 "latency 저하 없음"이 명시되지 않아 판정 기준 불명확 → 누적 손실 방치.

<!-- CHANGED: SLO 수치의 현실성, 성능 측정·관측 포인트 및 최적화 전략 필요성 명시 -->
**추가 조치**:  
- multi-hop p95 < 300ms(1-hop p50 기준 +30ms 이내) SLO가 실제 Cloudflare Workers/D1 환경에서 달성 가능한지 현장 벤치마크 필요.  
- Observability(관측) 체계 강화 및 Edge Computing, Circuit Breaker, Worker 배치 최적화 전략 추가 검토 필요.

### Gap 10. EventBus/비동기 통신 PoC 부재

**증상**: 원 PRD §7b "Event-driven communication"은 "Cloudflare Queue 또는 D1 Event Table + Cron Trigger"를 언급하나, PoC 미착수.

**근거**: `packages/api/src/db/migrations/*event*` 검색 결과 관련 테이블 없음. Queue 바인딩 wrangler.toml 전무.

**구조적 문제**: 모든 cross-domain 통신이 sync Service Binding으로 처리됨. Discovery에서 Shaping 트리거 같은 장기 작업도 동기 호출 → timeout 위험.

**영향**: 향후 AX BD 발굴→형상화 자동 파이프라인 구축 시 재설계 필요.

<!-- CHANGED: EventBus 기술스택(Durable Objects 등) 범위 명확화, PoC-실서비스 단계 구분 명시 -->
**추가 조치**:  
- EventBus PoC는 D1 Event Table, Cloudflare Queue, Durable Objects 등 여러 대안에 대한 기술 검토가 필요하고, 실제 실서비스 적용까지 확장성을 염두에 둔 단계적 실험/도입이 필요함.

### Gap 11 (보조). harness-kit 표준화 미완

**증상**: 원 PRD가 제안한 "harness-kit 공통 패키지(Workers scaffold + JWT + CORS + EventBus)" 도입이 부분만 진행됨.

**근거**: `packages/harness-kit/` 존재 여부와 실제 fx-gateway/fx-discovery/fx-shaping 의존 여부 검증 필요. 현재 각 Worker가 개별 Hono app 세팅.

**구조적 문제**: scaffold 중복 → 세 Worker의 CORS/JWT 동작이 drift 가능.

**영향**: 새 Worker 생성 시 boilerplate 비용 유지 → 분리 속도 저하.

---

<!-- CHANGED: 추가 섹션 — 리소스/현실성/운영 영향/보안/롤백 전략 등 -->
## 2-1. 추가 고려사항 및 리스크 요약

### 리소스/인력 산정

| 도메인       | Route 수 | Service 수 | 예상 분리 난이도 | 예상 리소스(인력/기간) |
|--------------|----------|------------|------------------|------------------------|
| discovery    | 10       | 26         | 중                | 2명/2주                |
| shaping      | 13       | 22         | 중                | 2명/2주                |
| offering     | 12       | 29         | 상                | 3명/3~4주              |
| agent        | 15       | 62         | 최상              | 4명/6~8주 이상         |
| harness      | 22       | 49         | 상                | 3명/3~4주              |
| modules/*    | 39       | 50         | 중~상             | 3명/4주                |
| **합계**     | 111      | 238        | -                | **(전체 4~5명, 10~16주 소요 예상)** |

> **참고:** 실제 투입 가능 인력과 동시 진행 병렬성, 업무 복잡도, QA 리소스에 따라 일정은 달라질 수 있음

### 데이터 마이그레이션/분리 전략

- D1 Option A 전환 시, 대상 테이블별 Blue-Green 병렬 배포, 데이터 consistency 테스트, 마이그레이션 중 동시성 문제 대응, 롤백 시나리오(기존 DB shadowing, feature flag, double-write/read 등) 마련 필수

### 운영/관측/보안 영향

- 도메인/DB 분리 후 장애 발생 시 장애 감지·격리·모니터링 체계 재설계 필요
- Observability(분리 후 서비스별 모니터링, latency/에러 추적, Circuit Breaker, Feature Flag) 강화 필요
- Worker/Contract 분리 시 인증/인가 체계 및 기존 보안 정책의 적합성/취약점 추가 점검 필요

### 엔드유저 영향 분석 및 커뮤니케이션

- 분리 작업이 서비스 성능, 가용성, 기능/UX에 미치는 영향(성능 저하, 잠정 중단, 호환성, 신규 장애 등) 사전 분석
- 주요 변경사항에 대한 내부/외부(최종 사용자) 커뮤니케이션 플랜(릴리즈 노트, 공지, FAQ 등) 수립 필요

### 병렬작업 및 종속성 관리

- D1 분리(shared-contracts, EventBus 등)의 선후행 의존성, 병렬 진행 가능성(Blocking Point) 분석
- F-item 간 종속성 맵 작성 및 일정/리스크 관리

### 롤백/리커버리 플랜

- DB 분리/대규모 분리 이관 실패 시 단계별 롤백 시나리오(Shadow Write, Feature Toggle, Canary, Snapshot Backup 등) 설계

---

## 2-2. MVP · Out-of-scope · KPI (Round 3 보강)

### MVP (Phase 45 최소 성공 기준)

Phase 45는 13개 F-item을 모두 완결하면 이상적이지만, **리소스/시간 제약 시 MVP 3종**만으로도 "전략적 성공"을 선언한다. MVP는 전체 Exit Criteria의 부분집합이 아니라 **별도의 최소 수용 기준**이다.

| MVP # | 항목 | 판정 기준 | 대응 F-item |
|-------|------|----------|-------------|
| M1 | Discovery 완전 이관 | fx-gateway → fx-discovery **proxy 0건** (grep 검증) + Discovery 10 routes 모두 fx-discovery 소속 | F560 |
| M2 | D1 Option A PoC 성공 | discovery_db 별도 DB에 10+ migration 적용 + biz_items read/write E2E PASS + 롤백 리허설 1회 성공 | F561 |
| M3 | Strangler 단일 진입점 | CLI/Web 모두 `VITE_API_URL=fx-gateway.*` + foundry-x-api 직결 코드 grep 0건 | F564 |

**MVP 미달 시**: Phase 45 실패 선언, Phase 46 재조정. MVP 달성 후 Exit Criteria 8개는 Phase 46에 이월 가능.

### Out-of-scope (본 PRD 범위 밖)

아래 항목은 Phase 46 이후에 다루며, 본 PRD는 **명시적으로 제외**한다.

| # | 항목 | 이유 | 언제 다룰지 |
|---|------|------|------------|
| O1 | Agent 도메인 내부 리팩토링 (62 services → 모듈 재설계) | Phase 45는 "분리"이지 "재설계"가 아님. 내부 구조 개선은 별도 Phase 필요 | Phase 47+ |
| O2 | 멀티 리전 배포 (APAC/EU/US 분리) | D1 Option A 완료가 선행. 리전 분리는 별도 고가용성 PRD | Phase 48+ |
| O3 | 멀티 테넌트 / 조직 분리 | SSO Hub Token 체계 재설계 필요 | Phase 49+ |
| O4 | Plumb Track B (TS 재구현) | F541과 무관. Track A 유지 | 별도 PRD |
| O5 | fx-ai-foundry-os 대시보드 기능 확장 (F545~F549) | 별도 Phase 진행 중 (P1) | 병렬 진행 |
| O6 | 운영 중 발견되는 hidden coupling 해소 | 발견 시 Sprint 단위 C-track으로 처리 | 지속적 |

### KPI (비정량 + 운영 KPI 보강)

Exit Criteria(§3-3) 8개는 기술/정량 축. 아래는 비즈니스/운영 축의 보조 KPI로 Phase 45 진행 중 분기별 측정한다.

| KPI # | 축 | 지표 | 목표 |
|-------|-----|------|------|
| K-UX1 | 엔드유저 UX | 프로덕션 p95 응답 시간 변화율 (Phase 45 전/후) | ≤ +10% (열화 허용 상한) |
| K-UX2 | 엔드유저 UX | 사용자 claim ticket (CLI/Web fx-gateway 전환 관련) | ≤ 2건/month |
| K-OPS1 | 운영/Observability | Worker별 에러율 모니터링 대시보드 | 4 Worker(gateway/discovery/shaping/offering) 전부 Grafana 등록 |
| K-OPS2 | 운영/Observability | 장애 mean-time-to-recovery (MTTR) | Phase 45 전 대비 악화 없음 |
| K-BIZ1 | 비즈니스 연속성 | 배포 실패 → 프로덕션 500 발생 건수 | ≤ 1건 / Phase (허용 최대) |
| K-BIZ2 | 팀 속도 | 신규 도메인 추가 소요 (F570/F571 기준) | F560 대비 ≤ 1.5배 (harness-kit 효과) |

### 리소스 재산정 (ChatGPT Round 2 피드백 반영)

§2-1의 "1 route = 0.5~1일" 산정은 hidden coupling/QA/SRE 리소스 미반영 이유로 비현실적. 아래는 **개발 + QA + SRE + 보안 리뷰** 통합 산정.

| 도메인 | 개발(명·주) | QA(명·주) | SRE/보안(명·주) | 합계 (인월) | 비고 |
|--------|------------|----------|----------------|------------|------|
| discovery | 4 | 1 | 0.5 | ~1.5 인월 | MVP 포함 |
| shaping | 4 | 1 | 0.5 | ~1.5 인월 | partial 해소 |
| offering | 6 | 2 | 1 | ~2.25 인월 | |
| agent | 12 | 4 | 2 | ~4.5 인월 | 최고 리스크 |
| harness | 6 | 2 | 1 | ~2.25 인월 | |
| modules/* | 8 | 2 | 1 | ~2.75 인월 | 3개 하위 통합 |
| **합계** | **40** | **12** | **6** | **~14.5 인월** | QA/SRE 포함 |

> **현실 범위**: 4~5명 전담 시 10~16주(§2-1)는 **개발만**의 시간. QA/SRE/보안 포함 시 **12~22주** 현실적. Phase 45를 6 도메인 모두 포함하면 인력 1.5~2배 필요.

---

## 3. Phase 45 "MSA 3rd Separation & Hardening" 제안

위 11개 gap을 해소할 Phase 45를 제안한다. 범위는 **남은 6 도메인 분리 + 경계 강화(hardening)** 두 축.

<!-- CHANGED: F-item별 PoC-실서비스 단계 구분, 병렬작업/종속성, 리스크 표시 추가 -->
### 3-1. F-item 후보 (Draft)

| F# | 제목 | 목적 | 예상 Sprint | 우선순위 | 리스크/비고 |
|----|------|-----|------------|---------|------------|
| **F560** | Discovery 완전 이관 (7 routes 순수 분리) | Gap 1 해소. Service Binding proxy → 순수 이관 | 311 | P0 | 버저닝 전략/호환성 검증 병행 필요 |
| **F561** | D1 Option A 전환 PoC (discovery_db 분리) | Gap 2 해소. 데이터 소유권 분리 첫 단계 | 312 | P0 | Blue-Green, Shadow Write, 롤백 플랜 필수 |
| **F562** | shared-contracts 레이어 신설 | Gap 3 해소. cross-domain DTO/Event 계약 분리 | 312 | P1 | consumer-driven contracts, monolith화 방지 가이드 필수 |
| **F563** | fx-shaping E2E + KOAMI P2 완결 | Gap 4, 6 해소. 실제 트래픽 수용 | 313 | P0 | KOAMI P2 deferred 시나리오 사전 분석 필요 |
| **F564** | CLI VITE_API_URL 전환 + Strangler 완결 | Gap 5 해소. 단일 진입점 원칙 복귀 | 313 | P1 | CLI 환경 호환성/SSO 경로 검증 |
| **F565** | SDD Triangle 동기화 CI 게이트 | Gap 7 해소. SPEC drift 방지 자동화 | 314 | P2 | 실제 자동화 스크립트 리소스 확보 필요 |
| **F566** | MSA Separation Roadmap v2 (6 도메인) | Gap 8 해소. 분리 우선순위 + 일정 명문화 | 311 | P0 | 리소스/일정 산정, 단계별 롤백 시나리오 포함 |
| **F567** | Multi-hop latency benchmark | Gap 9 해소. 누적 latency 측정 + SLO 설정 | 314 | P1 | SLO 현실성/실측 기반 보정 필요 |
| **F568** | EventBus PoC (D1 Event Table + Cron) | Gap 10 해소. 비동기 파이프라인 가능성 확보 | 315 | P1 | Durable Object 등 기술스택 최종 결정 필요 |
| **F569** | harness-kit 표준화 (Workers scaffold) | Gap 11 해소. 새 Worker 생성 비용 절감 | 315 | P2 | 버전관리(npm publish vs workspace internal) 전략 확정 필요 |
| **F570** | Offering 완전 이관 (12 routes 순수 분리) | F541 Walking Skeleton 후속 — proxy → 순수 이관. F560 Discovery 패턴 재사용 | 316 | P1 | F541 partial 잔존 확인, 하위 도메인 분할 검토 |
| **F571** | Agent 도메인 분리 (Walking Skeleton) | 62 services — 가장 복잡, 마지막에 배치 | 318 | P1 | 하위 도메인 쪼개기, 리그레션 위험 사전 모듈화 |
| **F572** | modules/portal·gate·launch 통합 분리 | 모듈 계열 묶어서 한번에 분리 | 317 | P2 | 종속관계/병렬 작업 가능성 분석 필요 |

<!-- CHANGED: F561/568/567 등 주요 F-item의 선행 조건(DeepSeek 요구) 반영 -->
> **참고:**  
> - F561(D1 분리) → 상세 설계서 및 마이그레이션/롤백 전략 확보 선행  
> - F568(EventBus) → 기술스택(Durable Object 등) PoC 범위 명확화 및 최종 결정 선행  
> - F567(Multi-hop latency) → 측정 기준/툴/관측 포인트/최적화 전략 명확화 선행

### 3-2. Phase 순서 (우선순위 기반)

```
Sprint 311 (P0 집중):
  F560 Discovery 완전 이관 → F566 Roadmap v2 초안
Sprint 312 (P0 구조 작업):
  F561 D1 Option A PoC → F562 shared-contracts 신설
Sprint 313 (P0 완결):
  F563 fx-shaping E2E → F564 CLI 전환
Sprint 314 (P1/P2 보강):
  F565 SDD CI 게이트 → F567 multi-hop benchmark
Sprint 315 (인프라):
  F568 EventBus PoC → F569 harness-kit 표준화
Sprint 316~318 (도메인 확장):
  F570 Offering 완전 이관 → F572 modules 통합 → F571 Agent (마지막)
```

> **Sprint 번호 조정 (S302 확정)**: PRD draft v1.0은 Sprint 300~307을 가정했으나, 실제로는 Sprint 300~310이 Codex/F541/F556 등에 이미 배정됨. Phase 45는 Sprint 311부터 시작.

<!-- CHANGED: 병렬작업/종속성, F-item별 PoC→실서비스 전환 단계 구분 명시 -->
> **주의:**  
> - F561(D1 분리), F562(shared-contracts)는 병렬 진행이 불가할 수 있으며, 선후행 종속성 및 Blocking Point 사전 분석 필요  
> - 모든 F-item은 PoC → 실서비스 전환 단계로 분리, 각 단계별 롤백/리커버리 플랜, 엔드유저 영향 최소화 전략 동반

### 3-3. 성공 기준 (Phase 45 Exit Criteria)

1. **도메인 소유권 분리율**: Discovery/Shaping/Offering 각각 routes 100% 순수 이관 (proxy 0%)
2. **데이터 경계**: 최소 1개 도메인(Discovery)이 별도 D1 DB 보유, 마이그레이션/롤백 플랜 검증
3. **Contract 분리**: shared-contracts 패키지 v1.0 publish (monolith화 방지 원칙 준수, consumer-driven contracts 적용 권장)
4. **E2E 통과율**: KOAMI P0/P1/P2 전체 100% (deferred 0건, deferred 케이스 사전 분석·완결)
5. **Strangler 완결**: CLI/Web 모두 fx-gateway 단일 진입점, SSO 등 호환성 검증
6. **Latency SLO**: multi-hop p95 < 300ms (1-hop p50 기준 +30ms 이내, 실측 및 사용자 경험 기반 보정)
7. **SDD Triangle**: SPEC drift CI 게이트 통과 — sprint 종료 시 자동 동기화(자동화 스크립트/리소스 확보)
8. **비동기 PoC**: Discovery→Shaping 트리거 1건이 EventBus로 동작 (기술스택/확장성 평가 포함)

---

<!-- CHANGED: 성공 기준·Gap/F-item 매핑의 1:1 대응 한계, "달성하면 끝"식 구조의 위험성, 엔드유저 영향/연속성 등 추가 명시 -->
> **보완:**  
> - Gap→F-item→Exit Criteria의 1:1 대응 원칙에만 의존하지 않고, 각 Gap별 "해결 정의" 명확화 및 (엔드유저 영향, 비즈니스 연속성 등) 비정량적 성공 요건을 추가 관리
> - Gap 2/3/9 등 상호 영향도(Dependency Management) 명시

---

## 4. 원 PRD와의 차이 요약

| 항목 | 원 PRD (fx-msa-roadmap v2) | 본 후속 PRD (v1.1) |
|------|--------------------------|-----------------|
| 범위 | Walking Skeleton (Gateway + Discovery 1개) | 6 도메인 완전 분리 + 경계 강화 + 리소스·운영·보안·롤백 전략 보강 |
| D1 전략 | Option A 권장, Option B 허용 | Option A 전환 **PoC 의무화** (F561), Blue-Green/Shadow/롤백 포함 |
| Contract | shared 슬리밍까지 | shared-contracts **신규 레이어** 추가, consumer-driven contracts/monolith화 방지 |
| Latency | 1-hop <500ms | multi-hop p95 <300ms (SLO 명문화, 실측 기반 보정, 관측/최적화 전략 포함) |
| EventBus | "향후 도입" 언급 | PoC **Sprint 315에 배정**, 기술스택/확장성/실서비스 단계 구분 |
| 이관 순서 | 명시 없음 | Sprint 311~318 **우선순위 배치**, 인력/일정/롤백 명시 |
| SDD drift | 운영 수칙으로만 | CI 게이트 **자동화(리소스/기술 검증)** (F565) |
| 리소스/운영/보안 | 미명시 | **리소스 산정, 운영/관측/보안 영향, 데이터 마이그레이션/롤백, 엔드유저 커뮤니케이션, 병렬작업/종속성 관리** 등 추가 |

---

## 5. 리스크 & 오픈 이슈

<!-- CHANGED: 리스크 섹션 세분화/강화, 보안/운영/마이그레이션/테스트 자동화/병렬작업 등 추가 -->
### 주요 리스크

| R# | 설명 | 완화책 |
|----|------|-------|
| R1 | D1 Option A 전환 시 FK 참조 끊어짐, 데이터 일관성/정합성/다운타임·손실 위험 | F561 상세 설계서, Blue-Green, Shadow/Double Write, 마이그레이션 전용 툴, 단계별 롤백 플랜, 실서비스 전환 전 사전 검증 |
| R2 | Agent 도메인(62 services)은 단일 분리 시 리그레션 위험 | F571을 Phase 45 **마지막**에 배치, 하위 도메인 분할/사전 모듈화, Canary Release, Feature Flag 도입 |
| R3 | shared-contracts 레이어가 또 다른 monolith 될 위험 | v1은 Event/DTO만, 구현 로직 금지, consumer-driven contracts 도입, 설계 가이드라인 명문화, 주기적 호환성 검증 |
| R4 | EventBus PoC가 지연되면 비동기 플로우 설계 계속 미뤄짐 | F568에 타임박스 2주 고정, 기술스택 최종 결정, 실서비스 단계 구분, 확장성 검증 |
| R5 | Phase 44 partial 항목이 Phase 45에 끌려옴 (F538, F540) | F560, F563에서 선 해결, 선행 완료 후 후속 확장 |
| R6 | 리소스(인력/시간) 산정 미흡, 일정 지연/과부하 | 도메인 규모별 리소스/일정 현실적 산정, 병렬작업 가능성 사전 분석, 타임박스 분리, 진행률 모니터링, 필요시 범위 재조정 |
| R7 | 운영/Observability 체계 미비 — Worker 분리 후 장애 대응 공백 | 분산 트레이싱(Cloudflare Trace/OpenTelemetry), 중앙 로깅(Logpush), Worker별 메트릭 대시보드, 장애 전파 범위 runbook |
| R8 | 보안(인증/JWT) 재검증 누락 — Worker/Contract 분리 시 인증 경계 drift | Phase 45 Exit 전 security-architect agent 리뷰, JWT 전파 경로 전수 grep, SSO Hub Token 호환성 검증 |
| R9 | 엔드유저 영향 및 커뮤니케이션 플랜 부재 | Sprint별 Release Note + CLI 사용자 공지 + Strangler 단계별 사용자 영향 측정 |

### 오픈 이슈

1. Option A 전환 시 기존 133 migration을 어떻게 분리할 것인가? (migration 재번호? 재적용? per-domain migration 디렉토리?)
2. fx-ai-foundry-os(F545~F549)와의 관계 — 별도 프로젝트인가, Foundry-X의 dashboard 레이어인가?
3. Codex 통합(F550~F555)이 Phase 45 전/후 어디에 위치하는가?
4. harness-kit의 버전 관리 전략 — npm publish? workspace internal?
5. EventBus 선택지 — D1 Event Table vs Cloudflare Queue vs Durable Object 중 어느 것?
6. KOAMI P2 deferred 케이스의 구체적 내용 확인 필요 (F539c 보고서) — Phase Exit 전 해소 필수
7. CLI가 fx-gateway로 전환되면 기존 SSO Hub Token 경로 호환성 검증 필요
8. **리소스 산정 확정**: 83 routes / 185 services 공수 — domain별 route 1개당 0.5~1일 가정으로 총 Sprint 수 재계산 필요
9. **MVP 기준 정의**: Phase 45 "최소 성공"을 (a) Discovery 100% 순수 이관 + (b) D1 Option A PoC 성공 + (c) CLI fx-gateway 전환 3개로 좁힐지, 8개 Exit 전부로 갈지 결정
10. **Out-of-scope 명시**: Agent 도메인 완전 리팩토링(모듈 재설계), 리전 분리, 멀티 테넌트는 Phase 46+ 이월 — 본 PRD 범위 밖
11. shared-contracts가 monolith 되지 않도록 per-domain contract 세분화 vs 단일 패키지 선택

---

## 6. 다음 단계 (This PRD → Implementation)

1. **SPEC.md §5에 F560~F572 등록** (master 직접 commit, meta-only 규칙) — 13 F-item 중 P0는 F560/F561/F566 3건 선행
2. **Sprint 311 WT 생성**: `bash -i -c "sprint 311"` → F560(Discovery 완전 이관) + F566(Roadmap v2) 착수
3. **원 PRD 갱신**: `fx-msa-roadmap/prd-final.md` §Appendix에 "본 문서의 미비점은 fx-msa-followup PRD에서 해소" 링크 추가
4. **MEMORY.md 업데이트**: project Phase 45 진입 기록
5. **3-AI 검토 Round 2 수렴** 후 F-item 등록 (스코어카드 ≥ 80점 목표)

---

## 7. 관련 문서 & 참조

- `docs/specs/fx-msa-roadmap/prd-final.md` — 원 Walking Skeleton PRD
- `docs/specs/ax-bd-msa/prd-final.md` — AX BD 재조정 PRD
- `docs/specs/fx-work-unit-taxonomy/taxonomy.md` — F/C/X 택소노미
- `.claude/rules/sdd-triangle.md` — SDD 원칙
- `.claude/rules/tdd-workflow.md` — TDD Red-Green
- `.claude/rules/task-promotion.md` — Backlog → F 승격 기준
- `SPEC.md §5` — F-item SSOT
- `docs/specs/fx-msa-followup/review/round-1/` — 3-AI 검토 피드백 (ChatGPT/Gemini/DeepSeek, 2026-04-19)
- GitHub PRs: #535 (F520/F521), #544 (F522/F523), #588 (F538), #595/#596/#597 (F539), #598 (F540), #624 (F541)

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 | 작성자 |
|------|-----|------|--------|
| 2026-04-18 | v1.0 draft | 초안 작성 (Phase 39/44 검증 + Phase 45 제안) | Sinclair |
| 2026-04-19 | v1.0 Final | Phase 44 현행 유지 결정 + Phase 45 PRD final 승격 (S302) | Sinclair |
| 2026-04-19 | v1.1 | 3-AI Round 1 Conditional 피드백 반영: 이해관계자 명시, §2-1 추가 고려사항(리소스/마이그레이션/운영/보안/롤백), F-item PoC→실서비스 단계 구분, §3-4 Observability 계획, R6~R9 추가, 오픈 이슈 4건 추가(리소스/MVP/out-of-scope/contract 세분화) | Sinclair + ChatGPT Round 1 Apply |