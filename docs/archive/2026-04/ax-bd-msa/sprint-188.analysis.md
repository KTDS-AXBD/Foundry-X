---
code: FX-ANLS-S188
title: Sprint 188 Gap Analysis — F401 Production 배포 + harness-kit 문서화 + 개발자 가이드
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude (gap-detector)
sprint: 188
f_items: [F401]
req_ids: [FX-REQ-393]
phase: 20
match_rate: 100
---

# Sprint 188 Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
> **Match Rate**: **100%** (5/5 PASS)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Architecture Compliance | N/A | — |
| Convention Compliance | N/A | — |
| **Overall** | **100%** | **PASS** |

> Architecture/Convention은 코드 변경이 없는 문서화 Sprint이므로 해당 없음.

---

## 2. Gap Analysis (Design §3 성공 기준)

| # | 기준 | 결과 | Status |
|---|------|------|:------:|
| 1 | smoke-test.sh 0 FAIL | 7 passed, 0 failed | PASS |
| 2 | harness-kit README 존재 | `packages/harness-kit/README.md` (생성 완료, ~298줄) | PASS |
| 3 | 개발자 가이드 존재 | `docs/specs/ax-bd-msa/developer-guide.md` (생성 완료, ~355줄) | PASS |
| 4 | 마이그레이션 가이드 존재 | `docs/specs/ax-bd-msa/migration-guide.md` (생성 완료, ~292줄) | PASS |
| 5 | SPEC.md F401 ✅ | F401 ✅ + Phase 20 ✅ 갱신 완료 | PASS |

---

## 3. 산출물 상세 대조

### 3.1 harness-kit README.md vs Design §2.1

| Design 명세 | 구현 | 일치 |
|------------|------|:----:|
| Quick Start 3단계 | ✅ (서비스 생성, app.ts 통합, 실행) | O |
| createAuthMiddleware API | ✅ (JWT payload 타입 포함) | O |
| createCorsMiddleware API | ✅ | O |
| rbac(minRole) API | ✅ (역할 레벨 설명) | O |
| errorHandler() API | ✅ (HarnessError 예시) | O |
| createStranglerMiddleware API | ✅ (local/proxy 모드 예시) | O |
| D1 유틸리티 API | ✅ (getDb/runQuery/runExec) | O |
| D1EventBus / NoopEventBus API | ✅ (발행/구독/폴링, D1 마이그레이션 SQL) | O |
| ESLint plugin API | ✅ (no-cross-service-import) | O |
| CLI: harness create | ✅ (옵션 4종, 생성 파일 목록) | O |
| ServiceId 목록 | ✅ (6종 테이블) | O |

### 3.2 개발자 가이드 vs Design §2.2

| Design 명세 | 구현 | 일치 |
|------------|------|:----:|
| §1 새 서비스 생성 | ✅ (harness create + wrangler.toml + Secrets) | O |
| §2 harness-kit 통합 | ✅ (미들웨어 스택 + JWT 공유) | O |
| §3 서비스 간 통신 | ✅ (REST + D1EventBus) | O |
| §4 로컬 개발 | ✅ (wrangler dev + D1 로컬 + 테스트) | O |
| §5 배포 | ✅ (CI/CD yaml + 수동 + smoke test) | O |

### 3.3 마이그레이션 가이드 vs Design §2.3

| Design 명세 | 구현 | 일치 |
|------------|------|:----:|
| §1 Strangler Fig 패턴 개요 | ✅ (ASCII 다이어그램, Phase 1/2) | O |
| §2 모듈 분리 체크리스트 | ✅ (E2E 태그 + D1 ownership + ESLint + 테스트) | O |
| §3 단계별 이관 절차 | ✅ (Phase A~F, Design 4단계→6단계 세분화) | O+ |
| §4 실전 예시 (Gate-X PoC) | ✅ (Sprint 187 결과 기반) | O |
| §5 트러블슈팅 | ✅ (FK + JWT + CORS + 무한루프 Q&A) | O+ |

### 3.4 Smoke Test

| Design 명세 | 구현 | 비고 |
|------------|------|------|
| 기대 6 passed, 0 failed | 7 passed, 0 failed | 테스트 1건 추가 (양성) |

---

## 4. Differences Found

### 4.1 Missing (Design O → Implementation X)
없음.

### 4.2 Added (Design X → Implementation O)

| 항목 | 위치 | 설명 |
|------|------|------|
| ESLint 설정 가이드 | developer-guide.md §6 | 서비스 경계 보호 실습 예시 |
| 디렉토리 규칙 | developer-guide.md §7 | 패키지 구조 가이드 |
| 이관 우선순위 테이블 | migration-guide.md §2 | P1~P4 서비스별 우선순위 |
| 이관 완료 체크리스트 | migration-guide.md §7 | 8항목 체크리스트 |

모두 양성(개선) 방향이에요.

---

## 5. Phase 20 종합

Sprint 188 (F401)은 **Phase 20 AX BD MSA 재조정의 마지막 Sprint**예요.

| 지표 | 결과 |
|------|------|
| Phase 20 전체 F-items | 10/10 ✅ (F392~F401) |
| Sprint 범위 | Sprint 179~188 |
| 전체 Match Rate | 100% |
| 핵심 산출물 | harness-kit 문서 3종 + Production smoke test 7/7 PASS |

---

## Related Documents

- Plan: [[FX-PLAN-S188]] (`docs/01-plan/features/sprint-188.plan.md`)
- Design: [[FX-DSGN-S188]] (`docs/02-design/features/sprint-188.design.md`)
- SPEC: F401 ✅ (FX-REQ-393)
