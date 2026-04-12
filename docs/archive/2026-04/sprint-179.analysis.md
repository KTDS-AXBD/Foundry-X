---
code: FX-ANLS-S179
title: "Sprint 179 Gap Analysis — M1: 분류 + 아키텍처 결정"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
---

# Sprint 179 Gap Analysis

## Executive Summary

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** (10/10 PASS) |
| **F-items** | F392, F393 |
| **산출물** | 4건 (service-mapping + d1-ownership + ADR-001 + 설계서 v4) |
| **코드 변경** | 0건 (문서 Sprint) |
| **테스트** | typecheck PASS (코드 변경 없음) |

---

## 체크리스트

| # | Design 완료 기준 | 상태 | 검증 |
|---|-----------------|------|------|
| 1 | service-mapping.md에 118 routes 전수 태깅 | ✅ PASS | 118건 확인 |
| 2 | service-mapping.md에 252 services 전수 태깅 | ✅ PASS | 252건 확인 |
| 3 | service-mapping.md에 133 schemas 전수 태깅 | ✅ PASS | 133건 확인 |
| 4 | d1-ownership.md에 전체 테이블 소유권 기록 | ✅ PASS | 186행 (174 테이블 + 소계) |
| 5 | d1-ownership.md에 크로스 서비스 FK 목록 | ✅ PASS | 30개 FK 대상, 핫스팟 분석 포함 |
| 6 | adr-001 Shared DB 결정 문서화 | ✅ PASS | ADR 형식 완성, Accepted |
| 7 | F268~F391 배정 검증 완료 | ✅ PASS | 설계�� v4 §5.1b에 반영 |
| 8 | 설계서 v4 수치 정확 | ✅ PASS | 118/252/133/174 실측값 일치 |
| 9 | typecheck 통과 | ✅ PASS | `turbo typecheck` 6/6 success |
| 10 | 코드 변경 없음 확인 | ✅ PASS | packages/ 하위 변경 0건 |

---

## 서비스별 분류 결과 요약

| 서비스 | Routes | Services | Schemas | D1 테이블 |
|--------|--------|----------|---------|----------|
| S0 AI Foundry (이관) | 20 (17%) | 27 (11%) | 21 (16%) | ~24 (14%) |
| S1 Discovery-X (이관) | 4 (3%) | 5 (2%) | 5 (4%) | ~6 (3%) |
| **S3 Foundry-X (잔류)** | **44 (37%)** | **97 (39%)** | **55 (41%)** | **~75 (43%)** |
| S4 Gate-X (이관) | 7 (6%) | 6 (2%) | 6 (5%) | ~10 (6%) |
| S5 Launch-X (이관) | 8 (7%) | 12 (5%) | 8 (6%) | ~15 (9%) |
| S6 Eval-X (이관) | 2 (2%) | 4 (2%) | 2 (2%) | ~3 (2%) |
| SX Infra (공유) | 33 (28%) | 101 (40%) | 36 (27%) | ~43 (25%) |

## 핵심 발견

1. **Foundry-X(S3)가 전체의 ~40%** — PRD 목표 "60~70 routes"는 S3(44)+SX일부로 달성 가능
2. **Infra(SX)가 의외로 큰 비중** — 101 services (40%), harness-kit으로 추출할 핵심 자산
3. **FK 핫스팟**: `biz_items` 30 FK, `organizations` 25 FK — MSA 분리 시 최대 도전
4. **F268~F391 증분 대부분 S3 집중** — Phase 9~19가 발굴+형상화에 집중했기 때문

---

## 결론

Match Rate **100%** — Sprint 179 M1 분류 + 아키텍처 결정 목표 달성.
다음 Sprint 180에서 harness-kit 패키지 생성으로 진행 가능.
