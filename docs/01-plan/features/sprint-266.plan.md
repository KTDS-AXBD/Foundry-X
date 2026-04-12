# Sprint 266 Plan

> **Summary**: F515 자동화 연결 — board-sync-spec 세부 상태 파싱 + Roadmap/Blueprint 자동 갱신 + 아카이브 자동화 + CHANGELOG 자동 생성
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: In Progress
> **F-items**: F515
> **REQs**: FX-REQ-538

---

## 1. Sprint Scope

### 1.1 F515 — 자동화 연결 (Phase 36-C)

Phase 36의 마지막 Sprint. 기존 스크립트/문서를 자동화 파이프라인으로 연결한다.

| ID | Task | 내용 | 결과물 | 우선순위 |
|----|------|------|--------|---------|
| C-1 | board-sync-spec 세부 상태 파싱 | `🔧(impl)`, `📋(plan)` 등 괄호 세부 상태를 board column 매핑에 반영 | `scripts/board/board-sync-spec.sh` 수정 | P1 |
| C-2 | Roadmap 자동 갱신 | Sprint 완료 시 `docs/ROADMAP.md` §1 Current Position 갱신 스크립트 | `scripts/update-roadmap.sh` 신규 | P1 |
| C-3 | Blueprint 버전 범프 | Phase 완료 시 `docs/BLUEPRINT.md` version frontmatter 자동 범프 | `scripts/bump-blueprint.sh` 신규 | P1 |
| C-4 | 아카이브 자동화 | Phase 완료 시 `docs/` 산출물을 `docs/archive/` 이동 | `scripts/archive-phase.sh` 신규 | P1 |
| C-5 | CHANGELOG 자동 생성 | `git log` + F-item 매핑으로 미입력 항목을 CHANGELOG.md에 추가 | `scripts/gen-changelog.sh` 신규 | P2 |

**목표**: Phase 36 완료 후 자동화 파이프라인 5종 가동 (PRD Phase C KPI)

---

## 2. Dependencies

- F512 A-0 (파서 테스트 보강) ✅ PR #517 — `scripts/board/board-sync-spec.sh` 기존 테스트 인프라
- F513 API ✅ Sprint 264 PR #518
- F514 Web UI ✅ Sprint 265 PR #524
- `docs/ROADMAP.md` ✅ v1.263 (F512 A-2)
- `docs/BLUEPRINT.md` ✅ v1.36 (F512 A-1)

---

## 3. Git Strategy

| Task | 변경 종류 | Git 경로 |
|------|----------|---------|
| C-1: board-sync-spec.sh 수정 | code | PR + auto-merge (sprint/266 브랜치) |
| C-2~C-5: 신규 스크립트 4종 | code | PR에 함께 포함 |
| Plan/Design docs | meta (혼합) | code PR에 함께 포함 |

---

## 4. TDD 전략

C-1(board-sync-spec.sh)은 기존 테스트 인프라(`packages/cli/src/plumb/__tests__/board-sync-spec.test.ts` 또는 `scripts/board/test-require-projects.sh`) 확인 후 테스트 추가.

C-2~C-5 스크립트는 TDD "선택" 등급 (내부 Shell Script, side-effect 제한적). 각 스크립트에 `--dry-run` 플래그 내장하여 smoke test 가능하게 설계.

---

## 5. 위험/주의사항

| 위험 | 대응 |
|------|------|
| board-sync-spec.sh 파서 변경 시 기존 테스트 회귀 | F512 A-0 테스트 전체 PASS 확인 후 수정 |
| ROADMAP.md 갱신 스크립트가 frontmatter format 파손 | sed 기반 정밀 치환 + dry-run 검증 |
| archive-phase.sh가 활성 문서를 실수로 이동 | Phase 번호 명시적 입력 + dry-run 필수 |
| CHANGELOG 중복 항목 생성 | 기존 항목 존재 여부 확인 후 append |

---

## 6. 완료 기준

- [ ] C-1: `board-sync-spec.sh --fix`가 `🔧(impl)` 상태를 "In Progress"로 정상 매핑
- [ ] C-2: `update-roadmap.sh 266 F515`가 ROADMAP.md §1 갱신 (dry-run 포함)
- [ ] C-3: `bump-blueprint.sh 37`이 BLUEPRINT.md version 자동 범프 (dry-run 포함)
- [ ] C-4: `archive-phase.sh 35`가 Phase 35 산출물을 `docs/archive/phase-35/`로 이동 (dry-run 포함)
- [ ] C-5: `gen-changelog.sh`가 최근 commit 기반 CHANGELOG 항목 생성 (dry-run 포함)
- [ ] typecheck + lint PASS (scripts 수정 없음, TS 변경 없으면 자동 PASS)
