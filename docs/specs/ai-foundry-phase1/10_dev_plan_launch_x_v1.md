---
title: Launch-X 개발 계획서 (Tech Spec + WBS)
subtitle: Delivery Plane / 배포·패키징·운영전환 모듈
version: v1 (2026-05-02)
owner: Sinclair Seo
audience: KTDS-AXBD 사내 (Layer 5 코어 + Sinclair)
status: 🔴 To-Do (신규 빌드)
based_on:
  - 08_build_plan_v1.md §2.6
  - 02_ai_foundry_phase1_v0.3.md §3.7 (Layer 5) + §3.7.5 (MCP Tools)
  - 07_ai_foundry_os_target_architecture.md §6.2.2~6.2.4
classification: 기업비밀 II급
---

# Launch-X 개발 계획서

> **이 문서가 답하는 질문**
>
> "**Launch-X는 Type 1 Delivery (소스 기반 SI 투입) vs Type 2 Delivery (도메인 Agent 구독) 두 형태가 있는데, 혼자 먼저 어디까지 짜고, 어디서부터는 사업 라운드와 합쳐야 하는가?**"

---

## 0. 한 페이지 요약

### 0.1 정체성 한 줄

> **Guard-X 통과한 반제품(정책팩·Skill Package)을 실제 운영 환경에 배포·패키징·전환하는 모듈. Type 1(소스 기반 반제품 SI 투입)과 Type 2(도메인 Agent 구독형 운영) 두 모드를 같은 인터페이스로 지원.**

### 0.2 매핑

| 차원 | 위치 |
|---|---|
| 5-Layer (외부) | Layer 5 Agent (Skill Package 발행 + Integration Bus) |
| 사내 3-Plane (내부) | Delivery Plane 우측 (07 §6.2.2~6.2.4) |
| 자기진화 루프 | Delivery → Eval Rail로 가는 출구 (학습 신호의 시작점) |
| 5-Asset 영향 | Skill Package 운영 등록, Decision Log entry 발행 |

### 0.3 현재 상태 → To-Be 단계

| 단계 | 상태 |
|---|---|
| **Solo** (혼자 먼저) | types.ts contract + Release API stub + Skill Package 발행 stub + 단위 테스트 |
| **Integration** (Layer 5·운영팀과) | Type 1 Delivery (SI 투입 형태) + Skill Registry 연동 + Runtime 호출 |
| **Ops** (운영) | Type 2 Delivery (구독형) + Multi-Tenant Runtime + 라이선스 관리 |

### 0.4 핵심 4 결정

| # | 결정 | 근거 |
|---|---|---|
| **L1** | **Type 1 = 정적 패키지 export (zip + manifest), Type 2 = Runtime 인스턴스 (도메인 Worker)** | 두 모드를 명확히 분리, 같은 input contract 공유 |
| **L2** | **Phase 2 mock = Skill Package 발행 stub (manifest.json + 빈 zip), Runtime 미동작** | G3 통과는 인터페이스 살아 있으면 충분 (08 D2) |
| **L3** | **Skill Registry는 Foundry-X Skill Runtime을 그대로 차용**, Launch-X는 등록·발행 흐름만 담당 | 기존 자산 재사용, 신규 개발 회피 |
| **L4** | **MCP Tools 발행은 Phase 3에서 BeSir 미팅 결과 반영 후 결정** | 02 §3.7.5 결정에 따른 — 5월 W19 미팅 후 인터페이스 확정 |

---

## 1. 책임 범위

### 1.1 책임

- Guard-X 통과한 정책팩·Skill Package를 운영 환경에 배포
- Skill Package manifest 생성 (.skill.json + 메타)
- Type 1: 정적 패키지 (zip) export + 다운로드 URL 발급
- Type 2: 도메인 Worker 인스턴스 배포 (Foundry-X Runtime 호출) + 호출 엔드포인트 노출
- Decision Log entry 자동 발행 (Audit Log Bus 연계)
- 운영 중 Skill의 호출 메트릭 수집 (Eval Rail로)

### 1.2 비책임 (다른 모듈 영역)

| 영역 | 담당 모듈 |
|---|---|
| 발행 직전 검증 | Guard-X (별도 모듈 — 09_dev_plan 참조) |
| Skill 호출 인증·권한 | Layer 5 Foundation Identity |
| LLM 비용 집계 | Cost Governor (Foundry-X 횡단) |
| 호출 결과 평가 | Eval Rail (Auto Evals) |
| Marketplace 노출·결제 | Phase 4 영역 (Launch-X v1.0 후 별도 모듈) |

---

## 2. 인터페이스 (types.ts contract level)

### 2.1 입력 인터페이스

#### `POST /v1/launch/release`

**Request body 형태**:

```
LaunchReleaseRequest {
  artifact_type: 'policy_pack' | 'skill_package'
  artifact_id: string                    // POL-* 또는 SKILL-*
  version: string                         // semver (예: 1.0.0)
  delivery_mode: 'type1_static' | 'type2_runtime'
  payload: PolicyPackPayload | SkillPackagePayload
  guard_check_id: string                  // Guard-X 통과 증빙
  domain: string
  release_notes: string                   // 한글 반존대
  trace_id: string
}
```

#### `POST /v1/launch/rollback`

```
LaunchRollbackRequest {
  release_id: string
  target_version: string                  // 직전 버전으로 롤백
  reason: string
  requester: { user_id, role }
}
```

#### `GET /v1/launch/runtime/{skill_id}/invoke` (Type 2 전용)

```
LaunchInvokeRequest {
  input: object                           // Skill input_schema 준수
  caller: { user_id, domain }
  trace_id: string
}
```

### 2.2 출력 인터페이스

#### `LaunchReleaseResponse`

```
LaunchReleaseResponse {
  release_id: string                      // ULID
  artifact_type: 'policy_pack' | 'skill_package'
  delivery_mode: 'type1_static' | 'type2_runtime'
  status: 'building' | 'ready' | 'failed'
  type1_artifact?: {
    download_url: string                  // 사전 서명 URL (24h)
    manifest_path: string                 // manifest.json
    zip_size_bytes: number
    sha256: string
  }
  type2_runtime?: {
    invoke_endpoint: string               // /v1/launch/runtime/{skill_id}/invoke
    deployed_at: ISO8601
    runtime_version: string
  }
  decision_log_entry_id: string
}
```

#### 이벤트 (Audit Log Bus로 발행)

```
EVENT launch.release.requested { release_id, artifact_id, delivery_mode, guard_check_id }
EVENT launch.release.completed { release_id, status, deployed_at, decision_log_entry_id }
EVENT launch.release.failed { release_id, reason, failed_at }
EVENT launch.rollback.completed { release_id, from_version, to_version, requester }
EVENT skill.invoked { release_id, skill_id, caller, latency_ms, status }
EVENT skill.published { release_id, artifact_id, type } // 자기진화 루프 트리거
```

### 2.3 외부 호출

- Foundry-X Skill Registry: 신규 Skill 등록
- Foundry-X Skill Runtime: Type 2 인스턴스 배포·호출 라우팅
- Object Store: Type 1 zip 업로드, 다운로드 URL 발급
- Audit Log Bus: 모든 이벤트
- Eval Rail Metrics Collector: skill.invoked 메트릭

---

## 3. 내부 모델 (서브 모듈)

### 3.1 ReleaseBuilder

- 정책팩·Skill Package 페이로드 → 표준 패키지 형식 변환
- Type 1: zip + manifest.json 생성, sha256 계산
- Type 2: Foundry-X Runtime 어댑터 호출용 페이로드 생성

### 3.2 ManifestGenerator

- `.skill.json` (JSON Schema 2020-12 준수) 생성
- 메타: artifact_id·version·input_schema·output_schema·permissions·release_notes
- POL-* 코드 형식 검증 (Guard-X와 룰 공유)

### 3.3 RuntimeDeployer (Type 2 전용)

- Foundry-X Skill Runtime 어댑터 호출
- 도메인별 격리 (Multi-Tenant 준비)
- 배포 실패 시 자동 롤백

### 3.4 PackagePublisher (Type 1 전용)

- Object Store 업로드
- 24시간 사전 서명 URL 발급
- 다운로드 횟수 메트릭 수집

### 3.5 DecisionLogger

- release.completed → Decision Log entry 자동 발행
- artifact_id·version·delivery_mode·trace_id chain

### 3.6 RollbackManager

- 직전 버전 추적 (Type 1: 이전 zip 보존, Type 2: blue/green)
- 롤백 요청 시 audit log + 롤백 이벤트

---

## 4. 데이터 모델

### 4.1 PostgreSQL 테이블

| 테이블 | 핵심 컬럼 | 용도 |
|---|---|---|
| `launch_releases` | release_id, artifact_id, version, delivery_mode, status, deployed_at | 릴리스 추적 |
| `launch_artifacts_type1` | release_id, download_url, manifest_path, zip_size, sha256, expires_at | Type 1 정적 패키지 |
| `launch_runtimes_type2` | release_id, invoke_endpoint, runtime_version, status | Type 2 런타임 인스턴스 |
| `launch_invocations` | invocation_id, release_id, caller_id, latency_ms, status, invoked_at | 호출 메트릭 |
| `launch_rollbacks` | rollback_id, release_id, from_version, to_version, reason, executed_at | 롤백 이력 |

### 4.2 Object Store (Type 1)

- `releases/{domain}/{artifact_id}/{version}.zip`
- `releases/{domain}/{artifact_id}/{version}.manifest.json`
- 보존: 6개월 (Phase 3 가설), 라이선스 만료 시 삭제

### 4.3 Git 저장소 (메타·재현성)

- `release_history/{domain}/{artifact_id}.yaml` — 릴리스 이력 (재현 가능한 빌드)
- `runtime_configs/{domain}/*.yaml` — Type 2 런타임 설정

---

## 5. 외부 의존성

| 의존성 | 용도 | 단계 |
|---|---|---|
| Guard-X | 발행 직전 검증 통과 증빙 | Solo부터 (mock으로 받기) |
| Audit Log Bus | 모든 이벤트 영구 저장 | Solo부터 |
| Foundry-X Skill Registry | Skill 등록 | Integration |
| Foundry-X Skill Runtime | Type 2 인스턴스 배포·호출 | Integration |
| Object Store | Type 1 zip 저장·다운로드 URL | Integration |
| Eval Rail Metrics Collector | 호출 메트릭 | Integration |
| 알림 채널 | 릴리스/롤백 알림 | Ops |

---

## 6. SLA 가설

| 지표 | Phase 2 mock | Phase 3 β | Phase 4 v1.0 |
|---|---|---|---|
| `/v1/launch/release` p95 | ≤ 200ms (stub) | ≤ 5초 (zip 빌드 포함) | ≤ 3초 |
| Type 2 인스턴스 배포 시간 | (해당없음) | ≤ 60초 | ≤ 30초 |
| Skill 호출 p95 | (해당없음) | ≤ 1초 (단순 스킬) | ≤ 500ms |
| 롤백 시간 | (해당없음) | ≤ 30초 | ≤ 10초 |
| 가용성 | 99.0% | 99.0% | 99.9% |

---

## 7. WBS 태스크 분해

### 7.1 Solo 단계 (혼자 먼저 시도)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| LX-S01 | Hono sub-app scaffold (Foundry-X packages/api에 `core/launch/`) | P0 | - | S | `app.use('/v1/launch', launchApp)` 동작 |
| LX-S02 | types.ts contract 정의 (LaunchReleaseRequest/Response, Type 1/2 분기) | P0 | LX-S01 | S | TypeScript 컴파일 통과 |
| LX-S03 | Release API stub (echo + ULID 발급 + Decision Log entry stub) | P0 | LX-S02 | S | curl로 200 응답 + decision_log_entry_id 반환 |
| LX-S04 | ManifestGenerator (sample .skill.json 생성) | P1 | LX-S02 | M | 가상 Skill 1개 → manifest 1건 생성 |
| LX-S05 | PackagePublisher stub (zip 빌드 + 로컬 파일 저장) | P1 | LX-S04 | M | zip 1개 생성 + sha256 일치 |
| LX-S06 | RuntimeDeployer stub (콘솔 로그만 출력, 실제 배포 X) | P1 | LX-S02 | S | type2_runtime 응답 형식 일치 |
| LX-S07 | DecisionLogger 골격 (Audit Log Bus에 release.completed 1건) | P0 | LX-S03 | S | audit table에 1건 insert |
| LX-S08 | RollbackManager 골격 (직전 버전 lookup + 롤백 시뮬레이션) | P2 | LX-S05 | M | 가상 롤백 1건 audit |
| LX-S09 | 단위 테스트 (vitest) | P1 | LX-S04~S07 | M | 커버리지 ≥ 70% |
| LX-S10 | OpenAPI 스펙 1차 (POST /release, /rollback, GET /invoke) | P2 | LX-S03 | S | Swagger UI 호출 가능 |

**Solo 단계 산출물**:
- `core/launch/` 모듈
- 가상 Skill 1개 → Type 1 zip + Type 2 stub 모두 동작
- Decision Log entry 자동 발행
- OpenAPI 1차

### 7.2 Integration 단계 (Layer 5·운영팀 협업)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| LX-I01 | Foundry-X Skill Registry 연동 (등록 API 호출) | P0 | LX-S04·Foundry-X 코어 | M | 가상 Skill 1개가 Skill Registry에 등록 |
| LX-I02 | Object Store 업로드 + 사전 서명 URL 발급 | P0 | LX-S05·인프라 | M | 24h URL 발급 + 다운로드 1회 성공 |
| LX-I03 | Foundry-X Skill Runtime 어댑터 (Type 2 실 배포) | P0 | LX-S06·Foundry-X 코어 | L | 가상 Skill Runtime에 배포 + invoke 1회 |
| LX-I04 | Guard-X 통과 증빙 검증 (`guard_check_id` lookup) | P0 | Guard-X GX-I01 | S | guard_check_id가 pass 상태일 때만 release 진행 |
| LX-I05 | Eval Rail Metrics Collector 연동 (skill.invoked 이벤트) | P1 | LX-I03 | M | invoke 1회 → metric 1건 |
| LX-I06 | Type 1 manifest 표준화 (정책팩 12종 + Skill Package 8종) | P0 | LX-S04 | L | 모든 종류 manifest 생성 검증 |
| LX-I07 | RollbackManager 실 동작 (Type 1 zip 교체 / Type 2 blue/green) | P1 | LX-S08·LX-I03 | L | 롤백 1회 E2E 성공 |
| LX-I08 | E2E 시나리오 — Guard-X check → Launch-X release Type 1 → 다운로드 → 검증 | P0 | LX-I01·LX-I02·LX-I04 | L | E2E 테스트 1개 통과 |
| LX-I09 | E2E 시나리오 — Guard-X check → Launch-X release Type 2 → invoke → metric | P0 | LX-I03·LX-I05 | L | E2E 테스트 1개 통과 |
| LX-I10 | release_history Git 자동 기록 (재현 가능한 빌드) | P2 | LX-I06 | M | release 1건 → Git commit 1건 |

**Integration 단계 산출물**:
- 가상 도메인에서 Type 1·Type 2 모두 E2E 동작
- Skill Registry 등록·Runtime 배포 검증
- Guard-X 통과 증빙 차단 동작

### 7.3 Ops 단계 (운영·확장)

| Task ID | 설명 | 우선순위 | 의존성 | 노력 | DoD |
|---|---|---|---|---|---|
| LX-O01 | Type 1 SI 투입 패키지 표준화 (배포 가이드 문서 + 사용자 매뉴얼) | P0 | LX-I06·서민원 | L | SI 투입 1건 dry-run + 문서 sign-off |
| LX-O02 | Type 2 Multi-Tenant Runtime (도메인별 격리) | P1 | LX-I03·Foundry-X Multi-Tenant | XL | 도메인 2개 동시 운영 시 격리 확인 |
| LX-O03 | 라이선스 만료·삭제 정책 (Type 1 zip 6개월 보존 → 삭제) | P1 | LX-I02·법무 | M | TTL 1건 동작 |
| LX-O04 | 호출 메트릭 → Eval Rail 통합 대시보드 | P1 | LX-I05 | M | 임원 보고용 그래프 1건 |
| LX-O05 | MCP Tools 발행 인터페이스 (BeSir 미팅 결과 반영) | P0 | BeSir W19 미팅 결과 | L | MCP tool 1개 발행 + BeSir에서 호출 |
| LX-O06 | 자동 롤백 트리거 (호출 에러율 ≥ 5%) | P2 | LX-I07·LX-O04 | L | 자동 롤백 1회 동작 |
| LX-O07 | Marketplace 진입 후보 검토 (Phase 4) | P3 | LX-O01·사업 라운드 | XL | 후보 정리 1건 |

---

## 8. 단계별 진척 흐름

```
Solo                  Integration              Ops
─────────────────     ────────────────────     ──────────────────────
LX-S01 scaffold       LX-I01 Skill Registry   LX-O01 Type 1 SI 표준화
  ↓                     ↓                       ↓
LX-S02 types          LX-I02 Object Store     LX-O02 Type 2 Multi-Tenant
  ↓                     ↓                       ↓
LX-S03 stub           LX-I03 Skill Runtime    LX-O03 라이선스 정책
  ↓                     ↓                       ↓
LX-S04 manifest       LX-I04 Guard-X 증빙     LX-O04 메트릭 대시보드
LX-S05 zip            LX-I05 Metrics          LX-O05 MCP Tools (BeSir)
LX-S06 runtime stub   LX-I06 manifest 표준    LX-O06 자동 롤백
LX-S07 DecisionLog    LX-I07 Rollback 실동작
LX-S08 Rollback stub  LX-I08 Type 1 E2E
  ↓                   LX-I09 Type 2 E2E
LX-S09 단위 테스트    LX-I10 Git 자동 기록
LX-S10 OpenAPI
```

**전이 게이트**:
- Solo → Integration: types.ts contract 동결 + ManifestGenerator로 sample 생성 + Decision Log 발행 동작
- Integration → Ops: Type 1·Type 2 E2E 모두 통과 + Guard-X 증빙 검증 동작 + Skill Registry 연동
- Ops → Phase 4 확장: Type 1 SI 투입 1건 외부 검증 + Type 2 Multi-Tenant 안정 + MCP Tools 1개 발행

---

## 9. 리스크

| ID | 리스크 | 영향 | 완화책 |
|---|---|---|---|
| **LX-R1** | Foundry-X Skill Runtime 어댑터가 변경되면 Type 2 깨짐 | Type 2 운영 중단 | Foundry-X 코어와 어댑터 contract 동결 협의 (LX-I03 이전) |
| **LX-R2** | Type 1 zip 크기가 커지면 Object Store 비용 증가 | 비용 초과 | 정책팩 텍스트만 zip, 모델 파일 제외 (별도 참조) |
| **LX-R3** | Guard-X check_id 위조 시도 | 보안 위반 | check_id를 ULID + HMAC 서명으로 변경, Guard-X DB lookup 의무화 |
| **LX-R4** | Multi-Tenant Runtime이 도메인 간 데이터 누출 | Cross-Org 보호(R-14) 위반 | 도메인별 Worker 격리 + Cross-Org 핵심 모듈과 권한 매트릭스 공유 |
| **LX-R5** | MCP Tools 인터페이스가 BeSir 결정 후 변경 | Type 2 v1.0 지연 | LX-O05를 Phase 3 후순위로 두고, BeSir 결정 전에는 인터페이스 stub만 |
| **LX-R6** | 롤백이 부분적으로만 적용 (Type 1 zip은 교체했는데 manifest 미갱신 등) | 운영 일관성 깨짐 | RollbackManager에 트랜잭션 패턴 적용 + 롤백 dry-run 의무 |

---

## 10. 검증 (DoD 종합)

### 10.1 단계별 DoD

| 단계 | DoD |
|---|---|
| **Solo 완료** | curl로 /v1/launch/release Type 1·Type 2 모두 200 OK + Decision Log entry 1건 + 단위 테스트 ≥ 70% + OpenAPI |
| **Integration 완료** | E2E: Guard-X check → Launch-X release → 다운로드/invoke → metric 자동 테스트 2개 (Type 1·Type 2) / Skill Registry 등록 검증 |
| **Ops 완료** | Type 1 SI 투입 1건 외부 dry-run + Type 2 Multi-Tenant 도메인 2개 동시 운영 + 라이선스 정책 동작 |

### 10.2 자동 검증

| 검증 | 방법 | 트리거 |
|---|---|---|
| types.ts contract 미변경 | TypeScript 빌드 + breaking change check | PR마다 |
| Manifest schema 유효성 | JSON Schema 2020-12 validation | release마다 |
| Type 1 zip sha256 일치 | upload 후 검증 | release마다 |
| Type 2 invoke p95 ≤ 1초 | k6 부하 테스트 | 주간 |
| Decision Log chain 무결성 | trace_id cross-check | 일일 |

### 10.3 시연 시나리오 (G3·G5)

1. Type 1 — 가상 도메인 정책팩 release → Object Store 업로드 → 다운로드 URL 발급 → 검증
2. Type 2 — 가상 Skill Package release → Skill Runtime 배포 → invoke → metric 수집 → 대시보드 표시
3. 롤백 — Type 2 v1.1 release → 호출 에러율 5% 도달 → 자동 롤백 v1.0 → audit log

---

## 11. 외부 노출 가이드

| 본 문서 명칭 | 외부 변환 (08 §10.2) |
|---|---|
| Launch-X | Release & Packaging Module (Delivery) |
| Foundry-X Skill Registry/Runtime | Skill Registry / Skill Runtime |
| Type 1/2 Delivery | Static Package / Runtime Service Delivery |

---

## 12. Changelog

| 버전 | 일자 | 변경 |
|---|---|---|
| v1 | 2026-05-02 | 초판 — Tech Spec + types.ts contract + WBS 27 task (Solo 10 / Integration 10 / Ops 7) |

---

## 끝맺음

Launch-X는 **Solo 단계는 혼자 거의 다 짤 수 있지만, Integration 단계의 Foundry-X Skill Runtime 어댑터 연결(LX-I03)에서 Foundry-X 코어 협업이 필수**입니다. Type 1과 Type 2가 같은 input contract를 공유하도록 설계해두면, 사업 라운드의 결정(Type 1 SI 투입 vs Type 2 구독)에 무관하게 Solo 단계 산출물이 모두 재사용돼요.

가장 신경 써야 할 의존: **Guard-X `check_id` 검증(LX-I04)** — 이게 빠지면 검증 안 받은 정책팩이 발행될 수 있으니, Solo 단계에서 mock 검증 함수 1개를 미리 끼워두는 게 좋아요.

— 끝.
