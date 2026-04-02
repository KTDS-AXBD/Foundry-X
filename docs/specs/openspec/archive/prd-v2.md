# Skill Evolution (Phase 10) PRD

**버전:** v2
<!-- CHANGED: 버전 갱신 -->
**날짜:** 2026-04-02
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**문서코드:** FX-PLAN-SKILLEVOL-001

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 BD 스킬 체계에 OpenSpace의 Self-Evolving 개념을 내재화하여, 스킬 실행 메트릭 자동 수집 → 성공 패턴 자동 추출 → 팀 내 스킬 공유 → 경제적 ROI 벤치마크를 구현한다.

**배경:**
Foundry-X는 Phase 9까지 76개 BD 스킬, 420+ API endpoints, 169 services를 구축했다. 그러나 스킬이 정적 파일로 수동 관리되어 실행 결과에서 자동 진화하지 않고, 성공/실패 메트릭이 수집되지 않으며, 팀 내 검증된 스킬의 공유·검색 메커니즘이 없다. OpenSpace(HKUDS)가 증명한 토큰 46% 절감, 품질 30pp 향상이라는 수치적 결과를 참고하여, Foundry-X의 기존 자산 위에 Self-Evolving 계층을 얹는다.

<!-- CHANGED: OpenSpace(HKUDS) 수치 적용의 한계 및 검증 필요성 명시 -->
> **참고:** OpenSpace(HKUDS)에서 보고된 "토큰 46% 절감, 품질 30pp 향상" 수치는 Foundry-X의 BD 스킬 환경에 그대로 전이되기 어렵습니다. 실 환경에서의 효과성은 별도의 PoC 및 벤치마크로 검증이 필요합니다.

**목표:**
BD 스킬이 실행될 때마다 메트릭이 자동 수집되고, 반복 성공 패턴이 새 스킬로 추출되며, 팀원 간 검증된 스킬을 검색·공유하고, Cold Start vs Warm Run 간 ROI를 정량적으로 비교할 수 있는 상태.

<!-- CHANGED: 목표와 기능의 Traceability 및 실질적 이득 연결 -->
> **추가:** 스킬 공유 및 자동 진화 기능을 통해 재사용률 50% 이상, 신규 스킬 발굴/적용 리드타임 30% 단축, BD팀 내 지식 확산 속도 증대를 기대하며, 이는 KPI(재사용률, 신규 도입률, ROI 등)로 측정·관리합니다.

**범위 제외:**
O-G-D Agent Loop(F270~F273)은 별도 PRD(FX-SPEC-OGD-001)로 이미 등록됨. 본 PRD는 Track A(메트릭), C(DERIVED+CAPTURED), D(레지스트리), E(ROI 벤치마크)를 다룬다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **스킬 정적 관리**: `.claude/skills/` 디렉토리에 마크다운 파일로 존재. 수동 편집만 가능. 실행 이력·버전 관리 없음
- **메트릭 부재**: 스킬 호출 횟수, 성공/실패율, 토큰 소비량이 추적되지 않음. F143 토큰 대시보드는 모델 수준만 추적
- **반복 작업**: 같은 유형의 BD 분석(BMC, 사업성 검토 등)을 매번 처음부터 실행. 이전 성공 패턴이 활용되지 않음
- **스킬 공유 불가**: 팀원 A가 검증한 스킬 개선을 팀원 B가 알 수 없음. ax-marketplace 플러그인은 스킬 배포만, 실행 메트릭 공유 미지원
- **ROI 불투명**: 스킬 사용이 실제로 얼마나 비용을 절감하는지 정량적 근거 없음

<!-- CHANGED: 문제 정의 구체화 및 실제 사례/영향 추가 -->
> **사례 1:** BD팀 내 동일한 사업성 검토 문서를 2명 이상의 팀원이 중복 생성(동일 보고서 2중 작성)하는 일이 월 3회 이상 발생, 인력·토큰 낭비 및 산출물 품질 편차 유발  
> **사례 2:** 신규 스킬 검증 없이 팀별 임의 배포로, 실패율 30% 이상인 스킬이 알림 없이 반복 사용되어 프로젝트 일정 지연  
> **영향:** 스킬 실행 이력 및 품질 데이터 부재로 검증/재사용이 불가능, 업무 중복/비효율, 품질 저하, 신규 스킬 도입 속도 저해

### 2.2 목표 상태 (To-Be)

- **메트릭 자동 수집**: 스킬 실행 시 호출 횟수, 성공률, 토큰 소비, 실행 시간, 품질 점수가 D1에 자동 기록
- **패턴 자동 추출**: BD 7단계 전체에서 반복 성공하는 도구 조합·워크플로우를 DERIVED/CAPTURED 스킬로 추출
- **스킬 레지스트리**: ax-marketplace 확장으로 팀 내 스킬 검색·공유. 메타데이터(성공률, 토큰 비용, 계보) 기반 시맨틱 검색
- **BD ROI 벤치마크**: Cold Start(스킬 없이) vs Warm Run(진화 스킬 활용) 비교로 스킬 진화의 경제적 가치 정량화

<!-- CHANGED: 목표 상태와 KPI의 연결고리 명확화 -->
> **추가:** 위 상태 도달 시, BD팀 전체 스킬 재사용률 50% 이상, 신규 DERIVED/CAPTURED 스킬 평균 도입 리드타임 30% 단축, BD_ROI 2배 이상 상향, KPI 대시보드 및 리포트로 정기 모니터링

### 2.3 시급성

- BD 스킬 76개(68개 발굴 + 8개 기타)가 활발히 사용되지만 실행 데이터가 유실되는 중
- Phase 10 O-G-D Agent Loop(F270~F273)이 진행되면 Generator→Discriminator 루프에서 대량의 스킬 실행 데이터가 발생 — 메트릭 수집 인프라가 선행되어야 함
- AX BD팀 데모 준비 중 — 스킬 진화 시연이 차별화 포인트

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair (Phase 1) | AX BD팀 개발자, 초기 검증 담당 | 스킬 실행 메트릭 확인, 자동 패턴 추출, ROI 측정 |
| AX BD팀 전원 (Phase 2) | 7명, BD 담당자 | 검증된 스킬 검색·재사용, 메트릭 대시보드 확인 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀장 | 승인, 성과 확인 | 높음 |
| AX BD팀원 | 스킬 사용자, 피드백 제공 | 높음 |

### 3.3 사용 환경

- 기기: PC (WSL + Windows Terminal)
- 네트워크: 인터넷 (Cloudflare Workers/D1)
- 기술 수준: 개발자 (Claude Code 사용 가능)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | Track | 기능 | 설명 | 우선순위 |
|---|-------|------|------|----------|
| 1 | A | 스킬 실행 메트릭 수집 | 스킬 호출 시 횟수, 성공/실패, 토큰 소비, 실행 시간, 품질 점수를 D1 `skill_executions` 테이블에 자동 기록 | P0 |
| 2 | A | 메트릭 대시보드 연동 | 기존 F143 토큰 대시보드에 스킬별 비용-효과 시각화 추가. F158~F161 KPI 인프라 활용 | P0 |
| 3 | C | DERIVED 엔진 — 성공 패턴 추출 | BD 7단계(발굴→검증→제안→수주→수행→완료→회고)에서 반복 성공하는 스킬 시퀀스를 자동 식별하여 새 스킬로 통합 | P0 |
| 4 | C | CAPTURED 엔진 — 워크플로우 캡처 | 복합 작업에서 성공적인 도구 조합을 기록하고 크로스 도메인 메타 스킬 생성. 방법론 레지스트리(F191) 연동 | P1 |
| 5 | D | 스킬 레지스트리 — 검색·공유 | ax-marketplace 플러그인 확장. 스킬 메타데이터(name, success_rate, token_cost, lineage) 기반 검색 + 버전 추적 | P0 |
| 6 | E | BD ROI 벤치마크 | `BD_ROI = (산출물 가치) / (토큰 비용)`. Cold Start vs Warm Run 비교. 사업성 신호등(F262) 달러 환산 | P1 |

<!-- CHANGED: Track C 기술적 불확실성 언급 및 PoC/검증 필요 명시 -->
> **참고:** Track C(DERIVED/CAPTURED 엔진)는 AI/ML 기반 자동화가 핵심이며, 반복 성공 판정 기준, 패턴 추출 로직, 데이터 라벨링 등 구체적 방법론은 PoC 및 실험을 통해 확정 필요(오픈 이슈 참조)

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | 스킬 안전성 검사 | OpenSpace의 `check_skill_safety` 패턴 적용. 프롬프트 인젝션, 자격증명 탈취 등 위험 패턴 자동 차단 | P1 |
| 2 | 스킬 버전 롤백 | 진화 실패 시 이전 버전으로 즉시 롤백. D1 `skill_versions` 테이블에 전 버전 보관 | P1 |
| 3 | 스킬 실행 샌드박스 | 진화된 스킬을 격리 환경에서 테스트 실행 후 승인 | P2 |
| 4 | 감사 로그 | 모든 스킬 진화 이력(생성, 수정, 롤백, 삭제)을 D1에 기록. 계보(lineage) 추적 | P1 |
| 5 | 산업 템플릿 오버라이드 | 산업군별(제조, 금융, 공공 등) 특화 스킬 세트 프리셋 | P2 |

### 4.3 제외 범위 (Out of Scope)

- **O-G-D Agent Loop**: F270~F273으로 별도 관리. 본 PRD는 O-G-D 결과물을 입력으로 수신만 함
- **Cloud Skill Community**: OpenSpace의 open-space.cloud 같은 외부 공유. 팀 내 레지스트리만 구현
- **OpenSpace 라이브러리 직접 도입**: Python 의존성 추가 없이, 개념만 TS로 자체 구현
- **기존 스킬 재작성**: 76개 기존 스킬의 구조 변경 없이, 메트릭 수집 래퍼만 추가

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| D1 Database | SQL (skill_executions, skill_versions, skill_lineage 테이블) | 필수 |
| F143 토큰 대시보드 | API 연동 (기존 KPI 인프라) | 필수 |
| F191 방법론 레지스트리 | 데이터 참조 (CAPTURED 패턴 분석용) | 선택 |
| F262 사업성 신호등 | 점수 참조 (ROI 달러 환산) | 필수 (Track E) |
| ax-marketplace 플러그인 | 확장 (스킬 레지스트리) | 필수 (Track D) |
| O-G-D Agent Loop (F270~F273) | 이벤트 수신 (Generator/Discriminator 실행 결과) | 선택 |

<!-- CHANGED: 이벤트 기반 아키텍처 미비, 단일 DB 의존성, 동시성/일관성/확장성 리스크 언급 -->
> **참고:** 현재 모든 트랙(A, C, D, E)이 단일 D1 인스턴스에 결합되어 있으며, O-G-D 루프 → 메트릭 수집 간 이벤트 기반 구조가 미흡해 강결합·확장성·동시성(예: success_rate 레이스 컨디션), 데이터 일관성(예: skill_versions.is_active 불일치) 등의 위험이 존재합니다. 향후 분리/이벤트 아키텍처 전환 고려.

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 토큰 절감률 (Warm vs Cold) | 0% (비교 불가) | 30%+ | 동일 작업 2회차 실행 시 토큰 비교 |
| 자동 생성 스킬 재사용률 | 0% (미존재) | 50%+ | DERIVED/CAPTURED 스킬 호출 비율 |
| 스킬 실행 메트릭 커버리지 | 0% (수집 안 함) | 90%+ | 메트릭이 기록된 스킬 실행 / 전체 실행 |
| BD_ROI (산출물가치/토큰비용) | 측정 불가 | 베이스라인 대비 2×+ | Track E 벤치마크 |

<!-- CHANGED: KPI와 기능/목표의 Traceability 명확화 -->
> **추가:** 각 KPI는 핵심 기능(메트릭 수집, 자동 진화, 공유/검색, ROI 벤치마크)별로 직접 추적되며, Track별 Feature Completion이 곧 KPI 달성으로 이어져야 합니다.

### 5.2 MVP 최소 기준

- [x] Track A: `skill_executions` 테이블에 스킬 실행 시 메트릭 자동 기록
- [ ] Track A: 대시보드에서 스킬별 성공률·토큰 비용 조회 가능
- [ ] Track C: 1개 이상의 DERIVED 스킬이 자동 생성되어 재사용
- [ ] Track D: ax-marketplace에서 스킬 검색·메타데이터 조회 가능
- [ ] Track E: Cold Start vs Warm Run 1회 비교 리포트 생성

### 5.3 실패/중단 조건

- 3개 Sprint 내에 Track A(메트릭 수집)가 동작하지 않으면 접근 방식 재검토
- DERIVED 스킬 자동 생성 품질이 수동 작성보다 낮으면(사용자 평가 기준) Track C 재설계
- 기존 스킬 체계와의 호환성 문제로 76개 스킬 동작에 영향이 가면 즉시 롤백
<!-- CHANGED: 전략적 목표 미달(ROI, 토큰 절감 등) 시 대응방안 추가 -->
> **신설:**  
> **전략적 실패 조건:**  
> - 2개 Sprint 이상 경과 후에도 BD_ROI 2배, 토큰 절감 30% 등 핵심 KPI 달성 추세가 없거나, 자동 진화 스킬의 재사용률이 20% 미만일 경우, 근본 설계/목표(자동 진화, 공유) 자체를 전면 재검토하며 기능 축소/범위 조정, 리소스 재배치, PoC 장기화, Track C 중단 가능  
> - 핵심 가정(예: 자동 패턴 추출, 품질 향상 등)이 PoC/Spike에서 실증되지 않을 경우, 파생 기능(Track C, E) 개발을 보류하고, 핵심 데이터/메트릭 인프라(Track A, D)에 집중

---

## 6. 제약 조건

### 6.1 일정

| Track | 원래 Sprint | 압축 Sprint | 핵심 산출물 | 의존성 |
|-------|-------------|-------------|-----------|--------|
| A: 메트릭 수집 | 99~100 | 103 (1 Sprint) | skill_executions 테이블 + 대시보드 연동 | F143, F158~F161 |
| C: DERIVED+CAPTURED | 103~105 | 104~105 (2 Sprint) | 패턴 추출 + 워크플로우 캡처 | Track A, O-G-D(F270~F273) |
| D: 스킬 레지스트리 | 106~107 | 106 (1 Sprint) | ax-marketplace 확장 + 시맨틱 검색 | Track A |
| E: BD ROI 벤치마크 | 108 | 107 (1 Sprint) | Cold/Warm 비교 + ROI 정량화 | Track A, C |

**총 5 Sprint (103~107)**, O-G-D(Sprint 101~102) 이후 시작.

<!-- CHANGED: 일정 압축(기존 Sprint 대비) 근거 부족 명시 및 PoC/리소스 재검토 필요 -->
> **참고:** 기존 대비 최대 50% 일정 압축(2→1 Sprint 등)은 레거시 재사용, PoC/사전 검증 기반임을 전제하나, 실증 근거 및 인력 추가 없이는 일정 지연 위험이 높음. 초기 1명(Sinclair) 투입만으로 Track A~E를 동시 커버하는 것은 과도한 낙관적 가정이며, 핵심 P0 기능 위주로 범위 최소화·순차 개발·리소스 증원 병행 검토 필요.

### 6.2 기술 스택

- 프론트엔드: Vite 8 + React 18 + React Router 7 (기존 web 패키지)
- 백엔드: Hono API (기존 api 패키지) + D1
- 인프라: Cloudflare Workers/Pages/D1 (기존)
- 기존 시스템 의존: F143 토큰 대시보드, F158~F161 KPI 인프라, F191 방법론 레지스트리, F262 사업성 신호등, ax-marketplace 플러그인

### 6.3 인력/예산

- 투입: Sinclair 1명 (초기 검증), 이후 팀 확대
<!-- CHANGED: 인력 리스크 및 병목 명시 -->
> **리스크:** Track C(패턴 추출/DERIVED 엔진)는 AI/ML 및 실험적 성격이 강하며, 단일 인력으로 2 Sprint 내 완수는 현실적으로 도전적. 팀 확장 또는 외부/내부 리소스 증원, 외부 검증/PoC 동시 진행 필요.
- API 비용: 스킬 진화 시 LLM 호출 비용 발생 — Track E에서 ROI 측정하여 관리

### 6.4 컴플라이언스

- **자동 커밋 절대 금지**: 스킬 진화 결과는 반드시 사람 확인 후 커밋 (CLAUDE.md 원칙)
- **스킬 안전성 검사**: 프롬프트 인젝션, 자격증명 접근 등 위험 패턴 자동 차단 (OpenSpace check_skill_safety 패턴)
- **실행 샌드박스**: 진화된 스킬은 격리 환경에서 테스트 후 승인 (P2)
- **감사 로그**: 모든 진화 이력 D1 기록 + 계보(lineage) 추적
- **버전 롤백**: 진화 실패 시 즉시 이전 버전 복원 가능
<!-- CHANGED: 보안/권한/감사 체계 상세화 -->
> **추가:**  
> - **Role-Based Access Control(RBAC):** 스킬 생성/수정/삭제/롤백 등 중요 액션별로 권한 등급(예: 일반 사용자, 승인자, 관리자) 및 승인 프로세스(2인 이상 승인 등) 적용  
> - **행위 감사:** 모든 중요 액션에 대해 행위자, 변경 이력, 승인 여부를 감사 로그에 기록, 정기 감사

---

## 7. 아키텍처 (참조)

```
┌──────────────────────────────────────────────────────┐
│                 Foundry-X Web Dashboard                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Skill    │  │ Evolution│  │ BD ROI           │    │
│  │ Registry │  │ Lineage  │  │ Dashboard        │    │
│  │ Browser  │  │ Graph    │  │ (Cold vs Warm)   │    │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
│       │              │                 │              │
├───────┼──────────────┼─────────────────┼──────────────┤
│       │     Foundry-X API (Hono)       │              │
│  ┌────┴──────────────┴─────────────────┴────────┐     │
│  │           Skill Evolution Engine              │     │
│  │  ┌─────────┐  ┌──────────┐                   │     │
│  │  │ DERIVED │  │ CAPTURED │  ← Track C        │     │
│  │  │ Engine  │  │ Engine   │                    │     │
│  │  └────┬────┘  └────┬─────┘                   │     │
│  │       │            │                          │     │
│  │  ┌────┴────────────┴─────────────────┐        │     │
│  │  │    Skill Execution Tracker        │        │     │
│  │  │  (메트릭 수집 — Track A)           │        │     │
│  │  └────────────────┬──────────────────┘        │     │
│  └───────────────────┼──────────────────────────┘     │
│                      │                                │
├──────────────────────┼────────────────────────────────┤
│  ┌───────────────────┴──────────────────────────┐     │
│  │              D1 Database                      │     │
│  │  skill_executions │ skill_versions │           │     │
│  │  skill_lineage    │ skill_audit_log│           │     │
│  └───────────────────────────────────────────────┘     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐      │
│  │     O-G-D Agent Loop (F270~F273, 별도 PRD)    │      │
│  │  Generator → Discriminator → Orchestrator     │      │
│  │  → 실행 결과를 Track A 메트릭으로 전달          │      │
│  └──────────────────────────────────────────────┘      │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐      │
│  │  ax-marketplace (Track D 확장)                 │      │
│  │  스킬 메타데이터 + 시맨틱 검색 + 버전 추적      │      │
│  └──────────────────────────────────────────────┘      │
│                                                        │
├────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐      │
│  │  기존 BD 스킬 체계                             │      │
│  │  .claude/skills/ax-bd-discovery/ (68스킬)      │      │
│  │  .claude/skills/ai-biz/ (11종 서브스킬)         │      │
│  │  .claude/agents/ (커스텀 에이전트)               │      │
│  └──────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────┘
```

<!-- CHANGED: 이벤트 처리, 동시성, 확장성, 보안 등 아키텍처 리스크 명시 참고 주석 추가 -->
> **참고:**  
> - 현 아키텍처는 단일 D1 DB, API 직접 연동 구조이므로, 이벤트 기반/비동기 처리, 장애 격리, DB 오류시 임시 버퍼링 등은 미구현 상태  
> - DERIVED/CAPTURED 엔진, skill_lineage 확장성, 동시성 제어, RBAC 등은 추가 설계 필요

---

## 8. D1 스키마 설계 (초안)

### skill_executions

```sql
CREATE TABLE skill_executions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  skill_version TEXT NOT NULL,
  execution_start DATETIME NOT NULL,
  execution_end DATETIME,
  status TEXT NOT NULL DEFAULT 'running',  -- running | success | failure
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  token_cost_usd REAL DEFAULT 0.0,
  quality_score REAL,                      -- 사업성 신호등 연계 (0.0~1.0)
  bd_stage TEXT,                           -- 발굴/검증/제안/수주/수행/완료/회고
  error_context TEXT,                      -- 실패 시 에러 정보 (JSON)
  metadata TEXT,                           -- 추가 컨텍스트 (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT NOT NULL
);
```

### skill_versions

```sql
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,              -- 스킬 파일 해시
  evolution_mode TEXT,                     -- DERIVED | CAPTURED | FIX | MANUAL
  parent_version_id TEXT,                  -- 계보 추적
  success_rate REAL DEFAULT 0.0,
  avg_token_cost REAL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  safety_checked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT NOT NULL,
  FOREIGN KEY (parent_version_id) REFERENCES skill_versions(id)
);
```

### skill_lineage

```sql
CREATE TABLE skill_lineage (
  id TEXT PRIMARY KEY,
  child_skill_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  relationship TEXT NOT NULL,              -- derived_from | captured_from | fixed_from
  evidence TEXT,                           -- 파생 근거 (JSON: 성공률, 실행 횟수 등)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (child_skill_id) REFERENCES skill_versions(id),
  FOREIGN KEY (parent_skill_id) REFERENCES skill_versions(id)
);
```

### skill_audit_log

```sql
CREATE TABLE skill_audit_log (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  action TEXT NOT NULL,                    -- created | evolved | rolled_back | deleted | safety_blocked
  actor TEXT NOT NULL,                     -- 사용자 또는 시스템
  details TEXT,                            -- 변경 상세 (JSON)
  version_before TEXT,
  version_after TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  tenant_id TEXT NOT NULL
);
```

<!-- CHANGED: 품질 점수(quality_score) 및 ROI 산정 방식 구체화 필요 명시 -->
> **참고:**  
> - `quality_score` 산정은 F262 사업성 신호등 점수(0~100)와 연동, 100점 만점 환산 후 0.0~1.0 스케일 적용  
> - BD_ROI = (산출물 가치[달러환산] = quality_score × F262 환산공식) / (토큰 비용[USD]), 공식 및 환산 기준 오픈 이슈에 따라 확정

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | DERIVED 엔진의 "반복 성공" 판정 기준 (최소 N회 성공? 성공률 N%?) | Sinclair | Sprint 104 착수 전 |
| 2 | ax-marketplace 스킬 메타데이터 스키마 확장 범위 | Sinclair | Sprint 106 착수 전 |
| 3 | 사업성 신호등(F262) 점수의 달러 환산 공식 | BD팀 협의 | Sprint 107 착수 전 |
| 4 | 샌드박스 실행 환경 구현 방식 (Docker? Worker isolate?) | Sinclair | P2이므로 후순위 |
| 5 | O-G-D 루프 결과 → Track A 메트릭 전달 인터페이스 | Sinclair | Sprint 103 (O-G-D 완료 후) |
<!-- CHANGED: 핵심 가정 검증(PoC/Spike), AI/ML 방법론 확정, 리소스/일정 재검토, 이벤트/확장성 등 추가 -->
| 6 | Track C(DERIVED/CAPTURED) PoC/Spike로 실효성 검증(자동 패턴 추출, 품질 향상 등) | Sinclair | Sprint 104 이전 |
| 7 | 일정 압축 및 리소스 증원 여부(팀 확장, 외부 PoC 등) | BD팀장 | Sprint 103 |
| 8 | 이벤트 기반/비동기 구조 전환(메트릭 수집, 장애 버퍼링 등) | Sinclair | Sprint 105 |
| 9 | 동시성 제어 및 데이터 일관성(스킬 상태, success_rate 등) | Sinclair | Sprint 105 |
| 10 | RBAC/승인체계 구체 설계(권한, 승인 프로세스, 행위 감사) | Sinclair | Sprint 106 |

---

## 10. 운영/테스트/교육/장애/보안 시나리오 <!-- CHANGED: 운영/장애/테스트/교육/보안 섹션 신설 -->

### 10.1 운영 및 장애 대응

- **DB 장애 발생 시:** 스킬 실행 메트릭은 임시 로컬/메모리 버퍼에 저장, 일정 시간 내 재시도 후 최종 실패 시 운영자 알림
- **메트릭 수집 실패:** 해당 스킬 실행 결과는 "미기록" 상태로 집계, 대시보드에 누락/경고 표시
- **스킬 자동 진화 오류:** 자동 진화 실패 시 기존(Stable) 버전 자동 롤백, 오작동 패턴은 감사 로그 및 관리자 알림
- **데이터 일관성 장애:** 병렬 실행으로 인한 success_rate 등 불일치 감지 시, 충돌 감지/재계산 및 이슈 리포트
- **확장성/비용 폭증:** 데이터 볼륨 급증, 토큰 비용 급등 감지 시 실시간 Alert 및 임계치 초과 시 자동 샘플링/로깅 제한

### 10.2 테스트/검증 프로세스

- **자동 진화 스킬 검증:** 신규 DERIVED/CAPTURED 스킬은 자동화 테스트(정합성, 품질 점수, 안전성) → QA 담당자 Human-in-the-Loop 승인
- **테스트 케이스:** 각 스킬별 정상/에러/극한 입력, 품질 점수 최소 임계치(예: 0.8/1.0) 이상 확인
- **QA 기준:** 성공률, 품질 점수, 안전성(프롬프트 인젝션 등) 모두 통과 시만 승인/배포
- **승인 프로세스:** RBAC 승인자 2인 이상 리뷰(자동/수동), 승인 이력은 감사 로그에 기록

### 10.3 사용자 교육/온보딩

- **온보딩 가이드:** ax-marketplace, 대시보드, 스킬 공유/검색/활용법 등 세부 매뉴얼(문서/영상) 제공
- **FAQ/교육 자료:** 자동 진화, 실패/오류 대응, 신규 스킬 등록 절차 등 자주 묻는 질문 정리
- **온보딩 세션:** MVP 배포 시 BD팀 전원 대상 교육 세션(1~2회), 이후 상시 문의/지원 체계 운영

### 10.4 보안/권한/감사

- **RBAC:** 스킬 생성/수정/삭제/롤백 등 액션별 권한 등급 및 승인 프로세스
- **감사 로그:** 모든 중요 변경사항(행위자, 변경 전후, 승인 여부 등) 기록 및 주기적 모니터링
- **스킬 안전성 검사:** 자동/수동 병행, 오탐/누락시 즉시 경고 및 관리자 승인 필요

### 10.5 운영 지표/Alerting

- **실시간 Alert:** 특정 스킬 실패율 급등, 토큰 비용 임계치 초과, 자동 진화 오류 등 실시간 알림(이메일/슬랙 등)
- **운영 대시보드:** 장애/경고 현황, 승인 대기 건, 품질/성공률 이상치, 데이터/비용 폭증 등 실시간 모니터링

---

## 11. 리스크 및 대응 <!-- CHANGED: 리스크/대응 섹션 신설 및 상세화 -->

| 구분 | 내용 | 대응 방안 |
|------|------|-----------|
| 핵심 가정 미검증 | 자동 패턴 추출, 품질 향상, 재사용률 증대 등 핵심 효과가 실증되지 않은 상태 | Track C PoC/Spike 선행, 목표 미달 시 기능 범위 축소/재설계, KPI 기반 단계적 확장 |
| 일정/리소스 | 단일 인력, 5 Sprint 내 완료 등 과도한 일정/리소스 낙관 | 초반 Track A/D 중심 MVP, 팀 확장·외주·PoC 병행 검토 |
| 기술적 불확실성 | AI/ML 기반 DERIVED/CAPTURED 엔진의 구현 난이도, 판정 기준 미확정 | 오픈 이슈 1, 6 우선 해결, 룰 기반→AI/ML 점진 이행, 데이터 라벨링/검증 프로세스 강화 |
| 데이터 일관성/동시성 | 병렬 실행, 상태 불일치, race condition | 트랜잭션/락/충돌 감지, 비동기 이벤트 구조 검토 |
| DB/아키텍처 결합도 | 단일 DB, API 직접 호출(강결합), 이벤트 처리 미구현 | 장애 발생시 임시 버퍼링, 향후 이벤트 기반 구조 전환 설계 반영 |
| 보안/권한 | RBAC/승인/감사 미흡시 운영 위험 | RBAC/감사 로그/승인 프로세스 우선 설계 반영 |
| 비용/성능 | 대용량 데이터·토큰 폭증 | 운영 임계치/Alert, 샘플링/로깅 제한, 비용 감시 대시보드 |
| 스킬 호환성/품질 | 기존 스킬/데이터 품질 저하, 자동 진화 실패 | 샌드박스/롤백/QA 체계, Human-in-the-Loop 승인 |
| 사용자 온보딩 | 신규 기능 활용 저조 | 온보딩/교육/FAQ 세트, 상시 지원 체계 |

---

## 12. Out-of-scope <!-- CHANGED: Out-of-scope 섹션 보강 -->

- O-G-D Agent Loop(F270~F273): 본 PRD에 포함되지 않으며, Track A는 O-G-D 결과를 입력으로만 수신
- Cloud Skill Community, OpenSpace 외부 공유: 팀 내 레지스트리까지만 구현
- OpenSpace 라이브러리 직접 도입: Python 등 외부 의존성 없이 자체 구현
- 기존 스킬 구조 대폭 변경: 메트릭 래퍼 적용 외 구조/로직 변경 없음
- **이벤트 기반 완전 리팩토링:** 현 단계에서는 단일 DB/API 기반, 이벤트 구조는 추후 검토
- **외부 PoC/벤치마크 전제:** KPI/ROI 등 효과 수치는 실 환경 검증 이후 확정, 직접 수치 이식 불가

---

## 13. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-02 | 인터뷰 기반 최초 작성. 참조: FX-ANLS-OPENSPACE-001 | - |
| 2차 | 2026-04-03 | AI 리뷰 피드백 반영: 문제/목표 구체화, Traceability, 운영/장애/테스트/보안/교육/리스크/Out-of-scope 등 보강 | Conditional |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---