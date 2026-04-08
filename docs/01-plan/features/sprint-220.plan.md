---
code: FX-PLAN-S220
title: "Sprint 220 — 1차/2차 PRD 자동 생성"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 220: 1차/2차 PRD 자동 생성

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F454 (1차 PRD 자동 생성), F455 (2차 PRD 보강) |
| Sprint | 220 |
| 우선순위 | P0 |
| 의존성 | Sprint 219 완료 (F451~F453: Clean Sheet + 아이템 등록 + 사업기획서/Offering 연결 + Prototype 역등록) |
| Phase | 26 — BD Portfolio Management |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 사업기획서(HTML)가 존재하지만 PRD 형태로 정리되지 않아, 이후 형상화·검증 파이프라인 진입 불가 |
| Solution | 사업기획서 HTML 자동 파싱 → LLM 기반 1차 PRD 생성 + req-interview 스킬 기반 2차 PRD 보강 |
| Function UX Effect | "PRD 생성" 버튼 클릭만으로 1차 PRD 확보, 인터뷰 UI에서 HITL 기반 2차 보강까지 완료 |
| Core Value | 사업기획서 → PRD 변환 자동화로 형상화 파이프라인 진입 시간 90% 단축 |

---

## 작업 목록

### F454: 1차 PRD 자동 생성

#### API 변경

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 1 | `api/src/core/offering/services/bp-prd-generator.ts` | **신규** — 사업기획서 HTML 파싱 + PRD 변환 서비스 |
| 2 | `api/src/core/offering/services/bp-html-parser.ts` | **신규** — HTML 구조화 파싱 (제목, 목적, 타깃, 시장, 기술, 일정 등 섹션 추출) |
| 3 | `api/src/core/discovery/routes/biz-items.ts` | **수정** — POST `/biz-items/:id/generate-prd-from-bp` 엔드포인트 추가 |
| 4 | `api/src/core/offering/schemas/bp-prd.ts` | **신규** — Zod 스키마 (GeneratePrdFromBpSchema) |
| 5 | `api/src/db/migrations/NNNN_prd_source_type.sql` | **신규** — `biz_generated_prds` 테이블에 `source_type` 컬럼 추가 (discovery / business_plan) |

#### Web UI 변경

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 6 | `web/src/routes/ax-bd/discovery-detail.tsx` | **수정** — 형상화 탭에 "사업기획서 기반 PRD 생성" 버튼 추가 (사업기획서 연결 시에만 활성화) |
| 7 | `web/src/components/feature/discovery/PrdFromBpPanel.tsx` | **신규** — PRD 생성 진행 상태 + 결과 미리보기 패널 |
| 8 | `web/src/lib/api-client.ts` | **수정** — `generatePrdFromBp()` API 클라이언트 함수 추가 |

#### 테스트

| # | 파일 | 시나리오 |
|---|------|----------|
| 9 | `api/src/__tests__/bp-prd-generator.test.ts` | HTML 파싱 → PRD 생성 (4건 아이템), 사업기획서 미연결 시 에러 |
| 10 | `api/src/__tests__/bp-html-parser.test.ts` | HTML 구조 추출 정확도 (섹션 7종 이상 추출) |

---

### F455: 2차 PRD 보강 (HITL 인터뷰)

#### API 변경

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 11 | `api/src/core/offering/services/prd-interview-service.ts` | **신규** — 1차 PRD 기반 인터뷰 질문 생성 + 응답 반영 + 2차 PRD 갱신 |
| 12 | `api/src/core/discovery/routes/biz-items.ts` | **수정** — POST `/biz-items/:id/prd-interview/start`, POST `/biz-items/:id/prd-interview/answer`, GET `/biz-items/:id/prd-interview/status` |
| 13 | `api/src/core/offering/schemas/prd-interview.ts` | **신규** — Zod 스키마 (StartInterviewSchema, AnswerInterviewSchema) |
| 14 | `api/src/db/migrations/NNNN_prd_interviews.sql` | **신규** — `prd_interviews` 테이블 (세션 관리) + `prd_interview_qas` 테이블 (질문-응답 쌍) |

#### Web UI 변경

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 15 | `web/src/components/feature/discovery/PrdInterviewPanel.tsx` | **신규** — 인터뷰 UI (질문 표시 → 응답 입력 → 제출 → 다음 질문) |
| 16 | `web/src/routes/ax-bd/discovery-detail.tsx` | **수정** — 형상화 탭에 "PRD 보강 인터뷰" 버튼 + 인터뷰 진행 상태 배지 |
| 17 | `web/src/lib/api-client.ts` | **수정** — 인터뷰 시작/응답/상태 API 클라이언트 함수 추가 |

#### 테스트

| # | 파일 | 시나리오 |
|---|------|----------|
| 18 | `api/src/__tests__/prd-interview-service.test.ts` | 인터뷰 시작 → 질문 생성 → 응답 반영 → 2차 PRD 저장 |
| 19 | `api/src/__tests__/prd-interview-flow.test.ts` | E2E 흐름: 1차 PRD 없이 인터뷰 시도 시 에러, 인터뷰 완료 후 version=2 확인 |

---

## 사전 조건

- [x] Sprint 219 완료 (F451~F453: Clean Sheet + 아이템 4건 + 사업기획서/Offering 연결 + Prototype 역등록)
- [ ] 사업기획서 HTML 4건이 `business_plan_drafts` 테이블에 존재
- [ ] ANTHROPIC_API_KEY 또는 OPENROUTER_API_KEY Workers secret 설정

## 성공 기준 (MVP)

| # | 기준 | 판정 |
|---|------|------|
| 1 | F454: 사업기획서 HTML → 1차 PRD 자동 생성 (4건 아이템 대상) | PASS/FAIL |
| 2 | F454: 생성된 PRD에 7개 이상 섹션 포함 (목적, 타깃, 시장, 기술, 범위, 일정, 리스크) | PASS/FAIL |
| 3 | F454: `biz_generated_prds` 테이블에 `source_type='business_plan'`, `version=1`로 저장 | PASS/FAIL |
| 4 | F454: UI에서 PRD 열람 + 마크다운 렌더링 | PASS/FAIL |
| 5 | F455: 1차 PRD 기반 인터뷰 질문 5개 이상 자동 생성 | PASS/FAIL |
| 6 | F455: 사용자 응답 후 2차 PRD에 반영 (version=2) | PASS/FAIL |
| 7 | F455: 인터뷰 UI에서 질문→응답→다음 질문 루프 동작 | PASS/FAIL |
| 8 | 전체 테스트 통과 (unit 6건 이상) | PASS/FAIL |
| 9 | Match Rate >= 90% | PASS/FAIL |

## 리스크

| # | 리스크 | 영향 | 완화 방안 |
|---|--------|------|-----------|
| 1 | 사업기획서 HTML 구조가 일관되지 않음 | 파싱 실패 | 폴백 전략: 구조화 실패 시 전체 텍스트를 LLM에 전달 |
| 2 | LLM 응답 품질 편차 | PRD 품질 불균일 | 템플릿 기반 구조 강제 + LLM은 내용 보강만 담당 |
| 3 | 인터뷰 질문 품질 | 사용자 이탈 | 도메인 특화 프롬프트 + 질문 수 5~8개 제한 |
