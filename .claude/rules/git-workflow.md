# Foundry-X Git Workflow

## Branch & Merge
- Branch Protection: master에 직접 push 불가 — PR 필수 + 1명 Approve
- Merge 전략: Squash merge + Linear history + Auto-delete branches
- Remote: HTTPS + PAT 인증 (SSH 아님)

## Sprint Worktree
- WT 생성: `bash -i -c "sprint N"` 함수만 사용 (wt.exe/git worktree 직접 호출 금지)
- WT에서 작업 → Master에서 `/ax:sprint merge N`으로 통합

## 필수 금지 사항
- `git add .` 절대 금지 — 파일을 개별 지정 (멀티 pane 사고 방지)
- `git add -A` / `git add --all` 금지 — 동일 이유
- `--no-verify` 금지 — hook 실패 시 원인 해결 후 재시도
- `git push --force` 금지 — Linear history 파괴
- 자동 커밋 절대 금지 — NL→Spec 변환 결과는 사람 확인 후 커밋
