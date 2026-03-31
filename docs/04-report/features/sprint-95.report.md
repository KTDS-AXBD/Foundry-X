---
code: FX-RPRT-S95
title: "Sprint 95 — Help Agent 챗봇 (F264) 완료 보고서"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S95]], [[FX-DSGN-S95]]"
---

# Sprint 95: Help Agent 챗봇 (F264) 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F264 Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 |
| Sprint | 95 |
| 기간 | 2026-03-31 (단일 세션) |
| Match Rate | **99%** |

### Results Summary

| 지표 | 수치 |
|------|------|
| Match Rate | 99% |
| 신규 파일 | 7개 |
| 수정 파일 | 2개 |
| 테스트 파일 | 3개 |
| 테스트 수 | 18개 (all pass) |
| D1 마이그레이션 | 0078 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 팀원들이 BD 프로세스 중 질문할 곳이 없음 |
| Solution | Hybrid 분기 챗 (로컬 패턴매칭 + OpenRouter LLM SSE) |
| Function UX Effect | 위저드 내 플로팅 챗 패널에서 즉시 질의, 컨텍스트 인식 응답 |
| Core Value | "프로세스 컨텍스트 인식 AI 비서" 차별화 |

## 구현 결과

### API 신규 (5파일)

| 파일 | 설명 | 테스트 |
|------|------|--------|
| `openrouter-service.ts` | OpenRouter SSE 프록시 | 4 tests |
| `help-agent-service.ts` | Hybrid 분기 + 컨텍스트 조립 + D1 저장 | 9 tests |
| `help-agent.ts` (route) | POST /chat, GET /history | 5 tests |
| `help-agent-schema.ts` | Zod 요청/응답 스키마 | — |
| `0078_help_agent.sql` | help_agent_conversations 테이블 | — |

### Web 신규 (2파일)

| 파일 | 설명 |
|------|------|
| `HelpAgentChat.tsx` | 플로팅 챗 UI (FAB + 패널) |
| `help-agent-store.ts` | Zustand: SSE 파싱, 메시지 관리, 에러 핸들링 |

### 수정 (2파일)

| 파일 | 변경 |
|------|------|
| `app.ts` | helpAgentRoute import + 등록 |
| `DiscoveryWizard.tsx` | HelpAgentChat import + 하단 FAB |

## 기술 결정

### Hybrid 분기

- **로컬 패턴 4종**: 다음 단계, 현재 단계, 스킬 추천, 체크포인트
- **LLM 경로**: OpenRouter SSE 릴레이 (Workers → 클라이언트)
- **결과**: 단순 질문은 즉시 응답, 복잡 질문만 LLM 호출 → 비용 절약

### SSE 릴레이

- Workers에서 `response.body`를 그대로 클라이언트에 파이프
- 클라이언트에서 `ReadableStream` reader로 chunk 파싱
- Content-Type 분기: JSON(로컬) vs SSE(LLM)

## 갭 분석 결과

| 카테고리 | 점수 |
|----------|------|
| Design Match | 95% |
| Architecture Compliance | 100% |
| Convention Compliance | 97% |
| **Overall** | **99%** |

### 의도적 차이 (개선 방향)

- `saveConversation` → `saveMessage`: user/assistant 분리 저장으로 개선
- `getHistory`에 `tenantId` 추가: tenant isolation 보안 강화
- Error message 상세화: `${status}: ${errorText}` 포맷

## 배포 사전 작업

- [ ] `wrangler secret put OPENROUTER_API_KEY` (Windows PowerShell)
- [ ] `wrangler d1 migrations apply foundry-x-db --remote` (0078)
- [ ] `wrangler deploy` (Workers)

## 성공 기준 달성

| 기준 | 상태 |
|------|------|
| Help Agent 챗이 위저드 내 동작 | ✅ |
| Hybrid: 단순질문 즉시, 복잡질문 SSE | ✅ |
| D1 대화 저장 + 조회 | ✅ |
| 테스트 3파일 10개 이상 통과 | ✅ (18개) |

## PDCA 사이클

| 단계 | 상태 | 비고 |
|------|------|------|
| Plan | ✅ | sprint-95.plan.md (사전 작성) |
| Design | ✅ | sprint-95.design.md |
| Do | ✅ | 7 신규 + 2 수정 + 3 테스트 |
| Check | ✅ | Match Rate 99% |
| Report | ✅ | 이 문서 |
