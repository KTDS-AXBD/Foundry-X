---
code: FX-PLAN-S179
title: "Sprint 179 — M1: 분류 + 아키텍처 결정"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 179 Plan — M1: 분류 + 아키텍처 결정

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F392 (서비스 태깅 + D1 소유권 + FK 목록), F393 (증분 서비스 배정 + 설계서 v4) |
| **Phase** | Phase 20-A: 모듈화 (MSA 재조정) |
| **Sprint** | 179 |
| **PRD** | `docs/specs/ax-bd-msa/prd-final.md` |
| **기존 설계서** | `docs/specs/AX-BD-MSA-Restructuring-Plan.md` (v3, F1~F267) |
| **예상 산출물** | 서비스 매핑 문서 + ADR + 설계서 v4 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 118 routes / 252 services / 133 schemas / 50+ D1 테이블이 서비스 경계 없이 단일 모놀리스에 혼재 |
| **Solution** | 전체 코드/DB 자산을 7개 서비스(S0~S6)로 분류·태깅하고, 크로스 서비스 의존성을 식별 |
| **Function UX Effect** | Sprint 180~184 코드 모듈화의 기초 데이터 확보 — 정확한 분류 없이는 이동 불가 |
| **Core Value** | MSA 전환의 첫 단추: "어디에 뭐가 있는지" 완전 파악 |

---

## 1. 배경 및 목표

### 1.1 배경

Foundry-X는 F1~F391 (19개 Phase, 178 Sprint)를 거치며 BD 프로세스 전체를 담당하는 모놀리스로 성장했어요. Phase 20에서는 이를 BD 2~3단계(발굴+형상화) 전용으로 축소하기 위해, 먼저 **현황 파악과 분류**가 필요해요.

기존 MSA 설계서(v3)는 F1~F267까지만 커버하고, Sprint 99~178에서 추가된 F268~F391 (124건)은 미배정 상태예요.

### 1.2 목표

1. **F392**: 전체 118 routes, 252 services, 133 schemas를 7개 서비스로 태깅
2. **F392**: D1 50+ 테이블 소유권 태깅 + 크로스 서비스 FK 목록 작성
3. **F393**: F268~F391 증분 124건 서비스 배정 확정
4. **F393**: MSA 설계서를 v3 → v4로 갱신 (F1~F391 전체 커버)

---

## 2. F-item 상세

### F392: 서비스 태깅 + D1 소유권 + FK 목록

**SPEC 정의**: 전체 라우트/서비스/스키마 서비스별 태깅 + D1 테이블 소유권 태깅 + 크로스 서비스 FK 목록 (FX-REQ-384, P0)

**산출물**:
1. `docs/specs/ax-bd-msa/service-mapping.md` — 전체 routes/services/schemas 서비스 태깅 매핑
2. `docs/specs/ax-bd-msa/d1-ownership.md` — D1 테이블 소유권 + 크로스 서비스 FK 목록
3. `docs/specs/ax-bd-msa/adr-001-d1-shared-db.md` — D1 Shared DB 논리적 분리 ADR

**접근법**:
- 118 routes를 파일명과 import 패턴으로 분석하여 서비스 매핑
- 252 services의 DB 접근 패턴과 비즈니스 로직으로 서비스 분류
- 133 schemas를 연관 route/service 기반으로 분류
- D1 마이그레이션 123건에서 CREATE TABLE 추출 → 서비스 매핑
- FK REFERENCES 문 추출 → 크로스 서비스 의존성 그래프

### F393: 증분 서비스 배정 + 설계서 갱신

**SPEC 정의**: F268~F391 증분 124건 서비스 배정 확정 + MSA 설계서 v4 갱신 (FX-REQ-385, P0)

**산출물**:
1. `docs/specs/AX-BD-MSA-Restructuring-Plan.md` 갱신 → v4 (F1~F391 전체 커버)
2. PRD §7 배정표와 설계서 §5 배정표 정합성 확인

**접근법**:
- PRD §7에 이미 F268~F391 배정표가 존재 — 이를 검증하고 설계서 §5에 반영
- 각 F-item의 실제 구현 코드(routes/services)를 확인하여 배정 정확도 검증
- 설계서 v4에 현재 수치 반영 (118 routes, 252 services, 133 schemas, 123 migrations)

---

## 3. 작업 순서

| # | 작업 | 입력 | 출력 | 예상 |
|---|------|------|------|------|
| 1 | routes 118개 서비스 분류 | `packages/api/src/routes/*.ts` | service-mapping.md §1 | 분석 |
| 2 | services 252개 서비스 분류 | `packages/api/src/services/*.ts` | service-mapping.md §2 | 분석 |
| 3 | schemas 133개 서비스 분류 | `packages/api/src/schemas/*.ts` | service-mapping.md §3 | 분석 |
| 4 | D1 테이블 추출 + 소유권 태깅 | `packages/api/src/db/migrations/*.sql` | d1-ownership.md §1 | 분석 |
| 5 | 크로스 서비스 FK 그래프 | D1 테이블 + FK REFERENCES | d1-ownership.md §2 | 분석 |
| 6 | ADR-001 D1 Shared DB 결정 | PRD §7c + 분석 결과 | adr-001-d1-shared-db.md | 문서 |
| 7 | F268~F391 배정 검증 | PRD §7 + 실제 코드 | 검증 결과 | 분석 |
| 8 | MSA 설계서 v4 갱신 | v3 + 전체 분류 결과 | AX-BD-MSA-Restructuring-Plan.md v4 | 문서 |

---

## 4. 서비스 분류 기준

PRD 및 기존 설계서 기반 7개 서비스:

| 코드 | 서비스 | 잔류/이관 | 핵심 키워드 |
|------|--------|-----------|------------|
| S0 | AI Foundry (포털) | 이관 | auth, sso, org, dashboard, kpi, wiki, workspace, onboarding, feedback, notification, inbox |
| S1 | Discovery-X (수집) | 이관 | collection, ideas, insights, ir-proposals |
| S3 | Foundry-X (발굴+형상화) | **잔류** | discovery, biz-items, bmc, bdp, offering, shaping, prototype, persona, hitl, methodology, skill |
| S4 | Gate-X (검증) | 이관 | validation, decision, gate-package, team-review |
| S5 | Launch-X (제품화+GTM) | 이관 | pipeline, mvp, offering-pack, gtm, outreach, poc |
| S6 | Eval-X (평가) | 이관 | evaluation, roi-benchmark, user-evaluation |
| SX | Infra (공통) | 공유 | agent, orchestration, harness, guard-rail, governance, health, reconciliation |

---

## 5. 리스크

| # | 리스크 | 완화 |
|---|--------|------|
| 1 | 파일명만으로 서비스 분류가 모호한 경우 | import 체인 + DB 접근 패턴으로 보충 분류 |
| 2 | F268~F391 중 여러 서비스에 걸치는 기능 | primary 서비스 1개 + secondary 태깅 |
| 3 | 설계서 v4 갱신 시 기존 v3 내용과 충돌 | v3 구조 유지, §5 배정표만 확장 |

---

## 6. 완료 기준

- [ ] service-mapping.md 완성 (118 routes + 252 services + 133 schemas 전수 태깅)
- [ ] d1-ownership.md 완성 (전체 테이블 소유권 + FK 그래프)
- [ ] adr-001-d1-shared-db.md 작성
- [ ] F268~F391 배정 검증 완료
- [ ] MSA 설계서 v4 갱신 완료
- [ ] typecheck + test 통과 (문서 Sprint이므로 코드 변경 없음)
