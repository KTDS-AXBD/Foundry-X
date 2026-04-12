---
code: FX-ANLS-113
title: Sprint 113 Gap Analysis — Role-based Sidebar + 리브랜딩
version: 1.0
status: Active
category: ANLS
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 113
f-items: F288, F289
design-ref: FX-DSGN-113
---

# Sprint 113 Gap Analysis — Role-based Sidebar + 리브랜딩

> Design 참조: [[FX-DSGN-113]] `docs/02-design/features/sprint-113-ia-structure.design.md`

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F288 Role-based Sidebar + F289 리브랜딩 |
| **Sprint** | 113 |
| **분석일** | 2026-04-03 |
| **Match Rate** | **92%** (11/12 항목 Pass) |

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 팀원에게 개발자 전용 메뉴 노출 + Figma v0.92 명칭 불일치 |
| **Solution** | NavItem.visibility + useUserRole 필터링 + 리브랜딩 3건 |
| **Function/UX Effect** | Member ~18메뉴, Admin ~29메뉴. Role 기반 네비게이션 |
| **Core Value** | BD 팀원이 사업개발 워크플로에 집중할 수 있는 역할 기반 UX |

---

## 검증 결과

| V# | 검증 항목 | 결과 | 근거 |
|----|----------|:----:|------|
| V-01 | NavItem에 visibility 속성 존재 | ✅ | sidebar.tsx L70-76 |
| V-02 | isVisible 유틸 함수 존재 + 정상 동작 | ✅ | sidebar.tsx L88-96 + T-01~T-04 |
| V-03 | Admin 전용 메뉴 9개 마킹 | ✅ | adminGroup, externalGroup, knowledge 3아이템 |
| V-04 | Member 로그인 시 관리/외부서비스 미노출 | ✅ | T-05 통과 |
| V-05 | Admin 로그인 시 전체 메뉴 노출 | ✅ | T-06 통과 |
| V-06 | 리브랜딩 3건 반영 | ✅ | T-07 (Field 수집), T-08 (IDEA Portal), T-09 (PRD) |
| V-07 | 지식 그룹 아이템 레벨 필터링 | ✅ | T-10 + isVisible 유닛테스트 |
| V-08 | 시작하기 조건부 노출 | ✅ | topItems conditional visibility |
| V-09 | Member 하단 도움말+설정 노출 | ✅ | memberBottomItems + !isAdmin 조건 |
| V-10 | 기존 Web 테스트 전체 통과 | ✅ | 287/287 pass |
| V-11 | TypeScript 에러 0건 | ✅ | tsc --noEmit 통과 |
| V-12 | E2E 35 specs 통과 | ⏭️ | CI에서 확인 (로컬 Playwright 미설치) |

---

## 변경 파일 요약

| 파일 | 변경 유형 | 변경 내용 |
|------|:--------:|----------|
| `packages/web/src/components/sidebar.tsx` | MODIFY | Visibility 타입 + isVisible + NavLinks 필터링 + 리브랜딩 |
| `packages/web/src/__tests__/sidebar-visibility.test.tsx` | NEW | 14개 테스트 (유닛 5 + 통합 9) |

---

## 미해결 항목

- V-12 E2E: CI/CD 파이프라인에서 자동 검증 예정 (PR merge 전 GitHub Actions)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial analysis — Match 92% | Sinclair Seo |
