# Sprint 197 Plan — F413 Foundry-X 수집 코드 격리

**Plan ID:** FX-PLAN-S197
**F-item:** F413
**Phase:** 21-E (Foundry-X 사전 정리)
**Sprint:** 197
**Status:** 🔧 In Progress
**Date:** 2026-04-07
**Owner:** Sinclair (AX BD팀)

## Executive Summary

Discovery-X 외부 서비스 이관(Phase 21+)을 앞두고, Foundry-X 내부 수집 도메인 코드를 `core/collection/` 디렉터리로 격리한다. Strangler Fig 패턴의 사전 정리 단계로, 도메인 경계를 명확히 하고 향후 추출(extraction)을 단순화하는 것이 목적이다.

## 배경

- **현황**: 수집 관련 코드(Idea Portal, IR Proposals, Discovery-X Ingest, Insights)가 `core/discovery/`와 `core/shaping/` 두 모듈에 흩어져 있다.
- **문제**: 도메인 경계가 모호하여 Discovery-X 이관 시 어떤 파일을 옮겨야 하는지 식별이 어렵다.
- **결정**: 이관 대상 14개 파일(4 routes + 5 services + 5 schemas)을 `core/collection/`으로 격리하여 S1 영역을 시각적으로 분리한다.

## 범위

### In Scope
- `packages/api/src/core/collection/` 디렉터리 신설
- 14개 파일을 `git mv`로 이동 (rename history 보존)
- Cross-module import 경로 6개 파일 수정
- 8개 테스트 파일의 import 경로 갱신
- `core/index.ts` barrel + `app.ts` import/mount 정합성 유지
- typecheck 0 errors 유지, 전체 테스트 통과

### Out of Scope
- 실제 Discovery-X 외부 서비스로의 코드 이관 (Phase 21+ 별도 작업)
- 수집 도메인 비즈니스 로직 변경
- DB 스키마 변경
- 신규 기능 추가

## 작업 항목

1. `core/collection/{routes,services,schemas}` 디렉터리 생성
2. 14 파일 `git mv`로 이동 (R 보존)
3. `core/collection/index.ts` barrel 작성 (5 routes export)
4. `core/discovery/index.ts`, `core/shaping/index.ts`에서 이관 항목 제거
5. `core/index.ts`에 `collection` re-export 추가
6. Cross-module 상대경로 패치 (6 파일)
7. 테스트 파일 import 경로 패치 (8 파일)
8. `app.ts` import 블록 + 5 mount 라인 정합성 검증
9. typecheck + 전체 테스트 + lint 통과 확인

## 성공 기준

- ✅ `pnpm --filter @foundry-x/api typecheck` = 0 errors
- ✅ `pnpm --filter @foundry-x/api test` 전체 통과 (3167 passed 기준 유지)
- ✅ `git log --diff-filter=R` 14건 R(rename) 확인
- ✅ Discovery-X 이관 대상이 단일 디렉터리(`core/collection/`)에 집중

## Related Documents

- SPEC.md F413
- `docs/02-design/features/sprint-197.design.md`
- `docs/04-report/features/sprint-197.report.md`
- `docs/specs/ax-bd-msa/service-mapping.md` (S1 영역)
