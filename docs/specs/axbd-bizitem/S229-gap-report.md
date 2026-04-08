---
code: FX-ANLS-029
title: S229 Discovery E2E 사용자 여정 검증 — 갭 리포트
version: 1.0
status: Active
category: Analysis
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# S229 Discovery E2E 사용자 여정 검증 — 갭 리포트

## 검증 범위

신규 사용자 관점에서 **사업 아이템 등록 → Discovery 분석 → 형상화 → Prototype** 전체 여정을 코드 분석 + 라이브 서비스(fx.minu.best) 테스트로 검증.

## 요약

| 구분 | 건수 |
|------|------|
| 🔴 Critical (서비스 불능) | 1 |
| 🟠 High (핵심 흐름 끊김) | 5 |
| 🟡 Medium (UX/데이터 불일치) | 8 |
| 🟢 Low (표시/개선) | 4 |
| **합계** | **18** |

---

## 🔴 Critical — 서비스 불능

### C1. Getting Started 위자드 완전 불능 (source enum 불일치)

- **위치**: `packages/web/src/routes/getting-started.tsx:386` → `packages/api/src/core/discovery/schemas/biz-item.ts:4`
- **현상**: 프론트엔드가 `source: "wizard"`를 전송하지만, API Zod 스키마는 `["agent", "field", "idea_portal"]`만 허용
- **결과**: `POST /biz-items` → 400 에러 → **위자드 첫 단계에서 100% 실패**
- **영향**: 신규 사용자가 아이템을 등록할 수 없음. 전체 사용자 여정이 시작 단계에서 차단
- **수정**: API 스키마에 `"wizard"` 추가 또는 프론트엔드에서 `"field"`로 변경

---

## 🟠 High — 핵심 흐름 끊김

### H1. Discovery → 형상화 자동 전환 시 페이지 새로고침 필요

- **위치**: `PipelineTransitionCTA.tsx` (발굴분석 탭 내)
- **현상**: 발굴 분석 완료 후 CTA 버튼이 나타나려면 페이지를 수동 새로고침해야 함
- **원인**: 분석 완료 상태 변경 후 UI 리렌더링이 트리거되지 않음
- **영향**: 사용자가 "다음 단계"를 찾지 못해 이탈 가능

### H2. 기획서 생성 → Offering CTA 동일한 새로고침 문제

- **위치**: `PipelineTransitionCTA.tsx` (형상화 탭 내)
- **현상**: 사업기획서 생성 완료 후 "Offering 단계로 이동" CTA가 즉시 나타나지 않음
- **원인**: H1과 동일 — 비동기 상태 갱신 누락
- **영향**: 파이프라인 흐름이 끊기고, 사용자가 수동으로 메뉴를 찾아야 함

### H3. Offering → Prototype 명시적 연결 부재

- **위치**: Offering 에디터/목록 → Prototype 페이지 간
- **현상**: Offering 작업 완료 후 Prototype으로 가는 CTA/링크가 없음
- **원인**: `PipelineTransitionCTA`에 Offering→Prototype 전환 케이스가 미구현
- **영향**: 사용자가 사이드바에서 수동으로 Prototype 메뉴를 찾아야 함

### H4. Prototype 상세에서 원본 아이템/Offering 역링크 부재

- **위치**: `/shaping/prototype` 상세 뷰
- **현상**: Prototype 제목이 ID(`bi-deny-semi-001`)만 표시, 원본 biz item이나 Offering으로 돌아가는 링크 없음
- **영향**: 맥락 파악 불가 — Prototype만 보면 어떤 사업 아이템의 것인지 알 수 없음

### H5. Discovery→Shaping 트리거 메커니즘 불명확

- **위치**: `POST /biz-items/:id/generate-prd` → `POST /shaping/runs`
- **현상**: Discovery 9기준 완료 후 PRD 생성 → Shaping Run 시작까지의 연결이 코드상 명확하지 않음
- **원인**: PRD 저장소 테이블 미정의 (`discovery_prd_id` FK 대상 불명), Webhook vs 수동 POST 불명
- **영향**: 전체 파이프라인의 자동 흐름이 보장되지 않음

---

## 🟡 Medium — UX/데이터 불일치

### M1. 랜딩 페이지 수치 하드코딩 (Sprint 186 · Phase 20)

- **위치**: `packages/web/src/routes/landing.tsx` (footer + hero 영역)
- **현상**: "Sprint 186 · Phase 20" 표시 — 실제는 Sprint 218 · Phase 25 (현재 Phase 26 진행)
- **영향**: 서비스 신뢰도 저하 — 방문자에게 오래된 프로젝트로 보임

### M2. 대시보드 퀵 액션에 "새 아이템" 없음

- **위치**: 대시보드 퀵 액션 섹션
- **현상**: SR 등록, 아이디어 추가, Spec 생성, 파이프라인 4개만 있고 "새 아이템"이 없음
- **영향**: 신규 사용자가 퀵 액션에서 시작점을 찾지 못함 (사이드바에는 있음)

### M3. 파이프라인 카운트 불일치

- **위치**: 대시보드 프로세스 파이프라인
- **현상**: 모든 스테이지 "0" 표시 vs "전체 4건 진행 중" 텍스트
- **원인**: 카운트 API가 올바른 데이터를 반환하지 않거나, 프론트엔드 매핑 오류
- **영향**: 대시보드의 핵심 지표가 부정확

### M4. Getting Started에서 파일 업로드(Step 0) UI 미노출

- **위치**: `/getting-started` 위자드
- **현상**: 코드에 Step 0(파일 업로드)이 존재하지만 실제 UI에서 3단계만 표시
- **원인**: Step 0이 조건부 표시이거나 제거됨 — 확인 필요
- **영향**: F443(파일 업로드) 기능이 사용자에게 도달하지 않을 수 있음

### M5. Prototype 리뷰 진행률 "0/0" 표시

- **위치**: `/shaping/prototype` → 아이템 상세
- **현상**: 5개 리뷰 섹션이 있는데 리뷰 진행률이 "0/0 승인 (0%)"
- **원인**: 섹션 카운트를 분모로 사용하지 않고 실제 리뷰 건수를 사용
- **영향**: 사용자가 리뷰 진행 상태를 파악할 수 없음

### M6. shaping-artifacts API 404 (형상화 전 아이템)

- **위치**: `GET /api/biz-items/:id/shaping-artifacts`
- **현상**: 아직 형상화에 진입하지 않은 아이템에 접근하면 404
- **원인**: 빈 결과 대신 404 반환
- **영향**: 콘솔 에러 + 사용자에게 불필요한 에러 표시 가능

### M7. 온보딩 투어 오버레이가 하위 요소 클릭 차단

- **위치**: Discovery 목록 페이지 (`/discovery/items`)
- **현상**: 온보딩 투어 overlay(discovery-tour-mask)가 z-index 최상위로 아이템 클릭을 차단
- **원인**: 투어 스텝이 특정 영역만 허용하도록 mask를 사용하지만, 목록 영역을 마스크 밖에 둠
- **영향**: 첫 방문 사용자가 아이템을 클릭하려면 투어를 먼저 닫아야 함

### M8. API 미정의 테이블 다수 (코드 분석)

- **위치**: `packages/api/src/__tests__/helpers/mock-d1.ts`
- **현상**: 다음 테이블이 mock-d1에 미정의
  - `biz_analysis_contexts` (F184)
  - `poc_environments` (Prototype PoC)
  - `tech_reviews` (기술 검증)
  - `prototype_section_reviews` (섹션 리뷰)
- **영향**: 관련 API가 프로덕션에서 동작해도 테스트에서 검증 불가

---

## 🟢 Low — 표시/개선

### L1. Discovery 위저드 페이지와 아이템 상세 페이지 URL 패턴 혼재

- **현상**: 목록에서 `/ax-bd/discovery/bi-koami-001` → 리다이렉트 → `/discovery/items/bi-koami-001`
- **영향**: 경로 일관성 부족, SEO 불리

### L2. Prototype 제목에 아이템명 미표시

- **현상**: "bi-deny-semi-001" (ID만) → "Deny 반도체 — 내부자 리스크 의사결정 AI 플랫폼" 이어야 함
- **영향**: 사용자 경험 저하

### L3. 사이드바 발굴/형상화 서브메뉴 접근성

- **현상**: 서브메뉴가 토글 시 바로 열리지 않는 경우 있음 (Playwright 기준)
- **영향**: 접근성 테스트 시 문제 가능

### L4. 대시보드에서 파이프라인 진행률 vs 아이템 상세 파이프라인 불일치

- **현상**: 대시보드는 6단계(수집~GTM), 아이템 상세는 4단계(발굴~MVP)
- **영향**: 사용자 혼란 — 동일 파이프라인이 다른 단계 수로 보임

---

## 사용자 여정 흐름도 (현재 상태)

```
[Landing Page] ─── "시작하기" ───→ [Dashboard]
                                      │
                                      ├── "새 아이템" ───→ [Getting Started Wizard]
                                      │                        │
                                      │                    🔴 C1: API 400 에러
                                      │                    ❌ 여기서 막힘
                                      │
                                      └── "2. 발굴" ─→ [Discovery 목록]
                                                           │
                                                    아이템 선택 (기존 데이터)
                                                           │
                                                    [Discovery Detail]
                                                      ├── 기본정보 탭 ✅
                                                      ├── 발굴분석 탭 ✅
                                                      │     └── 분석 시작 → 9기준 체크
                                                      │          └── 🟠 H1: CTA 새로고침 필요
                                                      └── 형상화 탭
                                                            ├── 사업기획서 "생성하기" ✅
                                                            │     └── 🟠 H2: CTA 새로고침 필요
                                                            ├── Offering ✅ (목록/편집)
                                                            │     └── 🟠 H3: → Prototype 연결 없음
                                                            ├── PRD ✅
                                                            └── Prototype
                                                                  └── 🟠 H4: 역링크 없음
```

## 다음 단계

이 리포트를 기반으로 **보강 계획(F-item 후보 + 우선순위)**을 수립한다.
