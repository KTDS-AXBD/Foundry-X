---
code: FX-PLAN-046
title: "Sprint 46 — Phase 5 고객 파일럿 준비 (F162+F163+F169)"
version: 1.0
status: Active
category: PLAN
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-46
sprint: 46
phase: "Phase 5"
references:
  - "[[FX-PLAN-044]]"
  - "[[FX-SPEC-001]]"
  - "FX-SPEC-PRD-V8_foundry-x.md"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F162: Azure 마이그레이션 PoC / F163: SI 파트너 R&R 확정 / F169: 고객 데모 환경 구축 |
| Sprint | 46 |
| 기간 | 2026-03-22 ~ (1 Sprint) |
| Phase | Phase 5 — 고객 파일럿 + 수주 준비 (PRD v8 Conditional 선결 조건 해소) |

### Results (예상)

| 항목 | 목표 |
|------|------|
| Azure PoC | 핵심 모듈 3개 Azure 환경 구동 확인 |
| SI R&R 문서 | 역할 분담 정의서 1건 |
| 데모 환경 | 엔드투엔드 SR 자동 처리 시나리오 데모 1건 |
| 테스트 | Azure 환경 E2E 스모크 테스트 |
| 문서 | Azure 마이그레이션 가이드, 데모 시나리오 스크립트 |

### Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | PRD v8이 Conditional Ready 상태 — 5개 선결 조건 중 P0 3건(Azure PoC, SI R&R, 데모 환경)이 미해소. 기술 기반은 완성됐지만 고객사에 보여줄 수 있는 상태가 아님 |
| **Solution** | F162: 핵심 모듈의 Azure 환경 구동 검증으로 멀티 클라우드 배포 가능성 확인. F163: SI 파트너와 역할 분담 확정. F169: SR 자동 처리 엔드투엔드 데모 환경 구축 |
| **Function UX Effect** | 고객사 담당자가 웹 브라우저에서 직접 SR 제출 → AI 에이전트 자동 분류 → 워크플로우 실행 → 결과 대시보드 확인까지 체험 가능 |
| **Core Value** | PRD v8 Conditional → Ready 전환을 위한 선결 조건 3/5 해소. 6개월 내 1~2건 수주 목표의 실행 기반 확보 |

---

## 1. 목표 (Objectives)

### 1.1 Sprint 목표

Sprint 46은 **기존 Sprint와 성격이 다름** — 코드 구현보다 **기술 검증 + 비즈니스 준비 + 시나리오 패키징**이 핵심.

| 유형 | F# | 작업 | 완료 기준 |
|:----:|:--:|------|-----------|
| 기술 검증 | F162 | Azure 마이그레이션 PoC | 핵심 모듈 3개가 Azure 환경에서 동작 확인 |
| 비즈니스 | F163 | SI 파트너 R&R 확정 | 역할 분담 정의서 합의 완료 |
| 시나리오 | F169 | 고객 데모 환경 구축 | 외부 접근 가능한 데모 URL + 시나리오 스크립트 |

### 1.2 PRD v8 Conditional 조건 매핑

| PRD 조건 | 이번 Sprint | 비고 |
|----------|:-----------:|------|
| #1 SI 파트너 R&R 확정 | ✅ F163 | |
| #2 Azure 마이그레이션 PoC | ✅ F162 | |
| #3 고객 커스터마이징 범위 (F164) | ⏭️ Sprint 47 | F162/F163 결과에 의존 |
| #4 내부 Adoption 데이터 (F114) | 🔄 진행 중 | 4주 수집 병행 |
| #5 법적/윤리적 정책 (F165, F166) | ⏭️ Sprint 47 | |

---

## 2. 범위 (Scope)

### 2.1 In Scope

- [ ] **F162**: Azure Functions + Azure SQL 환경에 핵심 모듈 배포 테스트
  - [ ] Hono → Azure Functions 어댑터 적용 검증
  - [ ] D1(SQLite) → Azure SQL 마이그레이션 스크립트 작성
  - [ ] 에이전트 오케스트레이션 엔드투엔드 호출 테스트
  - [ ] Git 연동(GitHub API) Azure 환경 동작 확인
  - [ ] 웹 대시보드 Azure Static Web Apps 또는 별도 배포 테스트
- [ ] **F163**: SI 파트너 R&R 정의서 작성
  - [ ] 역할 분류: 개발 / 커스터마이징 / 운영 / 보안 / 교육
  - [ ] 각 역할의 담당(내부 vs 외부), 범위, 비용 추정
  - [ ] 합의 문서 초안 → 리뷰 → 확정
- [ ] **F169**: 데모 환경 구축
  - [ ] 데모 시나리오 정의: SR 제출 → 분류 → 에이전트 DAG 실행 → 결과 확인
  - [ ] 데모용 데이터 시딩 (SR 샘플, 프로젝트, 에이전트 설정)
  - [ ] 외부 접근 가능한 URL 배포 (Cloudflare 우선, Azure 옵션)
  - [ ] 데모 시나리오 스크립트 문서화

### 2.2 Out of Scope

- 프로덕션 수준의 Azure 전체 마이그레이션 (PoC 범위만)
- D1 전체 46테이블 마이그레이션 (핵심 테이블만)
- SI 파트너 계약 체결 (R&R 정의서까지만)
- 고객사별 커스터마이징 구현 (범위 정의는 Sprint 47)
- ML 모델 도입 (F167, Sprint 48+)

---

## 3. 요구사항 (Requirements)

### 3.1 기능 요구사항

| ID | 요구사항 | F# | 우선순위 | 상태 |
|----|---------|:--:|:--------:|:----:|
| FR-01 | Hono API가 Azure Functions 런타임에서 정상 응답 | F162 | P0 | Pending |
| FR-02 | D1 스키마의 핵심 테이블이 Azure SQL에서 동작 | F162 | P0 | Pending |
| FR-03 | AgentOrchestrator가 Azure 환경에서 에이전트 호출 성공 | F162 | P0 | Pending |
| FR-04 | 웹 대시보드가 Azure 호스팅에서 정상 렌더링 | F162 | P1 | Pending |
| FR-05 | SI 파트너 R&R 정의서 초안 완성 | F163 | P0 | Pending |
| FR-06 | 데모 시나리오 엔드투엔드 실행 성공 | F169 | P0 | Pending |
| FR-07 | 외부 네트워크에서 데모 URL 접근 가능 | F169 | P0 | Pending |
| FR-08 | 데모 시나리오 스크립트 문서 완성 | F169 | P1 | Pending |

### 3.2 비기능 요구사항

| 범주 | 기준 | 검증 방법 |
|------|------|-----------|
| 성능 | Azure Functions 응답 시간 < 3초 (cold start 포함) | HTTP 호출 측정 |
| 보안 | 데모 환경 인증 필수 (JWT) | 미인증 접근 차단 확인 |
| 가용성 | 데모 URL 24시간 접근 가능 | 외부 네트워크 테스트 |

---

## 4. 성공 기준 (Success Criteria)

### 4.1 Definition of Done

- [ ] F162: Azure Functions에서 최소 5개 API 엔드포인트 정상 응답 확인
- [ ] F162: Azure SQL에서 핵심 테이블 CRUD 동작 확인
- [ ] F162: 마이그레이션 가이드 문서 작성 (비용/시간/위험 포함)
- [ ] F163: SI R&R 정의서 초안 완성 + 내부 리뷰 완료
- [ ] F169: 데모 URL에서 SR 제출→분류→결과 확인 시나리오 성공
- [ ] F169: 데모 시나리오 스크립트 문서 완성

### 4.2 품질 기준

- [ ] 기존 테스트(953 API + 64 Web) 영향 없음 (Cloudflare 환경 유지)
- [ ] Azure PoC 코드는 별도 브랜치 또는 환경 설정으로 격리
- [ ] 데모 환경의 시드 데이터가 현실적 SR 시나리오 반영

---

## 5. 리스크 및 대응 (Risks and Mitigation)

| 리스크 | 영향 | 가능성 | 대응 |
|--------|:----:|:------:|------|
| Azure Functions에서 Hono 호환 불가 | 높음 | 중간 | `@hono/node-server` → Azure Functions adapter 대안, 또는 Express 래퍼 검토 |
| D1→Azure SQL 마이그레이션 시 SQLite 비호환 SQL | 높음 | 높음 | 핵심 5개 테이블만 우선 전환, SQLite→SQL Server 변환 스크립트 작성 |
| Azure 계정/구독 미확보 | 높음 | 낮음 | KT DS 내부 Azure 구독 확인, 없으면 무료 체험판 활용 |
| SI 파트너 협의 지연 | 중간 | 중간 | R&R 정의서 초안을 먼저 작성하고 리뷰 요청, 비동기 협의 |
| 데모 환경 외부 접근 차단 (방화벽) | 중간 | 낮음 | Cloudflare 우선 배포 (이미 외부 접근 가능), Azure는 후속 |

---

## 6. 아키텍처 고려사항

### 6.1 Azure PoC 아키텍처

```
현재 (Cloudflare)                    Azure PoC
┌───────────────────┐           ┌───────────────────┐
│ Workers (Hono)    │    →      │ Functions (Hono)  │
│ D1 (SQLite)       │    →      │ Azure SQL         │
│ Pages (Next.js)   │    →      │ Static Web Apps   │
│ KV (Cache)        │    →      │ Azure Cache       │
└───────────────────┘           └───────────────────┘
       │                                │
       └── GitHub API ──────────────────┘ (공통)
```

### 6.2 핵심 마이그레이션 포인트

| 컴포넌트 | Cloudflare | Azure | 위험도 |
|----------|-----------|-------|:------:|
| HTTP 런타임 | Workers (V8) | Functions (Node.js) | 낮음 (Hono 멀티 런타임) |
| DB | D1 (SQLite) | Azure SQL (T-SQL) | **높음** (SQL 문법 차이) |
| 정적 호스팅 | Pages | Static Web Apps | 낮음 |
| 캐시 | KV | Redis Cache | 중간 |
| Cron | Cron Triggers | Timer Trigger | 낮음 |

### 6.3 데모 환경 구조

```
데모 시나리오 흐름:
  1. 고객 담당자가 웹 대시보드 접속 (데모 계정)
  2. SR 제출: "API 응답시간 개선 요청" (텍스트 입력)
  3. SrClassifier가 자동 분류 → "Performance" 유형
  4. SrWorkflowMapper가 에이전트 DAG 생성
     → ArchitectAgent(분석) → TestAgent(벤치마크) → InfraAgent(최적화 제안)
  5. 대시보드에서 에이전트 진행 상태 실시간 확인
  6. 결과: 분석 보고서 + 최적화 제안 + 예상 효과
```

---

## 7. 구현 순서 (Implementation Order)

### Week 1: F169 (데모 환경) + F162 (Azure PoC 시작)

| # | 작업 | 예상 시간 | 의존성 |
|:-:|------|:--------:|:------:|
| 1 | 데모 시나리오 정의 + 데이터 시딩 SQL | 2h | — |
| 2 | 데모용 seed 스크립트 작성 (D1 local → remote) | 2h | 1 |
| 3 | 데모 전용 계정 + 프로젝트 생성 API 호출 | 1h | 2 |
| 4 | 데모 URL 배포 (Cloudflare 기존 환경 활용) | 1h | 3 |
| 5 | 데모 시나리오 스크립트 문서화 | 2h | 4 |
| 6 | Azure 구독 확인 + Functions 프로젝트 초기화 | 2h | — |
| 7 | Hono → Azure Functions 어댑터 설정 | 3h | 6 |

### Week 2: F162 (Azure PoC 완료) + F163 (SI R&R)

| # | 작업 | 예상 시간 | 의존성 |
|:-:|------|:--------:|:------:|
| 8 | D1 핵심 테이블 → Azure SQL 마이그레이션 스크립트 | 4h | 7 |
| 9 | Azure 환경 에이전트 오케스트레이션 E2E 테스트 | 3h | 8 |
| 10 | Azure 마이그레이션 가이드 문서 작성 | 2h | 9 |
| 11 | SI R&R 정의서 초안 작성 | 3h | — |
| 12 | R&R 내부 리뷰 + 수정 | 2h | 11 |

---

## 8. 다음 단계

1. [ ] Sprint 46 Design 문서 작성 (`sprint-46.design.md`)
2. [ ] F162/F163/F169 구현 + 검증
3. [ ] Sprint 47 계획: F164(커스터마이징 범위) + F165/F166(정책 수립)
4. [ ] 내부 온보딩 4주 데이터 수집 결과 정리

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-22 | 초안 작성 — PRD v8 Conditional 선결 조건 기반 | Sinclair Seo |
