---
code: FX-RPRT-051
title: Sprint 51 — 사업 아이템 분류 Agent + AI 멀티 페르소나 사전 평가 완료 보고서
version: 1.0
status: Active
category: RPRT
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
---

# Sprint 51 Completion Report

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Feature** | Sprint 51 — F175 사업 아이템 분류 Agent + F178 AI 멀티 페르소나 사전 평가 |
| **Period** | 2026-03-24 |
| **Duration** | 1 세션 (Agent Team: 2 Workers) |

### Results

| Metric | Value |
|--------|:-----:|
| **Match Rate** | **95%** (Gap 6건, 모두 Low Impact) |
| **New Files** | 14 |
| **Modified Files** | 1 |
| **Tests** | 53 (all passed) |
| **API Endpoints** | +6 (총 181개) |
| **Services** | +5 (총 84개) |
| **D1 Tables** | +4 (총 54개) |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업 아이템을 수동으로 분류하고 평가하는 데 담당자 1명당 2주 소요. 주관적 판단으로 인한 편향, 500개 Use Case 대량 선별 불가. |
| **Solution** | F175: 3턴 대화 시뮬레이션 AI Agent가 Type A/B/C 자동 분류 + 유형별 분석 가중치 추천. F178: KT DS 8개 역할 페르소나가 병렬 평가 → G/K/R 판정. |
| **Function/UX Effect** | `POST /classify` 1회 호출로 분류 완료 (<10s). `POST /evaluate` 1회 호출로 8개 페르소나 병렬 평가 (<30s). 부분 실패(3/8) 허용으로 안정성 확보. |
| **Core Value** | "사업 아이템 분석 2주 → 30초" — AI 체계적 분석 + 인간 도메인 판단 결합. 8개 관점으로 편향 제거, G/K/R 자동 판정으로 의사결정 속도 10배 향상. |

---

## 2. Implementation Summary

### 2.1 F175: 사업 아이템 분류 Agent

**핵심 구현:**
- `item-classification-prompts.ts` — 3턴 자문자답 구조 프롬프트 빌더
  - 질문 1: 출처 파악 (레퍼런스/시장/고객)
  - 질문 2: 핵심 강점 (자료 수준)
  - 질문 3: 초점 검증 (수익 등가)
- `item-classifier.ts` — ItemClassifier 클래스
  - AgentRunner 단일 호출로 3턴 시뮬레이션
  - JSON 파싱 + markdown 코드블록 처리
  - 가중치 범위 검증 (0~3, 범위 이탈 시 DEFAULT_WEIGHTS 폴백)
  - ClassificationError (LLM_PARSE_ERROR, LLM_EXECUTION_FAILED)

**유형별 가중치 매핑:**

| 분석 단계 | Type A | Type B | Type C |
|-----------|:------:|:------:|:------:|
| ref (레퍼런스) | 3 | 1 | 0 |
| market (시장) | 1 | 3 | 1 |
| competition (경쟁) | 3 | 2 | 2 |
| derive (도출) | 3 | 3 | 1 |
| select (선정) | 2 | 3 | 1 |
| customer (고객) | 2 | 2 | 3 |
| bm (BM) | 2 | 2 | 3 |

### 2.2 F178: AI 멀티 페르소나 사전 평가

**8개 KT DS 역할 페르소나:**

| ID | 이름 | 핵심 관점 |
|----|------|-----------|
| strategy | 전략기획팀장 (15년차) | 전략적합성, 시장규모, 성장잠재력 |
| sales | 영업총괄부장 (20년차) | 수주확보, 기존고객 확장, 영업난이도 |
| ap_biz | AP사업본부장 (18년차) | 기술실현, 자원투입비, 타임라인 |
| ai_tech | AI기술본부장 (12년차) | 기술차별성, AI 적합성, 데이터 확보 |
| finance | 경영기획팀장 (15년차) | 재무타당성, ROI, 투자회수기간 |
| security | 보안전략팀장 (13년차) | 보안위험, 컴플라이언스, 데이터 거버넌스 |
| partnership | 대외협력팀장 (14년차) | 파트너십, 규제환경, 시장진입 장벽 |
| product | 기술사업화PM (10년차) | 사업화 실행력, 리스크, MVP 가능성 |

**G/K/R 판정 로직:**
- 🟢 **Green**: avgScore ≥ 7.0 AND totalConcerns ≤ 2
- 🟡 **Keep**: avgScore 5.0~6.9 OR totalConcerns 3~5
- 🔴 **Red**: avgScore < 5.0 OR totalConcerns ≥ 6
- **Override**: 전략기획+경영기획 둘 다 avg < 5 → Green→Keep 하향
- **Warning**: 3개+ 페르소나가 특정 축 ≤ 3점 → 경고 플래그

### 2.3 API 엔드포인트

| # | Method | Path | 설명 |
|---|--------|------|------|
| 1 | POST | `/api/biz-items` | 사업 아이템 등록 |
| 2 | GET | `/api/biz-items` | 목록 조회 (?status, ?source 필터) |
| 3 | GET | `/api/biz-items/:id` | 상세 조회 (분류 결과 포함) |
| 4 | POST | `/api/biz-items/:id/classify` | 3턴 AI 분류 실행 |
| 5 | POST | `/api/biz-items/:id/evaluate` | 8개 페르소나 평가 실행 |
| 6 | GET | `/api/biz-items/:id/evaluation` | 평가 결과 조회 |

### 2.4 D1 데이터 모델

| 테이블 | 마이그레이션 | 용도 |
|--------|:----------:|------|
| biz_items | 0033 | 사업 아이템 CRUD |
| biz_item_classifications | 0033 | 분류 결과 (1:1) |
| biz_evaluations | 0034 | 평가 판정 결과 |
| biz_evaluation_scores | 0034 | 페르소나별 8축 점수 |

---

## 3. Test Coverage

| 테스트 파일 | 테스트 수 | 대상 |
|------------|:--------:|------|
| `item-classifier.test.ts` | 11 | 분류 로직 + 에러 처리 + 가중치 검증 |
| `biz-persona-evaluator.test.ts` | 14 | 평가 + G/K/R 경계값 + 부분 실패 + Override |
| `biz-item-service.test.ts` | 14 | CRUD + 상태 전이 + 분류/평가 저장 |
| `biz-items.test.ts` | 14 | 6개 API 엔드포인트 통합 테스트 |
| **합계** | **53** | |

---

## 4. Architecture Decisions

| 결정 | 근거 |
|------|------|
| 3턴 시뮬레이션을 단일 LLM 호출로 | 비용 1/3, 지연 1/3 — 분류 품질 동등 |
| Promise.allSettled 부분 실패 허용 | 8개 중 5개만 성공해도 판정 가능 — 안정성 우선 |
| G/K/R 판정을 서비스 레이어에 분리 | LLM 환각 방지 — 비즈니스 규칙은 코드로 강제 |
| BizItem 인터페이스 로컬 정의 | Worker 병렬 작업 시 import 충돌 방지 |
| Agent Team 2-Worker 구조 | Worker-1(DB+CRUD+Schema), Worker-2(AI 서비스+테스트) 병렬 |

---

## 5. Cumulative Metrics (Sprint 51 완료)

| 지표 | Sprint 50 | Sprint 51 | 증감 |
|------|:---------:|:---------:|:----:|
| API 엔드포인트 | 175 | **181** | +6 |
| API 서비스 | 79 | **84** | +5 |
| API 스키마 | 32 | **33** | +1 |
| D1 테이블 | 50 | **54** | +4 |
| D1 마이그레이션 | 0032 | **0034** | +2 |
| API 테스트 | 1051 | **1104** | +53 |
| CLI 테스트 | 131 | 131 | 0 |
| Web 테스트 | 73 | 73 | 0 |
| **전체 테스트** | **1255** | **1308** | **+53** |
