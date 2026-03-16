---
name: npm-release
description: "foundry-x CLI npm 배포 — version bump, 검증, build, publish 자동화. /npm-release patch|minor|major"
disable-model-invocation: true
---

# npm-release

foundry-x CLI 패키지의 npm 배포 워크플로우.

## Arguments

- `patch` (default): 0.3.1 → 0.3.2
- `minor`: 0.3.1 → 0.4.0
- `major`: 0.3.1 → 1.0.0

## Workflow

### Step 1: Pre-flight 검증

```bash
cd packages/cli
pnpm typecheck && pnpm lint && pnpm test
```

모든 검증 통과해야 다음 단계 진행. 실패 시 중단하고 에러 보고.

### Step 2: Version Bump

`packages/cli/package.json`의 `version` 필드를 인자에 따라 bump.
루트 `package.json`이 있다면 동일하게 업데이트.

### Step 3: CHANGELOG.md 갱신

`git log --oneline` 기반으로 마지막 태그 이후 변경사항 요약 추가.
형식: `## vX.Y.Z (YYYY-MM-DD)` + bullet list.

### Step 4: Build

```bash
cd packages/cli && pnpm build
```

`dist/` 출력 확인.

### Step 5: Git Commit + Tag

```bash
git add packages/cli/package.json CHANGELOG.md
git commit -m "release: foundry-x vX.Y.Z"
git tag vX.Y.Z
```

### Step 6: 사용자 확인

AskUserQuestion으로 최종 확인:
- 변경된 version
- CHANGELOG 내용
- "npm publish 진행할까요?"

### Step 7: Publish

사용자 승인 후:
```bash
cd packages/cli && npm publish --access public
```

### Step 8: Post-publish

- MEMORY.md의 npm 버전 정보 갱신
- `git push && git push --tags` 안내 (Branch Protection으로 PR 필요할 수 있음)

## Safety Rules

- `npm publish`는 반드시 사용자 명시적 승인 후 실행
- typecheck/lint/test 중 하나라도 실패하면 즉시 중단
- `--force` 플래그 사용 금지
- 이미 publish된 버전으로 bump 시도 시 경고
