# Foundry-X 작업 단위 용어 사전 (Taxonomy)

**버전:** 1.0  
**날짜:** 2026-04-12  
**상태:** 확정  
**근거:** `diagnostic-report.md` 개선안 E

---

## 개요

Foundry-X는 7개의 작업 단위 개념을 사용한다. 이 문서는 각 개념의 정의, 경계, 상호 관계를 명확히 하여 "어디에 뭘 기록해야 하는지" 모호함을 없앤다.

---

## 1. 개념 정의

### F-item (Feature Item)

| 항목 | 내용 |
|------|------|
| **정의** | 사용자가 관찰 가능한 기능 변화를 만드는 최소 작업 단위 |
| **SSOT** | `SPEC.md §5` |
| **식별자** | `F{NNN}` (예: F512) |
| **라이프사이클** | `📋(idea)` → `📋(groomed)` → `📋(plan)` → `🔧(design)` → `🔧(impl)` → `🔧(review)` → `🔧(test)` → `✅` → `✅(deployed)` |
| **관계** | 1 Sprint에 1~5개, FX-REQ 1:1, GitHub Issue 1:1 |
| **생성 조건** | D1 migration 포함 또는 3개 이상 파일 변경 (→ Backlog 승격 기준 참조) |
| **상세** | `.claude/rules/process-lifecycle.md` |

---

### Sprint

| 항목 | 내용 |
|------|------|
| **정의** | 1~5개 F-item을 묶어 TDD 사이클로 실행하는 개발 단위 |
| **SSOT** | `SPEC.md §2` (현황) + `docs/01-plan/features/sprint-{N}.plan.md` (계획) |
| **식별자** | Sprint N (예: Sprint 264) |
| **라이프사이클** | Plan → Design → TDD Red → TDD Green → Gap Analysis → Report → Deploy |
| **관계** | 1 Phase에 1~15개, Worktree 1:1 |
| **생성 방법** | `bash -i -c "sprint N"` (직접 `git worktree add` 금지) |
| **완료 기준** | Gap Match Rate ≥ 90% + PR merge + CI 통과 |

---

### Phase

| 항목 | 내용 |
|------|------|
| **정의** | 사용자가 인지할 수 있는 제품 역량 도약을 이루는 Sprint 묶음. 완료 시 Milestone으로 기록됨 |
| **SSOT** | `SPEC.md §3` + `ROADMAP.md` |
| **식별자** | Phase {N} (예: Phase 36) |
| **라이프사이클** | PRD 작성 → Sprint 할당 → 전체 Sprint 완료 → ✅ 태그 |
| **관계** | 1 Phase = 1~15 Sprints. Phase 완료 = Milestone 도달 |
| **완료 표시** | SPEC.md §3에 ✅ 기록 + ROADMAP.md 갱신 |

---

### Milestone

| 항목 | 내용 |
|------|------|
| **정의** | Phase 완료 시점을 나타내는 체크포인트. "Milestone = Phase 완료"로 동의어 취급 |
| **SSOT** | `SPEC.md §3` (Phase 완료 행이 곧 Milestone 행) |
| **식별자** | "Phase N 완료" 또는 SemVer git tag (v1.8.0 등) |
| **버전 정책** | v2.5 이후 프로젝트-레벨 SemVer 중단. 패키지별 Independent SemVer 사용 (`gov-version` 스킬). Phase 완료 ≠ 자동 태그 (수동 판단) |
| **관계** | Phase와 1:1. SemVer 태그는 선택적 부가 정보 |
| **주의** | Phase와 별개 개념이 아님. "Milestone 표" = "Phase 진행 표" |

---

### FX-REQ (Requirement)

| 항목 | 내용 |
|------|------|
| **정의** | F-item의 요구사항 코드. F-item과 1:1 대응하며 외부 추적(GitHub Issues, PRD) 시 참조 ID로 활용 |
| **SSOT** | `SPEC.md §5` F-item 행의 괄호 안 (예: `FX-REQ-535`) |
| **식별자** | `FX-REQ-{NNN}` |
| **라이프사이클** | F-item 생성 시 동시 부여 → F-item 완료 시 DONE |
| **관계** | F-item 1:1 (alias 역할). GitHub Issue와도 1:1 |
| **한계** | 독자적 요구사항 역할보다 추적 ID 역할이 주. 별도 REQ 문서 관리는 오버헤드 |

---

### Backlog Item (B/C/X Track)

| 항목 | 내용 |
|------|------|
| **정의** | F-item 등록 임계값 미달의 소규모 작업. Task Orchestrator로 관리 |
| **SSOT** | `SPEC.md §5` Backlog 섹션 또는 `scripts/task/task-start.sh` |
| **식별자** | `B{N}` (기능보완), `C{N}` (인프라/자동화), `X{N}` (기타/실험) |
| **라이프사이클** | `task-start.sh` → WT(선택) → PR → merge → `task-complete.sh` |
| **F-item 승격 기준** | `.claude/rules/task-promotion.md` 참조 |
| **완료 건수** | 37건 완료 (2026-04-12 기준) |

---

### Roadmap

| 항목 | 내용 |
|------|------|
| **정의** | Phase 전체 시퀀스와 시간 계획을 담는 장기 문서 |
| **SSOT** | `ROADMAP.md` |
| **식별자** | 없음 (단일 문서) |
| **라이프사이클** | Phase 36-A에서 신규 도입. SPEC.md §3과 연동 |
| **관계** | SPEC.md §3의 현황 표를 보완하는 장기 뷰 |

---

## 2. 계층 구조 (포함 관계)

```
Roadmap (장기 시간축 계획)
    │
    └── Phase (기능 도약 묶음, 완료 = Milestone)
             │
             └── Sprint (TDD 실행 단위, 1~15개/Phase)
                      │
                      └── F-item (사용자 관찰 가능 기능, 1~5개/Sprint)
                               ├── FX-REQ (추적 ID, 1:1)
                               └── GitHub Issue (이슈 추적, 1:1)

Backlog B/C/X (F-item 임계값 미달, 독립 트랙)
    └── 승격 시 → F-item (`.claude/rules/task-promotion.md` 기준)
```

---

## 3. 혼동하기 쉬운 경계

| 질문 | 답변 |
|------|------|
| Phase와 Milestone의 차이? | 동의어. Phase 완료 = Milestone 도달. 별개 개념 아님 |
| FX-REQ가 없으면 F-item이 아닌가? | REQ는 자동 부여. F-item 등록 시 항상 동시 부여 |
| Backlog C-track과 F-item 중 어디 등록? | 승격 기준(`task-promotion.md`)으로 판단. 애매하면 C-track으로 시작, 나중에 승격 |
| Sprint 없이 F-item만 있을 수 있나? | `📋(idea)` 상태는 가능. Sprint 배정 전 상태 |
| Roadmap과 SPEC.md §3의 차이? | §3은 현재 진행/완료 상태 표. Roadmap은 장기 계획 문서 |

---

## 4. 각 개념의 기록 위치 요약

| 개념 | 현황 기록 | 계획 기록 | 완료 기록 |
|------|----------|----------|----------|
| F-item | SPEC.md §5 | sprint-{N}.plan.md | SPEC.md §5 ✅ |
| Sprint | SPEC.md §2 | sprint-{N}.plan.md | sprint-{N}.plan.md 완료 표시 |
| Phase | SPEC.md §3 | ROADMAP.md | SPEC.md §3 ✅ |
| Milestone | SPEC.md §3 (Phase 완료 행) | — | git tag (선택) |
| FX-REQ | SPEC.md §5 (F-item 행) | — | SPEC.md §5 DONE |
| Backlog | SPEC.md §5 Backlog 섹션 | — | task-complete.sh |
| Roadmap | ROADMAP.md | ROADMAP.md | — |

---

## 변경 이력

| 날짜 | 버전 | 내용 |
|------|------|------|
| 2026-04-12 | 1.0 | 최초 작성 — diagnostic-report.md 개선안 E |
