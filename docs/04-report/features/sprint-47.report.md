---
code: FX-RPRT-047
title: "Sprint 47 완료 보고서 — 커스터마이징 범위 + 법적/윤리/거버넌스 정책 (F164+F165+F166)"
version: 1.0
status: Active
category: RPRT
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-47
sprint: 47
matchRate: 93
phase: "Phase 5"
references:
  - "[[FX-PLAN-047]]"
  - "[[FX-DSGN-047]]"
  - "[[FX-ANLS-047]]"
  - "[[FX-SPEC-001]]"
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F164: 커스터마이징 범위 + 플러그인 시스템 / F165: AI 코드 법적/윤리 정책 + 감사 로그 / F166: 데이터 거버넌스 + PII 마스킹 |
| Sprint | 47 |
| 기간 | 2026-03-22 (1 session) |
| Phase | Phase 5 — PRD v8 Conditional 선결 조건 #3, #5 해소 |

### 1.2 Results

| 항목 | 목표 | 실제 | 달성 |
|------|------|------|:----:|
| Match Rate | ≥ 90% | **93%** | ✅ |
| 정책 문서 | 3건 | **4건** (+ 보안 체크리스트) | ✅ |
| 플러그인 인터페이스 | 타입 정의 | **12 타입** (shared 패키지) | ✅ |
| 감사 로그 API | 2 endpoints | **3 endpoints** (+ stats) | ✅ |
| PII 마스킹 | 서비스 + 미들웨어 | 6종 패턴 + 4종 전략 | ✅ |
| 거버넌스 API | 2 endpoints | **2 endpoints** | ✅ |
| D1 마이그레이션 | 2건 | **2건** (0029, 0030) | ✅ |
| 테스트 | ~55 | **46** (+38 from baseline) | ⚠️ 84% |
| API 테스트 합계 | 961+ | **999** | ✅ |

### 1.3 Value Delivered

| 관점 | 설명 |
|------|------|
| **Problem** | PRD v8 Conditional 5개 중 #3(커스터마이징 범위 미정)과 #5(법적/윤리/거버넌스 정책 부재)가 미해소. 고객사 제안 시 "어디까지 커스터마이징 가능한가", "AI 코드 저작권은", "데이터가 외부로 나가는가"에 답할 수 없었음 |
| **Solution** | F164: 5-레이어 커스터마이징 범위 + 3-Tier 옵션 매트릭스 + 플러그인 시스템 아키텍처(12 타입). F165: AI 코드 가이드라인 + AuditLogService(3 API). F166: 데이터 거버넌스 정책 + PiiMaskerService(6종 패턴) + Hono 미들웨어 + 보안 체크리스트(SC-01~SC-32) |
| **Function UX Effect** | 고객사 담당자가 커스터마이징 Tier 매트릭스(Standard/Professional/Enterprise)로 옵션 선택 가능. 감사 로그로 AI 생성물 이력 추적. 기밀정보가 외부 AI API로 전송되기 전 6종 PII 자동 마스킹 (이메일, 전화, 주민번호, 사번, IP, 카드번호) |
| **Core Value** | PRD v8 Conditional **4/5 해소** (#4 Adoption 데이터만 수집 대기). 커스터마이징 가능 범위와 데이터 보안 보장을 고객 제안서에 정량적으로 포함 가능. 999 API 테스트 달성 (1000건 임박) |

---

## 2. PDCA Cycle Summary

| Phase | 산출물 | 상태 |
|-------|--------|:----:|
| Plan | `sprint-47.plan.md` (FX-PLAN-047) | ✅ |
| Design | `sprint-47.design.md` (FX-DSGN-047) | ✅ |
| Do | 코드 13개 파일 + 정책 문서 4건 + 플러그인 인터페이스 | ✅ |
| Check | `sprint-47.analysis.md` (FX-ANLS-047) — Match Rate 93% | ✅ |
| Report | 본 문서 (FX-RPRT-047) | ✅ |

### 2.1 구현 Phase 구조

```
Phase A: 정책 문서 (Leader 단독)
├─ docs/policy/customization-scope.md    — F164 커스터마이징 범위 + Tier 매트릭스
├─ docs/policy/ai-code-guidelines.md     — F165 AI 코드 가이드라인
├─ docs/policy/data-governance.md        — F166 데이터 거버넌스 정책
├─ docs/policy/security-checklist.md     — F166 KT DS 보안 체크리스트 (SC-01~SC-32)
└─ packages/shared/src/plugin.ts         — F164 플러그인 인터페이스 (12 타입)

Phase B: 코드 구현 (2-Worker 병렬)
├─ Worker 1 (F165 감사 로그): 6파일, 19 tests
│   ├─ audit-logger.ts (AuditLogService: logEvent/getEvents/getStats)
│   ├─ audit.ts (route: 3 endpoints — POST log, GET logs, GET stats)
│   ├─ audit.ts (schema: 6 Zod schemas)
│   └─ 0029_audit_logs.sql (D1 migration)
└─ Worker 2 (F166 PII 마스킹): 7파일, 27 tests
    ├─ pii-masker.ts (PiiMaskerService: 6종 패턴, 4종 전략)
    ├─ pii-masker.middleware.ts (Hono middleware)
    ├─ governance.ts (route: 2 endpoints — GET rules, PUT rules/:id)
    ├─ governance.ts (schema: 7 Zod schemas)
    └─ 0030_data_classification.sql (D1 migration)

Phase C: 통합 (Leader)
├─ app.ts — 라우트 등록 (audit, governance) + PII 미들웨어 (3경로)
└─ prompt-gateway.ts — AuditLogger 연동 (마스킹 시 감사 로그 자동 기록)
```

---

## 3. 수치 변화

| 항목 | Sprint 46 | Sprint 47 | 변화 |
|------|:---------:|:---------:|:----:|
| API 테스트 | 961 | **999** | +38 |
| API 엔드포인트 | 163 | **168** | +5 |
| API 서비스 | 76 | **78** | +2 |
| D1 마이그레이션 | 0028 | **0030** | +2 |
| D1 테이블 | 47 | **49** | +2 |
| 정책 문서 | 0 | **4** | +4 |
| shared 타입 | (기존) | **+12** | +12 |
| Typecheck 에러 | 0 | **0** | - |

---

## 4. PRD v8 Conditional 조건 현황

| # | 조건 | 상태 | 해소 Sprint |
|:-:|------|:----:|:-----------:|
| 1 | SI 파트너 R&R 확정 | ✅ | Sprint 46 (F163) |
| 2 | Azure 마이그레이션 PoC | ✅ | Sprint 46 (F162) |
| 3 | 고객 커스터마이징 범위 | ✅ | **Sprint 47 (F164)** |
| 4 | 내부 Adoption 데이터 | 🔄 | 4주 수집 중 (~2주 경과) |
| 5 | 법적/윤리적 정책 | ✅ | **Sprint 47 (F165+F166)** |

→ **5개 중 4개 해소 완료**. #4만 데이터 수집 기간 대기.

---

## 5. PRD 오픈이슈 해소

| 이슈 | 내용 | 해소 |
|------|------|:----:|
| Q12 | 고객사별 커스터마이징 범위 정의 | ✅ F164 (5-레이어 + 3-Tier) |
| Q13 | AI 생성 코드 법적/윤리적 정책 수립 | ✅ F165 (가이드라인 + 감사 로그) |
| Q14 | 외부 AI API 데이터 거버넌스 정책 | ✅ F166 (4단계 분류 + PII 마스킹) |

---

## 6. Gap 분석 결과 + 수정 사항

### 6.1 Critical Fix (수정 완료)

| # | Issue | Fix |
|---|-------|-----|
| 1 | PII 미들웨어 경로 `/api/agent/` → `/api/agents/` | `pii-masker.middleware.ts:10` 수정 |
| 2 | InputClassification `restricted` 누락 | `schemas/audit.ts` enum 수정 |

### 6.2 Accepted Differences

구현이 Design보다 확장된 부분 (모두 합리적 변경으로 수용):
- AuditEventType: 5종 → 8종 (더 세분화)
- getEvents 응답키: `events` → `logs`
- getStats period: string enum → number (더 유연)
- mask/maskAbove: 동기 → 비동기 (DB 패턴 로드 필요)
- 미들웨어 감사 로그: 직접 호출 → context 저장 (Phase C 패턴)

---

## 7. Agent Team 실행 요약

| Worker | 담당 | 소요 시간 | 파일 | 테스트 |
|--------|------|:---------:|:----:|:------:|
| Worker 1 | F165 감사 로그 | ~2m 45s | 6 | 19/19 ✅ |
| Worker 2 | F166 PII 마스킹 | ~4m 35s | 7 | 27/27 ✅ |
| Leader | 정책 문서 + 통합 | - | 8 | - |

총 신규 파일: **21개** (코드 13 + 정책 4 + 플러그인 1 + PDCA 문서 3)

---

## 8. Lessons Learned

### 8.1 Design-Implementation 경로 불일치
- PII 미들웨어에서 `/api/agent/` vs `/api/agents/` 버그 — Design이 실제 라우트 경로를 잘못 참조
- **교훈**: Design 작성 시 기존 라우트 경로를 `app.ts`에서 직접 확인해야 함

### 8.2 정책 문서 Sprint의 특수성
- 코드 구현보다 정책 문서가 더 큰 비중을 차지하는 Sprint
- 정책 → 코드 순서(Phase A → B)가 컴플라이언스 기능의 표준 패턴
- Design에서 "정책이 코드의 요구사항"이라는 관계를 명시한 것이 효과적

### 8.3 Worker 범위 이탈 방지
- Positive File Constraint로 Worker 범위 이탈 0건 달성
- 기존 Sprint 46의 12건 수동 revert에서 크게 개선
