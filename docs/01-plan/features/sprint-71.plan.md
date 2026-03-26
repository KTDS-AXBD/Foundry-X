---
code: FX-PLAN-071
title: "Sprint 71 Plan — F215 AX BD 스킬 팀 가이드"
version: 1.0
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 71
features: [F215]
req: [FX-REQ-207]
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F215 AX BD 스킬 팀 가이드 — Getting Started 페이지 확장 |
| **Sprint** | 71 |
| **의존성** | Sprint 68 (F212) 스킬 체계 ✅, Sprint 70 (F214) Web Discovery 대시보드 ✅ |
| **목표** | Cowork 설치 + CC 스킬 사용법 + 프로세스 v8.2 흐름 시각화 + 팀 FAQ/트러블슈팅 4섹션 확장 |

| 관점 | 내용 |
|------|------|
| **Problem** | AX BD팀원이 ai-biz 11스킬 + ax-bd-discovery 오케스트레이터를 어떻게 설치·사용하는지 안내가 없음 |
| **Solution** | Getting Started 페이지에 4개 가이드 섹션 + API 엔드포인트 확장 |
| **Function UX Effect** | 팀원이 5분 내 스킬 설치 → 첫 Discovery 실행 가능 |
| **Core Value** | 사업개발 프로세스 진입 장벽 제거, 팀 전원 자율 사용 가능 |

---

## 1. 목표

1. **Cowork 설치 가이드**: pm-skills + ai-biz 플러그인 설치 절차를 단계별로 안내
2. **CC 스킬 사용법**: ax-bd-discovery 오케스트레이터 + ai-biz 11종 스킬 레퍼런스
3. **프로세스 v8.2 흐름 시각화**: 6단계 라이프사이클 + 2단계 발굴 상세 흐름 인터랙티브 시각화
4. **팀 FAQ/트러블슈팅**: 자주 묻는 질문 10개 + 에스컬레이션 경로

---

## 2. 범위

### In Scope

| 구분 | 항목 |
|------|------|
| 섹션 | Section 1: Cowork 설치 & 셋업 가이드 (StepCard 방식) |
| 섹션 | Section 2: Claude Code 스킬 사용법 (11종 레퍼런스 테이블 + 오케스트레이터 워크플로우) |
| 섹션 | Section 3: 프로세스 v8.2 시각화 (인터랙티브 6단계 + 2단계 발굴 상세) |
| 섹션 | Section 4: 팀 FAQ & 트러블슈팅 (아코디언 10항목) |
| 컴포넌트 | `CoworkSetupGuide.tsx` — 스텝별 설치 가이드 |
| 컴포넌트 | `SkillReferenceTable.tsx` — ai-biz 11종 + 오케스트레이터 레퍼런스 |
| 컴포넌트 | `ProcessLifecycleFlow.tsx` — 6단계 라이프사이클 시각화 |
| 컴포넌트 | `TeamFaqSection.tsx` — FAQ 아코디언 |
| 수정 | `getting-started/page.tsx` — 4개 섹션 탭 네비게이션 추가 |
| API | `GET /api/onboarding/skill-guide` — 스킬 가이드 데이터 |
| API | `GET /api/onboarding/process-flow` — 프로세스 v8.2 흐름 데이터 |
| API | `GET /api/onboarding/team-faq` — 팀 FAQ 목록 |
| 수정 | `api-client.ts` — 신규 타입 + 함수 |
| 테스트 | 신규 컴포넌트 4개 + API 3개 엔드포인트 테스트 |

### Out of Scope

- Cowork 플러그인 자체 개발 (이미 존재)
- ai-biz 스킬 내용 변경 (F212에서 완료)
- API 서버 비즈니스 로직 변경 (가이드 데이터만 제공)
- Discovery 대시보드 수정 (F214에서 완료)

---

## 3. 기술 전략

### 3.1 페이지 구조

기존 Getting Started 페이지를 **탭 네비게이션**으로 확장:
- Tab 1: **시작하기** (기존 Welcome + WorkflowQuickstart + OnboardingChecklist)
- Tab 2: **설치 가이드** (Cowork + CC 스킬 설치)
- Tab 3: **스킬 레퍼런스** (11종 ai-biz + 오케스트레이터)
- Tab 4: **프로세스 가이드** (v8.2 시각화)
- Tab 5: **FAQ** (팀 FAQ + 기존 FAQ 통합)

### 3.2 API 설계

가이드 데이터는 **정적 JSON** 기반 (DB 불필요):
- 스킬 메타데이터: `.claude/skills/ai-biz/` 구조를 API가 정리하여 제공
- 프로세스 흐름: v8.2 구조를 JSON으로 정의
- FAQ: 하드코딩 배열 (향후 D1 이관 가능)

### 3.3 컴포넌트 설계

- **CoworkSetupGuide**: numbered step cards + copy-to-clipboard 명령어
- **SkillReferenceTable**: 검색/필터 가능한 테이블 + 상세 모달
- **ProcessLifecycleFlow**: SVG 기반 6단계 흐름도 + 클릭 시 상세 표시
- **TeamFaqSection**: Radix Accordion + 검색 필터

---

## 4. 예상 산출물

| 산출물 | 파일 |
|--------|------|
| 컴포넌트 4개 | `packages/web/src/components/feature/CoworkSetupGuide.tsx` |
| | `packages/web/src/components/feature/SkillReferenceTable.tsx` |
| | `packages/web/src/components/feature/ProcessLifecycleFlow.tsx` |
| | `packages/web/src/components/feature/TeamFaqSection.tsx` |
| 페이지 수정 | `packages/web/src/app/(app)/getting-started/page.tsx` |
| API 라우트 | `packages/api/src/routes/onboarding.ts` (확장) |
| API 서비스 | `packages/api/src/services/skill-guide.ts` |
| API 스키마 | `packages/api/src/schemas/skill-guide.ts` |
| API 클라이언트 | `packages/web/src/lib/api-client.ts` (확장) |
| 테스트 | `packages/web/src/__tests__/cowork-setup-guide.test.tsx` |
| | `packages/web/src/__tests__/skill-reference-table.test.tsx` |
| | `packages/web/src/__tests__/process-lifecycle-flow.test.tsx` |
| | `packages/web/src/__tests__/team-faq-section.test.tsx` |
| | `packages/api/src/__tests__/routes/onboarding-guide.test.ts` |

---

## 5. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Getting Started 기존 코드 충돌 | 중 | 탭 분리로 기존 코드 영향 최소화 |
| 스킬 메타데이터 변경 시 가이드 stale | 저 | API에서 동적 로딩 (하드코딩 최소화) |

---

## 6. 완료 기준

- [ ] 4개 탭 섹션 모두 렌더링 + 상호작용 정상
- [ ] API 3개 엔드포인트 응답 정상
- [ ] 테스트 전체 통과 (Web + API)
- [ ] typecheck + lint 통과
