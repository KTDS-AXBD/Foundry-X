---
code: FX-PLAN-018
title: Sprint 17 (v1.5.0) — AI Foundry MCP 연동 + AgentInbox 스레드 뷰 + PlannerAgent Orchestrator 통합
version: 0.1
status: Archived
category: PLAN
system-version: 1.5.0
created: 2026-03-18
updated: 2026-03-19
author: Sinclair Seo
---

# Sprint 17 (v1.5.0) Planning Document

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI Foundry MCP가 PoC 스크립트에 머물러 서비스 미통합. AgentInbox flat list로 대화 맥락 파악 불가. PlannerAgent "승인→실행→결과" 라이프사이클 미완성 |
| **Solution** | F80: 설계 문서 + MCP 프리셋 등록 + PlannerAgent 외부 호출 / F81: 스레드 라우트 + 스레드 UI / F82: 폴링 승인 대기 + 실행 상태 추적 + D1 확장 + Plan API |
| **Function/UX Effect** | 외부 AI 도구를 대시보드에서 직접 호출. 에이전트 메시지 스레드 그룹핑. 계획 승인→자동 실행 완전 워크플로우 |
| **Core Value** | "PoC→Production" 외부 AI 연동 실용화 + 에이전트 협업 가시성 + Plan-to-Execution 자동화 완성 |

## F-items

| F# | 제목 | Priority | 핵심 작업 | 예상 테스트 |
|----|------|:--------:|-----------|:-----------:|
| F80 | AI Foundry MCP 연동 | P1 | 설계 문서 + MCP 프리셋 + PlannerAgent 외부 호출 | +6 |
| F81 | AgentInbox 스레드 뷰 | P1 | 스레드 라우트 + 스레드 UI + api-client | +5 |
| F82 | PlannerAgent Orchestrator 통합 | P1 | 승인 대기 폴링 + 실행 라이프사이클 + D1 0010 + API | +11 |

## 의존성
F80, F81, F82 모두 독립적 — 병렬 진행 가능. Agent Teams W1(F80+F82), W2(F81) 배치.

## 리스크
- R1: Claude API 응답 JSON schema 불일치 → 폴백 (중/중)
- R2: createPlanAndWait 폴링 D1 부하 → 1s interval + 5min timeout (저/중)
- R3: D1 migration 0010 프로덕션 drift → migrations list 확인 (저/고)

## 성공 기준
전체 typecheck ✅, tests 통과, PDCA Match Rate ≥ 90%
