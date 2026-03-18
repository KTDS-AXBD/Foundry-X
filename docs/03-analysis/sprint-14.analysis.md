---
code: FX-ANLS-015
title: Sprint 14 (v1.2.0) Gap Analysis — MCP Resources + 멀티 에이전트 동시 PR
version: 0.1
status: Active
category: ANLS
system-version: 1.2.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 14 Gap Analysis

> **Design**: [[FX-DSGN-015]] / **Plan**: [[FX-PLAN-015]]
> **Date**: 2026-03-18
> **Methodology**: Agent Teams 병렬 분석 (W1: F67, W2: F68) + Leader 통합

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Overall Match Rate** | **90%** (F67 92% + F68 88% 가중 평균) |
| **총 체크 항목** | 119건 (F67: 57, F68: 62) |
| **✅ 구현** | 95건 (79.8%) |
| **⚠️ 부분 구현** | 10건 (8.4%) — 대부분 구현이 Design보다 나은 선택 |
| **❌ 미구현** | 5건 (4.2%) — agents/page 통합, SSE 연동, UI 테스트 |
| **테스트** | 429건 (기존 388 + 신규 41) |

---

## 1. F67 MCP Resources — Match Rate 92%

### 1.1 핵심 구현 상태

| 카테고리 | ✅ | ⚠️ | ❌ |
|---------|:--:|:--:|:--:|
| 타입 + McpRunner | 13 | 1 | 0 |
| McpTransport | 3 | 0 | 0 |
| McpResourcesClient | 7 | 0 | 0 |
| API (스키마+라우트) | 9 | 1 | 0 |
| UI (Panel+Viewer) | 12 | 0 | 0 |
| api-client.ts | 5 | 0 | 0 |
| SSE | 2 | 0 | 0 |
| 테스트 | 1 | 1 | 1 |
| **합계** | **52** | **3** | **1** |

### 1.2 Gap 목록

| # | 항목 | 상태 | 영향 | 조치 |
|---|------|:----:|:----:|------|
| G1 | Resources API 인증 미적용 | ⚠️ | Low | 기존 MCP 라우트도 미인증. Sprint 범위 밖 |
| G2 | notificationHandlers 복수 핸들러 | ⚠️ | None | 구현이 Design보다 우수 (상위 호환) |
| G3 | mcp-resources.test "빈 결과" 케이스 | ⚠️ | Low | 1건 추가 권장 |
| G4 | McpResourcesPanel.test.tsx 미작성 | ❌ | Medium | 4건 UI 테스트 추가 필요 |

---

## 2. F68 Merge Queue — Match Rate 88%

### 2.1 핵심 구현 상태

| 카테고리 | ✅ | ⚠️ | ❌ |
|---------|:--:|:--:|:--:|
| 타입 (shared) | 12 | 0 | 0 |
| MergeQueueService | 6 | 2 | 0 |
| GitHubService | 3 | 0 | 0 |
| AgentOrchestrator parallel | 2 | 2 | 0 |
| API (스키마+라우트) | 10 | 1 | 0 |
| SSE | 4 | 0 | 0 |
| UI (Panel+Diagram+Form) | 2 | 0 | 2 |
| D1 Migration | 3 | 0 | 0 |
| api-client.ts | 5 | 0 | 0 |
| 테스트 | 4 | 0 | 1 |
| 기타 | 0 | 1 | 0 |
| **합계** | **43** (추가 ⚠️×0.5=3.5) | **7** | **3** |

### 2.2 Gap 목록

| # | 항목 | 상태 | 영향 | 조치 |
|---|------|:----:|:----:|------|
| G5 | agents/page.tsx 탭 통합 미완 | ❌ | High | Queue+Parallel 탭 추가 필요 (~20줄) |
| G6 | MergeQueuePanel SSE 실시간 미연동 | ❌ | Medium | polling → SSE 전환 (~15줄) |
| G7 | MergeQueuePanel.test.tsx 미작성 | ❌ | Medium | 3건 UI 테스트 필요 |
| G8 | detectConflicts autoResolvable 로직 | ⚠️ | Low | Design heuristic이 더 유용 |
| G9 | priority 정렬 방향 차이 | ⚠️ | Low | 구현이 스키마와 일관적 → Design 갱신 권장 |
| G10 | processNext 반환 타입 | ⚠️ | None | 구현이 더 정보적 → Design 갱신 권장 |
| G11 | executeParallel 단일 runner | ⚠️ | Low | 현 단계 적절, 향후 확장 가능 |
| G12 | task-type 기반 priority 미적용 | ⚠️ | Low | 향후 필요 시 추가 |
| G13 | Route handler task별 runner | ⚠️ | Low | G11과 동일 |
| G14 | PrPipeline 연동 위치 차이 | ⚠️ | None | orchestrator 중심이 더 cohesive |

---

## 3. F69 릴리스 + Phase 3 기반 — 미착수

| 항목 | 상태 | 비고 |
|------|:----:|------|
| Sprint 13 D1 migration 0007 remote | ⏳ | 별도 터미널 필요 |
| D1 migration 0008 remote | ⏳ | 0007 이후 순차 |
| CHANGELOG v1.2.0 | ⏳ | Do 완료 후 작성 |
| version bump | ⏳ | 릴리스 시 |
| multitenancy.design.md | ⏳ | Phase 3 설계 |
| phase-3-roadmap.md | ⏳ | Phase 3 로드맵 |
| E2E 테스트 | ⏳ | 통합 후 작성 |

---

## 4. 개선 우선순위 (Iteration 권장)

### Must Fix (Match Rate ≥ 90% 달성 위해)

| # | Gap | 예상 작업량 | 우선순위 |
|---|-----|:----------:|:--------:|
| 1 | G5: agents/page.tsx 탭 통합 | ~20줄 | P0 |
| 2 | G6: MergeQueuePanel SSE 연동 | ~15줄 | P1 |

### Should Fix (품질 향상)

| # | Gap | 예상 작업량 | 우선순위 |
|---|-----|:----------:|:--------:|
| 3 | G8: detectConflicts autoResolvable | ~3줄 | P2 |
| 4 | G3: mcp-resources.test 빈 결과 | ~10줄 | P2 |

### Won't Fix (구현이 Design보다 나은 선택)

- G2 (notificationHandlers 복수), G9 (priority 방향), G10 (processNext 반환), G11/G13 (단일 runner), G14 (PrPipeline 위치) → **Design 문서 갱신 권장**

### Deferred (Sprint 14+)

- G1 (API 인증): 전체 MCP 라우트 인증 정책 수립 시 함께 처리
- G4, G7 (UI 테스트): React 컴포넌트 테스트 환경 구성 후
- G12 (task-type priority): 실 사용 시 피드백 반영

---

## 5. 테스트 현황

| 패키지 | 이전 | 현재 | 증가 |
|--------|:----:|:----:|:----:|
| API | 237 | 278 | +41 |
| CLI | 106 | 106 | 0 |
| Web | 45 | 45 | 0 |
| **합계** | **388** | **429** | **+41** |

**신규 테스트 파일 (7개):**
- `mcp-resources.test.ts` (7건) — McpResourcesClient
- `mcp-runner-resources.test.ts` (4건) — McpRunner resources 메서드
- `mcp-routes-resources.test.ts` (4건) — MCP Resources API 라우트
- `merge-queue.test.ts` (10건) — MergeQueueService
- `agent-orchestrator-parallel.test.ts` (6건) — 병렬 실행
- `github-extended.test.ts` (4건) — GitHub 확장 메서드
- `agent-routes-queue.test.ts` (5건) — Queue/Parallel API 라우트

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-18 | Initial analysis — F67 92% + F68 88% = Overall 90% | Sinclair Seo |
