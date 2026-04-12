---
code: FX-RPRT-S114
title: Sprint 114 완료 보고서 — Route Namespace 마이그레이션 (F290)
version: 1.0
status: Active
category: RPRT
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 114
f-items: F290
phase: "Phase 11-A"
refs: FX-PLAN-114, FX-DSGN-114, FX-ANLS-114
---

# Sprint 114 완료 보고서 — F290 Route Namespace 마이그레이션

## Executive Summary

| Item | Value |
|------|-------|
| **Feature** | F290 — Route Namespace 마이그레이션 |
| **Sprint** | 114 |
| **Phase** | Phase 11-A (IA 구조 기반) |
| **Duration** | ~15분 (단일 구현) |
| **Match Rate** | 100% (22/22 PASS) |
| **Changed Files** | 30개 |
| **Changed Lines** | +155 / -118 |

### Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | flat URL 구조가 BD 6단계 프로세스 소속을 반영하지 못해 사용자 혼란 + sidebar ↔ URL 불일치 |
| **Solution** | 6단계 namespace prefix 도입 + Navigate redirect 16건 + 컴포넌트/E2E 경로 일괄 갱신 |
| **Function/UX Effect** | URL만으로 프로세스 단계 직관적 파악. 기존 북마크/딥링크는 자동 redirect로 끊김 없음 |
| **Core Value** | BD 라이프사이클이 URL 구조에 1:1 반영 — "경로를 보면 단계가 보인다" |

---

## 1. Scope Delivered

### F290: Route Namespace 마이그레이션

| 작업 | 상세 | 파일 수 |
|------|------|:-------:|
| router.tsx 재구성 | 22건 경로 namespace 전환 + 16건 Navigate redirect + 외부 서비스 이전 | 1 |
| sidebar.tsx href 갱신 | processGroups + externalGroup 16건 | 1 |
| ProcessStageGuide.tsx | STAGES 6개 paths + nextAction 갱신 | 1 |
| 컴포넌트 내부 링크 | dashboard, getting-started, MemberQuickStart, AdminQuickGuide, CoworkSetupGuide, progress, discovery-detail, shaping-detail, bdp-detail, offering-pack-detail, offering-pack-givc-pitch, sr-detail, ontology | 13 |
| E2E 테스트 | 14개 spec 파일 경로 갱신 | 14 |

### Namespace 구조

| 단계 | Namespace | 경로 수 |
|:----:|-----------|:-------:|
| 1-수집 | `/collection/*` | 4 |
| 2-발굴 | `/discovery/*` | 5 |
| 3-형상화 | `/shaping/*` | 7 |
| 4-검증 | `/validation/*` | 1 |
| 5-제품화 | `/product/*` | 1 |
| 6-GTM | `/gtm/*` | 1 |
| 외부 | `/external/*` | 2 |
| **합계** | | **21** |

---

## 2. Quality Metrics

| Metric | Result |
|--------|--------|
| TypeScript typecheck | ✅ 에러 0건 |
| Web tests | ✅ 287/287 pass |
| Build | ✅ 성공 (501ms) |
| Match Rate | ✅ 100% |

---

## 3. Phase 11-A Progress

| F-item | 제목 | 상태 | Sprint |
|:------:|------|:----:|:------:|
| F288 | Role-based Sidebar | ✅ | 113 |
| F289 | 리브랜딩/재배치 | ✅ | 113 |
| **F290** | **Route Namespace 마이그레이션** | **✅** | **114** |

Phase 11-A (구조 기반) 3건 **전체 완료**.

---

## 4. Lessons Learned

1. **API 경로 vs 프론트엔드 라우트 구분 필수**: `fetchApi("/offering-packs")`와 `<Link to="/offering-packs">`는 동일 문자열이지만 용도가 다름. 일괄 치환 시 API 경로를 건드리면 서버 호출이 깨짐.
2. **ontology.tsx 추가 발견**: Design 명세에 없었지만 grep sweep에서 `/ax-bd` 링크 1건 추가 발견. 전수 조사의 중요성.
3. **React Router v6 best-match**: redirect와 실제 라우트가 같은 prefix를 공유해도 specificity 기반 매칭으로 안전하게 공존.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial report — Sprint 114 완료 | Sinclair Seo |
