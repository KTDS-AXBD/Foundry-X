---
code: FX-PLAN-BDV1
title: "FX-BD-V1 — BD 파이프라인 End-to-End 통합 계획"
version: 1.0
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# FX-BD-V1: AX BD 사업개발 파이프라인 End-to-End 통합 Planning Document

> **Summary**: AX BD팀 6명이 수집→발굴→형상화→검증/공유→제품화까지 끊김 없이 업무를 수행할 수 있도록 Foundry-X의 파이프라인 갭 9개를 보강한다.
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
| **Problem** | 6단계 BD 파이프라인이 각 단계 별로 단절되어 있어, 산출물 공유·게이트 문서·Offering Pack 등 실무 워크플로가 불가능한 상태 |
| **Solution** | 파이프라인 통합 대시보드 + 산출물 공유/알림 + BDP 편집 + ORB/PRB 게이트 자동화 + Offering Pack 번들링을 기존 API/Web에 확장 구현 |
| **Function/UX Effect** | 아이템 등록→의사결정→게이트 통과→Offering Pack까지 한 대시보드에서 추적 가능, 단계 전환 시 자동 알림 |
| **Core Value** | 내부 온보딩(F114) 연계로 팀원 6명이 실제 BD 업무를 Foundry-X 위에서 수행 — 파이프라인 완주율 30%+ 달성 |

---

## 1. Overview

### 1.1 Purpose

Foundry-X의 기존 AX BD 기능(BMC, PRD, Prototype, Six Hats, Discovery 등 ~75 endpoints)을 **end-to-end 파이프라인으로 연결**하여, 사업 아이템이 수집부터 Offering Pack 생성까지 하나의 플랫폼에서 추적·공유·의사결정 가능한 환경을 구축한다.

### 1.2 Background

- AX BD 프로세스 v0.9 다이어그램 × 코드베이스 갭 분석 결과, 10개 미구현/보강 항목 식별
- 인터뷰(FX-BD-V1) → PRD v1~v3 → 3 AI 검토(3라운드) + Six Hats 20턴 토론 → final 확정
- 핵심 병목: 단계 간 단절 — 각 기능은 있으나 연결 워크플로 부재

### 1.3 Related Documents

- PRD: `docs/specs/fx-bd-v1/prd-final.md` (착수 준비 완료)
- 인터뷰: `docs/specs/fx-bd-v1/interview-log.md`
- 프로세스 다이어그램: AX-Discovery-Process v0.9
- 기존 SPEC: `SPEC.md` §5 F-items

---

## 2. Scope

### 2.1 In Scope

- [ ] **F232**: 파이프라인 통합 대시보드 — 칸반/파이프라인 뷰, 아이템별 단계·진행률·다음 액션
- [ ] **F233**: 산출물 공유 시스템 — 공유 링크 생성 + 알림/리뷰 요청 + 통합 뷰
- [ ] **F234**: BDP 편집/버전관리 — 사업계획서 마크다운 에디터 + 버전 히스토리 + 최종본
- [ ] **F235**: ORB/PRB 게이트 준비 — 게이트 문서 패키지 자동 구성 + 다운로드
- [ ] **F236**: Offering Pack 생성 — 영업/제안용 번들 (사업제안서+데모+기술검증+가격)
- [ ] **F237**: 사업제안서 자동 생성 — 사업계획서에서 요약본 자동 추출
- [ ] **F238**: MVP 추적 + 자동화 — 상태 추적 + PoC 배포/테스트 파이프라인
- [ ] **F239**: 단계별 의사결정 워크플로 — Go/Hold/Drop 버튼 + 승인/이력/알림
- [ ] **F240**: IR Bottom-up 채널 — 사내 현장 제안 전용 등록 폼

### 2.2 Out of Scope

- CRB/ERB 게이트 (다른 팀 영역)
- GTM 별도 모듈 (Offering Pack으로 대체)
- 외부 고객 포털
- 사내 시스템 API 직접 연동 (ORB/PRB는 문서 생성까지만)
- 실시간 문서 협업 (Google Docs 수준)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status | Sprint |
|----|-------------|----------|--------|--------|
| FR-01 | 파이프라인 대시보드: 칸반 뷰 + 파이프라인 뷰 전환, 아이템 카드 클릭 시 상세 | P0 | Pending | 79 |
| FR-02 | 산출물 공유: 인증 기반 공유 링크 생성, 만료 설정, 리뷰 요청 알림 | P0 | Pending | 79 |
| FR-03 | 알림 시스템: 단계 전환/리뷰 요청/의사결정 시 인앱 + 이메일 알림 | P0 | Pending | 79 |
| FR-04 | BDP 에디터: 마크다운 편집 + 버전 히스토리 + diff 뷰 + 최종본 잠금 | P0 | Pending | 80 |
| FR-05 | 사업제안서: BDP에서 요약본 자동 생성 (LLM 활용) | P1 | Pending | 80 |
| FR-06 | ORB/PRB 게이트: 산출물 자동 수집 → 패키지 구성 → PDF/ZIP 다운로드 | P0 | Pending | 80 |
| FR-07 | Offering Pack: 사업제안서 + 데모 링크 + 기술검증 + 가격 번들 생성 | P0 | Pending | 81 |
| FR-08 | Go/Hold/Drop 워크플로: 팀장 승인 버튼 + 코멘트 + 이력 + 자동 단계 전환 | P0 | Pending | 79 |
| FR-09 | MVP 추적: 상태(In Dev/Testing/Released) + PoC 배포 자동화 | P1 | Pending | 81 |
| FR-10 | IR Bottom-up: 사내 제안 등록 폼 + biz-item 자동 변환 | P2 | Pending | 81 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 대시보드 로딩 < 2초 (50 아이템 기준) | Lighthouse, 실측 |
| Security | 공유 링크 JWT 인증 필수, RBAC 역할별 접근 제어 | 수동 검증 + E2E |
| Data Protection | 사업 아이템 데이터 외부 유출 금지, 공유 링크 만료 설정 | 보안 리뷰 |
| Availability | Workers 99.9% SLA (Cloudflare 제공) | 모니터링 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-10 전체 구현 완료
- [ ] API 테스트 커버리지 90%+ (신규 endpoints)
- [ ] E2E 테스트: 파이프라인 대시보드 + 공유 + 게이트 문서 크리티컬 패스
- [ ] 내부 온보딩(F114) 6명 전원 UAT 완료
- [ ] D1 마이그레이션 remote 적용 완료

### 4.2 Quality Criteria

- [ ] typecheck 0 error
- [ ] lint 0 error
- [ ] API 전체 테스트 pass
- [ ] E2E 크리티컬 패스 pass

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| ORB/PRB 게이트 문서 양식 미확정 | High | High | 팀장에게 기존 양식 확인 요청, 없으면 표준 양식 자체 정의 |
| Offering Pack 가격 정보 형식 미정의 | Medium | High | 초기 버전은 자유 텍스트, 이후 구조화 |
| 1인 개발 + AI 리소스 한계 | High | Medium | P0 먼저 구현, Sprint 단위 점진 배포, 필요 시 P1/P2 후순위 |
| 팀원 사용 저항 | Medium | Medium | 온보딩 교육 + 실제 업무 시나리오로 가치 체감 |
| D1 성능 한계 (대량 산출물) | Low | Low | 현재 6명 사용 규모에서는 문제 없음, 향후 KV/R2 분리 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | Web apps with backend | ☑ |
| **Enterprise** | Strict layer separation, DI, microservices | High-traffic systems | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Framework | Next.js 14 (기존) | Next.js 14 | 기존 웹 대시보드 확장 |
| API | Hono (기존) | Hono | 기존 API 서버 확장 |
| DB | Cloudflare D1 (기존) | D1 | 기존 스키마 확장 (0063~) |
| 알림 | 인앱 SSE (기존) + 이메일 | SSE + Mailgun/Resend | SSE는 기존 구현, 이메일은 신규 |
| 에디터 | Monaco / Milkdown / react-md-editor | react-md-editor | 경량, 마크다운 특화, 빠른 통합 |
| 문서 번들링 | jsPDF + JSZip | JSZip (ZIP 기본) | 브라우저 사이드 패키징, PDF는 추후 |

### 6.3 신규 D1 마이그레이션 (예상)

```
0063_pipeline_stages.sql       — 아이템별 단계 추적 (stage enum + timestamps)
0064_share_links.sql           — 공유 링크 (token, expires_at, access_level)
0065_notifications.sql         — 인앱 알림 (type, recipient, read_at)
0066_bdp_versions.sql          — 사업계획서 버전 (content, version_num, is_final)
0067_gate_packages.sql         — ORB/PRB 게이트 패키지 (items, status, download_url)
0068_offering_packs.sql        — Offering Pack (bundle_items, price_info, status)
0069_decisions.sql             — Go/Hold/Drop 의사결정 이력 (decision, comment, decided_by)
0070_mvp_tracking.sql          — MVP 상태 추적 (status, deployed_at, test_result)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config, 3 custom rules)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Vitest test framework
- [x] Zod schema validation on all API inputs

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **알림 이벤트 타입** | SSE 3종 기존 | 단계전환/리뷰요청/의사결정 이벤트 추가 | High |
| **공유 링크 토큰 형식** | 없음 | JWT 기반 공유 토큰 + 만료 정책 | High |
| **게이트 문서 양식** | 없음 | ORB/PRB 패키지 구성 표준 정의 | High |
| **Offering Pack 스키마** | 없음 | 번들 구성 항목 + 가격 정보 형식 | Medium |

---

## 8. Sprint 분할 계획

### Sprint 79 (F232+F233+F239) — 파이프라인 + 공유 + 의사결정 [P0 Core]

| F# | 제목 | 우선순위 | 예상 규모 |
|----|------|----------|----------|
| F232 | 파이프라인 통합 대시보드 | P0 | API 5 ep + Web 1 page + D1 1 |
| F233 | 산출물 공유 시스템 | P0 | API 6 ep + Web 컴포넌트 + D1 2 |
| F239 | 단계별 의사결정 워크플로 | P0 | API 4 ep + Web 컴포넌트 + D1 1 |

### Sprint 80 (F234+F235+F237) — BDP + 게이트 [P0 문서]

| F# | 제목 | 우선순위 | 예상 규모 |
|----|------|----------|----------|
| F234 | BDP 편집/버전관리 | P0 | API 5 ep + Web 에디터 + D1 1 |
| F235 | ORB/PRB 게이트 준비 | P0 | API 4 ep + Web 패키지 UI + D1 1 |
| F237 | 사업제안서 자동 생성 | P1 | API 2 ep (LLM) |

### Sprint 81 (F236+F238+F240) — Offering Pack + MVP + IR [P0+P1+P2]

| F# | 제목 | 우선순위 | 예상 규모 |
|----|------|----------|----------|
| F236 | Offering Pack 생성 | P0 | API 4 ep + Web 번들 UI + D1 1 |
| F238 | MVP 추적 + 자동화 | P1 | API 4 ep + Web 상태 UI + D1 1 |
| F240 | IR Bottom-up 채널 | P2 | API 2 ep + Web 폼 |

---

## 9. Next Steps

1. [ ] SPEC.md에 F232~F240 등록 + Sprint 79~81 배정
2. [ ] `/pdca design FX-BD-V1`로 Design 문서 작성
3. [ ] ORB/PRB 게이트 문서 양식 확인 (팀장)
4. [ ] Offering Pack 가격 정보 형식 정의 (팀)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-30 | 인터뷰 기반 초안 (PRD final 참조) | Sinclair Seo |
