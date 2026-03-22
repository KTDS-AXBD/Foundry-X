# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview
- Language: {{languages}}
- Framework: {{frameworks}}
- Build: {{buildTools}}
- Architecture: {{architecturePattern}}

## Commands
- Build: [TODO: add build command]
- Test: [TODO: add test command]
- Lint: [TODO: add lint command]

## KT DS SR 워크플로우

### SR 유형 분류 (Foundry-X 자동화)

| SR 유형 | 에이전트 워크플로우 | SLA |
|---------|--------------------|----|
| `security_patch` | Security → Test → Reviewer | 4h / 1일 |
| `bug_fix` | QA → Planner → Test → Security → Reviewer | 4h / 1일 |
| `env_config` | Infra → Security → Reviewer | 1일 / 3일 |
| `doc_update` | Planner → Architect → Reviewer | 1일 / 3일 |
| `code_change` | Planner → Architect → Test → Reviewer | 2일 / 5일 |

### SR 자동화 프로세스
1. SR 접수 → `POST /api/sr` (자동 분류 + D1 저장)
2. 워크플로우 실행 → `POST /api/sr/:id/execute`
3. 에이전트 순차 실행 → WorkflowEngine DAG 기반
4. Human Review → 대시보드에서 승인/반려
5. SR 완료 → `PATCH /api/sr/:id { status: "done" }`

### SR 수동 프로세스 (폴백)
1. SR 접수 → `specs/sr-template.md` 복사하여 `specs/SR-XXXX.md` 생성
2. 요구사항 분석 → 영향 범위/검증 기준 작성
3. 구현 → feature branch에서 작업
4. 검증 → 검증 기준 체크리스트 완료
5. 배포 → `foundry-x sync`로 SDD Triangle 검증 후 PR

### SR 우선순위 기준
| 우선순위 | 응답 시간 | 해결 목표 |
|----------|----------|----------|
| High | 4시간 | 1영업일 |
| Medium | 1영업일 | 3영업일 |
| Low | 2영업일 | 5영업일 |

### SR 파일 명명 규칙
- `specs/SR-{번호}.md` — 개별 SR 명세
- `specs/SR-{번호}-design.md` — 설계 문서 (필요 시)

## 하네스 갱신 규칙 (에이전트 필독)

이 파일은 프로젝트와 함께 살아있어야 한다.
다음 조건에서 이 파일을 업데이트하라:
- 새 CLI 커맨드 추가 시
- 빌드/테스트/lint 커맨드 변경 시
- 디렉터리 구조 주요 변경 시
갱신 후: `foundry-x status`로 하네스 무결성 확인
