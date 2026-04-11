---
code: FX-DOC-PRIORITY-HISTORY
title: "Priority 변경 이력 저장소"
version: "1.0"
status: Active
category: DOC
created: 2026-04-11
---

# Priority 변경 이력 저장소

F-item별 Priority(P0~P3) 변경 이력을 append-only로 보관한다.
F507(FX-REQ-502)에서 도입 — 거버넌스 갭 G7 해소.

## 파일 형식

`docs/priority-history/F{N}.md` 하나당 F-item 하나.

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

## 불변 규칙

- **append-only** — 과거 행 수정/삭제 금지
- 정정이 필요하면 새 행 추가 + 사유에 `정정: ...` 표기
- 시간 역순 금지 — 항상 시간 증가 방향으로 append

## 기록 방법

### 1) 수동 (스크립트 직접)

```bash
bash scripts/priority/record-change.sh F507 P2 P1 "M4 critical path 승격"
```

동작:
1. `docs/priority-history/F507.md`에 행 append (없으면 파일 생성)
2. GitHub Issue `[F507] ...` 찾아 comment 추가
3. 라벨 교체: `P2-medium` → `P1-high`

`--no-issue` 플래그로 GitHub 동기화 건너뛸 수 있음.

### 2) /ax:req-manage 연동 (계획)

플러그인 스킬 `/ax:req-manage status`가 Priority 변경을 감지하면
내부적으로 `scripts/priority/record-change.sh`를 호출한다.
(별도 PR로 플러그인 측 패치 필요)

### 3) GitHub Actions 자동 감지

`.github/workflows/priority-change.yml`이 Issue 라벨 `P[0-3]-*` 변경을 감지하면
자동으로 이력 파일을 갱신하는 PR을 생성한다.

## 조회 방법

```bash
# 특정 F-item만
bash scripts/priority/list-history.sh --f F507

# 특정 시점 이후
bash scripts/priority/list-history.sh --since 2026-04

# P1 포함 변경만
bash scripts/priority/list-history.sh --priority P1

# 전체
bash scripts/priority/list-history.sh
```

출력은 시간 역순 테이블.

## 감사 활용

- **Sprint 회고**: `list-history.sh --since` 로 해당 Sprint 내 Priority 변경 수집
- **마일스톤 회고**: P0/P1 강등 건수 집계 — 스코프 드리프트 신호
- **의사결정 추적**: 변경 사유로 원인 분석
