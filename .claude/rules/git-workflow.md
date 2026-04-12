# Foundry-X Git Workflow

## Branch & Merge (Context-aware, 혼자 개발 모드)

> 혼자 개발 context (S258~). Branch Protection은 서버 측 설정 없음(문서/self-discipline만 있었음).
> 아래 정책은 변경 파일 성격에 따라 **자동 분기**한다.

### Meta-only 변경 → master 직접 commit+push
- **대상**: `SPEC.md`, `CHANGELOG.md`, `docs/**`, `.claude/**`, `*.md` (루트), MEMORY 파일
- **절차**: `git checkout master` → `git add <파일 개별>` → `git commit` → `git push origin master`
- **근거**: 이력/롤백 필요성 낮음, CI 무관, deploy.yml은 meta-only 변경에도 돌지만 빠르게 pass함
- **주의**: hook(PreToolUse)는 여전히 적용 — `--no-verify` 여전히 금지

### Code 변경 → PR + auto-merge (CI 통과 후 자동 머지)
- **대상**: `packages/**/*.{ts,tsx,js}`, `packages/api/src/db/migrations/*.sql`, `scripts/**/*.sh`, `wrangler.toml`, 빌드 설정, 테스트 코드
- **절차**: feature 브랜치 → commit+push → `gh pr create` → `gh pr merge <N> --auto --squash`
- **`--auto`**: CI 통과하면 GitHub이 자동 squash merge 수행, 실패하면 대기 (수동 개입 신호)
- **전제조건**: repo 설정 `allow_auto_merge: true` (S258에 활성화)
- **근거**: deploy.yml이 master push 즉시 프로덕션 배포하므로 CI 통과 검증은 포기 불가

### 혼합 변경 (meta + code 동시)
- code PR에 meta 변경도 함께 포함 → `--auto --squash` 단일 경로로 통합
- meta만 있던 PR에 code가 끼어들면 **즉시 PR 분리** (meta는 master에 직접 push, code는 새 PR)

### 공통 유지 항목
- Merge 전략: **Squash merge + Linear history + Auto-delete branches** (변경 없음)
- Remote: HTTPS + PAT 인증 (SSH 아님)
- PR 이력: code 변경은 PR 경유가 **필수** (blame/revert/review 접근성)
- sprint merge: `/ax:sprint merge N` 흐름은 별도 (WT → PR → auto-merge 동일)

## Sprint Worktree
- WT 생성: `bash -i -c "sprint N"` 함수만 사용 (wt.exe/git worktree 직접 호출 금지)
- WT에서 작업 → Master에서 `/ax:sprint merge N`으로 통합

## Claude Squad (cs) 운영 규칙
- cs 실행 시 `HOME=/home/sinclair` prefix 필수 (multi-account HOME 정합성, C28 패턴)
- `--autoyes` (-y) 사용 금지 — 자동 커밋/push 방지
- cs config `auto_yes: false` 유지 확인
- cs 세션 내부에서도 아래 "필수 금지 사항" 전체 규칙 동일 적용
- cs 세션 정리: `HOME=/home/sinclair cs reset` (worktree 잔존 방지)
- sprint WT: `sprint N` 명령으로 생성 → cs가 자동 실행됨 (직접 cs 호출 불필요)

## 필수 금지 사항
- `git add .` 절대 금지 — 파일을 개별 지정 (멀티 pane 사고 방지)
- `git add -A` / `git add --all` 금지 — 동일 이유
- `--no-verify` 금지 — hook 실패 시 원인 해결 후 재시도
- `git push --force` 금지 — Linear history 파괴
- 자동 커밋 절대 금지 — NL→Spec 변환 결과는 사람 확인 후 커밋
