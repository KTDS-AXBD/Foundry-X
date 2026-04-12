---
code: FX-RPRT-S90
title: "Sprint 90 완료 보고서 — BD 스킬 실행 엔진 + 산출물 저장·버전 관리"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S90]], [[FX-DSGN-S90]], [[FX-ANLS-S90]]"
---

# Sprint 90 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F260 BD 스킬 실행 엔진 + F261 BD 산출물 저장·버전 관리 |
| Sprint | 90 |
| 기간 | 2026-03-31 |
| Match Rate | **96%** |
| 신규 파일 | 17 |
| 수정 파일 | 5 |
| 신규 테스트 | 37 (API 31 + Web 6) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 스킬 카탈로그가 "보기만 가능"한 상태 — 실제 실행과 결과 관리 없음 |
| Solution | 스킬 선택 → Anthropic LLM 실행 → 산출물 D1 저장 + 버전 히스토리 풀스택 파이프라인 |
| Function UX Effect | SkillDetailSheet에 실행 폼 + 산출물 목록/상세/버전 비교 3개 웹 페이지 |
| Core Value | BD 프로세스 "가이드 → 실행 → 결과 축적" 완전 사이클 달성 |

## 구현 내역

### F260: BD 스킬 실행 엔진
- `BdSkillExecutor` — 스킬 ID → 프롬프트 매핑 → Anthropic Messages API 직접 호출
- `bd-skill-prompts.ts` — 20개 스킬별 system prompt 정의 (ai-biz 11 + pm 6 + mgmt 3)
- `PromptGatewayService` 연동 — 사용자 입력 sanitization (secret/PII 마스킹)
- Biz-item 컨텍스트 자동 주입 — 제목/설명/상태를 LLM 프롬프트에 포함
- 실행 상태 추적 — pending → running → completed/failed

### F261: BD 산출물 저장 + 버전 관리
- `bd_artifacts` D1 테이블 (마이그레이션 0075) — 5개 인덱스 포함
- `BdArtifactService` — CRUD + 자동 버전 증가 + 필터 목록
- 버전 히스토리 — 같은 biz_item + skill 재실행 시 version 자동 증가
- 산출물 목록/상세/버전 비교 API 엔드포인트 4개

### Web UI
- `SkillExecutionForm` — 실행 폼 + 실시간 로딩 + 결과 표시 (토큰 수, 소요 시간)
- `ArtifactList` — 산출물 목록 (필터, 페이지네이션)
- `ArtifactDetail` — 산출물 상세 + 입력/산출물 전문 + 버전 히스토리
- Sidebar "산출물" 메뉴 추가
- Router 2개 라우트 추가 (`/ax-bd/artifacts`, `/ax-bd/artifacts/:id`)

## 테스트 결과

| 패키지 | 실행 | 통과 | 상태 |
|--------|------|------|------|
| API (Sprint 90 신규) | 31 | 31 | ✅ |
| Web (Sprint 90 신규) | 6 | 6 | ✅ |
| Typecheck | 5 packages | 5 pass | ✅ |

## 기술 결정 로그

| 결정 | 근거 |
|------|------|
| Anthropic API 직접 호출 (ClaudeApiRunner 미사용) | 기존 Runner는 AgentExecutionRequest 인터페이스에 묶여 커스텀 system prompt 주입 불가 |
| 20개 스킬 프롬프트 서버 측 관리 | 프롬프트 보안 + 클라이언트 무관하게 프롬프트 개선 가능 |
| 통합 list() 메서드 (분리 메서드 대신) | 필터 조합이 동적이므로 하나의 메서드로 통합하는 것이 더 유연 |
| claude-haiku-4-5 모델 사용 | BD 스킬 산출물 생성에 충분 + 비용 효율 |
