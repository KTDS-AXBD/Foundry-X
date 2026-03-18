---
code: FX-ANLS-016
title: Sprint 16 (v1.4.0) Gap Analysis — PlannerAgent LLM + AgentInboxPanel UI + 프로덕션 배포
version: 0.1
status: Active
category: ANLS
system-version: 1.4.0
created: 2026-03-18
updated: 2026-03-18
author: Sinclair Seo
---

# Sprint 16 Gap Analysis

> **Design**: [[FX-DSGN-017]] / **Plan**: [[FX-PLAN-017]]
> **Date**: 2026-03-18
> **Methodology**: Leader 직접 분석 + gap-detector Agent (Design 7개 섹션 vs 구현 6개 파일 1:1 비교)

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Overall Match Rate** | **85%** (F75 92% + F76 80% 가중 평균, F77 미착수 제외) |
| **총 체크 항목** | 47건 (F75: 19, F76: 28) |
| **✅ 구현** | 35건 (74.5%) |
| **⚠️ 부분 구현/변경** | 7건 (14.9%) — 대부분 경미한 차이 |
| **❌ 미구현** | 5건 (10.6%) — Plans 탭 실 렌더링, 스레드 뷰, UI 테스트 |
| **테스트** | 313건 (기존 307 + 신규 6), Design 예상 ~316건 대비 -3건 |

---

## 1. F75 PlannerAgent LLM 실 연동 — Match Rate 92%

### Gap 목록

| # | 항목 | Design | Implementation | 영향 |
|---|------|--------|----------------|:----:|
| G1 | buildPlannerPrompt 포맷 | `## Task Type:` Markdown 헤더 | `Task Type:` 플랫 텍스트 | Low |
| G2 | buildPlannerPrompt spec 처리 | `context.spec.title/description` 개별 접근 | `context.spec` 문자열 직접 사용 | Low |
| G3 | parseAnalysisResponse 접근성 | private | public (테스트 직접 호출) | None |
| G4 | parseAnalysisResponse codebaseAnalysis 폴백 | `"분석 결과 없음"` | `""` 빈 문자열 | Low |
| G5 | parseAnalysisResponse estimatedTokens 폴백 | `(files.length ?? 1) * 2000` | `2000` 고정값 | Low |

**F75 결론**: 모든 핵심 기능 완전 구현. Gap은 모두 경미한 포맷/기본값 차이.

---

## 2. F76 AgentInboxPanel UI + AgentPlanCard — Match Rate 80%

### Gap 목록

| # | 항목 | Design | Implementation | 영향 |
|---|------|--------|----------------|:----:|
| G6 | AgentInboxPanel 스레드 뷰 | parentMessageId 기반 대화 맥락 | 미구현 (flat list) | Medium |
| G7 | AgentInboxPanel 타입 라벨 배지 | Badge with config.label | 아이콘만, 라벨 없음 | Low |
| G8 | api-client createPlan 반환 타입 | `AgentPlanResponse` 구체 타입 | `Record<string, unknown>` | Low |
| G9 | api-client listInboxMessages 반환 타입 | `InboxMessagesResponse` 구체 타입 | generic 타입 | Low |
| G10 | agents/page Plans 탭 실 렌더링 | AgentPlanCard 목록 + API 연동 | 플레이스홀더 텍스트만 | High |
| G11 | agents/page plan API import | createPlan/approvePlan/rejectPlan import | 미 import | High |
| G12 | AgentInboxPanel 렌더링 테스트 | +2건 | 0건 | Medium |
| G13 | AgentPlanCard shared import 테스트 | +1건 | typecheck 통과로 대체 | Low |

---

## 3. F77 프로덕션 배포 — 미착수 (예상대로)

코드 구현 완료 후 순차 실행 예정.

---

## 4. 개선 우선순위

### Must Fix (90% 달성 필수)

| # | Gap | 예상 작업량 |
|---|-----|:----------:|
| G10+G11 | Plans 탭 AgentPlanCard 실 렌더링 + API import | ~40줄 |
| G8/G9 | api-client 반환 타입 구체화 | ~20줄 |

### Deferred

| # | Gap | 사유 |
|---|-----|------|
| G6 | 스레드 뷰 | Sprint 17 이월 — flat list로 MVP 충분 |
| G12 | UI 테스트 | 렌더링 테스트는 E2E로 대체 가능 |

### 예상 Match Rate (수정 후)

G10+G11+G8/G9 해결 → **91%** 달성 가능
