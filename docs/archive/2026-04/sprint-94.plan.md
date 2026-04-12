---
code: FX-PLAN-094
title: "Sprint 94 — 발굴 UX: 위저드 UI(F263) + 온보딩 투어(F265)"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Claude (Autopilot)
system-version: "1.8.0"
sprint: 94
f-items: [F263, F265]
---

# Sprint 94 Plan — 발굴 UX: 위저드 UI + 온보딩 투어

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263 발굴 프로세스 위저드 UI + F265 온보딩 투어 |
| Sprint | 94 |
| 시작일 | 2026-03-31 |
| 예상 소요 | 1 Sprint (Autopilot) |
| PRD | docs/specs/fx-discovery-ux/prd-final.md v2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 메뉴가 나열형 10+항목으로 과다 → 팀원이 어디서 시작할지 모르고 CC Cowork에 의존 |
| Solution | 위저드/스텝퍼 UI로 재구성 + 인터랙티브 온보딩 투어 |
| Function UX Effect | biz-item별 현재 단계 하이라이트 + 다음 할 일 명확 안내 + 첫 방문자 가이드 |
| Core Value | Foundry-X 발굴 기능 실사용 전환 — CC Cowork 대비 구조화된 프로세스 관리 |

---

## 1. 배경 및 목표

### 1.1 현재 상태 (As-Is)
- `routes/ax-bd/discovery.tsx`: 전체 프로세스 흐름 + 유형 매트릭스 + 아이템 리스트가 한 페이지에 나열
- 사이드바에 발굴 관련 메뉴 8개 (프로세스, 아이디어, BMC, 가이드, 카탈로그, 산출물, 진행추적, Ontology)
- `OnboardingTour.tsx`(F252): 사이드바 단위 일반 온보딩 — 발굴 프로세스 특화 없음
- `ProcessFlowV82.tsx`: 11단계 시각화만 제공, biz-item별 진행 추적 없음

### 1.2 목표 상태 (To-Be)
- **F263**: Discovery 페이지를 위저드/스텝퍼 구조로 전환 — biz-item 선택 → 현재 단계 하이라이트 → 단계별 상세(목적/스킬/산출물/다음단계)
- **F265**: 발굴 페이지 첫 방문 시 인터랙티브 3~5스텝 투어 — 아이템 등록 → 유형 분류 → 분석 실행 → 결과 확인 → 다음 단계

---

## 2. 구현 범위

### F263: 발굴 프로세스 단계별 안내 UI

| # | 항목 | 설명 |
|---|------|------|
| 1 | **DiscoveryWizard 컴포넌트** | 스텝퍼 (2-0 ~ 2-10) + 현재 단계 하이라이트 + 클릭 시 단계 상세 패널 |
| 2 | **WizardStepDetail 컴포넌트** | 각 단계의 (a) 목적, (b) 사용 스킬, (c) 예상 산출물, (d) 다음 단계 안내 |
| 3 | **biz-item별 진행 추적 API** | `GET /biz-items/:id/discovery-progress` → 현재 단계 + 완료 단계 목록 |
| 4 | **biz-item 단계 갱신 API** | `POST /biz-items/:id/discovery-stage` → 단계 상태 갱신 (pending/in_progress/completed) |
| 5 | **D1 마이그레이션** | `biz_item_discovery_stages` 테이블 — biz-item별 단계 진행 추적 |
| 6 | **Discovery 페이지 재구성** | 기존 나열형 → 위저드 중심 레이아웃 (아이템 선택 → 스텝퍼 → 단계 상세) |

### F265: 발굴 온보딩 투어 개선

| # | 항목 | 설명 |
|---|------|------|
| 1 | **DiscoveryTour 컴포넌트** | 5스텝 인터랙티브 투어 (스팟라이트 + 툴팁) |
| 2 | **투어 스텝 정의** | ① 위저드 소개 ② 아이템 등록 ③ 유형 분류 ④ 단계별 분석 ⑤ 진행 추적 |
| 3 | **첫 방문 감지** | localStorage `fx-discovery-tour-completed` 체크 |
| 4 | **data-tour 속성 추가** | 위저드 컴포넌트 핵심 영역에 투어 타겟 속성 |

---

## 3. 기술 설계 요약

### 3.1 DB 스키마

```sql
-- 0078_biz_item_discovery_stages.sql
CREATE TABLE biz_item_discovery_stages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-0','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, stage)
);
```

### 3.2 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/biz-items/:id/discovery-progress` | 전 단계 상태 조회 |
| POST | `/biz-items/:id/discovery-stage` | 단계 상태 갱신 |

### 3.3 Web 컴포넌트 구조

```
packages/web/src/
├── routes/ax-bd/discovery.tsx          (재구성)
├── components/feature/discovery/
│   ├── DiscoveryWizard.tsx             (F263 메인)
│   ├── WizardStepper.tsx               (단계 진행 막대)
│   ├── WizardStepDetail.tsx            (단계별 상세 패널)
│   └── DiscoveryTour.tsx               (F265 온보딩 투어)
```

---

## 4. 구현 순서

| # | 작업 | 예상 파일 |
|---|------|-----------|
| 1 | D1 마이그레이션 + API (service + route + schema) | api: migration, service, route, schema |
| 2 | Web: DiscoveryWizard + WizardStepper + WizardStepDetail | web: components/feature/discovery/ |
| 3 | Web: discovery.tsx 페이지 재구성 (위저드 통합) | web: routes/ax-bd/discovery.tsx |
| 4 | Web: DiscoveryTour + data-tour 속성 | web: components/feature/discovery/DiscoveryTour.tsx |
| 5 | API 테스트 + Web 테스트 | tests |

---

## 5. 의존성

| 의존 | 상태 | 영향 |
|------|------|------|
| F241 (발굴 메뉴 재구조화) | ✅ 완료 | F263 확장 대상 |
| F258~F262 (BD 스킬 풀스택) | ✅ 완료 | 스킬 카탈로그 데이터 활용 |
| F252 (온보딩 시스템) | ✅ 완료 | F265 패턴 차용 |
| ProcessFlowV82.tsx | ✅ 존재 | 단계 정의/시각화 참조 |
| analysis-path-v82.ts | ✅ 존재 | 유형별 강도 매핑 데이터 |

---

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| discovery.tsx 기존 기능 손실 | 위저드 내부에 기존 ProcessFlowV82, TypeRoutingMatrix 통합 (삭제 아닌 재배치) |
| biz-item 없는 초기 상태 UX | 빈 상태 가이드 + 투어 자동 실행으로 첫 아이템 생성 유도 |
| 마이그레이션 번호 충돌 | 0077 사용 (현재 최대 0076) |
