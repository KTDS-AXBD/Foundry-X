# AGENTS.md

This file provides guidance to AI coding agents (Codex, Devin, etc.) working in this repository.
Section structure mirrors CLAUDE.md for harness sync verification.

## Project Overview

Foundry-X CLI — 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼의 Phase 1 CLI 도구.
핵심 철학: "Git이 진실, Foundry-X는 렌즈"

- Language: TypeScript, Python
- Framework: Commander (CLI), Plumb (SDD Engine)
- Build: pnpm workspace, Turborepo, tsc

## Architecture

- 5축: 하네스 구축, SDD Triangle, 에이전트 오케스트레이션, 지식 공유(SSOT), 협업 워크스페이스
- Phase 1: CLI가 Plumb를 subprocess로 직접 호출, API Server 없음
- 핵심 커맨드: `foundry-x init`, `foundry-x status`, `foundry-x sync`

## Repository Structure

모노리포 (pnpm workspace + Turborepo). `packages/cli/src/` 하위:
- `harness/` — detect, discover, analyze, generate, verify, merge-utils
- `plumb/` — bridge, errors, types (Plumb subprocess 래퍼)
- `services/` — config-manager, health-score, logger

## Key Documents

- PRD: `docs/specs/prd-v4.md` (유일한 현행 명세, ADR-000 확정)
- ADR: `docs/adr/` (Architecture Decision Records)
- Specs: `docs/specs/` (계약 문서, 인터뷰 로그)

## Development Setup (구현 착수 시)

```bash
pnpm install
turbo build
pip install plumb-dev
npx foundry-x init
```

## Sprint 1 Checklist (착수 즉시 과제)

에이전트는 이 체크리스트를 참조하되, 체크 상태 변경은 사람이 확인 후 수행한다.
현재 상태: CLAUDE.md 참조.

## Design Decisions & Constraints

- 모노리포 확정 (ADR-000, PRD v3 AI 검토 근거)
- Phase 1 범위: CLI 3개 커맨드만
- 자동 커밋 절대 금지: 에이전트가 생성한 결과는 반드시 사람이 확인 후 커밋
- Git hook 우회 금지: `--no-verify` 비율 < 20%

## 성공 지표 (구현 시 참고)

| 지표 | 목표 |
|------|------|
| CLI 주간 호출/사용자 | 10회+ |
| `--no-verify` 우회 비율 | < 20% |
| sync 후 수동 수정 파일 | 감소 추세 |
| 결정 승인율 | > 70% |

### Workflow

1. `specs/` 디렉토리의 요구사항 확인
2. `CONSTITUTION.md` (있으면)의 경계 규칙 확인
3. 변경 구현
4. `pnpm test`로 테스트 실행
5. `progress.md` (있으면) 업데이트

### 하네스 갱신 규칙 (에이전트 필독)

이 파일은 프로젝트와 함께 살아있어야 한다.
다음 조건에서 이 파일을 업데이트하라:
- 새 CLI 커맨드 추가 시
- 새로운 Always/Ask/Never 경계 결정 시
갱신 후: `foundry-x status`로 하네스 무결성 확인
