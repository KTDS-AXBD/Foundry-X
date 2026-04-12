# Foundry-X SDD Triangle

> Spec(명세) ↔ Code ↔ Test 상시 동기화 — Foundry-X 핵심 철학

## SPEC.md = 권위 소스(SSOT)
- SPEC.md가 권위 소스, MEMORY.md는 캐시 — 불일치 시 SPEC 기준 보정
- 수치(routes/services/schemas/tests/D1) 하드코딩 금지 — `/ax:daily-check`가 실측

## F-item 등록 선행 원칙
- Plan/Design 작성 전 반드시 SPEC.md에 F-item + REQ코드 먼저 등록
- SPEC 등록 → 커밋 → push → WT 생성 순서 (S149 교훈)

## Gap Analysis
- Design ↔ Implementation 일치율 90% 이상 목표
- Gap < 90%: pdca-iterator 자동 개선
- Gap ≥ 90%: 완료 보고서 작성

## TDD 순서 원칙
- SPEC 등록 → Red(테스트) → Green(구현) → Gap Analysis
- Spec↔Code↔Test 동기화의 **순서**를 명시: Test가 Code보다 먼저
- 상세: `.claude/rules/tdd-workflow.md`

## 동기화 주기
- 5세션마다 1회 또는 수동 운영(벌크 승인, DB 직접 조작) 후 즉시 점검
- 수치/상태/리스크/Phase 명칭/REQ 완전성 확인
