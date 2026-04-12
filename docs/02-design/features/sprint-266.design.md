# Sprint 266 Design

> **Summary**: F515 자동화 연결 — 5종 스크립트 설계
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: Approved
> **Plan**: `docs/01-plan/features/sprint-266.plan.md`

---

## §1 C-1: board-sync-spec.sh 세부 상태 파싱

**파일**: `scripts/board/board-sync-spec.sh`

### 현재 상태
```bash
spec_to_board() {
  case "$1" in
    *✅*) echo "Done" ;;
    *🔧*) echo "In Progress" ;;
    *📋*) echo "Sprint Ready" ;;
    *) echo "" ;;
  esac
}
```

Glob 패턴 `*🔧*`은 `🔧(impl)` 을 암묵적으로 매칭하지만 리포트 출력에서 세부 상태가 표시되지 않음.

### 개선 사항

1. `spec_to_board()` — bash glob 패턴 명시적 처리 유지 (이미 동작) + 주석 추가
2. SPEC 추출 awk — 세부 상태 괄호 포함 전체 추출 (현행 유지)
3. 리포트 출력 — `SPEC` 컬럼에 `🔧(impl)` 전체 표시 (현행 `tr -d ' '` 적용 후 출력 OK)
4. `spec_to_board_detail()` 신규 — 세부 상태를 board 컬럼명에 suffix 형태로 반환
   - `🔧(blocked)` → `"In Progress [BLOCKED]"`  
   - 기타 `🔧(*)`  → `"In Progress"`
   - `✅(deployed)` → `"Done"`

**변경 범위**: `scripts/board/board-sync-spec.sh` 함수 2개 추가/수정

---

## §2 C-2: update-roadmap.sh

**파일**: `scripts/update-roadmap.sh` (신규)

### 인터페이스
```
Usage:
  bash scripts/update-roadmap.sh <sprint_num> "<f_items>" "<summary>" [--pr <pr_num>]
  bash scripts/update-roadmap.sh 266 "F515" "자동화 연결 5종" --pr 525
  bash scripts/update-roadmap.sh 266 "F515" "자동화 연결 5종" --dry-run
```

### 동작

1. `docs/ROADMAP.md` YAML frontmatter `version`, `updated` 갱신
2. `# Foundry-X Roadmap v{N}` 제목 갱신
3. §1 Current Position 3개 줄 갱신:
   - `Active Phase`: SPEC.md §5 현재 Phase 읽기 (grep 기반)
   - `Last Sprint`: `{prev_sprint} ({f_items} {summary}, PR #{pr})`
   - `Next Sprint`: `{next_sprint} (TBD)` — `next_sprint = sprint_num + 1`

### 구현 패턴
- `sed -i` 로 in-place 교체 (macOS 호환 `/usr/bin/sed` 피해 GNU sed 보장)
- WSL/Linux 환경 = GNU sed 사용 가능
- `--dry-run`: 변경 내용을 stdout에 diff 형태로 출력, 파일 수정 안 함

---

## §3 C-3: bump-blueprint.sh

**파일**: `scripts/bump-blueprint.sh` (신규)

### 인터페이스
```
Usage:
  bash scripts/bump-blueprint.sh <new_phase>
  bash scripts/bump-blueprint.sh 37
  bash scripts/bump-blueprint.sh 37 --dry-run
```

### 동작

1. `docs/BLUEPRINT.md` YAML frontmatter `version: 1.{phase}` → `version: 1.{new_phase}`
2. `updated: {YYYY-MM-DD}` → 오늘 날짜
3. `# Foundry-X Blueprint v1.{phase}` 제목 갱신

### 구현 패턴
- 현재 version을 `grep -oP 'version: \K[\d.]+'` 로 추출
- `sed -i` 교체
- `--dry-run`: diff 출력만

---

## §4 C-4: archive-phase.sh

**파일**: `scripts/archive-phase.sh` (신규)

### 인터페이스
```
Usage:
  bash scripts/archive-phase.sh <phase_num> [--dry-run]
  bash scripts/archive-phase.sh 30 --dry-run    # 이동 대상 목록만 출력
  bash scripts/archive-phase.sh 30              # 실제 이동
```

### 동작

아카이브 대상 파일 규칙:
1. `docs/01-plan/features/` — 파일명에 phase/sprint 번호 기반 (Phase 번호와 연관된 Sprint 범위)
2. `docs/02-design/features/` — 동일
3. `docs/04-report/` — Phase N 관련 보고서
4. `docs/specs/` — Phase N PRD 디렉토리 전체

대상 디렉토리 결정 로직:
- Sprint 범위 매핑 테이블 (SPEC.md에서 읽거나 하드코딩)
- 또는: `find docs/ -name "*phase-{N}*" -o -name "*sprint-{sprint}*"` 방식

대상 디렉토리: `docs/archive/phase-{N}/`

```
docs/archive/
  phase-30/
    01-plan/
    02-design/
    04-report/
```

### 구현 패턴
- `--dry-run`: `find` 결과 목록만 출력
- 실제 실행: `mkdir -p` + `mv`
- 이동 후 `docs/INDEX.md` 업데이트 (archive 섹션에 링크 추가)

**주의**: Phase 번호를 명시적으로 입력받아 실수 이동 방지. 파일 존재 확인 후 이동.

---

## §5 C-5: gen-changelog.sh

**파일**: `scripts/gen-changelog.sh` (신규)

### 인터페이스
```
Usage:
  bash scripts/gen-changelog.sh [--since <tag_or_hash>] [--dry-run]
  bash scripts/gen-changelog.sh --since v1.8.0
  bash scripts/gen-changelog.sh --since HEAD~20 --dry-run
```

### 동작

1. `git log --oneline --since=...` 로 최근 커밋 목록 수집
2. 커밋 메시지에서 F-item 번호(`F[0-9]{3,4}`) 추출
3. SPEC.md에서 해당 F-item 제목/REQ 조회
4. PR 번호(`#[0-9]+`) 추출
5. `CHANGELOG.md`의 `## [Unreleased]` 섹션 아래에 항목 추가

### 출력 형식
```markdown
- **F515** (Sprint 266, PR #525): 자동화 연결 5종 — board-sync-spec/Roadmap/Blueprint/Archive/CHANGELOG (FX-REQ-538)
```

### 중복 방지
- 이미 CHANGELOG에 `F515` 언급이 있으면 skip
- `grep -q "F515" CHANGELOG.md` 패턴 사용

### 구현 패턴
- `--dry-run`: 추가될 항목을 stdout 출력
- 실제 실행: `sed -i` 로 `## [Unreleased]` 다음 줄에 삽입

---

## §6 Gap Analysis 제외 항목

> Gap Analysis 95.1% (39/41 PASS). 아래 2건은 구현 범위에서 의도적으로 제외함.

| 항목 | 사유 |
|------|------|
| C-2: `Active Phase` 라인 갱신 | Phase 전환 빈도가 낮음 (Sprint 수십 회 당 1회). SPEC.md grep 파싱 복잡도 대비 효과 낮아 수동 관리로 충분 |
| C-4: `docs/INDEX.md` 아카이브 링크 추가 | INDEX.md 구조 복잡 (214개 문서, 자동 생성). archive-phase.sh 이동 후 ax-gov-doc 재실행으로 자동 갱신되는 기존 흐름 활용 |

---

## §7 파일 매핑 (Worker 할당)

| 파일 | 작업 | 크기 |
|------|------|------|
| `scripts/board/board-sync-spec.sh` | C-1 수정 | ~20줄 추가 |
| `scripts/update-roadmap.sh` | C-2 신규 | ~80줄 |
| `scripts/bump-blueprint.sh` | C-3 신규 | ~60줄 |
| `scripts/archive-phase.sh` | C-4 신규 | ~100줄 |
| `scripts/gen-changelog.sh` | C-5 신규 | ~80줄 |
