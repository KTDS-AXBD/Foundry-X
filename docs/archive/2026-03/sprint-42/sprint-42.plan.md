---
code: FX-PLAN-042
title: "Sprint 42 — 자동화 품질 리포터 + 에이전트 마켓플레이스 (F151+F152)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-42
sprint: 42
phase: "Phase 5a"
references:
  - "[[FX-PLAN-041]]"
  - "[[FX-PLAN-040]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F151: 자동화 품질 리포터 + F152: 에이전트 마켓플레이스 |
| Sprint | 42 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5a (Agent Evolution Track A — **최종 스프린트**, A17+A18 완결) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| 신규 서비스 | 2개 (AutomationQualityReporter, AgentMarketplace) |
| 신규 테스트 | 40개+ |
| D1 마이그레이션 | 0025 (quality_snapshots) + 0026 (marketplace 3테이블) |
| API 엔드포인트 | 9개 (F151: 3개 + F152: 6개) |
| 기존 테스트 회귀 | 0건 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | 에이전트 자동화의 성공률·비용·실패 패턴이 흩어져 있어 품질 추세를 한눈에 파악 불가. 커스텀 역할(F146)을 조직 간 공유할 수 없어 역할 재활용 불가 |
| **Solution** | F151: AutomationQualityReporter — 5개 기존 테이블(agent_feedback, model_execution_metrics, kpi_events, agent_executions, fallback_events)을 집계하여 주간/기간별 품질 리포트 자동 생성. F152: AgentMarketplace — 에이전트 역할을 publish/install/rate하는 내부 마켓플레이스, CustomRole(F146) 기반 확장 |
| **Function UX Effect** | API 한 번 호출로 성공률·비용·실패 패턴·개선 제안이 담긴 종합 리포트 수신. 다른 조직이 만든 검증된 에이전트 역할을 검색→설치→평가 가능 |
| **Core Value** | Agent Evolution A17+A18 달성으로 **Track A 18개 기능 전체 완결**. 데이터 기반 자동화 품질 관리 + 에이전트 역할 생태계 기반 확보 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

**F151 — 자동화 품질 리포터 (Agent Evolution A17):**
- `AutomationQualityReporter` 서비스 구현 — 기존 5개 데이터 소스 집계
- `generateReport(period, taskType?)` — 기간별 품질 리포트 생성 (성공률, 비용, 실패 패턴, 개선 제안)
- `getFailurePatterns(days)` — 빈발 실패 패턴 분류 (taskType별, 모델별)
- `getImprovementSuggestions(days)` — 데이터 기반 개선 제안 (비용 절감, 모델 교체, 재시도 최적화)
- D1 마이그레이션 0025: `automation_quality_snapshots` 테이블 (일일 집계 캐시)
- 3개 엔드포인트: 종합 리포트, 실패 패턴, 개선 제안

**F152 — 에이전트 마켓플레이스 (Agent Evolution A18):**
- `AgentMarketplace` 서비스 구현 — CustomRole(F146) 기반 publish/install/rate 라이프사이클
- `publishItem(role, publisherOrgId)` — 커스텀 역할을 마켓플레이스에 게시
- `searchItems(query, filters)` — 마켓플레이스 항목 검색 (카테고리, 태그, taskType 필터)
- `installItem(itemId, targetOrgId)` — 마켓플레이스 항목을 조직에 설치 (CustomRole 복제)
- `rateItem(itemId, userId, score, review)` — 평점 및 리뷰 등록
- `uninstallItem(itemId, orgId)` — 설치된 항목 제거
- `getItemStats(itemId)` — 항목별 설치 수, 평균 평점 조회
- D1 마이그레이션 0026: `agent_marketplace_items` + `agent_marketplace_ratings` + `agent_marketplace_installs` 테이블
- 6개 엔드포인트: 게시, 검색, 설치, 평점, 삭제, 통계

### 1.2 범위 제한
- F151: 리포트 생성은 기존 데이터 집계 전용 — 새 메트릭 수집 로직 추가 없음
- F151: AI 기반 개선 제안은 규칙 기반 (LLM 호출 없음) — 패턴 매칭으로 구현
- F151: 일일 스냅샷은 API 호출 시 lazy 생성 — Cron 추가 없음 (기존 6시간 Cron 미사용)
- F152: 버전 관리(changelog, SemVer) 없음 — Phase 5b에서 추가
- F152: 카테고리는 AgentTaskType 10종 기반 하드코딩 — 커스텀 카테고리 미지원
- F152: 마켓플레이스 항목은 조직 내부 공유 전용 — 외부 레지스트리 연동 없음
- 기존 서비스 시그니처 불변: CustomRoleManager, ModelMetricsService, KpiLogger, AgentFeedbackLoopService

## 2. 기술 설계 요약

### 2.1 파일 구조
```
packages/api/src/services/
├── automation-quality-reporter.ts  # F151: 자동화 품질 리포터
└── agent-marketplace.ts            # F152: 에이전트 마켓플레이스

packages/api/src/__tests__/
├── automation-quality-reporter.test.ts  # 테스트 20개+
└── agent-marketplace.test.ts            # 테스트 20개+

packages/api/src/db/migrations/
├── 0025_automation_quality_snapshots.sql  # F151 마이그레이션
└── 0026_agent_marketplace.sql             # F152 마이그레이션

packages/api/src/
├── routes/agent.ts              # 9개 엔드포인트 추가
└── schemas/agent.ts             # QualityReport + Marketplace 스키마
```

### 2.2 API 엔드포인트

| Method | Path | 용도 | Feature |
|--------|------|------|---------|
| GET | /automation-quality/report | 종합 품질 리포트 (기간/taskType 필터) | F151 |
| GET | /automation-quality/failure-patterns | 실패 패턴 분류 | F151 |
| GET | /automation-quality/suggestions | 데이터 기반 개선 제안 | F151 |
| POST | /agents/marketplace | 마켓플레이스 항목 게시 | F152 |
| GET | /agents/marketplace | 마켓플레이스 검색 | F152 |
| POST | /agents/marketplace/:id/install | 항목 설치 (CustomRole 복제) | F152 |
| POST | /agents/marketplace/:id/rate | 평점/리뷰 등록 | F152 |
| DELETE | /agents/marketplace/:id | 항목 삭제 (게시자만) | F152 |
| GET | /agents/marketplace/:id/stats | 항목 통계 (설치 수, 평점) | F152 |

### 2.3 D1 마이그레이션

**0025 — automation_quality_snapshots (F151)**
```sql
CREATE TABLE IF NOT EXISTS automation_quality_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,            -- YYYY-MM-DD
  task_type TEXT,                          -- NULL = 전체, 값 있으면 taskType별
  total_executions INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  success_rate REAL NOT NULL DEFAULT 0,
  avg_duration_ms REAL NOT NULL DEFAULT 0,
  total_cost_usd REAL NOT NULL DEFAULT 0,
  avg_cost_per_execution REAL NOT NULL DEFAULT 0,
  feedback_pending INTEGER NOT NULL DEFAULT 0,
  feedback_applied INTEGER NOT NULL DEFAULT 0,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  top_failure_reason TEXT,                -- 최빈 실패 사유
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_quality_snapshot_date_type
  ON automation_quality_snapshots(snapshot_date, task_type);
```

**0026 — agent_marketplace (F152)**
```sql
CREATE TABLE IF NOT EXISTS agent_marketplace_items (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,                   -- 원본 custom_agent_roles.id 참조
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  system_prompt TEXT NOT NULL,
  allowed_tools TEXT NOT NULL DEFAULT '[]',
  preferred_model TEXT,
  preferred_runner_type TEXT DEFAULT 'openrouter',
  task_type TEXT NOT NULL,
  category TEXT NOT NULL,                  -- AgentTaskType 기반
  tags TEXT NOT NULL DEFAULT '[]',         -- JSON array
  publisher_org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published', -- published | archived
  avg_rating REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_marketplace_category ON agent_marketplace_items(category);
CREATE INDEX idx_marketplace_status ON agent_marketplace_items(status);
CREATE INDEX idx_marketplace_publisher ON agent_marketplace_items(publisher_org_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_ratings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
  review_text TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);

CREATE UNIQUE INDEX idx_marketplace_rating_user
  ON agent_marketplace_ratings(item_id, user_id);

CREATE TABLE IF NOT EXISTS agent_marketplace_installs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  installed_role_id TEXT,                  -- 설치 시 생성된 custom_agent_roles.id
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(item_id) REFERENCES agent_marketplace_items(id)
);

CREATE UNIQUE INDEX idx_marketplace_install_org
  ON agent_marketplace_installs(item_id, org_id);
```

### 2.4 AutomationQualityReporter 핵심 설계

```
GET /automation-quality/report?days=7&taskType=code-review
  │
  ├─ AutomationQualityReporter.generateReport(days, taskType?)
  │     │
  │     ├─ 캐시 확인: automation_quality_snapshots에서 해당 날짜 범위 조회
  │     │     └─ 캐시 miss → lazy 집계 + 스냅샷 저장
  │     │
  │     ├─ 데이터 소스 5종 집계:
  │     │     ├─ agent_executions → 성공률, 평균 소요시간
  │     │     ├─ model_execution_metrics → 모델별 비용, 토큰 효율
  │     │     ├─ agent_feedback → 피드백 처리율 (pending/reviewed/applied)
  │     │     ├─ kpi_events (event_type='agent_task') → 활동량
  │     │     └─ fallback_events → 폴백 발생률
  │     │
  │     └─ 반환: QualityReport { metrics, trends, failurePatterns, suggestions }

GET /automation-quality/failure-patterns?days=30
  │
  └─ getFailurePatterns(days)
        ├─ agent_executions WHERE status='failed' GROUP BY task_type, model
        ├─ agent_feedback WHERE status='pending' → 미해결 실패
        └─ 반환: FailurePattern[] { taskType, model, count, topReasons }

GET /automation-quality/suggestions?days=30
  │
  └─ getImprovementSuggestions(days)
        ├─ 규칙 1: 특정 모델 successRate < 80% → "모델 교체 권장"
        ├─ 규칙 2: fallback 비율 > 20% → "주 모델 안정성 점검"
        ├─ 규칙 3: 특정 taskType avgCost > 전체 평균 2배 → "비용 최적화 대상"
        ├─ 규칙 4: feedback pending > 10건 → "미처리 피드백 검토 필요"
        └─ 반환: Suggestion[] { type, severity, message, data }
```

### 2.5 AgentMarketplace 핵심 설계

```
POST /agents/marketplace { roleId, tags, category }
  │
  ├─ AgentMarketplace.publishItem(roleId, publisherOrgId)
  │     ├─ CustomRoleManager.getRole(roleId) → 역할 정보 가져오기
  │     ├─ isBuiltin 체크 → 내장 역할 게시 불가
  │     ├─ D1 INSERT → agent_marketplace_items
  │     └─ 반환: MarketplaceItem

GET /agents/marketplace?q=security&category=security-review&limit=20
  │
  ├─ AgentMarketplace.searchItems(query, filters)
  │     ├─ D1 SELECT + LIKE 검색 (name, description)
  │     ├─ 필터: category, tags, status='published'
  │     ├─ 정렬: avg_rating DESC, install_count DESC
  │     └─ 반환: { items: MarketplaceItem[], total: number }

POST /agents/marketplace/:id/install
  │
  ├─ AgentMarketplace.installItem(itemId, targetOrgId)
  │     ├─ 중복 설치 체크 (agent_marketplace_installs UNIQUE)
  │     ├─ 항목 정보 조회 → CustomRoleManager.createRole() 호출 (복제)
  │     ├─ agent_marketplace_installs INSERT
  │     ├─ agent_marketplace_items.install_count += 1
  │     └─ 반환: { installedRoleId, item }

POST /agents/marketplace/:id/rate { score, reviewText }
  │
  ├─ AgentMarketplace.rateItem(itemId, userId, score, review)
  │     ├─ agent_marketplace_ratings UPSERT (user당 1건)
  │     ├─ avg_rating + rating_count 재계산 → items UPDATE
  │     └─ 반환: { rating, updatedAvg }
```

### 2.6 개선 제안 규칙 (F151)

| 규칙 | 조건 | 제안 | 심각도 |
|------|------|------|--------|
| 모델 불안정 | 특정 모델 successRate < 80% | "모델 교체 또는 Fallback 체인 추가 권장" | warning |
| 폴백 빈발 | fallback 비율 > 20% | "주 모델 안정성 점검 — 대체 모델 상시화 검토" | warning |
| 비용 이상 | 특정 taskType 비용 > 전체 평균 × 2 | "비용 최적화 대상 — 더 저렴한 모델 라우팅 검토" | info |
| 피드백 적체 | pending 피드백 > 10건 | "미처리 피드백 검토 필요 — 학습 루프 지연" | warning |
| 재시도 과다 | 평균 retry > 2회 (reflection 데이터) | "프롬프트 개선 또는 태스크 분할 검토" | info |
| 저품질 태스크 | 특정 taskType successRate < 60% | "해당 태스크 자동화 적합성 재검토" | critical |

## 3. 위험 및 의존성

| 위험 | 대응 |
|------|------|
| F151 집계 쿼리 성능 (대량 데이터) | 일일 스냅샷 캐시 테이블로 lazy 집계 — 반복 호출 시 캐시 히트 |
| F152 CustomRoleManager 의존 (Sprint 41) | Sprint 41 F146 이미 커밋 완료(768fb76) — 안전 |
| D1 마이그레이션 0025/0026 충돌 | Sprint 41은 0024 — 0025/0026은 Sprint 42 전용으로 안전 |
| 마켓플레이스 항목 삭제 시 설치된 역할 처리 | 설치된 역할은 독립 CustomRole — 원본 삭제 시 설치 추적만 제거 |
| routes/agent.ts 공유 파일 충돌 (2-Worker) | F151은 별도 route 파일(/automation-quality) 사용 → 충돌 없음 |

## 4. 작업 순서 (2-Worker 병렬)

### Worker 1: F151 자동화 품질 리포터
1. `0025_automation_quality_snapshots.sql` — D1 마이그레이션
2. `automation-quality-reporter.ts` — AutomationQualityReporter 서비스 (3 메서드 + 스냅샷 캐시)
3. `automation-quality-reporter.test.ts` — 테스트 20개+
4. `routes/automation-quality.ts` — 3개 엔드포인트 (신규 라우트 파일)
5. `schemas/automation-quality.ts` — Zod 스키마 (신규)

### Worker 2: F152 에이전트 마켓플레이스
1. `0026_agent_marketplace.sql` — D1 마이그레이션 (3 테이블)
2. `agent-marketplace.ts` — AgentMarketplace 서비스 (6 메서드)
3. `agent-marketplace.test.ts` — 테스트 20개+
4. `routes/agent.ts` — 6개 엔드포인트 추가 (하단 append)
5. `schemas/agent.ts` — Marketplace 스키마 추가

### 통합 (리더)
6. `index.ts` — 신규 라우트 등록 (automation-quality)
7. 전체 테스트 회귀 확인
8. typecheck 검증

### 충돌 관리

| 공유 파일 | Worker 1 변경 | Worker 2 변경 | 충돌 위험 |
|----------|-------------|-------------|----------|
| `routes/agent.ts` | 수정 없음 (별도 라우트) | 하단에 6개 라우트 추가 | ✅ 없음 |
| `schemas/agent.ts` | 수정 없음 (별도 스키마) | 하단에 스키마 추가 | ✅ 없음 |
| `index.ts` | 라우트 등록 1줄 추가 | 수정 없음 | ✅ 없음 |

**병합 전략**: Worker 1, Worker 2 독립 커밋 가능 — 파일 충돌 0건 설계

## 5. 성공 기준

| 기준 | 목표 |
|------|------|
| Match Rate | ≥ 90% |
| 신규 테스트 | 40개+ 전체 통과 |
| 기존 테스트 회귀 | 0건 |
| typecheck | 에러 0건 |
| 품질 리포트 생성 | 5개 데이터 소스 집계 → 성공률/비용/실패 패턴/제안 포함 |
| 스냅샷 캐시 | 동일 날짜+taskType 재조회 시 캐시 히트 |
| 개선 제안 규칙 | 6종 규칙 모두 조건 충족 시 정상 제안 생성 |
| 마켓플레이스 게시 | CustomRole → MarketplaceItem 변환 + 게시 |
| 마켓플레이스 설치 | 항목 설치 → 대상 조직에 CustomRole 복제 생성 |
| 마켓플레이스 평점 | user당 1건 UPSERT + avg_rating 자동 재계산 |
| 중복 설치 방지 | 동일 org+item 재설치 시 에러 반환 |
| Agent Evolution 완결 | A1~A18 전체 18개 기능 완료 확인 |
