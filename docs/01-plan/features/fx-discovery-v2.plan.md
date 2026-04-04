---
code: FX-PLAN-014
title: "fx-discovery-v2 — 발굴→형상화 파이프라인 자동화"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
references: "[[FX-SPEC-001]], docs/specs/fx-discovery-v2/prd-final.md"
---

# fx-discovery-v2: 발굴→형상화 파이프라인 자동화

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 발굴(2-0~2-10)→형상화(Phase A~F) 전체 파이프라인이 단절되어 있어 수십 회 수동 클릭 필요 + E2E 테스트 부재 |
| **Solution** | 이벤트 기반 상태 머신 오케스트레이션 + HITL 체크포인트 + 형상화 자동 트리거 |
| **Function/UX Effect** | 수동 클릭 30회→HITL 7회로 감소, 발굴 완료 시 형상화 자동 전환, 위저드 E2E 회귀 방지 |
| **Core Value** | BD 프로세스 E2E 완성 → 팀 실사용 전환 + 도구 채택률 향상 |

---

## 1. Overview

### 1.1 Purpose

F270 1차 정비(Sprint 101)에서 6가지 기초 이슈를 해결한 후, 남아 있는 핵심 문제인 **파이프라인 단절**을 해소한다:
1. 발굴 단계 간 수동 전환 → 자동 순차 실행
2. 발굴→형상화 전환 부재 → 자동 트리거
3. E2E 테스트 부재 → 위저드 전체 흐름 커버리지

### 1.2 Background

- AX BD팀 7명(비개발자 포함)이 사용하는 내부 BD 프로세스 자동화 도구
- 현재: 각 단계 스킬을 수동 클릭(~30회/아이템), 발굴→형상화 전환 없음
- 목표: HITL 체크포인트에서만 개입(~7회), 나머지 자동

### 1.3 Related Documents

- PRD: `docs/specs/fx-discovery-v2/prd-final.md`
- F270 설계: `docs/specs/F270-discovery-shaping-overhaul.design.md`
- Discovery 프로세스 v8.2: `docs/specs/axbd/`
- 형상화 스킬: `.claude/skills/ax-bd-shaping/SKILL.md`

---

## 2. Scope

### 2.1 In Scope (F312~F317, 5 Sprint)

- [x] F312: 형상화 자동 전환 + Phase A~F 자동 실행 (P0, Sprint 132)
- [x] F313: 파이프라인 상태 머신 + 실패/예외 관리 (P0, Sprint 132)
- [ ] F314: 발굴 연속 스킬 파이프라인 + HITL 체크포인트 (P1, Sprint 133)
- [ ] F315: 상태 모니터링 + 알림 + 권한 제어 (P1, Sprint 134)
- [ ] F316: Discovery E2E 테스트 (P2, Sprint 135)
- [ ] F317: 데이터 백업/복구 + 운영 계획 (P2, Sprint 136)

### 2.2 Out of Scope

- 새로운 스킬 개발 (기존 68개 활용)
- 외부 AI 모델 연동 변경 (Anthropic/OpenRouter 현행 유지)
- 모바일 최적화 (PC 우선)
- 완전한 트랜잭션 롤백 (best-effort 일관성)
- 실시간 다중 사용자 협업

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Sprint | Status |
|----|-------------|----------|--------|--------|
| FR-01 | 2-10 완료 시 형상화 Phase A 자동 트리거 | High | 132 | Pending |
| FR-02 | Phase A~F 순차 자동 실행 (각 Phase 완료 → 다음 Phase) | High | 132 | Pending |
| FR-03 | 발굴 산출물을 형상화 입력으로 데이터 전달 (JSON Schema) | High | 132 | Pending |
| FR-04 | 파이프라인 상태 머신 (이벤트 기반, D1 상태 저장) | High | 132 | Pending |
| FR-05 | 실패 시 재시도/건너뛰기/중단 옵션 UI | High | 132 | Pending |
| FR-06 | 2-0~2-10 자동 순차 실행 파이프라인 | High | 133 | Pending |
| FR-07 | HITL 체크포인트 승인/거부 UI (2-5 Commit Gate 포함) | High | 133 | Pending |
| FR-08 | 파이프라인 진행 대시보드 | Medium | 134 | Pending |
| FR-09 | 실시간 알림 (Slack/이메일) | Medium | 134 | Pending |
| FR-10 | HITL 승인 권한 관리 + 타임아웃 | Medium | 134 | Pending |
| FR-11 | Discovery 위저드 E2E 테스트 15건+ | Medium | 135 | Pending |
| FR-12 | 산출물 백업/복구 + 운영 Hotfix 체계 | Low | 136 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 단계 전환 < 5초 | 파이프라인 로그 |
| Reliability | 스킬 실행 실패 시 상태 보존 | 재시작 테스트 |
| Usability | 비개발자가 HITL 승인 가능 | 사용자 테스트 |
| Compatibility | ax-bd-shaping Phase A~F 스킬 호환 | 통합 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 발굴→형상화 자동 파이프라인 E2E 데모 동작
- [ ] HITL 체크포인트에서 승인/거부 UI 동작
- [ ] Discovery E2E 테스트 15건+ 통과
- [ ] typecheck + build + lint 통과
- [ ] Gap Analysis 90%+ Match Rate

### 4.2 Quality Criteria

- [ ] Discovery E2E 테스트 커버리지 (현재 ~3건 → 15건+)
- [ ] 파이프라인 상태 머신 단위 테스트
- [ ] Zero lint errors
- [ ] Build succeeds

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cloudflare Workers 타임아웃 (30s/10min) vs 장기 실행 Agent 루프 | High | High | Queue 기반 비동기 처리 + Durable Objects 검토 |
| CLI 스킬 ↔ Web UI 통합 복잡성 | High | Medium | 어댑터 레이어 표준화 + 로그 파서 |
| 데이터 계약 미정의로 인한 발굴→형상화 데이터 불일치 | High | Medium | JSON Schema 기반 데이터 계약 먼저 정의 |
| 기존 ax-bd-shaping 스킬 호환성 문제 | Medium | Medium | Sprint 132에서 프로토타입 검증 우선 |
| HITL 체크포인트 타임아웃/무한 대기 | Medium | Low | 24시간 타임아웃 + 알림 정책 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** (기존 Foundry-X 아키텍처 유지)

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 파이프라인 오케스트레이션 | 순차 실행 / 상태 머신 / 이벤트 큐 | **상태 머신 + D1 상태 저장** | HITL 중단/재개 필수, Serverless 환경에서 상태 영속 필요 |
| 장기 실행 처리 | Workers 내 / Durable Objects / Queues | **Cloudflare Queues + Worker Consumer** | O-G-D 루프가 10분 초과 가능. Queue로 단계별 분할 실행 |
| CLI ↔ Web 통합 | API 래핑 / WebSocket / SSE | **기존 BdSkillExecutor REST API 확장** | 이미 `POST /ax-bd/skills/:skillId/execute` 존재, 상태 폴링 추가 |
| 데이터 전달 형식 | JSON / 파일 / DB 직접 | **D1 JSON 컬럼 + JSON Schema 계약** | 기존 D1 인프라 활용, 스키마 검증으로 무결성 보장 |
| 상태 저장 | 메모리 / D1 / KV | **D1 (pipeline_runs 테이블 확장)** | 기존 pipeline_stages 테이블 활용, 트랜잭션 필요 |

### 6.3 핵심 테이블 설계 (D1)

```sql
-- 기존 pipeline_stages 확장이 아닌, 새 테이블로 분리
CREATE TABLE pipeline_orchestration (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  pipeline_type TEXT NOT NULL CHECK(pipeline_type IN ('discovery', 'shaping', 'full')),
  current_step TEXT NOT NULL,        -- '2-0', '2-1', ..., '2-10', 'shaping-a', ..., 'shaping-f'
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'paused', 'completed', 'failed', 'cancelled')),
  hitl_pending BOOLEAN DEFAULT FALSE,
  hitl_action TEXT,                   -- 'approve', 'reject', 'skip'
  hitl_deadline TEXT,                 -- ISO 8601 타임아웃
  input_data TEXT,                    -- JSON (이전 단계 산출물)
  output_data TEXT,                   -- JSON (현재 단계 산출물)
  error_data TEXT,                    -- JSON (실패 정보)
  retry_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id)
);

CREATE TABLE pipeline_step_log (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT NOT NULL,
  step TEXT NOT NULL,
  action TEXT NOT NULL,               -- 'start', 'complete', 'fail', 'retry', 'skip', 'hitl_request', 'hitl_response'
  data TEXT,                          -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (orchestration_id) REFERENCES pipeline_orchestration(id)
);
```

### 6.4 파이프라인 상태 머신

```
[idle] → [running:2-0] → [running:2-1] → ... → [hitl:2-5] → [running:2-6] → ... → [running:2-10]
                                                     ↓                                     ↓
                                              [paused/rejected]                    [transition:shaping]
                                                                                          ↓
                                                                              [running:shaping-a] → ... → [running:shaping-f]
                                                                                          ↓                        ↓
                                                                                   [failed] ←──────────── [completed]
```

각 상태 전환 시:
1. `pipeline_step_log`에 이벤트 기록
2. `pipeline_orchestration.current_step` 갱신
3. HITL 필요 시 `hitl_pending = true` + `hitl_deadline` 설정
4. 실패 시 `error_data`에 상세 정보 + UI에서 재시도/건너뛰기/중단 옵션

---

## 7. Sprint 구성

### Sprint 132: M1 핵심 — 형상화 전환 + 상태 머신 (F312 + F313)

**변경 파일 예상:**

| 영역 | 파일 | 변경 |
|------|------|------|
| DB | `migrations/0090_pipeline_orchestration.sql` | 신규 테이블 2개 |
| Schema | `schemas/pipeline-orchestration.schema.ts` | Zod 스키마 |
| Service | `services/pipeline-orchestration-service.ts` | **신규** 상태 머신 로직 |
| Route | `routes/pipeline-orchestration.ts` | **신규** REST API (start/status/hitl-action/retry) |
| Service | `services/shaping-trigger-service.ts` | **신규** 2-10→형상화 전환 로직 |
| Web | `components/feature/discovery/PipelineStatusBar.tsx` | **신규** 진행 상태 표시 |
| Web | `components/feature/discovery/WizardStepDetail.tsx` | 수정: 자동 전환 트리거 연결 |

**검증:**
- 단위 테스트: 상태 머신 전환 로직
- 통합 테스트: 2-10 완료 → 형상화 Phase A 트리거

### Sprint 133: M2a — 발굴 파이프라인 + HITL (F314)

**의존성:** F312 + F313 (Sprint 132) 완료 필수

**변경 파일 예상:**

| 영역 | 파일 | 변경 |
|------|------|------|
| Service | `services/discovery-pipeline-runner.ts` | **신규** 2-0→2-10 순차 실행기 |
| Service | `services/hitl-checkpoint-service.ts` | **신규** HITL 승인/거부/타임아웃 |
| Route | `routes/pipeline-orchestration.ts` | 확장: HITL 엔드포인트 |
| Web | `components/feature/discovery/HitlCheckpoint.tsx` | **신규** 승인/거부 UI |
| Web | `components/feature/discovery/DiscoveryWizard.tsx` | 수정: 자동 실행 연동 |

### Sprint 134: M2b — 모니터링 + 알림 + 권한 (F315)

**의존성:** F314 (Sprint 133) 완료 필수

### Sprint 135: M3a — E2E 테스트 (F316)

**의존성:** F314 (Sprint 133) 완료 필수

**E2E 시나리오 예상:**

| # | 파일 | 시나리오 |
|---|------|----------|
| 1 | `e2e/pipeline-auto-run.spec.ts` | 발굴 파이프라인 자동 실행: 2-0→2-3 연속 동작 |
| 2 | `e2e/pipeline-hitl.spec.ts` | HITL 체크포인트: 승인/거부/타임아웃 |
| 3 | `e2e/pipeline-failure.spec.ts` | 실패 복구: 재시도/건너뛰기/중단 |
| 4 | `e2e/shaping-trigger.spec.ts` | 형상화 전환: 2-10 완료 → Phase A 트리거 |
| 5 | `e2e/pipeline-status.spec.ts` | 상태 대시보드: 진행률 표시 |

### Sprint 136: M3b — 백업/복구 + 운영 (F317)

**의존성:** F315 (Sprint 134) 완료 필수

---

## 8. Next Steps

1. [ ] `/pdca design fx-discovery-v2` — 상세 설계 문서 (상태 머신 다이어그램, API 명세, 데이터 계약)
2. [ ] Sprint 132 착수 — F312 + F313 병렬
3. [ ] 프로토타입 검증 — 2-10→형상화 Phase A 최소 경로 동작 확인

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-04 | 인터뷰 + PRD 기반 초안. F312~F317 6건, Sprint 132~136 | Sinclair Seo |
