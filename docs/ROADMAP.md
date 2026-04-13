---
code: FX-DOC-ROADMAP
title: Foundry-X Roadmap
version: 1.277
status: Active
created: 2026-04-12
updated: 2026-04-13
author: Sinclair Seo
---

# Foundry-X Roadmap v1.277

> 현재 위치, 단기/중기/장기 계획. Sprint 완료 시 갱신.

## 1. Current Position

- **Last Phase**: 39 — MSA Walking Skeleton ✅
- **Last Sprint**: 277 (F522+F523 shared 슬리밍 + D1 격리, PR #544, Gap 97%)
- **Active Work**: 없음 — Phase 40 기획 필요
- **Metrics**: ~11 routes, ~30 services, ~14 schemas, D1 0131, tests ~3452 (E2E 273)

## 2. Completed Phases (Sprint 263~277)

### Phase 36: Work Management Enhancement ✅

| 단계 | 내용 | Sprint | 상태 |
|------|------|:------:|:----:|
| A-0 | 파서 호환성 테스트 48건 | 263 | ✅ PR #517 |
| A-1~A-8 | 문서 체계 정비 + rules 승격 | 264 | ✅ PR #518 |
| B-0~B-3 | F513 TDD + API 3종 | 264 | ✅ PR #518 |
| B-4~B-5 | F514 대시보드 확장 | 265 | ✅ PR #524 |
| C-1~C-5 | F515 자동화 연결 5종 | 266 | ✅ PR #529 |

### Phase 37: Work Lifecycle Platform ✅

| Sprint | F-item | 내용 | 상태 |
|:------:|--------|------|:----:|
| 273 | F516 | Backlog 인입 파이프라인 + SSE 실시간 | ✅ PR #538 |
| 274 | F517 | 메타데이터 트레이서빌리티 | ✅ PR #539, Gap 100% |
| 275 | F518 | Work Ontology KG | ✅ PR #541, Gap 91% |

### Phase 38: Dashboard Overhaul ✅

| Sprint | F-item | 내용 | 상태 |
|:------:|--------|------|:----:|
| 276 | F519 | 대시보드 현행화 — 파이프라인 축소, 위젯 정리, ToDo UX | ✅ PR #543, Match 100% |

### Phase 39: MSA Walking Skeleton ✅

| Sprint | F-item | 내용 | 상태 |
|:------:|--------|------|:----:|
| 268 | F520 | API 게이트웨이 Worker (fx-gateway) | ✅ PR #535 |
| 268 | F521 | Discovery 도메인 분리 (fx-discovery) | ✅ PR #535 |
| 277 | F522 | shared 타입 슬리밍 | ✅ PR #544 |
| 277 | F523 | D1 스키마 격리 | ✅ PR #544, Gap 97% |

## 3. Next Phase Candidates (Phase 40)

Phase 39까지 완료. 아래 후보 중 PRD 작성 후 착수 결정.

| 후보 | 방향 | 의존 | 규모 |
|------|------|------|:----:|
| **A. 웹 관리 기능** | F-item 상태 전이, Sprint 배정을 웹 UI에서 직접 수행. SPEC.md CLI 의존 탈피 | Phase 36-B API 완료 ✅ | 중 |
| **B. 에이전트 자율 운영 강화** | autopilot Gap% E2E 확장, 자동 아카이브, Sprint 자율 선택 | Phase 36-C 완료 ✅ | 중 |
| **C. GIVC Ontology 2차** | KG 탐색기 고도화, 이벤트 연쇄 시나리오, KOAMI PoC 연결 | 독립 | 대 |
| **D. MSA 2차 — 도메인 확장** | core API의 다음 도메인(Work Management 등)을 독립 Worker로 분리 | Phase 39 완료 ✅ | 대 |

> 후보 선정 → `/ax:req-interview`로 PRD 작성 → F-item 등록 → Sprint 배정

## 4. Long-term Backlog

| F-item | 내용 | 등록 시점 | 상태 |
|--------|------|----------|:----:|
| F112 | GitLab API 지원 (수요 대기) | Phase 2 | 📋 DEFER |
| F117 | 외부 파일럿 (수요 대기) | Phase 2 | 📋 DEFER |

> 분기 1회 Backlog Grooming: 3 Phase 이상 미착수 항목 → 승격/보류/폐기 판단

## 5. Cadence

| 이벤트 | 주기 | 액션 |
|--------|------|------|
| Sprint 완료 | ~1~2일 | §1 Current Position 갱신 |
| Phase 완료 | ~1~2주 | §2 완료 기록 + §3 후보 갱신 |
| Backlog Grooming | 분기 1회 | §4 장기 백로그 승격/폐기 |

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.277 | 2026-04-13 | Phase 36~39 완료 반영, Phase 40 후보 4건 구체화 |
| 1.263 | 2026-04-12 | 초판. Sprint 263 완료, Phase 36 착수 시점 |
