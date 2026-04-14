# Backlog → F-item 승격 기준

> **버전**: 1.0 | **날짜**: 2026-04-12  
> **근거**: `docs/specs/fx-work-unit-taxonomy/diagnostic-report.md` 개선안 D  
> **SSOT**: 이 파일. `docs/specs/fx-work-unit-taxonomy/taxonomy.md §1 Backlog Item`에서 참조

---

## 배경

C11→F500 승격 사례처럼 Backlog 작업이 F-item으로 전환되는 경우가 있었으나, 기준이 암묵적이었다. 이 파일은 그 기준을 명문화하여 "F-item으로 등록해야 하나, Backlog로 처리해야 하나"를 일관되게 판단할 수 있게 한다.

---

## 승격 기준 (ANY 1개 충족 시 F-item)

### 기준 1: D1 Migration 포함

새 SQL migration 파일(`packages/api/src/db/migrations/*.sql`)이 필요한 작업.

- **이유**: DB 스키마 변경은 되돌리기 어렵고, TDD + Gap Analysis가 필수적
- **예외**: `--command` 방식의 1-line fix는 Backlog C-track 유지 가능 (drift 위험 주의)

### 기준 2: 3개 이상 파일 변경

단일 PR에서 3개 이상의 `packages/**` 소스 파일을 수정하는 작업.

- **이유**: 규모가 크면 Design 문서와 Gap Analysis 없이 회귀 위험 증가
- **측정**: 테스트 파일, 타입 선언 파일 포함. docs/meta 파일은 제외

### 기준 3: 사용자 관찰 가능한 기능 변화

API 엔드포인트 추가, UI 컴포넌트 신규, CLI 커맨드 추가처럼 외부에서 관찰 가능한 변화.

- **이유**: F-item의 정의("사용자가 관찰 가능한 기능 변화")에 직접 부합
- **경계**: 내부 리팩토링, 성능 최적화, 버그픽스는 Backlog 유지 가능

### 기준 4: Sprint 배정 필요

작업 규모가 4시간 이상으로 예상되거나, 별도 Worktree가 필요한 작업.

- **이유**: Sprint = Worktree = Plan/Design 문서 세트. F-item이어야 sprint N 생성 가능
- **경계**: 1~2시간 내 완료 가능한 작업은 Backlog WT-less 경로로 처리

---

## Backlog 유지 기준 (전부 해당 시)

- D1 migration 없음
- 변경 파일 2개 이하
- 사용자에게 직접 관찰되지 않는 내부 개선
- 2시간 이내 완료 예상

---

## 승격 절차

```
1. Backlog 작업 착수 중 승격 기준 충족 발견
   ↓
2. task-complete.sh로 현재 진행 중단 (commit + stash 포함)
   ↓
3. SPEC.md §5에 F-item + FX-REQ 등록 (master 직접 commit)
   ↓
4. Sprint N 생성: bash -i -c "sprint N"
   ↓
5. sprint N에서 기존 Backlog 컨텍스트 이어받아 TDD 사이클 시작
```

### 기존 Backlog 이력 처리

- Backlog 항목(예: C11)은 SPEC.md §5 Backlog 섹션에 "→ F500으로 승격" 표시
- GitHub Issue는 F-item Issue에 "Promoted from C11" 링크 포함
- 이미 작성한 코드는 Sprint WT로 이동 (cherry-pick 또는 stash apply)

---

## 판단 예시

| 작업 | 기준 | 결정 |
|------|------|------|
| `task-start.sh`에 `--reuse-id` 플래그 추가 (C24) | 기준 2 충족(3파일+) | F 승격 검토 → 하지만 내부 툴 개선으로 기준 3 불충족 → **Backlog 유지** |
| `agent_sessions` D1 테이블 신규 (F510) | 기준 1+3 충족 | **F-item** |
| 버그 1줄 픽스 (hotfix) | 전부 미충족 | **Backlog C-track** |
| Work Management 대시보드 신규 (F509) | 기준 1+2+3+4 충족 | **F-item** |
| statusline-command.sh 계정 표시 수정 (C28) | 기준 3 경계(내부 인프라) | 기준 2+4 검토 → 3파일+ 변경이면 F 검토 → 실제 2파일 → **Backlog 유지** |

---

## ID Forward 패턴 (사람-스크립트 번호 경합 해소)

PRD/문서 작성(사람) 시점에 예상한 C/F 번호와 `task-start.sh` 실행 시점에 `id-allocator`가 배정하는 번호가 다를 수 있다. autopilot 시대에는 둘이 비동기이므로 번호 경합이 자주 발생한다.

### 발생 조건
1. 사람이 PRD 또는 SPEC.md에 "다음은 C{N}으로 작업" 가정하고 row 등록
2. 그 사이 다른 autopilot/세션이 C{N}을 선점하거나, 인접 번호에서 발생
3. `task-start.sh` 실행 시 `id-allocator`가 `max+1`로 재계산 → C{N+1} 이상 배정

### 처리 원칙
- **"등록 의도" row 삭제 금지** — 추적성 유지 목적으로 남긴다
- 상태 컬럼에 `→ **C{실제번호} 실행**` 표시
- 비고에 `id-allocator가 C{실제} 발급 (C{의도}→C{실제} 선례 동일 ID forward)` 추가
- 실제 구현은 `C{실제번호}` row에서 PR/파일 추적

### 기존 선례
- C20 → C22 (FX-REQ-514 → FX-REQ-516): PRD 작성 중 다른 task 선점
- C21 → C23 (FX-REQ-515 → FX-REQ-517): 동일 패턴
- C53 → C54 + C55 (FX-REQ-567 → FX-REQ-568/569): PRD가 "단일 작업" 가정했으나 Open Issue #1 때문에 2개로 분할되며 C55까지 확장

### 왜 row 삭제가 아닌 표시 유지인가
- PRD 문서의 REQ 코드(FX-REQ-567) 링크가 SPEC.md에 "고아"로 남는 것을 방지
- 후속 작업이 "왜 이 번호가 비어있나?" 검색할 때 맥락 제공
- audit trail — 의도와 실행의 괴리를 추적 가능하게 함

---

## 관련 규칙

- `process-lifecycle.md` — F-item 6단계 라이프사이클
- `git-workflow.md` — meta vs code 변경 분류
- `tdd-workflow.md` — F-item TDD 필수 적용 범위
- `docs/specs/fx-work-unit-taxonomy/taxonomy.md` — 전체 개념 용어 사전
