---
code: FX-DSGN-S248
title: "Sprint 248 Design — F507 Priority 변경 이력 자동 기록"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-248)
sprint: 248
f_items: [F507]
---

# Sprint 248 Design — Priority 변경 이력 자동 기록

## 1. 아키텍처 개요

```
 ┌─────────────────────┐   호출  ┌──────────────────────────┐
 │ /ax:req-manage      │────────▶│ scripts/priority/         │
 │ (사용자 수동)       │         │   record-change.sh        │
 └─────────────────────┘         │                           │
                                 │  1) append history file   │
 ┌─────────────────────┐         │  2) gh issue comment      │
 │ GitHub Issue        │ webhook │  3) gh label swap         │
 │ (labeled/unlabeled) │────────▶│                           │
 └─────────────────────┘workflow └─────────┬────────────────┘
                                           │
                                           ▼
                          docs/priority-history/F{N}.md
                                (append-only log)

 조회: scripts/priority/list-history.sh [--f F507] [--since 2026-04]
```

## 2. record-change.sh 상세 설계

**파일**: `scripts/priority/record-change.sh` (신규)

**Usage**:
```bash
bash scripts/priority/record-change.sh F_NUM OLD_P NEW_P "REASON" [--no-issue]
# 예: record-change.sh F507 P2 P1 "M4 critical path 승격"
```

**동작**:
1. 인자 검증 — F_NUM 형식 `^F[0-9]+$`, OLD_P/NEW_P `^P[0-3]$`, REASON 필수
2. `docs/priority-history/F{N}.md` 존재 확인 — 없으면 헤더 포함 생성
3. 이력 append (ISO timestamp + OLD→NEW + reason + actor):
   ```markdown
   | 2026-04-11T13:30:00+09:00 | P2 → P1 | M4 critical path 승격 | ktds.axbd@gmail.com |
   ```
4. GitHub Issue 탐색 (`gh issue list --search "[F507] in:title"`)
5. Issue comment:
   ```
   🔧 Priority 변경: **P2 → P1**
   사유: M4 critical path 승격
   이력: docs/priority-history/F507.md
   ```
6. 라벨 교체: `P2-medium` 제거 → `P1-high` 추가 (gh label)
7. `--no-issue` 플래그 있으면 step 4~6 건너뜀
8. Exit code: 0 성공 / 1 인자 오류 / 2 history 실패 / 3 gh 실패(경고만)

**동기화 실패 정책**: history file 기록은 필수, Issue comment/label 실패는 stderr 경고만 — 로컬 기록 우선.

## 3. list-history.sh 상세 설계

**파일**: `scripts/priority/list-history.sh` (신규)

**Usage**:
```bash
bash scripts/priority/list-history.sh [--f F507] [--since YYYY-MM] [--priority P1]
```

**동작**:
1. `docs/priority-history/F*.md` 순회
2. 각 파일에서 마크다운 테이블 행 파싱 (| timestamp | OLD → NEW | reason | actor |)
3. 필터 적용: `--f`는 파일명, `--since`는 timestamp prefix, `--priority`는 OLD/NEW 포함 검사
4. stdout에 정렬된 테이블 출력 (최신 먼저)

## 4. Priority History File 형식

**파일**: `docs/priority-history/F{N}.md`

```markdown
---
f_item: F507
req: FX-REQ-502
created: 2026-04-11
---

# F507 Priority 변경 이력

| 시각 | 변경 | 사유 | 변경자 |
|------|------|------|--------|
| 2026-04-11T13:30:00+09:00 | P2 → P1 | M4 critical path 승격 | ktds.axbd@gmail.com |
```

**불변 규칙**: append-only — 과거 행 수정/삭제 금지. 정정은 새 행 + 사유에 "정정: ..." 표기.

## 5. GitHub Workflow 설계

**파일**: `.github/workflows/priority-change.yml` (신규)

**트리거**: `issues: [labeled, unlabeled]`

**조건**: 변경 라벨 이름이 `^P[0-3]-` 패턴

**동작**:
1. Issue 제목에서 `[F{N}]` 추출
2. 현재 라벨에서 `P[0-3]-*` 찾기 → NEW_P
3. 이전 상태: workflow payload `changes.labels` 또는 comment에서 last OLD_P 조회
4. `scripts/priority/record-change.sh F{N} OLD_P NEW_P "GitHub label sync" --no-issue` 호출
5. 변경사항은 PR로 자동 제출 (peter-evans/create-pull-request) — history 파일만 수정

**권한**: `contents: write`, `issues: write`, `pull-requests: write`

## 6. req-manage 연동 지점

**플러그인 측 변경 (별도 PR)**:
- `/ax:req-manage status` 서브커맨드에 Priority 변경 감지 추가
- 변경 감지 시 `scripts/priority/record-change.sh` 호출 — Foundry-X 프로젝트에서 실행될 때만

**현재 Sprint 책임**: 스크립트 인터페이스 고정 + 호출 예시 문서화 (README).

## 7. 파일 매핑 (구현 범위)

| # | 파일 | 라인 수 예상 | 유형 |
|---|------|-------------|------|
| 1 | `scripts/priority/record-change.sh` | ~90 | 신규 |
| 2 | `scripts/priority/list-history.sh` | ~60 | 신규 |
| 3 | `docs/priority-history/README.md` | ~40 | 신규 |
| 4 | `.github/workflows/priority-change.yml` | ~60 | 신규 |
| 5 | `docs/01-plan/features/sprint-248.plan.md` | — | 완료 |
| 6 | `docs/02-design/features/sprint-248.design.md` | — | 본 문서 |
| 7 | `docs/03-analysis/features/sprint-248.analysis.md` | — | 대기 |
| 8 | `docs/04-report/features/sprint-248.report.md` | — | 대기 |

## 8. 검증 시나리오

### 8.1 로컬 실행 (smoke)

```bash
# 1) 정상 실행
bash scripts/priority/record-change.sh F507 P2 P1 "테스트" --no-issue
grep "P2 → P1" docs/priority-history/F507.md  # 성공 확인

# 2) 조회
bash scripts/priority/list-history.sh --f F507

# 3) 인자 오류
bash scripts/priority/record-change.sh F507 P5 P1 "bad" 2>&1 | grep "ERROR"  # exit 1
```

### 8.2 Workflow 검증

- `yamllint .github/workflows/priority-change.yml` — 문법 OK
- `actionlint` (설치돼 있으면) — action 참조 OK

### 8.3 Shellcheck

- `shellcheck scripts/priority/*.sh` — 경고 0

## 9. 리스크 & 완화

| 리스크 | 완화 |
|-------|------|
| gh CLI 미설치 환경 | `--no-issue` 자동 fallback + stderr 경고 |
| Workflow 무한 루프 (bot이 라벨 변경 → 또 감지) | bot actor 제외 필터 |
| history 파일 merge conflict | append-only + PR 자동 생성으로 인간 검토 |

## 10. 완료 기준 (DoD)

- [ ] 4개 구현 파일 생성
- [ ] `shellcheck` 통과
- [ ] 로컬 smoke 스크립트 성공
- [ ] 4 PDCA 문서 + README
- [ ] Match Rate ≥ 90%
- [ ] SPEC.md F507 📋 → ✅
