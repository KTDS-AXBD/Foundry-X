# Skill Evolution (Phase 10) PRD

**버전:** v1
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

**목표:**
BD 스킬이 실행될 때마다 메트릭이 자동 수집되고, 반복 성공 패턴이 새 스킬로 추출되며, 팀원 간 검증된 스킬을 검색·공유하고, Cold Start vs Warm Run 간 ROI를 정량적으로 비교할 수 있는 상태.

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

### 2.2 목표 상태 (To-Be)

- **메트릭 자동 수집**: 스킬 실행 시 호출 횟수, 성공률, 토큰 소비, 실행 시간, 품질 점수가 D1에 자동 기록
- **패턴 자동 추출**: BD 7단계 전체에서 반복 성공하는 도구 조합·워크플로우를 DERIVED/CAPTURED 스킬로 추출
- **스킬 레지스트리**: ax-marketplace 확장으로 팀 내 스킬 검색·공유. 메타데이터(성공률, 토큰 비용, 계보) 기반 시맨틱 검색
- **BD ROI 벤치마크**: Cold Start(스킬 없이) vs Warm Run(진화 스킬 활용) 비교로 스킬 진화의 경제적 가치 정량화

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

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 토큰 절감률 (Warm vs Cold) | 0% (비교 불가) | 30%+ | 동일 작업 2회차 실행 시 토큰 비교 |
| 자동 생성 스킬 재사용률 | 0% (미존재) | 50%+ | DERIVED/CAPTURED 스킬 호출 비율 |
| 스킬 실행 메트릭 커버리지 | 0% (수집 안 함) | 90%+ | 메트릭이 기록된 스킬 실행 / 전체 실행 |
| BD_ROI (산출물가치/토큰비용) | 측정 불가 | 베이스라인 대비 2×+ | Track E 벤치마크 |

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

### 6.2 기술 스택

- 프론트엔드: Vite 8 + React 18 + React Router 7 (기존 web 패키지)
- 백엔드: Hono API (기존 api 패키지) + D1
- 인프라: Cloudflare Workers/Pages/D1 (기존)
- 기존 시스템 의존: F143 토큰 대시보드, F158~F161 KPI 인프라, F191 방법론 레지스트리, F262 사업성 신호등, ax-marketplace 플러그인

### 6.3 인력/예산

- 투입: Sinclair 1명 (초기 검증), 이후 팀 확대
- API 비용: 스킬 진화 시 LLM 호출 비용 발생 — Track E에서 ROI 측정하여 관리

### 6.4 컴플라이언스

- **자동 커밋 절대 금지**: 스킬 진화 결과는 반드시 사람 확인 후 커밋 (CLAUDE.md 원칙)
- **스킬 안전성 검사**: 프롬프트 인젝션, 자격증명 접근 등 위험 패턴 자동 차단 (OpenSpace check_skill_safety 패턴)
- **실행 샌드박스**: 진화된 스킬은 격리 환경에서 테스트 후 승인 (P2)
- **감사 로그**: 모든 진화 이력 D1 기록 + 계보(lineage) 추적
- **버전 롤백**: 진화 실패 시 즉시 이전 버전 복원 가능

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

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | DERIVED 엔진의 "반복 성공" 판정 기준 (최소 N회 성공? 성공률 N%?) | Sinclair | Sprint 104 착수 전 |
| 2 | ax-marketplace 스킬 메타데이터 스키마 확장 범위 | Sinclair | Sprint 106 착수 전 |
| 3 | 사업성 신호등(F262) 점수의 달러 환산 공식 | BD팀 협의 | Sprint 107 착수 전 |
| 4 | 샌드박스 실행 환경 구현 방식 (Docker? Worker isolate?) | Sinclair | P2이므로 후순위 |
| 5 | O-G-D 루프 결과 → Track A 메트릭 전달 인터페이스 | Sinclair | Sprint 103 (O-G-D 완료 후) |

---

## 10. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-02 | 인터뷰 기반 최초 작성. 참조: FX-ANLS-OPENSPACE-001 | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
