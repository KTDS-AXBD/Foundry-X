---
code: FX-PLAN-049
title: Sprint 49 — 대시보드 IA 재설계 + 인터랙티브 온보딩 투어
version: 0.1
status: Draft
category: PLAN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# Sprint 49 Planning Document

> **Summary**: 대시보드 정보 아키텍처(IA)를 업무 동선 중심으로 재편하고, 첫 로그인 시 인터랙티브 가이드 투어를 제공하여 팀원 온보딩 장벽을 제거한다.
>
> **Project**: Foundry-X
> **Version**: Sprint 49 (api 0.1.0 / web 0.1.0)
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 현재 대시보드는 기능 중심(feature-driven)으로 구성되어 있어, 신규 사용자가 "어디서 뭘 해야 하는지" 알 수 없고 메뉴 간 역할 중복이 심하다 (Dashboard/Workspace/Projects 3중 겹침, 숨겨진 페이지 3개) |
| **Solution** | 8+2개 플랫 메뉴를 3대 업무 동선(SR 관리 / Spec & 에이전트 / 프로젝트 현황) 기반 그룹 메뉴로 재편 + react-joyride 기반 첫 로그인 투어 |
| **Function/UX Effect** | 사이드바 진입점이 10개→6개 그룹으로 축소, 숨겨진 페이지(spec-generator, projects, getting-started) 접근 가능, 첫 3분 내 핵심 동선 파악 가능 |
| **Core Value** | "로그인하면 바로 일할 수 있다" — 도구를 이해하는 시간을 0으로 만들어 팀원 채택률(Adoption) 극대화 |

---

## 1. Overview

### 1.1 Purpose

AX 사업개발팀 동료 6명이 Foundry-X 대시보드에 처음 접속했을 때, **자기 업무에 맞는 화면을 즉시 찾고 사용할 수 있도록** 정보 아키텍처(IA)를 재설계하고 가이드 투어를 제공한다.

### 1.2 Background

- **현재 상태**: 10개 메뉴가 기능 중심으로 나열되어 있고, 숨겨진 페이지 3개(spec-generator, projects, getting-started)가 사이드바에 없어 접근 불가
- **사용자 피드백**: "어디서 뭘 해야 할지 모르겠어", "메뉴 내용이 중복되는 것 같아", "Wiki에 설명이 있을 줄 알았는데 아님"
- **Phase 5 Conditional**: F114 온보딩 프로세스 — 팀원 6명 실제 사용 시작이 필요한 상황
- **Sprint 48 미커밋 작업**: F167/F168 (SR 대시보드)이 이미 작업 중 — 새 IA에 맞춰 배치 필요

### 1.3 Related Documents

- SPEC.md §6 F171, F172
- PRD v8: `docs/specs/FX-SPEC-PRD-V8_foundry-x.md`
- 기존 getting-started: `packages/web/src/app/(app)/getting-started/page.tsx`

---

## 2. Scope

### 2.1 In Scope

- [x] F171: 사이드바 메뉴 구조 재편 (업무 동선 기반 그룹핑)
- [x] F171: 중복 페이지 통합 (Workspace 역할 재정의)
- [x] F171: 숨겨진 페이지 사이드바 노출 (spec-generator, projects)
- [x] F172: react-joyride 기반 인터랙티브 온보딩 투어
- [x] F172: Getting Started 페이지 사이드바 연결 + 콘텐츠 업데이트
- [x] F172: 업무별 퀵스타트 카드 (3대 동선)

### 2.2 Out of Scope

- 새로운 페이지/기능 추가 (기존 페이지 재배치만)
- 백엔드 API 변경 (프론트엔드 전용 스프린트)
- 모바일 반응형 재설계 (현재 구조 유지)
- Sprint 48 F167/F168 코드 완성 (별도 스프린트)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 사이드바 메뉴를 3대 업무 동선 + 관리 그룹으로 재편 | High | Pending |
| FR-02 | 그룹 접기/펼치기(collapsible) 지원 | Medium | Pending |
| FR-03 | spec-generator를 "Spec 생성"으로 사이드바에 노출 | High | Pending |
| FR-04 | projects를 "프로젝트 현황"으로 사이드바에 노출 | High | Pending |
| FR-05 | getting-started를 "시작하기" 최상단에 배치 | High | Pending |
| FR-06 | Workspace → "내 작업" 으로 리네이밍 + 위치 이동 | Medium | Pending |
| FR-07 | react-joyride 첫 로그인 시 자동 시작 투어 | High | Pending |
| FR-08 | 투어 스텝: 사이드바 → 홈 → SR관리 → Spec생성 → 에이전트 → 분석 (6스텝) | High | Pending |
| FR-09 | 투어 완료 상태를 localStorage에 저장 (재표시 안 함) | Medium | Pending |
| FR-10 | Getting Started 페이지에 3대 동선 퀵스타트 카드 추가 | High | Pending |
| FR-11 | "도움말" 메뉴 하단 배치 — Getting Started 재접근 가능 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 사이드바 렌더링 시간 변화 없음 (<50ms) | React DevTools Profiler |
| Accessibility | 투어 다이얼로그 키보드 탐색 가능 | 수동 테스트 |
| UX | 첫 방문 사용자가 3분 내 핵심 동선 1개 완료 | 도그푸딩 관찰 |

---

## 4. IA 재설계 상세

### 4.1 현재 구조 (AS-IS)

```
── Dashboard          (프로젝트 건강도)
── Wiki               (Git wiki 동기화)
── Architecture       (코드 구조 시각화)
── Workspace          (투두 + 메시지 + MCP)
── Agents             (에이전트 6탭)
── SR Management      (SR 접수/분류)    ← Sprint 48 신규
── Tokens             (비용/모델 품질)
── Analytics          (KPI/Adoption)
────────────────
── Discovery-X        (외부 iframe)
── AI Foundry         (외부 iframe)

[숨겨진 페이지]
── spec-generator     (NL→Spec 변환)
── projects           (멀티 프로젝트 현황)
── getting-started    (온보딩 체크리스트)
```

**문제점:**
1. Dashboard / Workspace / Projects — 3중 역할 겹침
2. Wiki — 이름이 "도움말/가이드"로 오해됨
3. spec-generator, projects, getting-started — 사이드바 미노출
4. 업무 동선과 메뉴 순서가 불일치
5. 10개 플랫 나열 — 인지 부하 높음

### 4.2 신규 구조 (TO-BE)

```
🚀 시작하기              ← getting-started (최상단, 첫 방문 시 강조)
────────────────────────
📊 홈                    ← dashboard (통합 대시보드)
────────────────────────
📥 SR 관리               ← [그룹] Workflow A
   ├ SR 목록             ← sr/page.tsx
   └ SR 분석 결과         ← (F168 대시보드 하위 탭 or 별도 뷰)

📝 개발                  ← [그룹] Workflow B
   ├ Spec 생성           ← spec-generator (숨겨진 페이지 노출)
   └ 에이전트             ← agents/page.tsx

📈 현황                  ← [그룹] Workflow C
   ├ 프로젝트             ← projects (숨겨진 페이지 노출)
   ├ Analytics           ← analytics/page.tsx
   └ 토큰 비용            ← tokens/page.tsx
────────────────────────
📚 지식베이스             ← wiki (리네이밍: Wiki → 지식베이스)
🏗️ 아키텍처              ← architecture
📋 내 작업               ← workspace (리네이밍: Workspace → 내 작업)
────────────────────────
🔗 외부 서비스
   ├ Discovery-X
   └ AI Foundry
────────────────────────
❓ 도움말                 ← getting-started 재접근 링크
```

### 4.3 동선 매핑 검증

| 동선 | 단계 | 메뉴 경로 | 클릭 수 |
|------|------|-----------|---------|
| **A: SR→분석→제안서** | 1. SR 접수 | SR 관리 > SR 목록 | 2 |
| | 2. AI 분류/분석 | (자동 처리, 상태 변경) | — |
| | 3. 결과 확인 | SR 관리 > SR 분석 결과 | 2 |
| **B: 아이디어→Spec→에이전트** | 1. 아이디어 정리 | 개발 > Spec 생성 | 2 |
| | 2. 에이전트 실행 | 개발 > 에이전트 | 2 |
| | 3. 결과 모니터링 | 현황 > 프로젝트 | 2 |
| **C: 프로젝트 모니터링** | 1. 전체 현황 | 홈 | 1 |
| | 2. 상세 KPI | 현황 > Analytics | 2 |
| | 3. 비용 확인 | 현황 > 토큰 비용 | 2 |

### 4.4 Workspace 역할 재정의

현재 Workspace = ToDo + Messages + Settings + MCP Servers (4탭)

**변경:**
- **리네이밍**: "Workspace" → "내 작업"
- **위치**: 관리 영역으로 이동 (주요 동선에서 분리)
- **이유**: ToDo/Messages는 개인 도구이지 업무 동선이 아님. 핵심 동선을 방해하지 않게 하위로 배치

---

## 5. 온보딩 투어 상세 (F172)

### 5.1 투어 스텝 설계

| Step | Target | Title | Description |
|------|--------|-------|-------------|
| 1 | 사이드바 전체 | 🧭 네비게이션 | "여기서 모든 기능에 접근할 수 있어요. 업무별로 그룹화되어 있어요." |
| 2 | 홈 메뉴 | 📊 대시보드 | "프로젝트 전체 건강도를 한눈에 확인하세요." |
| 3 | SR 관리 그룹 | 📥 SR 관리 | "고객 서비스 요청(SR)을 접수하고 AI가 자동 분류해요." |
| 4 | 개발 > Spec 생성 | 📝 Spec 생성 | "아이디어를 입력하면 AI가 명세서를 자동 생성해요." |
| 5 | 개발 > 에이전트 | 🤖 에이전트 | "AI 에이전트가 실제 작업을 수행해요. 플랜/PR/머지를 관리하세요." |
| 6 | 시작하기 메뉴 | 🚀 시작하기 | "언제든 이 가이드를 다시 볼 수 있어요. 궁금한 점은 여기서!" |

### 5.2 투어 트리거 조건

- **자동 시작**: `localStorage.getItem('fx-tour-completed')` === null && 로그인 상태
- **수동 재시작**: "도움말" 메뉴 클릭 or Getting Started 페이지 "투어 다시 보기" 버튼
- **스킵**: 투어 중 아무때나 "건너뛰기" 가능 → localStorage에 completed 저장

### 5.3 Getting Started 페이지 업데이트

기존 5개 FeatureCard를 **3대 동선 퀵스타트**로 교체:

| 카드 | 동선 | 설명 | CTA |
|------|------|------|-----|
| 📥 SR 처리하기 | A | "고객 SR을 접수하고 AI 분석 결과를 확인하세요" | → SR 관리로 이동 |
| 📝 아이디어 → 명세 | B | "아이디어를 입력하면 Spec이 자동 생성됩니다" | → Spec 생성으로 이동 |
| 📈 현황 확인하기 | C | "프로젝트 건강도와 KPI를 한눈에 보세요" | → 홈으로 이동 |

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] 사이드바가 TO-BE 구조로 재편됨
- [ ] 숨겨진 페이지 3개가 사이드바에서 접근 가능
- [ ] react-joyride 투어가 첫 로그인 시 자동 시작
- [ ] Getting Started 페이지에 3대 동선 퀵스타트 표시
- [ ] Web 테스트 전체 통과
- [ ] E2E 테스트 동기화

### 6.2 Quality Criteria

- [ ] 기존 Web 68 테스트 전체 통과
- [ ] 사이드바 테스트 추가 (그룹 접기/펼치기, 활성 메뉴 표시)
- [ ] 투어 컴포넌트 테스트 추가
- [ ] Zero lint errors
- [ ] typecheck 통과

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 메뉴 구조 변경으로 E2E 테스트 대량 실패 | High | High | E2E selector를 data-testid 기반으로 사전 수정 |
| react-joyride 번들 사이즈 증가 | Low | Medium | dynamic import로 첫 로그인 시에만 로드 |
| 기존 북마크/딥링크 깨짐 | Medium | Low | URL 경로는 변경하지 않음 (사이드바 구조만 변경) |
| 팀원들이 투어를 스킵하고 여전히 혼란 | Medium | Medium | Getting Started 페이지 + 도움말 메뉴로 재접근 보장 |

---

## 8. Architecture Considerations

### 8.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 Dynamic 레벨 유지 — 프론트엔드 전용 변경이라 아키텍처 레벨 변동 없음.

### 8.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 투어 라이브러리 | react-joyride | React 생태계 표준, shadcn과 호환, SSR 안전 |
| 그룹 메뉴 상태 | localStorage | 서버 상태 불필요, 개인 설정 |
| URL 경로 | 변경 없음 | 기존 딥링크/북마크 보존 |
| 사이드바 컴포넌트 | 기존 sidebar.tsx 수정 | 새 파일 불필요, 구조만 변경 |

### 8.3 변경 파일 목록 (예상)

| 파일 | 변경 내용 |
|------|-----------|
| `packages/web/src/components/sidebar.tsx` | 메뉴 그룹 구조 재편 + collapsible |
| `packages/web/src/app/(app)/getting-started/page.tsx` | 3대 동선 퀵스타트 카드 |
| `packages/web/src/components/feature/OnboardingTour.tsx` | 신규 — react-joyride 래퍼 |
| `packages/web/src/app/(app)/layout.tsx` | OnboardingTour 마운트 |
| `packages/web/src/__tests__/sidebar.test.tsx` | 사이드바 테스트 업데이트 |
| `packages/web/src/__tests__/onboarding-tour.test.tsx` | 신규 — 투어 테스트 |
| `packages/web/e2e/*.spec.ts` | 사이드바 selector 동기화 |

---

## 9. Implementation Order

| 순서 | 작업 | 의존성 | 예상 |
|------|------|--------|------|
| 1 | 사이드바 그룹 메뉴 구조 변경 (FR-01~06) | 없음 | 핵심 |
| 2 | 사이드바 테스트 업데이트 | Step 1 | 필수 |
| 3 | react-joyride 설치 + OnboardingTour 컴포넌트 (FR-07~09) | Step 1 | 핵심 |
| 4 | Getting Started 페이지 퀵스타트 카드 업데이트 (FR-10~11) | Step 1 | 핵심 |
| 5 | E2E 테스트 동기화 | Step 1~4 | 필수 |
| 6 | 도그푸딩 + 최종 조정 | Step 5 | 마무리 |

---

## 10. Next Steps

1. [ ] Plan 리뷰 및 확정
2. [ ] Design 문서 작성 (`/pdca design sprint-49`)
3. [ ] 구현 착수

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | 초안 — 현재 IA 분석 + TO-BE 설계 + 투어 스텝 | Sinclair Seo |
