---
code: FX-PLAN-109
title: "Sprint 109 — F281 데모 데이터 E2E 검증"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-03
updated: 2026-04-03
author: Claude Autopilot
sprint: 109
f_items: [F281]
req: [FX-REQ-273]
---

# Sprint 109 Plan — F281 데모 데이터 E2E 검증

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F281 데모 데이터 E2E 검증 |
| Sprint | 109 |
| 선행 | F279+F280 (BD 데모 시딩, Sprint 108 ✅) |
| 우선순위 | P1 |
| 목표 | 시드 데이터 기반 6단계(수집→GTM) 워크쓰루 검증 + 산출물 Markdown 렌더링 + UI 빈화면/깨짐 수정 |

## §1 배경

Sprint 108(F279+F280)에서 D1 마이그레이션 0082_bd_demo_seed.sql로 2개 아이디어(헬스케어AI + GIVC) × 12+ 테이블 ~104 rows를 시딩했어요. 이제 이 데이터가 실제 웹 UI에서 정상 표시되고, 6단계 BD 프로세스(수집→발굴→형상화→검증→제품화→GTM) 흐름이 끊김 없이 동작하는지 검증해야 해요.

## §2 목표

1. **Production D1 확인**: 0082 마이그레이션 remote 적용 완료 확인 (이미 적용 → 검증만)
2. **API 응답 검증**: 15개 BD 관련 라우트에서 시드 데이터가 정상 반환되는지 테스트
3. **웹 UI E2E 워크쓰루**: 6단계 흐름을 따라 각 화면이 데이터를 정상 렌더링하는지 확인
4. **UI 빈화면/깨짐 수정**: 데이터 없는 상태의 빈 화면 처리, Markdown 렌더링 보정
5. **데모 시나리오 페이지 보강**: demo-scenario.tsx 워크쓰루 가이드 완성도 향상

## §3 범위

### In-Scope
- API 테스트: BD 라우트 시드 데이터 응답 검증 (기존 테스트 + 시드 데이터 fixture)
- Web 컴포넌트: 빈 화면 방어 로직 추가 (empty state)
- Markdown 렌더링: 산출물 상세 페이지의 markdown 콘텐츠 올바른 렌더링
- E2E 테스트: 데모 시나리오 기반 워크쓰루 spec 추가
- demo-scenario.tsx: 6단계 안내 콘텐츠 보강

### Out-of-Scope
- 새 API 엔드포인트 추가 (기존 라우트만 검증)
- D1 스키마 변경 (0082 그대로 유지)
- 형상화 Phase D~F (Sprint 111~112)

## §4 작업 항목

| # | 작업 | 예상 파일 | 비고 |
|---|------|-----------|------|
| 1 | API 시드 데이터 조회 테스트 | `packages/api/src/__tests__/bd-demo-seed.test.ts` | biz_items, classifications, summaries, evaluations 등 |
| 2 | 웹 빈 화면 방어 로직 | `packages/web/src/components/feature/ax-bd/` 하위 | optional chaining + empty state UI |
| 3 | Markdown 렌더링 확인/보정 | `packages/web/src/routes/ax-bd/artifact-detail.tsx` | react-markdown 또는 dangerouslySetInnerHTML 검증 |
| 4 | E2E 워크쓰루 spec | `packages/web/e2e/bd-demo-walkthrough.spec.ts` | 6단계 경로 네비게이션 |
| 5 | demo-scenario.tsx 보강 | `packages/web/src/routes/ax-bd/demo-scenario.tsx` | 워크쓰루 단계별 딥링크 + 진행률 |
| 6 | typecheck + lint + test 검증 | — | 전체 CI 통과 확인 |

## §5 Worker 파일 매핑

단일 구현 (Worker 분할 불필요 — UI 보정 위주로 파일 간 의존성 높음)

## §6 성공 기준

- [ ] API 테스트: 시드 데이터 조회 15+ assertions PASS
- [ ] Web typecheck PASS
- [ ] 빈 화면 방어: 데이터 없는 경우 빈 상태 UI 표시 (에러 없음)
- [ ] Markdown 렌더링: artifact-detail 상세 콘텐츠 정상 표시
- [ ] E2E: bd-demo-walkthrough spec PASS
- [ ] 전체 테스트 스위트 기존 테스트 regression 없음
