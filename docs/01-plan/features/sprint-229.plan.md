---
code: FX-PLAN-S229
title: Sprint 229 Plan — BD Sentinel 구현 (F468)
version: "1.0"
status: Active
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Claude Sonnet 4.6 (autopilot)
sprint: 229
---

# Sprint 229 Plan — BD Sentinel 구현

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 229 |
| F-items | F468 |
| Phase | 27-C: BD Sentinel 통합 |
| REQ | FX-REQ-460 |
| 우선순위 | P0 |
| 목표 | prototype-sentinel을 BD 전체 산출물 감시용 bd-sentinel로 확장 |

## F468: BD Sentinel 구현

**배경:**  
Phase 27 BD Quality System에서 PRD·Offering·Prototype 각각의 QSA Discriminator(F461~F463)가 완성되었다.  
이제 이들을 **조율하는 메타 오케스트레이터**가 필요하다.  
기존 `prototype-sentinel.md`는 Prototype 파이프라인만 감시하므로, 범위를 BD 전체로 확장한 `bd-sentinel.md`를 신규 작성한다.

**핵심 책임:**
- 7+ Sector 자율 감시 (Prototype 한정 → BD 전체로 확장)
- DDPEV(Detect→Diagnose→Prescribe→Execute→Verify) 사이클 수행
- PRD QSA / Offering QSA / Prototype QSA 3종 에이전트 조율
- 파이프라인 단절(GAP) 감지 및 자율 복구

## 구현 대상

### 1. `.claude/agents/bd-sentinel.md` (신규)

**확장된 7 Sector:**

| Sector | 감시 대상 | prototype-sentinel 대비 변화 |
|--------|-----------|------------------------------|
| 1 | Generation–Evaluation 정합성 | Prototype → 3종 QSA 전체로 확장 |
| 2 | Design Token → Generation 연결 | 동일 (기존 Sector 유지) |
| 3 | Feedback → Regeneration 루프 | 동일 (기존 Sector 유지) |
| 4 | Quality 데이터 통합 | 동일 (기존 Sector 유지) |
| 5 | HITL Review → Action | 동일 (기존 Sector 유지) |
| 6 | **PRD QSA 정합성** | 신규 — PRD 품질 체계 감시 |
| 7 | **Offering QSA 정합성** | 신규 — Offering 품질 체계 감시 |
| 8 | **Cross-Artifact 일관성** | 신규 — PRD↔Offering↔Prototype 시각 언어 일치 감시 |

**DDPEV 사이클 강화:**
- `Detect` — 8 Sector 전체 스캔, 이상 신호 분류
- `Diagnose` — 단절/열화/drift 근본 원인 추적
- `Prescribe` — 수정 방안 설계 (코드 변경 vs. 설정 조정 vs. 재설계)
- `Execute` — 직접 수정 실행 (에이전트 스펙, 코드, 테스트, 문서)
- `Verify` — 파이프라인 재실행으로 개선 검증

**경보 등급 체계:**
- 🔴 CRITICAL — 고객 전달 불가 품질 → 즉시 차단 + 자동 수정 시도
- 🟡 WARNING — 기능 동작하나 품질 열화 → 진단 + 수정안 → 승인 후 실행
- 🔵 INFO — 개선 가능 영역 → 기록 + 다음 audit 포함
- ⚪ DRIFT — 점진적 불일치 → 정렬 코드 자동 적용

**자율 판단 기준:**
- 사람 확인 없이 직접 행동: 단절 복구, 체크리스트 정렬, 테스트 추가, 문서 갱신
- 사람 확인 요청: DB 스키마 변경, 새 에이전트 생성, 외부 서비스 변경, 비용 영향

### 2. bd-sentinel vs. prototype-sentinel 관계

- `prototype-sentinel.md` — 기존 유지 (Prototype 파이프라인 전문 감시)
- `bd-sentinel.md` — 신규 (BD 전체 파이프라인 메타 감시, prototype-sentinel 조율 포함)
- bd-sentinel이 prototype-sentinel을 하위 에이전트로 활용 가능

## 구현 전략

### Agent 문서 작성 방식 (Tier 3 단순화)
bd-sentinel.md는 Claude Agent 스펙 문서이므로, TypeScript 코드 구현 없이 `.claude/agents/` 마크다운 파일 1건만 작성한다.

### 참조 파일
- `.claude/agents/prototype-sentinel.md` — 기존 Sentinel 패턴 참조
- `.claude/agents/prototype-qsa.md` — QSA Discriminator 패턴 참조
- `.claude/agents/offering-qsa.md` — Offering QSA 패턴 참조
- `docs/specs/fx-bd-quality-system/prd-final.md` — PRD F468 요구사항

## 테스트 전략

Agent 마크다운 문서는 단위 테스트 대상이 아님.  
검증은 Design 문서 기준 Gap Analysis (gap-detector)로 수행한다.

## 완료 기준 (DoD)

- [ ] `.claude/agents/bd-sentinel.md` 작성 완료
- [ ] 8 Sector 전체 커버 (prototype-sentinel의 기존 5 + 신규 3)
- [ ] DDPEV 사이클 명시
- [ ] 경보 등급 체계 (4단계) 포함
- [ ] 자율 판단 기준 명시 (사람 확인 필요 vs. 자율 행동)
- [ ] bd-sentinel ↔ prototype-sentinel 관계 정의
- [ ] Gap Analysis ≥ 90%

## 일정

| 단계 | 내용 |
|------|------|
| Plan | Sprint 229 계획 수립 (현재) |
| Design | bd-sentinel 상세 설계 |
| Implement | bd-sentinel.md 작성 |
| Analyze | Gap Analysis (design vs. 구현) |
| Report | 완료 보고서 |
