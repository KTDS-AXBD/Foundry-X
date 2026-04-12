---
code: FX-DSGN-S97
title: "Sprint 97 — 발굴 UX 통합 QA + 팀 데모 설계"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S97]], [[FX-DSGN-FDU]]"
---

# Sprint 97: 발굴 UX 통합 QA + 팀 데모 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263~F266 통합 검증 (E2E 4건 + Help Agent PoC + Feature Flag) |
| Sprint | 97 |
| 핵심 전략 | API mock 기반 E2E — 프로덕션 API 없이도 전체 UX 흐름 검증 |
| 참조 Design | [[FX-DSGN-FDU]] §2~§5 (컴포넌트 구조) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 개별 기능 단위 테스트만 존재, E2E 통합 흐름 검증 부재 |
| Solution | Playwright E2E 4건 + Help Agent PoC 검증 + Feature Flag |
| Function UX Effect | 실사용 시나리오 자동 검증, 리그레션 방지 |
| Core Value | MVP 완성 신뢰도 확보 → 팀 데모/실사용 전환 기반 |

---

## 1. E2E 테스트 설계

### 1.1 공통 패턴

기존 프로젝트 E2E 패턴을 따름:
- `fixtures/auth.ts`의 `authenticatedPage` 사용 (fake JWT + localStorage)
- API 호출은 `page.route("**/api/...")` mock으로 처리
- `data-tour` 속성 + 접근성 label로 요소 선택

### 1.2 테스트 파일 매핑

| # | 파일 | 대상 Feature | 시나리오 수 |
|---|------|-------------|------------|
| 1 | `e2e/discovery-wizard.spec.ts` | F263 | 4 |
| 2 | `e2e/help-agent.spec.ts` | F264 | 4 |
| 3 | `e2e/hitl-review.spec.ts` | F266 | 4 |
| 4 | `e2e/discovery-tour.spec.ts` | F265 | 3 |

### 1.3 API Mock 데이터

```typescript
// 공통 mock 데이터 — 각 spec에서 인라인 정의
const MOCK_BIZ_ITEMS = [
  { id: "biz-1", title: "AI 문서 자동화", type: "I", orgId: "o1", ... },
];

const MOCK_STAGES = [
  { stage: "2-0", status: "completed" },
  { stage: "2-1", status: "in_progress" },
  { stage: "2-2", status: "pending" },
  // ...
];

const MOCK_TRAFFIC_LIGHT = {
  overall: "green",
  dimensions: { market: "green", tech: "yellow", team: "green" },
};
```

---

## 2. 테스트 시나리오 상세

### 2.1 discovery-wizard.spec.ts (F263)

| # | 시나리오 | 검증 내용 |
|---|----------|-----------|
| 1 | 위저드 렌더링 | `/ax-bd/discovery` 진입 → WizardStepper + StageContent 표시 |
| 2 | biz-item 선택 | 드롭다운에서 아이템 선택 → 단계 상태 로드 |
| 3 | 단계 탐색 | 스텝퍼 클릭 → StageContent 변경 (목적+스킬+체크포인트) |
| 4 | 단계 상태 변경 | "시작하기" 클릭 → pending→in_progress 전환 |

Mock 대상:
- `GET /biz-items` → MOCK_BIZ_ITEMS
- `GET /ax-bd/viability/traffic-light/:id` → MOCK_TRAFFIC_LIGHT
- `GET /biz-items/:id/discovery-progress` → MOCK_STAGES
- `POST /biz-items/:id/discovery-stage` → 200 OK

### 2.2 help-agent.spec.ts (F264)

| # | 시나리오 | 검증 내용 |
|---|----------|-----------|
| 1 | 채팅 UI 토글 | FAB 클릭 → 채팅 패널 열림/닫힘 |
| 2 | 로컬 응답 | "다음 단계 뭐야?" → JSON 응답 → "즉시 응답" 뱃지 |
| 3 | SSE 스트리밍 응답 | "BMC가 뭐야?" → text/event-stream → 점진적 렌더링 |
| 4 | 새 대화 리셋 | 리셋 버튼 → 메시지 목록 초기화 |

Mock 대상:
- `POST /help-agent/chat` → 분기: (1) JSON 로컬 응답 (2) SSE 스트림 응답

### 2.3 hitl-review.spec.ts (F266)

| # | 시나리오 | 검증 내용 |
|---|----------|-----------|
| 1 | HITL 패널 렌더링 | 산출물 선택 → 패널 열림 + 콘텐츠 표시 |
| 2 | 승인 동작 | "승인" 클릭 → API 호출 → 패널 닫힘 |
| 3 | 수정 동작 | "수정" → 에디터 → 수정 저장 → API 호출 |
| 4 | 리뷰 이력 | 이력 토글 → 과거 리뷰 목록 표시 |

Mock 대상:
- `POST /hitl/review` → 201 Created
- `GET /hitl/history/:artifactId` → 리뷰 이력 배열

### 2.4 discovery-tour.spec.ts (F265)

| # | 시나리오 | 검증 내용 |
|---|----------|-----------|
| 1 | 첫 방문 투어 | localStorage 비어있음 → 자동 시작 → 스포트라이트 표시 |
| 2 | 5스텝 완료 | 다음→다음→...→완료 → localStorage에 완료 기록 |
| 3 | 재방문 미표시 | localStorage 완료 상태 → 투어 미표시 |

---

## 3. Feature Flag 설계

### 3.1 localStorage 기반 토글

```typescript
// 초기 2명 대상 배포를 위한 간단한 Feature Flag
const FEATURE_FLAGS = {
  "discovery-wizard": true,   // F263
  "help-agent": true,         // F264
  "discovery-tour": true,     // F265
  "hitl-panel": true,         // F266
};

// 확인: localStorage.getItem("fx-feature-flags")
// 없으면 기본값(모두 활성) 사용
```

### 3.2 적용 위치

`packages/web/src/lib/feature-flags.ts` 신규 유틸:
- `isFeatureEnabled(flag: string): boolean`
- `discovery.tsx` 라우트에서 wizardMode 기본값 결정에 사용

---

## 4. 구현 파일 목록

| # | 경로 | 동작 |
|---|------|------|
| 1 | `packages/web/e2e/discovery-wizard.spec.ts` | 신규 |
| 2 | `packages/web/e2e/help-agent.spec.ts` | 신규 |
| 3 | `packages/web/e2e/hitl-review.spec.ts` | 신규 |
| 4 | `packages/web/e2e/discovery-tour.spec.ts` | 신규 |
| 5 | `packages/web/src/lib/feature-flags.ts` | 신규 |

---

## 5. 성공 기준

- [ ] E2E 4개 spec 파일 모두 통과
- [ ] Help Agent: 로컬 응답 + SSE 스트리밍 응답 검증
- [ ] HITL: 4가지 액션(승인/수정/재생성/거부) 중 승인+수정 검증
- [ ] 온보딩 투어: 첫 방문→완료→재방문 3단계 검증
- [ ] Feature Flag 유틸 작성 완료
