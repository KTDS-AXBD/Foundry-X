---
code: FX-RPRT-071
title: "Sprint 71 Report — F215 AX BD 스킬 팀 가이드"
version: 1.0
status: Active
category: RPRT
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 71
features: [F215]
req: [FX-REQ-207]
refs: ["[[FX-PLAN-071]]", "[[FX-DSGN-071]]"]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F215 AX BD 스킬 팀 가이드 — Getting Started 페이지 확장 |
| **Sprint** | 71 |
| **기간** | 2026-03-26 (단일 세션) |
| **Match Rate** | ~93% (iterate 1회 후 P0 해결) |

| 관점 | 결과 |
|------|------|
| **Problem** | AX BD팀원이 스킬 설치·사용법을 모름 → **해결** |
| **Solution** | Getting Started 5탭 확장 (시작하기/설치/스킬/프로세스/FAQ) |
| **Function UX Effect** | 5분 내 스킬 설치 → 첫 Discovery 프로세스 실행 가능 |
| **Core Value** | 사업개발 프로세스 진입 장벽 제거 |

---

## 1. 산출물

### 신규 파일 (8개)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/api/src/services/skill-guide.ts` | 스킬 가이드 정적 데이터 서비스 |
| 2 | `packages/api/src/schemas/skill-guide.ts` | Zod 스키마 3개 |
| 3 | `packages/api/src/__tests__/onboarding-guide.test.ts` | API 테스트 15개 |
| 4 | `packages/web/src/components/feature/CoworkSetupGuide.tsx` | 설치 가이드 컴포넌트 |
| 5 | `packages/web/src/components/feature/SkillReferenceTable.tsx` | 스킬 레퍼런스 컴포넌트 |
| 6 | `packages/web/src/components/feature/ProcessLifecycleFlow.tsx` | 프로세스 시각화 컴포넌트 |
| 7 | `packages/web/src/components/feature/TeamFaqSection.tsx` | 팀 FAQ 컴포넌트 |
| 8 | `packages/web/src/__tests__/team-guide-components.test.tsx` | Web 테스트 17개 |

### 수정 파일 (3개)

| # | 파일 | 변경 |
|---|------|------|
| 9 | `packages/api/src/routes/onboarding.ts` | 3개 엔드포인트 추가 |
| 10 | `packages/web/src/app/(app)/getting-started/page.tsx` | 탭 네비게이션 + 4컴포넌트 통합 |
| 11 | `packages/web/src/lib/api-client.ts` | 타입 3개 + 함수 3개 추가 |

### PDCA 문서 (4개)

| 문서 | 파일 |
|------|------|
| Plan | `docs/01-plan/features/sprint-71.plan.md` |
| Design | `docs/02-design/features/sprint-71.design.md` |
| Analysis | `docs/03-analysis/features/sprint-71.analysis.md` |
| Report | `docs/04-report/features/sprint-71.report.md` |

---

## 2. 검증 결과

| 항목 | 결과 |
|------|------|
| API typecheck | ✅ (신규 파일 에러 없음) |
| Web typecheck | ✅ |
| API 신규 테스트 | 15/15 통과 |
| Web 신규 테스트 | 17/17 통과 |
| API 기존 테스트 | 영향 없음 |
| Web 기존 테스트 | 영향 없음 |
| D1 마이그레이션 | 불필요 (정적 데이터만) |

---

## 3. Gap 분석 이력

| 회차 | Match Rate | P0 이슈 | 조치 |
|------|-----------|---------|------|
| 1차 | 85% | API↔Web 타입 불일치 3건 | API 서비스/스키마 전면 재작성 |
| 2차 (최종) | ~93% | 0건 | Medium 이슈(서브컴포넌트 미구현)는 향후 확장 범위 |

### 잔여 Medium 이슈 (향후 확장)

- IntensityMatrix 서브컴포넌트: 유형×단계 강도 매트릭스 시각화
- StageTimeline 서브컴포넌트: 2-0~2-10 타임라인 상세
- SkillDetailModal: 스킬 카드 클릭 시 상세 모달
- TroubleshootingTip: 설치 실패 시 상세 안내

---

## 4. 수치 변화

| 지표 | Before | After | Delta |
|------|--------|-------|-------|
| API 엔드포인트 | ~304 | ~307 | +3 |
| API 서비스 | 135 | 136 | +1 |
| API 스키마 | 61 | 62 | +1 |
| API 테스트 | 1786 | 1801 | +15 |
| Web 테스트 | 121+ | 138+ | +17 |
| Web 컴포넌트 | - | +4 | +4 |
