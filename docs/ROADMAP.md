---
code: FX-DOC-ROADMAP
title: Foundry-X Roadmap
version: 1.263
status: Active
created: 2026-04-12
updated: 2026-04-12
author: Sinclair Seo
---

# Foundry-X Roadmap v1.263

> 현재 위치, 단기/중기/장기 계획. Sprint 완료 시 갱신.

## 1. Current Position

- **Active Phase**: 36 — Work Management Enhancement
- **Last Sprint**: 263 (F511 Work Management 품질 보강, PR #516)
- **Next Sprint**: 264 (F513 API 테스트 보강 + 확장, TDD)

## 2. Short-term (Phase 36, ~6 Sprint)

### Phase 36-A: 문서 체계 정비 + 아카이브 (즉시, meta-only)

| 항목 | 작업 | 상태 |
|------|------|:----:|
| A-0 | 파서 호환성 테스트 48건 | ✅ PR #517 |
| A-1 | BLUEPRINT.md v1.36 | ✅ |
| A-2 | ROADMAP.md v1.263 | ✅ (이 문서) |
| A-3 | SPEC.md 경량화 (1,377→350줄) | 📋 |
| A-4 | SPEC.md §6 아카이브 | 📋 |
| A-5 | SPEC.md §2 아카이브 | 📋 |
| A-6 | docs/ 산출물 아카이브 (Phase 30 이전) | 📋 |
| A-7 | F-item 세부 상태 10단계 적용 | 📋 |
| A-8 | Entry/Exit Criteria → .claude/rules/ | 📋 |

### Phase 36-B: 기존 데이터 표면화 — TDD (Sprint 264~265)

| Sprint | F-item | 작업 |
|:------:|--------|------|
| 264 | F513 | B-0 기존 테스트 보강 (~15건) + B-1~B-3 API 3종 (velocity/phase-progress/backlog-health) |
| 265 | F514 | B-4 Pipeline Flow 뷰 + B-5 Velocity/Phase Progress 차트 + E2E |

### Phase 36-C: 자동화 연결 (Sprint 266)

| Sprint | F-item | 작업 |
|:------:|--------|------|
| 266 | F515 | board-sync-spec 파서 + Roadmap/Blueprint 자동갱신 + 아카이브 자동화 + CHANGELOG 생성 |

### 의존관계

```
A-0 ✅ → A-1 ✅ → A-2 ✅ → A-3~A-8 → Phase B → Phase C
                                  └── C-4 (A 직후 가능)
```

## 3. Mid-term (Phase 37~38, 방향성)

현재 구체화되지 않은 후보. Phase 36 완료 후 PRD 작성 예정.

| 후보 | 방향 | 의존 |
|------|------|------|
| 웹 대시보드 관리 기능 | F-item 상태 전이, Sprint 배정을 웹에서 직접 수행 | Phase 36-B API 의존 |
| 에이전트 자율 운영 강화 | autopilot Gap% E2E 측정 확장, 자동 아카이브 | Phase 36-C 의존 |
| GIVC Ontology 2차 | KG 탐색기 고도화, 이벤트 연쇄 시나리오 확장 | 독립 |

## 4. Long-term Backlog

| F-item | 내용 | 등록 시점 | 상태 |
|--------|------|----------|:----:|
| F112 | (수요 대기) | Phase 2 | 📋 |
| F117 | (수요 대기) | Phase 2 | 📋 |

> 분기 1회 Backlog Grooming: 3 Phase 이상 미착수 항목 → 승격/보류/폐기 판단

## 5. Cadence

| 이벤트 | 주기 | 액션 |
|--------|------|------|
| Sprint 완료 | ~1~2일 | §1 Current Position 갱신 |
| Phase 완료 | ~1~2주 | §2↔§3 시프트 + 버전 범프 |
| Backlog Grooming | 분기 1회 | §4 장기 백로그 승격/폐기 |

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.263 | 2026-04-12 | 초판. Sprint 263 완료, Phase 36 착수 시점 |
