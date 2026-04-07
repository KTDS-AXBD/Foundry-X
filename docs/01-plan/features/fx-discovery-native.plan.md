# fx-discovery-native Planning Document

> **Summary**: Foundry-X를 2.발굴 + 3.형상화 전문 도구로 재구축 — 사이드바 정리, Discovery iframe 제거 및 네이티브 전환, 아이템→분석→기획서 E2E 흐름 구현
>
> **Project**: Foundry-X
> **Author**: AX BD팀
> **Date**: 2026-04-07
> **Status**: Draft
> **PRD**: `docs/specs/fx-discovery-native/prd-final.md`
> **SPEC**: Phase 24, F434~F440

---

## 1. Overview

### 1.1 Purpose

사용자가 사업 아이템을 등록하면, 발굴 분석(11단계)을 단계별로 진행하고, 분석 완료 후 형상화 산출물(기획서→Offering→PRD→Prototype)을 파이프라인으로 생성할 수 있는 **일관된 흐름**을 구현한다.

### 1.2 Background

- **MSA 재조정**: Foundry-X는 AX BD 프로세스 중 2.발굴 + 3.형상화에 집중하는 서비스로 재정의
- **현재 문제**: 6단계 메뉴 전체 존재, Discovery iframe 단절, 형상화 산출물 간 연결 없음, 데이터 불일치
- **결정**: Clean Slate(새 데이터), 네이티브 전환, MVP 우선(아이템→발굴→기획서)

### 1.3 Related Documents

- PRD: `docs/specs/fx-discovery-native/prd-final.md`
- Interview Log: `docs/specs/fx-discovery-native/interview-log.md`
- 기존 Discovery UI v2: `docs/specs/fx-discovery-ui-v2/prd-final.md`
- AX BD 프로세스: `docs/specs/axbd/`

---

## 2. Scope

### 2.1 In Scope (F434~F440)

- [F434] 사이드바 정리 — 2.발굴 + 3.형상화만 남기고 1/4/5/6 제거
- [F435] 위저드형 온보딩 — 시작하기 페이지 재구축, 아이템 등록 위저드
- [F436] 아이템 등록 CRUD — 새 스키마 또는 기존 biz_items 활용
- [F437] 발굴 분석 대시보드 — 아이템별 11단계 진행 상태 UI
- [F438] 발굴 분석 실행 — AI 자동 수행 + 사용자 검토 (MVP: 3단계 이상)
- [F439] 아이템 상세 허브 — 기본정보 + 발굴결과 + 형상화 산출물 통합
- [F440] 사업기획서 생성 — 발굴 결과 기반 AI 자동 생성

### 2.2 Out of Scope

- 1.수집, 4.검증, 5.제품화, 6.GTM 기능 (MSA 분리)
- Offering/PRD/Prototype 생성 (P1 후속)
- Discovery-X(dx.minu.best) iframe 유지
- 기존 데이터 마이그레이션

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item | Status |
|----|-------------|----------|--------|--------|
| FR-01 | 사이드바에 2.발굴 + 3.형상화 processGroup만 표시, 나머지 제거 | High | F434 | Pending |
| FR-02 | Admin 메뉴(Auth/Portal/Gate/Launch/Core)는 유지 | High | F434 | Pending |
| FR-03 | 불필요한 라우트(1/4/5/6단계) 제거 또는 리다이렉트 | Medium | F434 | Pending |
| FR-04 | 위저드 UI: 프롬프트 입력 또는 자료 업로드로 아이템 등록 | High | F435 | Pending |
| FR-05 | 아이템 목록 페이지: 내 아이템 카드 뷰 + 상태 필터 | High | F436 | Pending |
| FR-06 | 아이템 CRUD API: 기존 `POST /biz-items` 활용 + 확장 | High | F436 | Pending |
| FR-07 | 11단계 분석 스텝퍼/타임라인 UI | High | F437 | Pending |
| FR-08 | 각 분석 단계 실행 트리거 + AI 결과 표시 | High | F438 | Pending |
| FR-09 | 아이템 상세: 탭 또는 섹션으로 기본정보/분석/산출물 통합 | High | F439 | Pending |
| FR-10 | 형상화 파이프라인 상태 바: 기획서→Offering→PRD→Prototype | Medium | F439 | Pending |
| FR-11 | 사업기획서 AI 생성: 기존 `POST /biz-items/:id/generate-business-plan` 활용 | High | F440 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | 페이지 전환 < 1초, AI 분석 결과 스트리밍 표시 | Lighthouse, 체감 |
| UX | 비개발자가 3분 내 첫 아이템 등록 가능 | 사용자 테스트 |
| 접근성 | 키보드 내비게이션, 충분한 콘트라스트 | 수동 점검 |

---

## 4. Existing Assets Analysis

### 4.1 기존 API 엔드포인트 (재사용 가능)

> `packages/api/src/core/discovery/routes/biz-items.ts`에 이미 풍부한 API가 존재

| 카테고리 | 엔드포인트 | 재사용 | 비고 |
|----------|-----------|:------:|------|
| **CRUD** | `GET/POST /biz-items`, `GET /biz-items/:id` | ✅ | 아이템 등록/조회 |
| **분류** | `POST /biz-items/:id/classify` | ✅ | 5유형 분류 |
| **평가** | `POST /biz-items/:id/evaluate` | ✅ | 다관점 평가 |
| **시작점** | `POST /biz-items/:id/starting-point` | ✅ | 5시작점 분류 |
| **분석경로** | `GET /biz-items/:id/analysis-path-v82` | ✅ | v8.2 분석 경로 |
| **9기준** | `GET/PATCH /biz-items/:id/discovery-criteria/:id` | ✅ | 9기준 체크포인트 |
| **분석컨텍스트** | `POST/GET /biz-items/:id/analysis-context` | ✅ | 단계별 분석 저장 |
| **다음안내** | `GET /biz-items/:id/next-guide` | ✅ | 다음 단계 안내 |
| **트렌드** | `POST /biz-items/:id/trend-report` | ✅ | 트렌드 분석 |
| **경쟁사** | `POST /biz-items/:id/competitor-scan` | ✅ | 경쟁사 스캔 |
| **PRD생성** | `POST /biz-items/:id/generate-prd` | ✅ | PRD 자동 생성 |
| **기획서** | `POST /biz-items/:id/generate-business-plan` | ✅ | 사업기획서 생성 |
| **프로토타입** | `POST /biz-items/:id/generate-prototype` | ✅ | 프로토타입 생성 |
| **Six Hats** | `POST /biz-items/:id/prd/:prdId/sixhats` | ✅ | 토론 세션 |

### 4.2 기존 프론트엔드 컴포넌트 (재사용 가능)

| 컴포넌트 | 경로 | 재사용 | 용도 |
|----------|------|:------:|------|
| `DiscoveryWizard` | `components/feature/discovery/` | ✅ | 위저드 UI 기반 |
| `DiscoveryTour` | `components/feature/discovery/` | ✅ | 온보딩 투어 |
| `ProcessGuide` | `components/feature/ax-bd/` | 🔄 | 프로세스 가이드 (수정 필요) |
| `offering-create-wizard` | `routes/offering-create-wizard.tsx` | ✅ | Offering 생성 (biz-item 선택) |
| `ShapingRunCard` | `components/feature/shaping/` | 🔄 | 형상화 카드 (수정) |

### 4.3 기존 라우트 (정리 대상)

| 라우트 그룹 | 현재 라우트 수 | 처리 |
|------------|:------------:|------|
| 1.수집 (collection/) | 4개 | 🗑️ 제거 |
| 2.발굴 (discovery/) | 8개 | ✅ 유지 + 재구성 |
| 3.형상화 (shaping/) | 12개 | ✅ 유지 + 재구성 |
| 4.검증 (validation/) | 4개 | 🗑️ 제거 |
| 5.제품화 (product/) | 4개 | 🗑️ 제거 |
| 6.GTM (gtm/) | 3개 | 🗑️ 제거 |
| ax-bd 하위 | 12개 | 🔄 정리 (일부 유지) |
| 외부 서비스 | 2개 | 🗑️ 제거 |
| 리다이렉트 | 16개 | 🔄 정리 |
| 관리/설정 | 11개 | ✅ 유지 |

---

## 5. Implementation Strategy

### 5.1 Sprint 배정

| Sprint | F-items | 마일스톤 | 예상 변경 |
|--------|---------|---------|----------|
| **209** | F434, F435 | 24-A: IA 정리 + 온보딩 | sidebar.json, router.tsx, getting-started.tsx |
| **210** | F436, F437 | 24-B: 발굴 네이티브 | 아이템 목록/CRUD 페이지, 분석 대시보드 |
| **211** | F438 | 24-B: 발굴 분석 실행 | AI 연동, 분석 결과 UI |
| **212** | F439, F440 | 24-C: 허브 + 기획서 | 아이템 상세 통합, 기획서 생성 |

### 5.2 Sprint 209 상세 (F434 + F435)

#### F434: 사이드바 정리

**변경 파일:**
1. `packages/web/content/navigation/sidebar.json`
   - `processGroups`에서 `collect`, `validate`, `productize`, `gtm` 제거
   - `discover` + `shape` 만 유지
   - `discover` items 재구성: 기존 2개 → `내 아이템`, `(동적 상세)`
   - `shape` items 재구성: 기존 5개 → `사업기획서`, `Offering`, `PRD`, `Prototype`
   - `topItems`의 `시작하기` → `아이템 등록` (위저드 링크)

2. `packages/web/src/router.tsx`
   - 1/4/5/6단계 라우트 블록을 제거 또는 `/discovery`로 리다이렉트
   - 관련 리다이렉트 정리

3. `packages/web/src/lib/navigation-loader.ts`
   - 제거된 아이콘 키 정리 (필요 시)

#### F435: 위저드형 온보딩

**변경 파일:**
1. `packages/web/src/routes/getting-started.tsx`
   - 기존 5탭 온보딩 → 위저드형 아이템 등록 UI로 재구축
   - Step 1: 프롬프트 입력 (텍스트) 또는 자료 업로드
   - Step 2: AI가 아이템 초안 생성 (제목, 설명, 키워드 추출)
   - Step 3: 사용자 확인 → `POST /biz-items` 호출 → 아이템 생성
   - Step 4: 생성 완료 → 발굴 분석 시작 CTA

2. 기존 `DiscoveryWizard` 컴포넌트 참조 (재사용 가능 부분 식별)

### 5.3 Sprint 210 상세 (F436 + F437)

#### F436: 아이템 등록 CRUD

**변경 파일:**
1. `packages/web/src/routes/discovery-unified.tsx` → 재구축
   - 기존 3탭(대시보드/프로세스/BMC) → 아이템 목록 카드 뷰
   - 각 카드: 아이템명, 상태 뱃지, 분석 진행률, 최근 활동
   - 상태 필터: 전체 / 분석 중 / 형상화 중 / 완료

2. 기존 API `GET /biz-items` (org 필터, status/source 쿼리) 활용
3. `POST /biz-items` → 위저드에서 호출 (F435와 연결)

**데이터 결정 (Clean Slate):**
- 기존 biz_items 테이블 구조 유지 (스키마 변경 최소화)
- DB 데이터만 정리 (새 org/프로젝트에서 시작)
- 필요 시 `status` 컬럼 값 정리 (사용하지 않는 상태 제거)

#### F437: 발굴 분석 대시보드

**변경 파일:**
1. 아이템 상세 내 분석 섹션 (새 컴포넌트)
   - 11단계 스텝퍼 UI: 각 단계별 상태 (대기/진행중/완료)
   - 기존 API 활용:
     - `GET /biz-items/:id/discovery-criteria` → 9기준 체크리스트
     - `GET /biz-items/:id/analysis-context` → 단계별 분석 결과
     - `GET /biz-items/:id/next-guide` → 다음 단계 안내

### 5.4 Sprint 211 상세 (F438)

#### F438: 발굴 분석 실행

**MVP 범위: 11단계 중 최소 3단계 구현**

| 단계 | API | MVP |
|------|-----|:---:|
| 2-0 시작점 분류 | `POST /biz-items/:id/starting-point` | ✅ |
| 2-1 자동 분류 | `POST /biz-items/:id/classify` | ✅ |
| 2-2 다관점 평가 | `POST /biz-items/:id/evaluate` | ✅ |
| 2-3~2-10 심화 분석 | `POST /biz-items/:id/analysis-context` | 🔜 후속 |

**구현:**
1. "분석 시작" 버튼 → 순차 API 호출 (2-0 → 2-1 → 2-2)
2. 각 단계 완료 시 스텝퍼 업데이트 + 결과 패널 표시
3. 결과 검토 UI: 접기/펼치기, 사용자 보완 입력
4. 전체 완료 시 "형상화 진행" CTA 활성화

### 5.5 Sprint 212 상세 (F439 + F440)

#### F439: 아이템 상세 허브

**새 라우트:** `/discovery/items/:id` (기존 `ax-bd/discovery-detail.tsx` 재구축)

**레이아웃:**
```
┌─────────────────────────────────────────────┐
│ 아이템명 | 상태 뱃지 | 등록일               │
├─────────────────────────────────────────────┤
│ [기본정보] [발굴분석] [형상화]               │  ← 탭
├─────────────────────────────────────────────┤
│                                             │
│  기본정보 탭:                                │
│  - 제목, 설명, 키워드, 첨부 자료             │
│  - 편집 가능                                │
│                                             │
│  발굴분석 탭:                                │
│  - 11단계 스텝퍼 + 각 단계 결과              │
│  - "분석 시작/재실행" 버튼                   │
│                                             │
│  형상화 탭:                                  │
│  - 파이프라인 상태 바                        │
│    [기획서 ✅] → [Offering ⬜] → [PRD ⬜]   │
│  - 완료된 산출물 바로가기                    │
│  - 다음 단계 생성 CTA                        │
│                                             │
└─────────────────────────────────────────────┘
```

#### F440: 사업기획서 생성

**기존 API 활용:** `POST /biz-items/:id/generate-business-plan`
- 발굴 분석 완료 확인 → 기획서 생성 트리거
- 생성 중 로딩 상태 표시
- 완료 후 기획서 열람/편집 UI
- 기존 `GET /biz-items/:id/business-plan` 으로 조회

---

## 6. Success Criteria

### 6.1 Definition of Done

- [ ] 사이드바에 2.발굴 + 3.형상화만 표시
- [ ] 위저드로 아이템 등록 가능
- [ ] 등록된 아이템에 대해 최소 3단계 발굴 분석 실행 가능
- [ ] 아이템 상세에서 기본정보 + 분석결과 + 형상화 상태 확인 가능
- [ ] 발굴 완료 아이템에서 사업기획서 생성 가능
- [ ] typecheck + lint + build 통과
- [ ] E2E 테스트 추가 (핵심 플로우 최소 1개)

### 6.2 Quality Criteria

- [ ] Zero lint errors
- [ ] Build succeeds
- [ ] 기존 E2E 중 영향받는 테스트 수정 완료

---

## 7. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 기존 라우트 제거 시 E2E 대량 실패 | High | High | 제거 라우트의 E2E를 먼저 식별하여 skip 또는 수정 |
| AI 분석 API 응답 품질 불균일 | Medium | Medium | MVP에서 3단계만 구현, 품질 검증 후 확대 |
| 기존 biz_items 스키마와 새 흐름 불일치 | Medium | Low | 스키마 변경 최소화, 필요 시 마이그레이션 |
| sidebar 변경이 Admin 메뉴에 영향 | Low | Low | adminGroups는 별도 구조, processGroups만 수정 |
| 형상화 Offering/PRD 페이지가 기존 데이터에 의존 | Medium | Medium | Clean Slate로 빈 상태에서 시작, 기존 페이지는 빈 목록 표시 |

---

## 8. Architecture Considerations

### 8.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 Foundry-X 모노리포 구조(Vite + React + Hono + D1) 그대로 활용.

### 8.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| Discovery iframe vs 네이티브 | 네이티브 | 데이터 연결 + 사용자 경험 통합 |
| 기존 API 재사용 vs 새 API | 기존 재사용 | 20+ 엔드포인트 이미 존재, 프론트만 재구축 |
| biz_items 스키마 | 기존 유지 | Clean Slate는 데이터만, 스키마는 유지 |
| 위저드 구현 | 기존 DiscoveryWizard 확장 | 기반 컴포넌트 재활용 |
| 상태관리 | Zustand (기존) | 프로젝트 표준 |
| 스타일 | CSS Modules (기존) | 프로젝트 표준, Tailwind 미사용 |

### 8.3 라우트 구조 (To-Be)

```
Router (To-Be):
├── / (Landing)
├── /login, /invite
├── Protected Routes
│   ├── /dashboard          ← 재구축: 내 아이템 현황
│   ├── /getting-started    ← F435: 위저드 온보딩
│   │
│   ├── /discovery          ← F436: 아이템 목록 (재구축)
│   ├── /discovery/items    ← 유지 (위저드)
│   ├── /discovery/items/:id ← F439: 아이템 상세 허브 (재구축)
│   ├── /discovery/report   ← 유지
│   │
│   ├── /shaping/business-plan ← 유지
│   ├── /shaping/offerings/*   ← 유지
│   ├── /shaping/offering/*    ← 유지
│   ├── /shaping/prd           ← 유지
│   ├── /shaping/prototype     ← 유지
│   │
│   ├── /wiki, /settings       ← 유지
│   └── Admin routes           ← 유지
```

---

## 9. Convention Prerequisites

### 9.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] `.claude/rules/coding-style.md` exists
- [x] ESLint configuration (flat config)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] PostToolUse hooks (auto lint+typecheck)

### 9.2 Environment Variables

| Variable | Purpose | Scope | Status |
|----------|---------|-------|:------:|
| `VITE_API_URL` | API 엔드포인트 | Client | ✅ 존재 |
| `ANTHROPIC_API_KEY` | AI 분석 | Server (Workers) | ✅ 존재 |
| `OPENROUTER_API_KEY` | AI 멀티모델 | Server (Workers) | ✅ 존재 |

---

## 10. Next Steps

1. [x] Plan 문서 작성
2. [ ] Design 문서 작성 (`/pdca design fx-discovery-native`)
3. [ ] Sprint 209 실행 (F434 사이드바 + F435 온보딩)
4. [ ] Sprint 210~212 순차 실행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | 초안 — PRD + 코드 분석 기반 | AX BD팀 (Claude) |
