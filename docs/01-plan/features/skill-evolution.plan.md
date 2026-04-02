---
code: FX-PLAN-SKILLEVOL
title: "skill-evolution — Skill Evolution Phase 1 (Track A 메트릭 수집 + Track D 스킬 레지스트리)"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-02
updated: 2026-04-02
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-SKILLEVOL-001]]"
---

# skill-evolution: Skill Evolution Phase 1 (Track A + Track D)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F274~F275 Skill Evolution Phase 1 (Track A 메트릭 수집 + Track D 스킬 레지스트리) |
| 기간 | Sprint 103~104 (2 Sprint) |
| 우선순위 | P0 |
| PRD | docs/specs/openspec/prd-final.md (FX-PLAN-SKILLEVOL-001) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 스킬 76개가 실행되지만 메트릭(성공률, 토큰 비용, 품질 점수)이 수집되지 않아 최적화 불가. 팀 내 검증된 스킬 공유·검색 메커니즘 부재 |
| Solution | BdSkillExecutor에 메트릭 수집 래퍼 추가(D1 4테이블) + ax-marketplace 확장으로 스킬 메타데이터 검색·공유·버전 추적 구현 |
| Function UX Effect | 대시보드에서 스킬별 성공률·토큰 비용·품질 추이 확인 가능. 팀원이 검증된 스킬을 검색하여 재사용 |
| Core Value | "매번 처음부터 추론" → "검증된 패턴 재사용" 전환의 데이터 기반 마련. Phase 2(DERIVED+CAPTURED+ROI)의 필수 인프라 |

---

## 목표

1. **Track A (F274)**: BD 스킬 실행 시 메트릭(호출 횟수, 성공/실패율, 토큰 소비, 실행 시간, 품질 점수)을 D1에 자동 기록하고, 기존 토큰 대시보드에 스킬별 시각화 추가
2. **Track D (F275)**: ax-marketplace 플러그인을 확장하여 스킬 메타데이터(success_rate, token_cost, lineage) 기반 검색·공유·버전 추적 + 안전성 검사 구현

---

## F-Items

| F-Item | 제목 | 우선순위 | Sprint | 의존성 |
|--------|------|---------|--------|--------|
| F274 | Track A: 스킬 실행 메트릭 수집 — D1 4테이블 + F143 대시보드 연동 + 감사 로그 | P0 | 103 | F143(토큰 대시보드), F158~F161(KPI 인프라) |
| F275 | Track D: 스킬 레지스트리 — ax-marketplace 확장 + 시맨틱 검색 + 버전 추적 + 안전성 검사 | P0 | 104 | F274 선행 |

---

## 기술 결정

### 1. 메트릭 수집 삽입 지점: BdSkillExecutor 래퍼 (확정)

기존 `BdSkillExecutor.execute()` 메서드가 이미 스킬 실행의 시작/종료, 토큰 수, 모델, 상태를 추적하고 있어요. 이 메서드에 메트릭 수집 래퍼를 추가하는 것이 최소 변경으로 최대 효과를 얻는 방법이에요.

**핵심 파일**: `packages/api/src/services/bd-skill-executor.ts`

```
execute() 흐름:
  startTime = Date.now()
  → sanitize → LLM 호출 → 결과 저장
  → [NEW] SkillMetricsService.record({
       skillId, version, startTime, endTime,
       tokensInput, tokensOutput, status, qualityScore
     })
```

**대안 고려**: KPI Logger(`kpi-logger.ts`)의 `trackEvent()` 패턴도 있지만, 스킬 실행은 KPI 이벤트보다 구조화된 데이터가 필요하므로 전용 서비스가 적합.

**재활용 대상 (기존 인프라 상세)**:
- `ModelMetricsService` (`services/model-metrics.ts`) — `recordExecution(status, tokens, cost, duration)` 패턴을 `SkillMetricsService`에 복제
- `KpiLogger` (`services/kpi-logger.ts`) — `logEvent()` + `getSummary()` + `getTrends()` 패턴 참조
- `AgentMarketplace` (`services/agent-marketplace.ts`) — `publishItem/searchItems/installItem/rateItem` + D1 3테이블 패턴을 Track D 레지스트리에 확장
- `ViabilityCheckpointService` (`services/viability-checkpoint-service.ts`) — `getTrafficLight()` → `quality_score` 0.0~1.0 환산에 활용

### 2. D1 스키마: 4테이블 (PRD 확정)

마이그레이션 번호 **0080~0083** 할당 (기존 0079까지 적용 완료).

| 마이그레이션 | 테이블 | 용도 |
|-------------|--------|------|
| 0080 | `skill_executions` | 실행 메트릭 (호출별 기록) |
| 0081 | `skill_versions` | 스킬 버전 관리 + 계보 |
| 0082 | `skill_lineage` | 스킬 간 파생 관계 |
| 0083 | `skill_audit_log` | 감사 로그 (생성/수정/롤백/삭제) |

**스키마 상세**:

```sql
-- 0080_skill_executions.sql
CREATE TABLE IF NOT EXISTS skill_executions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  skill_version TEXT NOT NULL DEFAULT '1.0',
  execution_start TEXT NOT NULL,           -- ISO 8601
  execution_end TEXT,
  status TEXT NOT NULL DEFAULT 'running',   -- running | success | failure
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  token_cost_usd REAL DEFAULT 0.0,
  quality_score REAL,                       -- 0.0~1.0, F262 연계
  bd_stage TEXT,                            -- 발굴/검증/제안/수주/수행/완료/회고
  error_context TEXT,                       -- JSON
  metadata TEXT,                            -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  tenant_id TEXT NOT NULL
);
CREATE INDEX idx_skill_exec_tenant ON skill_executions(tenant_id);
CREATE INDEX idx_skill_exec_name ON skill_executions(skill_name);
CREATE INDEX idx_skill_exec_status ON skill_executions(status);
```

```sql
-- 0081_skill_versions.sql
CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  evolution_mode TEXT,                      -- DERIVED | CAPTURED | FIX | MANUAL
  parent_version_id TEXT,
  success_rate REAL DEFAULT 0.0,
  avg_token_cost REAL DEFAULT 0.0,
  usage_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  safety_checked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  tenant_id TEXT NOT NULL,
  FOREIGN KEY (parent_version_id) REFERENCES skill_versions(id)
);
CREATE INDEX idx_skill_ver_tenant ON skill_versions(tenant_id);
CREATE INDEX idx_skill_ver_name ON skill_versions(skill_name);
CREATE INDEX idx_skill_ver_active ON skill_versions(is_active);
```

```sql
-- 0082_skill_lineage.sql
CREATE TABLE IF NOT EXISTS skill_lineage (
  id TEXT PRIMARY KEY,
  child_skill_id TEXT NOT NULL,
  parent_skill_id TEXT NOT NULL,
  relationship TEXT NOT NULL,               -- derived_from | captured_from | fixed_from
  evidence TEXT,                            -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (child_skill_id) REFERENCES skill_versions(id),
  FOREIGN KEY (parent_skill_id) REFERENCES skill_versions(id)
);
```

```sql
-- 0083_skill_audit_log.sql
CREATE TABLE IF NOT EXISTS skill_audit_log (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  action TEXT NOT NULL,                     -- created | evolved | rolled_back | deleted | safety_blocked
  actor TEXT NOT NULL,
  details TEXT,                             -- JSON
  version_before TEXT,
  version_after TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  tenant_id TEXT NOT NULL
);
CREATE INDEX idx_audit_tenant ON skill_audit_log(tenant_id);
CREATE INDEX idx_audit_skill ON skill_audit_log(skill_name);
```

### 3. 대시보드 연동: 기존 토큰 페이지 확장 (vs 새 페이지)

기존 `/dashboard/token` 페이지(F143)에 "Skill Metrics" 탭을 추가하는 방식. 새 페이지 생성보다 기존 대시보드 활용이 사용자 동선에 유리.

**API 엔드포인트 추가**:
- `GET /api/skill-metrics/summary` — 스킬별 성공률·토큰 비용 집계
- `GET /api/skill-metrics/trends` — 기간별 추이
- `GET /api/skill-metrics/executions` — 실행 이력 목록

**기존 패턴 재활용**: `token.ts`의 `GET /api/token/summary` 패턴과 `ModelMetricsService` 구조를 참고.

### 4. 스킬 레지스트리: ax-marketplace 확장 (Track D)

ax-marketplace 플러그인의 `plugin.json`에 skill-registry 관련 커맨드를 추가하고, API 측에 스킬 메타데이터 CRUD + 검색 엔드포인트를 구축.

**API 엔드포인트**:
- `GET /api/skill-registry/skills` — 스킬 목록 (메타데이터 포함)
- `GET /api/skill-registry/skills/:name` — 스킬 상세 (버전 이력, lineage)
- `GET /api/skill-registry/search?q=` — 시맨틱 검색
- `POST /api/skill-registry/skills` — 스킬 등록/업데이트
- `POST /api/skill-registry/skills/:name/safety-check` — 안전성 검사 실행

**안전성 검사 (check_skill_safety)**:
OpenSpace 패턴을 참고하여, 스킬 콘텐츠에서 위험 패턴을 감지:
- 프롬프트 인젝션 시도 (system prompt override, ignore instructions 등)
- 자격증명 접근 (API key, password, secret 패턴)
- 파일 시스템 위험 조작 (rm -rf, chmod 777 등)
- 외부 데이터 유출 시도 (curl, wget to external URLs)

### 5. 테스트 전략

| 영역 | 방식 | 예상 테스트 수 |
|------|------|---------------|
| D1 마이그레이션 | in-memory SQLite (기존 패턴) | ~10 |
| SkillMetricsService | 단위 테스트 (service 레벨) | ~20 |
| API routes | Hono `app.request()` (기존 패턴) | ~25 |
| 안전성 검사 | 패턴 매칭 단위 테스트 | ~15 |
| Web 대시보드 | React Testing Library | ~10 |
| **합계** | | **~80** |

---

## 구현 순서

### Sprint 103: Track A — 스킬 실행 메트릭 수집 (F274)

```
Step 1: D1 마이그레이션 (0080~0083)
  └── 4테이블 생성 + 인덱스

Step 2: SkillMetricsService 구현
  └── packages/api/src/services/skill-metrics.ts
  └── record(), getSummary(), getTrends(), getExecutions()

Step 3: BdSkillExecutor 래퍼 추가
  └── execute() 내 메트릭 기록 로직 삽입
  └── 기존 테스트 호환성 확인

Step 4: API 라우트 추가
  └── packages/api/src/routes/skill-metrics.ts
  └── GET summary / trends / executions

Step 5: Zod 스키마 추가
  └── packages/api/src/schemas/skill-metrics.ts

Step 6: Web 대시보드 탭 추가
  └── packages/web/src/routes/dashboard/skill-metrics.tsx
  └── 기존 토큰 대시보드 레이아웃 재활용

Step 7: 테스트
  └── 서비스 단위 + API 통합 + 웹 컴포넌트
```

### Sprint 104: Track D — 스킬 레지스트리 (F275)

```
Step 1: SkillRegistryService 구현
  └── packages/api/src/services/skill-registry.ts
  └── skill_versions CRUD + 검색 + lineage 관리

Step 2: SkillSafetyService 구현
  └── packages/api/src/services/skill-safety.ts
  └── check_skill_safety 패턴 매칭 엔진

Step 3: API 라우트 추가
  └── packages/api/src/routes/skill-registry.ts
  └── CRUD + search + safety-check

Step 4: ax-marketplace 플러그인 확장
  └── skill-registry 커맨드 추가
  └── `ax skill list`, `ax skill search`, `ax skill check`

Step 5: Web 레지스트리 UI
  └── packages/web/src/routes/dashboard/skill-registry.tsx
  └── 스킬 목록 + 상세 + 검색 + lineage 그래프

Step 6: 테스트
  └── 안전성 검사 단위 + 레지스트리 API + 웹 컴포넌트
```

---

## 변경 영향 분석

### 수정 파일 (기존)

| 파일 | 변경 내용 | 영향도 |
|------|----------|--------|
| `packages/api/src/services/bd-skill-executor.ts` | 메트릭 기록 래퍼 추가 | 중간 — 기존 execute() 로직 변경 없이 래퍼만 |
| `packages/api/src/index.ts` | 새 라우트 등록 (skill-metrics, skill-registry) | 낮음 |
| `packages/web/src/routes/dashboard/` | 토큰 대시보드 레이아웃에 탭 추가 | 낮음 |

### 신규 파일

| 파일 | 용도 |
|------|------|
| `packages/api/src/db/migrations/0080_skill_executions.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0081_skill_versions.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0082_skill_lineage.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0083_skill_audit_log.sql` | D1 마이그레이션 |
| `packages/api/src/services/skill-metrics.ts` | 메트릭 수집 서비스 |
| `packages/api/src/services/skill-registry.ts` | 레지스트리 서비스 |
| `packages/api/src/services/skill-safety.ts` | 안전성 검사 서비스 |
| `packages/api/src/routes/skill-metrics.ts` | 메트릭 API |
| `packages/api/src/routes/skill-registry.ts` | 레지스트리 API |
| `packages/api/src/schemas/skill-metrics.ts` | Zod 스키마 |
| `packages/api/src/schemas/skill-registry.ts` | Zod 스키마 |
| `packages/web/src/routes/dashboard/skill-metrics.tsx` | 메트릭 대시보드 |
| `packages/web/src/routes/dashboard/skill-registry.tsx` | 레지스트리 UI |

---

## 의존성

| 의존 대상 | 활용 내용 | 상태 |
|-----------|----------|------|
| F143 토큰 대시보드 | 대시보드 레이아웃 + ModelMetricsService 패턴 | ✅ 완료 (Sprint 43) |
| F158~F161 KPI 인프라 | KpiLogger 이벤트 트래킹 패턴 | ✅ 완료 (Sprint 45) |
| F260 BD 스킬 실행 엔진 | BdSkillExecutor (메트릭 삽입 지점) | ✅ 완료 (Sprint 93) |
| F262 사업성 신호등 | quality_score 연계 (0.0~1.0) | ✅ 완료 (Sprint 93) |
| ax-marketplace 플러그인 | 레지스트리 확장 대상 | ✅ 운영 중 |
| F270~F273 O-G-D Agent Loop | 선택적 연동 (실행 결과 수신) | 📋 계획됨 (Sprint 101~102) |

---

## 리스크

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| D1 writes/sec 한계 (1,000/sec) | 중간 | 고빈도 스킬 실행 시 배치 버퍼링 도입. 초기에는 실행 빈도가 낮으므로 직접 write |
| 기존 BdSkillExecutor 변경 시 호환성 | 높음 | 래퍼 패턴(기존 로직 변경 없이 전후 hook)으로 최소 침습 |
| 안전성 검사 오탐 | 중간 | 초기에는 경고만, 차단은 수동 승인 후 적용 |
| 스킬 버전 초기 데이터 부재 | 낮음 | 기존 76개 스킬을 v1.0으로 일괄 등록하는 시드 스크립트 |

---

## PoC/Spike 병행 (Phase 2 준비)

Sprint 103에서 Track A 구현과 병행하여, Phase 2(Track C: DERIVED 엔진)의 핵심 가정을 검증:

- 기존 BD 스킬 10개 이상의 실행 데이터(skill_executions)로 "반복 성공 패턴" 자동 추출 가능성 확인
- 추출된 패턴의 품질을 수동 작성 스킬과 비교 평가
- **PoC 통과 기준**: 추출된 패턴 중 50% 이상이 재사용 가치 있다고 판단(사용자 평가)
- **PoC 실패 시**: Track C를 룰 기반 단순 추출로 축소하거나 보류

> PoC 결과는 Sprint 104 완료 시점에 `/pdca analyze` 결과와 함께 평가하여
> Phase 2(F276~F278) 진행 여부를 결정한다.

---

## 검토 이력

| 날짜 | 변경 |
|------|------|
| 2026-04-02 | 최초 작성 — PRD final(FX-PLAN-SKILLEVOL-001) 기반 |
