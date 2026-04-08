---
code: FX-PLAN-029
title: S229 사용자 여정 보강 계획
version: 1.0
status: Draft
category: Plan
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
---

# S229 사용자 여정 보강 계획

> 근거: [[FX-ANLS-029]] S229 갭 리포트 (18건)

## 전략 방향

**"접착제 레이어"** — 개별 기능은 완성도 높음. 단계 간 연결 + 데이터 정합성 + UX 가이드를 보강하여 "끊김 없는 사용자 여정"을 완성.

## 보강 항목 (F-item 후보)

### Batch A: 긴급 수정 (즉시, Sprint 1개)

| # | 제목 | 갭 참조 | 우선순위 | 예상 작업량 |
|---|------|---------|---------|-----------|
| **A1** | Getting Started 위자드 source enum 수정 | C1 | P0 | 1줄 수정 (API 스키마 or 프론트 변경) |
| **A2** | 랜딩 페이지 수치 동적화 (Sprint/Phase) | M1 | P1 | API 엔드포인트 추가 or 빌드타임 주입 |
| **A3** | shaping-artifacts 404 → 빈 배열 반환 | M6 | P1 | API 에러 핸들링 1건 |
| **A4** | 대시보드 파이프라인 카운트 수정 | M3 | P1 | 카운트 쿼리 디버그 |

> **예상 소요**: Sprint 1개 (2~3시간). C1이 해결되면 위자드→Discovery 흐름 즉시 복구.

### Batch B: 파이프라인 연결 강화 (핵심, Sprint 1~2개)

| # | 제목 | 갭 참조 | 우선순위 | 설계 방향 |
|---|------|---------|---------|----------|
| **B1** | PipelineTransitionCTA 실시간 상태 반영 | H1, H2 | P1 | 폴링(30s) 또는 SSE로 분석 완료 감지 → 자동 CTA 노출 |
| **B2** | Offering → Prototype 전환 CTA 추가 | H3 | P1 | PipelineTransitionCTA에 3번째 케이스 추가 |
| **B3** | Prototype 상세 역링크 + 아이템명 표시 | H4, L2 | P1 | biz_item JOIN으로 제목 표시 + 원본 아이템/Offering 링크 |
| **B4** | 퀵 액션에 "새 아이템" 추가 | M2 | P2 | 대시보드 퀵 액션 섹션에 1개 링크 추가 |
| **B5** | Prototype 리뷰 진행률 분모 수정 | M5 | P2 | 섹션 수를 분모로 사용 |

> **예상 소요**: Sprint 1~2개. B1이 핵심 — CTA 실시간 반영이 전체 흐름의 품질을 결정.

### Batch C: 데이터 정합성 (중기, Sprint 1개)

| # | 제목 | 갭 참조 | 우선순위 | 설계 방향 |
|---|------|---------|---------|----------|
| **C1** | mock-d1 누락 테이블 추가 (4개) | M8 | P2 | biz_analysis_contexts, poc_environments, tech_reviews, prototype_section_reviews |
| **C2** | Discovery→Shaping 트리거 명확화 | H5 | P2 | PRD 저장 테이블 정의 + Shaping Run 자동 생성 연결 |
| **C3** | 파일 업로드 Step 0 UI 복구/검증 | M4 | P2 | Getting Started에서 파일 업로드 옵션이 보이는지 확인 + 복구 |

> **예상 소요**: Sprint 1개.

### Batch D: UX 개선 (개선, 이후)

| # | 제목 | 갭 참조 | 우선순위 |
|---|------|---------|---------|
| **D1** | 온보딩 투어 오버레이 클릭 영역 수정 | M7 | P3 |
| **D2** | URL 패턴 통일 (ax-bd/discovery → discovery) | L1 | P3 |
| **D3** | 대시보드/상세 파이프라인 단계 수 통일 | L4 | P3 |
| **D4** | 사이드바 서브메뉴 접근성 개선 | L3 | P3 |

> **예상 소요**: Sprint 1개 (묶어서 처리).

---

## 실행 순서

```
Sprint 219: Batch A (긴급 수정 4건)  ← C1 해결로 위자드 복구
    ↓
Sprint 220: Batch B (파이프라인 연결 5건) ← 핵심 UX 개선
    ↓
Sprint 221: Batch C (데이터 정합성 3건)
    ↓
Sprint 222+: Batch D (UX 개선 4건) — Phase 26 나머지와 병렬 가능
```

## Phase 26과의 관계

현재 Phase 26(BD Portfolio Management, F451~F460)이 진행 중이에요. 이 보강 계획은:

1. **Batch A는 즉시 실행 가능** — Phase 26과 독립적 (1줄 수정 수준)
2. **Batch B~C는 Phase 26-B/C와 병렬** — 형상화 파이프라인 공통 영역
3. **Batch D는 Phase 26 완료 후** — 비긴급 UX 개선

## 의사결정 필요 사항

1. **Batch A를 별도 핫픽스 Sprint로 즉시 실행할지**, Phase 26-B에 포함할지
2. **PipelineTransitionCTA 실시간 방식**: SSE(서버 부하) vs 폴링(30s 지연) vs optimistic update(즉시 반영, 실패 시 롤백)
3. **랜딩 수치 동적화 방식**: API 호출(실시간) vs 빌드타임 환경변수(배포 시 갱신) vs SPEC.md 파싱
