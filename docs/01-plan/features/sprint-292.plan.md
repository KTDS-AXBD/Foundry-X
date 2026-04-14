---
id: sprint-292-plan
type: plan
sprint: 292
features: [F544]
status: active
created: 2026-04-14
---

# Sprint 292 Plan — F544: F536 auto-trigger 저장 경로 복구

## 목표

Graph 완료 후 `autoTriggerMetaAgent` hook이 호출되지만 `agent_improvement_proposals`에 저장되지 않는 버그 수정.
Phase 43 Exit P1~P4 재검증 목적. MVP: K1(auto-trigger proposals ≥ 1건) + K2(manual == auto 경로 동일) PASS.

## 근본 원인 분석

Dogfood 실측 (graph-bi-koami-001-1776147547955): auto-trigger → 0건, manual `/api/meta/diagnose` → 6건.

### 원인 A: Cloudflare Workers `waitUntil` 누락 (P0)
```typescript
// 현재 — void fire-and-forget, Workers 응답 후 컨텍스트 종료 위험
void autoTriggerMetaAgent(c.env.DB, sessionId, apiKey, bizItemId).catch(...)
return c.json(...)
```
Workers는 `return c.json()` 이후 컨텍스트를 종료할 수 있음. `collection.ts` 등 다른 라우트는 `c.executionCtx.waitUntil()`로 안전 처리.

### 원인 B: 저장 경로 분기 (P1)
- **manual**: `rubric.score(p)` → `approveSvc.save({ ...p, rubricScore })`
- **auto-trigger**: `approvalService.save({ ...bare fields })` — `rubricScore` 없음, spread 없음

### 원인 C: 모델 미지정 (P2)
- **manual**: `new MetaAgent({ apiKey, model: META_AGENT_MODEL })`
- **auto-trigger**: `new MetaAgent({ apiKey })` — default 모델 사용 (일관성 없음)

## 작업 목록

| 항목 | 파일 | 설명 |
|------|------|------|
| (a) 구조 로깅 추가 | `discovery-stage-runner.ts` | sessionId, bizItemId, reportRows, proposals.length 로그 |
| (b) waitUntil 적용 | `discovery-stage-runner.ts` | `autoTriggerMetaAgent`를 route 내부로 이동, `c.executionCtx.waitUntil()` |
| (c) save 경로 단일화 | `discovery-stage-runner.ts` | `ProposalRubric` 적용 + spread로 manual과 동일화 |
| (d) 모델 통일 | `discovery-stage-runner.ts` | `MetaAgent({ apiKey, model })` — Env에서 읽기 |
| (e) integration test | `meta-agent-full-loop.test.ts` | Graph 완료 후 proposals > 0 보장 테스트 |

## 성공 기준

- K1: Dogfood P3에서 auto-trigger만으로 proposals ≥ 1건 실측
- K2: manual / auto-trigger 저장 경로 코드 단일화 (rubric 포함)
- K3: integration test GREEN (Graph run → proposals > 0)

## 전제

- F542 ✅ (Sonnet 4.6 + rubric 인프라 활용)
- D1 migration 없음 (스키마 변경 없음)
