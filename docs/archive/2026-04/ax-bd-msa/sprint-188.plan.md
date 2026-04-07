---
code: FX-PLAN-S188
title: Sprint 188 Plan — F401 Production 배포 + harness-kit 문서화 + 개발자 가이드
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude Autopilot
sprint: 188
f_items: [F401]
req_ids: [FX-REQ-393]
phase: 20
---

# Sprint 188 Plan — F401

> **Phase 20 M4 마지막 Sprint**: Production 배포 검증 + harness-kit 문서 완성

---

## 1. 목표

| 항목 | 내용 |
|------|------|
| **Feature** | F401: Production 배포 + smoke test + harness-kit 문서화 + 개발자 가이드 |
| **Phase** | Phase 20 — AX BD MSA 재조정 |
| **Milestone** | M4: 통합 검증 + Production 배포 + 문서화 |
| **Sprint** | 188 |
| **REQ** | FX-REQ-393 (P1) |

---

## 2. 배경

Sprint 179~187 (10 Sprint, F392~F400)을 통해 Phase 20의 핵심 구현이 완료됐어요:
- **F392~F395 (M1)**: 모듈 경계 정의 + D1 테이블 ownership 태깅 + ESLint 크로스 서비스 import 룰 + harness-kit scaffold
- **F396~F398 (M2)**: Strangler Fig 프록시 + D1EventBus + EventBus 전환
- **F399 (M3)**: API/Web/CLI 통합 + RBAC 검증
- **F400 (M3-M4 연결)**: E2E 서비스별 태깅 + 전체 회귀 테스트(264 pass, 0 fail) + Gate-X PoC

Sprint 188은 Phase 20의 마지막 스프린트로, **Production이 정상 동작하는지 검증**하고 **harness-kit 기반으로 새 서비스를 만드는 방법을 문서화**하는 것이 목적이에요.

---

## 3. 성공 기준

| 기준 | 목표 |
|------|------|
| Smoke test 통과 | scripts/smoke-test.sh — 0 FAIL |
| harness-kit README | packages/harness-kit/README.md 생성 (API 레퍼런스 포함) |
| 개발자 가이드 | docs/specs/ax-bd-msa/developer-guide.md 생성 |
| 마이그레이션 가이드 | docs/specs/ax-bd-msa/migration-guide.md 생성 |
| Phase 20 완결 | SPEC.md F401 → ✅, Phase 20 → ✅ 완료 |

---

## 4. 작업 분해 (WBS)

| Task | 내용 | 예상 복잡도 |
|------|------|-----------|
| T1 | Production smoke test 실행 + 결과 문서화 | Low |
| T2 | harness-kit README.md 작성 (퀵스타트 + API 레퍼런스) | Medium |
| T3 | 개발자 가이드 작성 (새 서비스 생성 워크플로우) | Medium |
| T4 | 마이그레이션 가이드 작성 (모놀리스 → MSA 전환 절차) | Medium |
| T5 | SPEC.md + MEMORY.md Phase 20 완결 처리 | Low |

---

## 5. 범위

### In-scope
- `packages/harness-kit/README.md` — 새로 생성
- `docs/specs/ax-bd-msa/developer-guide.md` — 새로 생성
- `docs/specs/ax-bd-msa/migration-guide.md` — 새로 생성
- `SPEC.md` — F401 ✅ + Phase 20 ✅ 갱신
- `MEMORY.md` — Phase 20 완결 반영

### Out-of-scope
- 신규 코드 구현 (harness-kit 코드는 Sprint 183에서 완료)
- Gate-X 실제 이관 (Phase 21 범위)
- harness-kit npm 배포 (별도 F-item 필요)

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| Smoke test FAIL | CI/CD 자동 배포(master push → deploy.yml) 재실행 |
| Production D1 마이그레이션 미적용 | `scripts/d1-migrate-remote.sh` 긴급 실행 |

---

## 7. 완료 조건

- [ ] T1: smoke-test.sh 0 FAIL (Production 정상)
- [ ] T2: harness-kit README.md 존재
- [ ] T3: developer-guide.md 존재
- [ ] T4: migration-guide.md 존재
- [ ] T5: SPEC.md F401 ✅ + Phase 20 ✅
