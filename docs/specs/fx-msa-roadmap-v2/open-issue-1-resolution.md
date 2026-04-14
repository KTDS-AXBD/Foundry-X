---
title: PRD Open Issue #1 해결 기록
type: resolution
date: 2026-04-14
resolved_by: C55
related_prd: prd-final.md
---

# PRD Open Issue #1 해결 기록

## 원본 이슈 요약

PRD `fx-msa-roadmap-v2` §Open Issues #1:

> **ESLint 룰 기존 위반 처리**: `no-cross-domain-import` / `no-direct-route-register` 룰을 전체 `packages/api/src/`에 적용하면 기존 코드 ~230건 위반으로 PR CI가 즉시 fail됨. 기존 코드를 일괄 수정하는 것은 GTM 일정 압박 상 불가.

## 해결 방안 (C55 채택)

**Git-aware 신규파일 전용 검사** — PR의 추가/수정 파일(Added+Modified)만 MSA ESLint 룰로 검사하고, unchanged 기존 파일은 skip.

### 구현 산출물

| 파일 | 역할 |
|------|------|
| `scripts/lint-new-files.sh` | `git diff --diff-filter=AM origin/master...HEAD`로 변경 `.ts` 추출 → `packages/api/src/core/` 필터 → ESLint 실행 |
| `.github/workflows/msa-lint.yml` | PR 전용 workflow. `packages/api/src/core/**/*.ts` 변경 시에만 트리거, `fetch-depth: 0` 설정 |
| `packages/api/package.json` | `lint:msa-new` 단축 스크립트 추가 (로컬 검증용) |

### 동작 방식

```
PR opened/updated
  │
  ├─ packages/api/src/core/**/*.ts 변경 없음 → msa-lint.yml skip (✅)
  │
  └─ 변경 있음
       │
       ├─ git diff --diff-filter=AM origin/master...HEAD
       │    → packages/api/src/core/ 하위 .ts (test 제외) 필터
       │
       ├─ 신규/수정 파일 0건 → "MSA lint skip" exit 0 (✅)
       │
       └─ 신규/수정 파일 N건 → eslint --max-warnings 0
            ├─ 위반 없음 → ✅ MSA lint 통과
            └─ 위반 있음 → ❌ CI fail (PR 머지 차단)
```

## 설계 결정

### 왜 deploy.yml 수정 대신 별도 workflow?

`deploy.yml`은 `push: master` 전용으로 설계되어 있고, PR 검증은 명확하게 분리하는 게 운영 투명성에 유리. `msa-lint.yml`을 독립 파일로 두면:
- deploy.yml의 복잡도 증가 없음
- MSA lint 룰 변경 시 영향 범위 명확
- 향후 비활성화/수정이 단순함

### 기존 230건 위반 처리

- **수정하지 않음** — GTM 일정 우선, unchanged 파일에는 룰 적용 안 함
- 향후 MSA 완전 분리(W+14~W+16) 단계에서 일괄 처리 예정
- 신규 F-item(F534~)은 이 시점부터 위반 0으로 시작

## 검증 방법

```bash
# 로컬 검증: 신규 위반 파일 감지 확인
echo "import { discoveryService } from '../../discovery/services/discovery.service.js';" \
  > packages/api/src/core/agent/test-violation.ts
bash scripts/lint-new-files.sh  # → exit 1 (위반 감지)
rm packages/api/src/core/agent/test-violation.ts

# 기존 위반 파일 skip 확인: 변경 없으면 diff에 안 잡힘
bash scripts/lint-new-files.sh  # → "변경 .ts 파일 없음 — MSA lint skip"
```

## 관련 링크

- PRD: `docs/specs/fx-msa-roadmap-v2/prd-final.md`
- ESLint 룰 구현: `packages/api/src/eslint-rules/` (C54)
- Backlog: C55 (task/C55-git-aware-eslint)
