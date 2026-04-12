# F-item Process Lifecycle — Entry/Exit Criteria

> **F-item 개발 라이프사이클**: Idea → Planning → Design → Impl → Verify → Done 6단계
> **버전**: 1.0 | **날짜**: 2026-04-12 | **사유**: F512 A-8 (FX-REQ-535)

---

## 개요

모든 F-track 작업은 아래 6단계를 거친다. 각 단계는 명확한 진입(Entry) 조건과 완료(Exit) 조건을 가진다. 이 규칙의 목적은 "어디에 있는지"를 명확히 하여 병목을 가시화하는 것이다.

---

## 단계 정의

### Stage 1: Idea (`📋(idea)`)

**목적**: 아이디어 캡처. 평가 전 상태.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | 아이디어 1줄 기술 가능 |
| **Exit Criteria** | 다음 Sprint 또는 Backlog에 배정 결정 |
| **산출물** | SPEC.md §5에 F-item 1줄 등록 |
| **담당** | 개발자 or AI Agent |
| **SPEC 이모지** | `📋(idea)` |

---

### Stage 2: Planning (`📋(groomed)` or `📋(plan)`)

**목적**: 요구사항 명확화, 범위 확정, Sprint 배정.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | F-item SPEC 등록, REQ 코드 배정 |
| **Exit Criteria** | PRD 또는 Plan 문서 존재, Sprint N 확정 |
| **산출물** | `docs/01-plan/features/sprint-{N}.plan.md` |
| **담당** | 개발자 |
| **SPEC 이모지** | `📋(groomed)` → `📋(plan)` |
| **TDD** | 이 단계에서 Red Phase 설계 가능 |

---

### Stage 3: Design (`🔧(design)`)

**목적**: 구현 상세 설계. API 스키마, DB 스키마, 컴포넌트 구조 확정.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | Plan 문서 존재, Sprint 브랜치 생성 |
| **Exit Criteria** | Design 문서 §5 "파일 매핑" 완성 |
| **산출물** | `docs/02-design/features/sprint-{N}.design.md` |
| **담당** | 개발자 |
| **SPEC 이모지** | `🔧(design)` |
| **TDD** | Red Phase 완료 (테스트 파일 FAIL 확인) |

---

### Stage 4: Implementation (`🔧(impl)`)

**목적**: 코드 작성. TDD Green Phase.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | Design 문서 완성, Red Phase 커밋 존재 |
| **Exit Criteria** | 모든 Red 테스트 GREEN, typecheck PASS |
| **산출물** | 구현 코드 + Green 커밋 |
| **담당** | 개발자 or AI Agent |
| **SPEC 이모지** | `🔧(impl)` |
| **TDD** | `feat(scope): FN green — ...` 커밋 |

---

### Stage 5: Verification (`🔧(review)` → `🔧(test)`)

**목적**: Gap Analysis + E2E + PR Review.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | 구현 완료, 로컬 vitest PASS |
| **Exit Criteria** | Gap Match Rate ≥ 90%, PR CI 통과 |
| **산출물** | Gap Analysis 보고서, PR |
| **담당** | 개발자 |
| **SPEC 이모지** | `🔧(review)` (리뷰 대기) → `🔧(test)` (테스트 진행) |
| **실패 시** | pdca-iterator 최대 3회 자동 개선 → 90% 미달 시 이슈 등록 |

---

### Stage 6: Done (`✅` or `✅(deployed)`)

**목적**: 프로덕션 배포 완료. 회고 기록.

| 항목 | 내용 |
|------|------|
| **Entry Criteria** | PR merge + CI/CD 배포 성공 |
| **Exit Criteria** | SPEC.md §5 상태 `✅` 갱신, 변경 이력 §9 추가 |
| **산출물** | 배포된 코드, Sprint Report (`docs/04-report/`) |
| **담당** | 개발자 |
| **SPEC 이모지** | `✅` → `✅(deployed)` (배포 후 모니터링 완료 시) |

---

## 특수 상태

| 상태 | 이모지 | 의미 |
|------|--------|------|
| Blocked | `🔧(blocked)` | 외부 의존 또는 결정 대기 |
| Dropped | `🗑️` | 폐기 결정 (사유 비고 필수) |
| Deferred | `📋(idea)` with DEFER note | 추후 재평가 예정 |

---

## 이모지 전환 규칙

```
📋(idea) → 📋(groomed) → 📋(plan)
           ↓
        🔧(design) → 🔧(impl) → 🔧(review) → 🔧(test)
                                              ↓
                                           ✅ → ✅(deployed)

언제든: 🔧(blocked) 가능 → 블록 해소 시 이전 상태로 복귀
```

---

## SPEC.md 적용 가이드

```markdown
# 형식
| FN | 제목 (FX-REQ-NNN, PN) | Sprint M | 🔧(impl) | 비고 |

# 예시
| F512 | 문서 체계 정비 (FX-REQ-535, P0) | Sprint 264 | 🔧(impl) | A-3~A-8 진행 |
| F513 | Work Management API TDD (FX-REQ-536, P0) | Sprint 264 | 📋(plan) | TDD Red 설계 중 |
```

---

## 관련 문서

- `ROADMAP.md` — Phase 전체 계획
- `BLUEPRINT.md` — 프로젝트 아키텍처
- `.claude/rules/tdd-workflow.md` — TDD Red→Green 상세
- `SPEC.md §5` — F-item SSOT
