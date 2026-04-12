---
code: FX-PLAN-080
title: "Sprint 80 — BDP 편집/버전관리 + ORB/PRB 게이트 + 사업제안서 자동 생성"
version: 1.0
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Sprint 80: BDP 편집/버전관리 + ORB/PRB 게이트 + 사업제안서 자동 생성

> **Summary**: 사업계획서(BDP) 마크다운 에디터 + 버전 관리, ORB/PRB 게이트 문서 자동 패키징, BDP→사업제안서 LLM 요약 생성
>
> **Project**: Foundry-X
> **Version**: api 0.1.0 / web 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 사업계획서(BDP) 편집/버전관리가 없어 초안 생성 후 수정 불가. ORB/PRB 게이트 문서를 수동으로 수집/패키징. |
| **Solution** | BDP 마크다운 에디터 + 버전 히스토리 + diff, 게이트 문서 자동 수집→ZIP 다운로드, BDP→사업제안서 LLM 추출 |
| **Function/UX Effect** | BDP 편집→저장→최종본 잠금→diff 확인 + 게이트 패키지 원클릭 생성 + 사업제안서 자동 요약 |
| **Core Value** | 문서 작성/검토 시간 단축으로 BD 파이프라인 4단계(검증/공유) 진입 장벽 제거 |

---

## 1. Overview

### 1.1 Purpose

Sprint 79에서 구축한 파이프라인 인프라(대시보드, 공유, 의사결정) 위에 **문서 편집/관리 계층**을 추가한다:
- F234: BDP 마크다운 편집 + 버전 히스토리 + diff + 최종본 잠금
- F235: ORB/PRB 게이트 산출물 자동 수집 → 패키지 구성 → ZIP 다운로드
- F237: BDP에서 게이트 제출용 사업제안서 요약본 LLM 자동 생성

### 1.2 Dependencies

- Sprint 79 (F232+F233+F239) 완료: pipeline_stages, share_links, notifications, decisions 테이블
- 기존 서비스: biz-item-service, business-plan-generator, pipeline-service, notification-service
- D1 0066~0069 마이그레이션 적용 완료

---

## 2. Scope

### 2.1 In Scope (F234+F235+F237)

| F# | 기능 | 우선순위 | 예상 규모 |
|----|------|----------|----------|
| F234 | BDP 편집/버전관리 — 마크다운 에디터 + 버전 히스토리 + diff + 최종본 잠금 | P0 | API 5ep + D1 1 |
| F235 | ORB/PRB 게이트 준비 — 산출물 자동 수집 → 패키지 구성 → ZIP 다운로드 | P0 | API 4ep + D1 1 |
| F237 | 사업제안서 자동 생성 — BDP에서 요약본 LLM 추출 | P1 | API 1ep |

### 2.2 Out of Scope

- Web UI 컴포넌트 (BdpEditor, GatePackageView) — 별도 Sprint 또는 후속
- Offering Pack (F236, Sprint 81)
- MVP 추적 (F238, Sprint 81)
- IR Bottom-up (F240, Sprint 81)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | F# | Priority |
|----|-------------|-----|----------|
| FR-01 | BDP 최신 버전 조회 (마크다운 콘텐츠 + 메타데이터) | F234 | P0 |
| FR-02 | BDP 버전 히스토리 목록 조회 | F234 | P0 |
| FR-03 | BDP 새 버전 저장 (마크다운 콘텐츠, 자동 version_num 증가) | F234 | P0 |
| FR-04 | BDP 최종본 잠금 (is_final=1, 이후 새 버전 생성 차단) | F234 | P0 |
| FR-05 | BDP 두 버전 간 diff 조회 | F234 | P0 |
| FR-06 | 게이트 패키지 자동 구성 (BMC+PRD+BDP+평가결과 수집) | F235 | P0 |
| FR-07 | 게이트 패키지 내용 조회 | F235 | P0 |
| FR-08 | 게이트 패키지 ZIP 다운로드 | F235 | P0 |
| FR-09 | 게이트 패키지 상태 변경 (draft→ready→submitted) | F235 | P0 |
| FR-10 | BDP→사업제안서 요약본 LLM 생성 | F237 | P1 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | BDP 조회 < 500ms, 게이트 패키지 구성 < 3s |
| Security | tenant 미들웨어 인증, 최종본 잠금은 admin만 |
| Test Coverage | 신규 endpoints 90%+ |

---

## 4. Architecture

### 4.1 D1 Migrations

- `0070_bdp_versions.sql` — BDP 버전 테이블
- `0071_gate_packages.sql` — 게이트 패키지 테이블

### 4.2 New Files

```
packages/api/src/
  schemas/
    bdp.schema.ts           # BDP Zod schemas
    gate-package.schema.ts  # Gate Package Zod schemas
  services/
    bdp-service.ts          # BDP CRUD + version + diff
    gate-package-service.ts # 산출물 수집 + 패키지 구성
    proposal-generator.ts   # LLM 사업제안서 생성
  routes/
    bdp.ts                  # 5+1 endpoints
    gate-package.ts         # 4 endpoints
  __tests__/
    bdp.test.ts             # BDP service + route tests
    gate-package.test.ts    # Gate package tests
```

### 4.3 Implementation Order

1. D1 마이그레이션 (0070, 0071)
2. Zod 스키마 (bdp.schema.ts, gate-package.schema.ts)
3. 서비스 (bdp-service, gate-package-service, proposal-generator)
4. 라우트 (bdp.ts, gate-package.ts)
5. 테스트 (~50 tests)
6. index.ts 라우트 등록

---

## 5. Success Criteria

- [ ] API 10 endpoints 구현 완료
- [ ] D1 마이그레이션 0070~0071 적용
- [ ] typecheck 0 error
- [ ] lint 0 error
- [ ] 테스트 50+ pass

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | 초안 — FX-BD-V1 Plan/Design 기반 | Sinclair Seo |
