---
code: FX-PLAN-S169
title: "Sprint 169 — Offerings 목록 + 생성 위자드 (F374, F375)"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-S169]]"
---

# Sprint 169: Offerings 목록 + 생성 위자드

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F374 (Offerings 목록 페이지) + F375 (Offering 생성 위자드) |
| Sprint | 169 |
| Phase | 18-C (Full UI) |
| 우선순위 | P0 |
| 의존성 | Sprint 167 (F370 CRUD API) ✅ 완료, Sprint 168 (F372 Export + F373 Validate) ✅ 완료 |
| Design | docs/02-design/features/sprint-169.design.md |
| PRD | docs/specs/fx-offering-pipeline/prd-final.md §2-3 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Offerings CRUD API는 있으나 Web UI가 없어 사용자가 사업기획서를 시각적으로 관리/생성 불가 |
| Solution | Offerings 목록 페이지(상태 필터 + 버전 히스토리) + 멀티스텝 생성 위자드(발굴 연결 + 목적/포맷/목차 선택) |
| Function UX Effect | 사업기획서 전체 현황 한눈에 파악 + 3단계 위자드로 일관된 생성 경험 |
| Core Value | 형상화 파이프라인의 사용자 진입점 확보, 발굴→형상화 연결고리 완성 |

## 범위 (Scope)

### F374: Offerings 목록 페이지
- **라우트**: `/shaping/offerings` (신규 — 기존 `/shaping/offering`은 Pack 목록)
- **뷰 모드**: Card Grid (기본) — 상태별 컬러 배지, 목적 태그, 생성일/버전 정보
- **상태 필터**: all / draft / generating / review / approved / shared (탭 UI)
- **버전 히스토리**: 카드 클릭 시 상세 페이지 이동, 버전 배지 표시
- **빈 상태**: 일러스트 + "첫 번째 사업기획서를 만들어보세요" CTA
- **API 연동**: `GET /offerings` (기존 API, pagination + filter)
- **api-client**: `fetchOfferings()`, `deleteOffering()` 함수 추가
- **라우터**: `router.tsx`에 `/shaping/offerings` 엔트리 추가
- **사이드바**: 기존 "Offering" → "Pack" 유지, "Offerings" 신규 메뉴 추가

### F375: Offering 생성 위자드
- **라우트**: `/shaping/offerings/new` (신규)
- **3단계 위자드**:
  - Step 1: 발굴 아이템 선택 (기존 biz_items에서 검색/선택)
  - Step 2: 기본 정보 — 제목, 목적(report/proposal/review), 포맷(html/pptx)
  - Step 3: 목차 선택 — 21개 표준 섹션에서 필수/선택 토글 (STANDARD_SECTIONS 활용)
- **API 연동**: `POST /offerings` (기존 API) → 생성 후 상세 페이지로 이동
- **api-client**: `createOffering()`, `fetchBizItems()` 함수 추가
- **UX**: 이전/다음 스텝 네비게이션, 진행 표시기, 스텝별 유효성 검증

### 범위 외
- 섹션 에디터 + HTML 프리뷰 (Sprint 170 F376)
- 교차검증 대시보드 (Sprint 170 F377)
- 콘텐츠 어댑터 (Sprint 171 F378)
- Kanban 뷰 (PRD 언급, 현재는 Card Grid만 — Kanban은 후속 Sprint에서 추가 가능)

## 구현 계획

### Phase A: API Client 확장
1. `api-client.ts` — Offering 관련 fetch/create/delete 함수 추가
2. `api-client.ts` — BizItem 목록 조회 함수 (위자드 Step 1용)

### Phase B: Offerings 목록 페이지 (F374)
1. `packages/web/src/routes/offerings-list.tsx` — 목록 컴포넌트
2. `router.tsx` — `/shaping/offerings` + `/shaping/offerings/new` 라우트 등록
3. 사이드바 메뉴에 "Offerings" 항목 추가

### Phase C: 생성 위자드 (F375)
1. `packages/web/src/routes/offering-create-wizard.tsx` — 3단계 위자드
2. Step 1: BizItem 선택 컴포넌트
3. Step 2: 기본 정보 폼
4. Step 3: 섹션 목차 선택 (21개 표준 섹션 체크박스)

### Phase D: 통합 검증
1. typecheck 통과
2. 기존 테스트 회귀 없음
3. 라우트 접근 확인

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 위자드가 프로젝트 첫 멀티스텝 패턴 | 중 | 상태 관리를 useState 단일 객체로 단순화, 과도한 추상화 방지 |
| BizItem 목록 대량 시 성능 | 하 | 기존 /biz-items API pagination 활용, 검색 필터 추가 |
| 사이드바 메뉴 충돌 (Offering Pack vs Offerings) | 하 | 명확한 라벨 분리: "Pack" vs "Offerings(기획서)" |

## 완료 기준

- [ ] F374: /shaping/offerings 라우트에서 목록 렌더링
- [ ] F374: 상태 필터 탭 동작 (all/draft/generating/review/approved/shared)
- [ ] F374: 빈 상태 + 스켈레톤 로딩 표시
- [ ] F374: 카드에 상태 배지 + 목적 태그 + 버전 + 생성일 표시
- [ ] F374: 삭제 기능 동작
- [ ] F375: /shaping/offerings/new 라우트에서 위자드 렌더링
- [ ] F375: Step 1 — 발굴 아이템 선택 목록 표시
- [ ] F375: Step 2 — 제목/목적/포맷 입력 폼
- [ ] F375: Step 3 — 21개 표준 섹션 토글
- [ ] F375: 생성 완료 후 상세 페이지로 이동
- [ ] typecheck 통과 + 기존 테스트 회귀 없음
