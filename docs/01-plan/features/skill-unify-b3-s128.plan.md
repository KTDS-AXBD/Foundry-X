---
code: FX-PLAN-S128
title: "Sprint 128 Plan — F307+F308 Skill Unification 배치 3 (대시보드+통합QA)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-04
updated: 2026-04-04
author: Sinclair Seo
refs:
  - "[[FX-SPEC-SKILL-UNIFY]]"
  - "[[FX-PLAN-S125]]"
  - "[[FX-PLAN-S126]]"
  - "[[FX-PLAN-S127]]"
---

# Sprint 128 Plan — Skill Unification 배치 3

## 1. 목표

Phase 12 Skill Unification 최종 배치 — 통합 대시보드 + 진화 계보 시각화 + 통합 QA + Production 배포.

| F-item | 제목 | REQ | 우선순위 |
|--------|------|-----|:--------:|
| F307 | SkillEnrichedView 대시보드 + 진화 계보 시각화 | FX-REQ-299 | P1 |
| F308 | Skill Unification 통합 QA + 데모 데이터 + Production 배포 | FX-REQ-300 | P1 |

**순서**: F307 → F308 (대시보드 완성 후 통합 QA)

## 2. 현재 상태 (배치 1+2 완료 기반)

### 이미 구현된 ��
- **F303 (B1)**: SkillCatalog → API 전환 완료 (useSkillList/useSkillSearch/useSkillEnriched hooks)
- **F304 (B1)**: 벌크 레지스트리 API + sf-scan-register.sh
- **F305 (B2)**: POST /api/skills/metrics/record + usage-tracker-hook.sh
- **F306 (B2)**: SkillMdGeneratorService + Deploy API + Review→SKILL.md 자동 생성
- API: `GET /api/skills/registry/:skillId/enriched` (registry+metrics+versions+lineage 통합)
- API: `GET /api/skills/:skillId/lineage` (부모/자식 관계)
- Hook: `useSkillEnriched(skillId)` (F303에서 추가)
- Web: SkillDetailSheet에 enriched 메트릭 일부 표시

### 없는 것
- **전용 대시보드 페이��**: skill-catalog 페이지만 있고, 통합 상세 뷰 페이지 없음
- **계보 시각화**: lineage 데이터를 트리/그래프로 표시하는 UI 없음
- **E2E 테스트**: skill-catalog, skill-enriched 관련 E2E 0건
- **데모 데이터**: D1에 스킬 데이터 0건 (벌크 등록 미실행)

## 3. 구현 계획

### Phase A: F307 — SkillEnrichedView 대시보드

#### A-1. 스킬 상세 페이지 생성
- `packages/web/src/routes/ax-bd/skill-detail.tsx` — 신규 페이지
- 라우트: `/ax-bd/skill-catalog/:skillId`
- 컴포넌트: `SkillEnrichedView` — registry + metrics + versions + lineage 통합

#### A-2. 메트릭 대시보드 섹션
- 실행 횟수/성공률/평균 비용 차트 (간단한 Bar/Stat 카드)
- 최근 실행 이력 테이블
- 기존 `useSkillEnriched()` hook 활용

#### A-3. 계보 시각화
- `SkillLineageTree` 컴포넌트 — manual→derived→captured 관계 트리
- 부모/자식 노드를 div 기반 트리로 표시 (D3.js 불필요 — CSS flex/grid)
- 노드 클릭 시 해당 스킬 상세로 이동

#### A-4. 버전 이력
- `SkillVersionHistory` — 버전 목록 + changelog + diff 표시

#### A-5. 라우터 등록 + 네비게이션
- `router.tsx`에 `/ax-bd/skill-catalog/:skillId` 추가
- SkillCatalog의 SkillCard 클릭 시 상세 페이지로 이동 (기존 Sheet → 페이지 전환)

### Phase B: F308 �� 통합 QA + 데모 + 배포

#### B-1. 데모 데이터 시딩
- `scripts/skill-demo-seed.sh` — sf-scan-register.sh로 샘��� 스킬 벌크 등록
- 메트릭 시딩: 샘플 ��행 기록 INSERT

#### B-2. E2E 테스트
- `packages/web/e2e/skill-catalog.spec.ts` — 카탈로그 페이지 렌더링, 검색, 필터
- `packages/web/e2e/skill-detail.spec.ts` — 상세 페이지 렌더링, 메트릭, 계보

#### B-3. 통합 검증
- typecheck + lint + 전체 test 통과
- E2E 커버리지 확인

## 4. 변경 파일 예상

### F307 (Web 중심)
| 파일 | 동작 |
|------|------|
| `packages/web/src/routes/ax-bd/skill-detail.tsx` | 신규 — 상세 페이지 |
| `packages/web/src/components/feature/ax-bd/SkillEnrichedView.tsx` | 신규 — 통합 뷰 |
| `packages/web/src/components/feature/ax-bd/SkillLineageTree.tsx` | 신규 — 계보 트리 |
| `packages/web/src/components/feature/ax-bd/SkillVersionHistory.tsx` | 신규 — 버전 이력 |
| `packages/web/src/components/feature/ax-bd/SkillMetricsCards.tsx` | 신규 — 메트릭 카드 |
| `packages/web/src/router.tsx` | 라우트 추가 |
| `packages/web/src/components/feature/ax-bd/SkillCatalog.tsx` | Card 클릭 → 상세 이동 |

### F308 (QA + 스크립트)
| 파일 | 동작 |
|------|------|
| `scripts/skill-demo-seed.sh` | 신규 — 데모 데이터 |
| `packages/web/e2e/skill-catalog.spec.ts` | 신규 — E2E |
| `packages/web/e2e/skill-detail.spec.ts` | 신규 — E2E |

## 5. 성공 기준

- [ ] `/ax-bd/skill-catalog/:skillId` 상세 페이지 렌더링
- [ ] enriched 메트릭 (실행횟수, 성공률, 비용) 표시
- [ ] 계보 트리 시각화 (부모→자식 관계)
- [ ] E2E skill-catalog + skill-detail 테스트 통과
- [ ] 데모 데이터 D1 시딩 ��공
- [ ] typecheck + lint + test + E2E 전체 통과
