---
code: FX-RPRT-094
title: "Sprint 94 Report — 발굴 UX: 위저드 UI(F263) + 온보딩 투어(F265)"
version: "1.0"
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Claude (Autopilot)
system-version: "1.8.0"
sprint: 94
f-items: [F263, F265]
---

# Sprint 94 Report — 발굴 UX: 위저드 UI + 온보딩 투어

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263 발굴 프로세스 위저드 UI + F265 온보딩 투어 |
| Sprint | 94 |
| 시작일 | 2026-03-31 |
| 완료일 | 2026-03-31 |
| Match Rate | **95%** |

### Results

| 지표 | 값 |
|------|-----|
| Match Rate | 95% |
| 신규 파일 | 11개 |
| 수정 파일 | 3개 |
| 신규 테스트 | 19개 |
| D1 마이그레이션 | 1개 (0077) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 메뉴 나열형 → 팀원 CC Cowork 의존, Foundry-X 미사용 |
| Solution | 위저드/스텝퍼 UI + biz-item별 진행 추적 + 온보딩 투어 |
| Function UX Effect | 단계별 하이라이트, 스킬·산출물 안내, 첫 방문자 가이드 |
| Core Value | 발굴 기능 실사용 전환 기반 마련 |

## Deliverables

### API (packages/api/)

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 1 | `db/migrations/0077_biz_item_discovery_stages.sql` | 신규 | biz-item별 11단계 진행 추적 테이블 |
| 2 | `schemas/discovery-stage.ts` | 신규 | Zod 스키마 (stage/status 유효성) |
| 3 | `services/discovery-stage-service.ts` | 신규 | getProgress, updateStage, initStages |
| 4 | `routes/discovery-stages.ts` | 신규 | GET progress + POST stage |
| 5 | `app.ts` | 수정 | 라우트 등록 |

### Web (packages/web/)

| # | 파일 | 유형 | 설명 |
|---|------|------|------|
| 6 | `components/feature/discovery/DiscoveryWizard.tsx` | 신규 | F263 메인 — 아이템 선택 + 스텝퍼 + 상세 |
| 7 | `components/feature/discovery/WizardStepper.tsx` | 신규 | 11단계 수평 진행 바 |
| 8 | `components/feature/discovery/WizardStepDetail.tsx` | 신규 | 단계별 상세 패널 (목적/스킬/산출물/질문) |
| 9 | `components/feature/discovery/DiscoveryTour.tsx` | 신규 | F265 5스텝 인터랙티브 투어 |
| 10 | `routes/ax-bd/discovery.tsx` | 수정 | 위저드 중심 재구성 (169줄 → 15줄) |
| 11 | `lib/api-client.ts` | 수정 | getDiscoveryProgress, updateDiscoveryStage |

### 테스트

| # | 파일 | Tests | 결과 |
|---|------|:-----:|:----:|
| 12 | `api/__tests__/discovery-stages.test.ts` | 11 | ✅ |
| 13 | `web/__tests__/discovery-wizard.test.tsx` | 5 | ✅ |
| 14 | `web/__tests__/discovery-tour.test.tsx` | 3 | ✅ |

### PDCA 문서

| 문서 | 코드 |
|------|------|
| Plan | FX-PLAN-094 |
| Design | FX-DSGN-094 |
| Analysis | FX-ANLS-094 |
| Report | FX-RPRT-094 |

## Architecture Decisions

1. **라우트 독립 등록**: Design은 biz-items.ts 하위 마운트였으나, 프로젝트 패턴에 맞게 app.ts 직접 등록으로 구현
2. **접이식 프로세스 흐름**: ProcessFlowV82, TypeRoutingMatrix를 접이식으로 감싸서 위저드에 집중하도록 UX 개선
3. **Lazy Init**: getProgress 호출 시 레코드 없으면 11단계 자동 초기화 (별도 init 호출 불필요)
4. **투어 독립 관리**: DiscoveryTour가 자체 localStorage로 상태 관리 — 페이지 컴포넌트에 의존하지 않음
