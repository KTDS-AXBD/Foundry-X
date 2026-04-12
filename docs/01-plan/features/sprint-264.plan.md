# Sprint 264 Plan

> **Summary**: F512 Phase A 잔여(A-3~A-8) + F513 Phase B(B-0~B-3 TDD)
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: In Progress
> **F-items**: F512, F513
> **REQs**: FX-REQ-535, FX-REQ-536

---

## 1. Sprint Scope

### 1.1 F512 — 문서 체계 정비 + 아카이브 (A-3~A-8)

A-0✅ A-1✅ A-2✅ 완료. 잔여:

| Task | 내용 | 결과물 | 종류 |
|------|------|--------|------|
| A-3 | SPEC.md 경량화 §1·§4→Blueprint 참조, §3 미래→Roadmap 참조, §7~§9→adr/ | SPEC.md ≤ 350줄 | meta |
| A-4 | SPEC.md §6(1265줄) 아카이브 → docs/archive/ + 링크 1줄 대체 | SPEC.md §6 제거 | meta |
| A-5 | SPEC.md §2(197줄) 아카이브 → 최근 5 Sprint만 유지 | SPEC.md §2 경량화 | meta |
| A-6 | docs/ Phase 30 이전 산출물 → docs/archive/ | docs/ ≤ 100파일 | meta |
| A-7 | F-item 세부 상태 괄호 표기 (🔧/📋 항목에 design/impl/test 등) | SPEC.md §5 업데이트 | meta |
| A-8 | Entry/Exit Criteria 명문화 | .claude/rules/process-lifecycle.md | meta |

### 1.2 F513 — Work Management API TDD (B-0~B-3)

| Task | 내용 | 결과물 | 종류 |
|------|------|--------|------|
| B-0 | work.service.ts snapshot/context/classify 단위 테스트 ~15건 | work.service.test.ts | code |
| B-1 | GET /api/work/velocity — TDD Red→Green | velocity 엔드포인트 | code |
| B-2 | GET /api/work/phase-progress — TDD Red→Green | phase-progress 엔드포인트 | code |
| B-3 | GET /api/work/backlog-health — TDD Red→Green | backlog-health 엔드포인트 | code |

---

## 2. Dependencies

- A-3~A-5는 A-0(✅) 완료 후 착수 가능
- A-6은 A-4/A-5 완료 후 (SPEC 변경 후 docs 아카이브)
- A-7은 A-3 완료 후 (경량화된 §5 편집)
- B-0은 기존 work.service.ts 분석 선행
- B-1~B-3은 B-0 완료 후 TDD 순서 적용

---

## 3. Git Strategy

| Task | 변경 종류 | Git 경로 |
|------|----------|---------|
| F512 A-3~A-8 | meta-only | master 직접 commit+push |
| F513 B-0~B-3 | code | PR + auto-merge |

---

## 4. Acceptance Criteria

- SPEC.md ≤ 350줄
- docs/ 활성 파일 ≤ 100개
- 진행 중 F-item 세부 상태 표기 완료
- .claude/rules/process-lifecycle.md 신규 생성
- work.service 단위 테스트 15건+
- velocity/phase-progress/backlog-health API 각 TDD 완료
- 전체 vitest PASS

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-12 | Sprint 264 착수 — F512 A-3~A-8 + F513 B-0~B-3 |
