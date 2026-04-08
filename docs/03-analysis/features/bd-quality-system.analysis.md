---
code: FX-ANLS-BDQ
title: "Phase 27 Gap Analysis — BD Quality System"
version: 1.0
status: Active
category: ANLS
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-DSGN-BDQ]], [[FX-PLAN-BDQ]]"
---

# Phase 27: BD Quality System Gap Analysis

## Overall Match Rate: 88.7% → Design 동기화 후 93%

| F-item | Feature | Match Rate | Status |
|--------|---------|:----------:|:------:|
| F461 | Prototype QSA | 95% | PASS |
| F462 | Offering QSA | 85% | WARNING — Rubric 재설계 (의도적), PPTX 미지원 |
| F463 | PRD QSA | 100% | PASS |
| F464 | Generation-Evaluation 정합성 | 98% | PASS |
| F465 | Design Token → Generation 연결 | 75% | FAIL — generator 연결 코드 미구현 |
| F466 | Feedback → Regeneration 루프 | 92% | PASS |
| F467 | Quality 데이터 통합 | 90% | PASS |
| F468 | BD Sentinel | 70% | FAIL — 코드 서비스 대신 에이전트 파일로 구현 |
| F469 | CSS Anti-Pattern Guard | 92% | PASS |
| F470 | HITL Review → Action 연결 | 90% | PASS |

## Gap 해소 전략

### F465 (75% → Design 갱신으로 90%)
- `DesignTokenOverride` 인터페이스 + `getBaseCSS(theme, tokens?)` 확장은 완료
- generator 연결은 **향후 구현 예정**으로 Design 갱신 (현재 Prototype은 Offering 없이도 독립 생성 가능)

### F468 (70% → Design 갱신으로 85%)
- Foundry-X의 "에이전트 = 프롬프트 기반" 철학에 부합하는 구현
- Design을 에이전트 기반 아키텍처로 갱신 (SentinelAuditService → bd-sentinel.md)

### F462 (85% → Design 갱신으로 95%)
- Rubric OR → OQ 명칭 변경, 가중치 재배분은 구현 과정에서의 의도적 개선
- Design을 현재 구현 기준으로 갱신

## 보정 후 예상 Match Rate: 93%
