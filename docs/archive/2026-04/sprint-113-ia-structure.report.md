---
code: FX-RPRT-113
title: Sprint 113 Report — Role-based Sidebar + 리브랜딩
version: 1.0
status: Active
category: RPRT
created: 2026-04-03
updated: 2026-04-03
author: Sinclair Seo
sprint: 113
f-items: F288, F289
plan-ref: FX-PLAN-113
design-ref: FX-DSGN-113
analysis-ref: FX-ANLS-113
---

# Sprint 113 Report — Role-based Sidebar + 리브랜딩

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F288 Role-based Sidebar + F289 리브랜딩 |
| **Sprint** | 113 |
| **Phase** | Phase 11-A (IA 구조 기반) |
| **완료일** | 2026-04-03 |
| **Match Rate** | **92%** (11/12) |
| **변경 파일** | 2개 (sidebar.tsx MODIFY + sidebar-visibility.test.tsx NEW) |
| **테스트** | 287/287 pass (기존 273 + 신규 14) |

| Perspective | Content |
|-------------|---------|
| **Problem** | BD 팀원에게 개발자 전용 메뉴(토큰/에이전트/아키텍처 등) 노출 → 혼란. Figma v0.92 명칭 불일치 |
| **Solution** | NavItem.visibility 속성 + useUserRole 필터링 + 리브랜딩 3건 |
| **Function/UX Effect** | Member ~18메뉴, Admin ~29메뉴. BD 프로세스 6단계에 집중 가능 |
| **Core Value** | 역할 기반 네비게이션으로 BD 팀원의 플랫폼 진입 장벽 해소 |

---

## PDCA 참조 체인

```
FX-PLAN-113 → FX-DSGN-113 → (Implement) → FX-ANLS-113 → FX-RPRT-113
```

---

## 구현 상세

### F288: Role-based Sidebar Visibility

1. **NavItem/NavGroup 인터페이스 확장**: `visibility` + `condition` 필드 추가
2. **isVisible() 유틸 함수**: `all` / `admin` / `conditional` 3가지 가시성 모드
3. **useUserRole() 연결**: JWT 기반 role → `isAdmin` 플래그 → useMemo 필터링
4. **Admin 전용 마킹**: adminGroup(그룹 레벨), externalGroup(그룹 레벨), knowledgeGroup 3아이템(아이템 레벨)
5. **Member 하단**: 도움말 + 설정 별도 제공 (admin 그룹 숨김 대체)
6. **시작하기 조건부**: 온보딩 완료(localStorage) 시 상단에서 숨김

### F289: 메뉴 리브랜딩

| 변경 전 | 변경 후 | 위치 |
|---------|---------|------|
| 수집 채널 | Field 수집 | 1단계 수집 |
| IR Bottom-up | IDEA Portal | 1단계 수집 |
| Spec 생성 | PRD | 3단계 형상화 |

---

## 테스트 요약

| 테스트 종류 | 수량 | 결과 |
|------------|:----:|:----:|
| isVisible 유닛테스트 | 5 | ✅ |
| Sidebar 통합 테스트 | 9 | ✅ |
| 기존 Web 테스트 | 273 | ✅ |
| **합계** | **287** | **✅ all pass** |

---

## 학습 포인트

1. **Sidebar mobile+desktop 듀얼 렌더링**: `getAllByText` 사용 필요 (중복 DOM)
2. **CollapsibleGroup 닫힌 상태**: 내부 아이템 DOM 미존재 → 그룹 헤더로 존재 검증
3. **isVisible을 순수 함수로 export**: 렌더링 없이 비즈니스 로직 단독 테스트 가능

---

## 다음 단계

- [ ] Sprint 114: F290 Route namespace migration (URL 경로 변경)
- [ ] Sprint 114 이후: Phase 11-B 기능 확장 (F291~F296)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-03 | Initial report — Sprint 113 완료 | Sinclair Seo |
