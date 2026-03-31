---
code: FX-PLAN-S90
title: "Sprint 90 — BD 스킬 실행 엔진 + 산출물 저장·버전 관리"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S90]], [[FX-PLAN-S89]]"
---

# Sprint 90: BD 스킬 실행 엔진 + 산출물 저장·버전 관리

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F260 BD 스킬 실행 엔진 + F261 BD 산출물 저장·버전 관리 |
| Sprint | 90 |
| 기간 | 2026-03-31 |
| 우선순위 | P0 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Sprint 89에서 스킬 카탈로그 UI가 생겼지만 "보기만 가능"한 상태 — 실제 스킬 실행과 결과 관리가 없음 |
| Solution | 스킬 선택 → Anthropic LLM 실행 → 산출물 D1 저장 + 버전 히스토리의 풀스택 실행 파이프라인 구축 |
| Function UX Effect | SkillDetailSheet에 "실행" 버튼 추가 → 실행 결과를 biz-item별 산출물로 조회·비교·이력 관리 |
| Core Value | BD 프로세스가 "가이드 참조 → 직접 실행 → 결과 축적"의 완전한 사이클로 진화 |

## 목표

1. **F260**: BD 스킬 실행 엔진
   - 웹에서 스킬 선택 → API 호출 → Anthropic LLM 실행 → 산출물 반환
   - `bd-skills.ts`의 정적 스킬 정의를 서버 측 프롬프트로 변환하는 매핑 계층
   - 기존 `ClaudeApiRunner` + `PromptGatewayService` 활용 (새 LLM 연동 불필요)
   - 실행 상태 추적 (pending → running → completed/failed)

2. **F261**: BD 산출물 저장 + 버전 관리
   - 스킬 실행 결과를 biz-item별 산출물로 D1 저장
   - 같은 스킬 재실행 시 버전 자동 증가 (v1, v2, ...)
   - 2-0~2-10 단계별 산출물 연결
   - 산출물 목록 조회 + 상세 조회 + 버전 히스토리 API

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F260 | BD 스킬 실행 엔진 | P0 | F259 선행. ClaudeApiRunner + PromptGateway 기반 |
| F261 | BD 산출물 저장 + 버전 관리 | P0 | F260 선행. D1 마이그레이션 0075 필요 |

## 기술 결정

### 1. LLM 실행 전략: ClaudeApiRunner 재사용

기존 `ClaudeApiRunner` (Anthropic Messages API 직접 호출)를 활용해요:
- 이미 API 키 관리, 에러 핸들링, 토큰 카운팅이 구현되어 있음
- `PromptGatewayService`로 입력 sanitization 적용
- 모델: `claude-haiku-4-5-20250714` (비용 효율, BD 스킬 산출물 생성에 충분)

### 2. 스킬 → 프롬프트 매핑: 서버 측 정적 맵

`bd-skills.ts`의 스킬 ID별로 system prompt + output format을 서버에 정의해요:
- 웹 클라이언트는 스킬 ID + 사용자 입력만 전송 (프롬프트 자체는 서버에서 관리)
- 프롬프트 템플릿에 스킬 메타데이터(이름, 설명, 기대 산출물 형식)를 주입
- 보안: 프롬프트 자체가 클라이언트에 노출되지 않음

### 3. D1 산출물 테이블: `bd_artifacts`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | TEXT PK | ULID |
| org_id | TEXT FK | 테넌트 |
| biz_item_id | TEXT FK | biz_items.id |
| skill_id | TEXT | 스킬 ID (예: "ai-biz:ecosystem-map") |
| stage_id | TEXT | 발굴 단계 (예: "2-1") |
| version | INTEGER | 동일 스킬+biz_item 내 버전 번호 |
| input_text | TEXT | 사용자 입력 |
| output_text | TEXT | LLM 산출물 |
| model | TEXT | 사용 모델명 |
| tokens_used | INTEGER | 토큰 수 |
| duration_ms | INTEGER | 실행 시간 |
| status | TEXT | pending/running/completed/failed |
| created_by | TEXT FK | 실행자 user_id |
| created_at | TEXT | ISO timestamp |

### 4. 라우팅 구조

```
POST   /api/ax-bd/skills/:skillId/execute      ← F260: 스킬 실행
GET    /api/ax-bd/artifacts                     ← F261: 산출물 목록
GET    /api/ax-bd/artifacts/:id                 ← F261: 산출물 상세
GET    /api/ax-bd/biz-items/:id/artifacts       ← F261: biz-item별 산출물
GET    /api/ax-bd/artifacts/:id/versions        ← F261: 버전 히스토리
```

## 실행 계획

### Step 1: D1 마이그레이션 (~5분)
- `0075_bd_artifacts.sql` — `bd_artifacts` 테이블 + 인덱스 생성

### Step 2: API — 스킬 실행 서비스 (~20분)
- `services/bd-skill-executor.ts` — 스킬 ID → 프롬프트 매핑 + ClaudeApiRunner 호출
- `schemas/bd-artifact.ts` — Zod 스키마 (실행 요청/응답/목록)

### Step 3: API — 산출물 서비스 (~15분)
- `services/bd-artifact-service.ts` — CRUD + 버전 관리 + 목록 조회
- 자동 버전 증가: 같은 biz_item_id + skill_id 조합의 max(version) + 1

### Step 4: API — 라우트 + 테스트 (~20분)
- `routes/ax-bd-skills.ts` — 실행 엔드포인트
- `routes/ax-bd-artifacts.ts` — 산출물 CRUD 엔드포인트
- 테스트: 실행 흐름 + 산출물 CRUD + 버전 관리

### Step 5: Web — SkillDetailSheet 실행 UI (~15분)
- "실행" 버튼 + 입력 폼 + 결과 표시 추가
- 산출물 목록 페이지 (biz-item별 필터)
- 산출물 상세 + 버전 비교 뷰

### Step 6: 통합 테스트 + typecheck (~10분)
- Web 테스트: 실행 플로우 + 산출물 뷰
- 전체 typecheck + lint 통과 확인

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Anthropic API rate limit | 실행 실패 | 429 에러 시 재시도 안내 + status=failed 기록 |
| LLM 응답 길이 초과 | D1 TEXT 컬럼 제한 | max_tokens 4096 제한 (충분) |
| 비용 증가 | Haiku 사용으로 최소화 | 실행 횟수 + 토큰 사용량 모니터링 |
