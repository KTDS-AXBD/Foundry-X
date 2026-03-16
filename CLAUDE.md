# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry-X(파운드리엑스)는 사람과 AI 에이전트가 동등한 팀원으로 협업하는 조직 협업 플랫폼이에요.
핵심 철학: **"Git이 진실, Foundry-X는 렌즈"** — 모든 명세/코드/테스트/결정 이력은 Git에 존재하고, Foundry-X는 이를 읽고 분석하고 동기화를 강제하는 레이어예요.

**현재 상태:** 설계/기획 완료, 구현 착수 대기 (PRD v3, 다중 AI 검토 2라운드 완료, 착수 점수 84/100)

## Architecture

### 핵심 5축
1. **하네스 구축** — 에이전트가 안정적으로 일할 수 있는 리포 환경 (CLAUDE.md, 린터, CI 등)
2. **SDD Triangle** — Spec(명세) ↔ Code ↔ Test 상시 동기화 (Plumb 엔진 기반)
3. **에이전트 오케스트레이션** — 병렬 작업, 충돌 해결 (Phase 2)
4. **지식 공유 (SSOT)** — Git 리포 = 단일 진실 공급원
5. **협업 워크스페이스** — 웹 대시보드 (Phase 2)

### Phase 1 (MVP, Month 1-3): CLI + Plumb
- CLI가 Plumb를 subprocess로 직접 호출, API Server 없음
- 저장소: Git만 (PostgreSQL/Redis 불필요)
- 3개 핵심 커맨드: `foundry-x init`, `foundry-x status`, `foundry-x sync`
- 타겟: 개발자 5명 강제 온보딩

### Phase 2+: API Server + Web Dashboard 추가
- Hono(API) + Next.js(Web) + PostgreSQL(메타) + Redis(캐시/큐)
- Git↔DB 정합성: Git 우선, DB 비동기 동기화 (5분 주기 reconciliation)
- 에이전트 충돌: 브랜치 기반 격리 (feature branch → PR → SDD 검증 → merge)

### Tech Stack

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Node.js 20, Commander + Ink |
| SDD Engine | Python, Plumb (subprocess) |
| API Server (Phase 2) | TypeScript, Hono + Drizzle |
| Web Dashboard (Phase 2) | Next.js 14, shadcn/ui, Zustand |
| Git 연동 | simple-git + octokit |

### Plumb 2트랙 전략
- **Track A (즉시):** Plumb를 CLI subprocess로 래핑. `foundry-x sync` = `plumb review` + 메타데이터
- **Track B (대기):** Plumb 핵심 알고리즘을 TypeScript로 재구현 (전환 기준: Plumb 버그 장애 주 2회 이상)

## Repository Structure

현재는 순수 문서 리포지토리 (코드 미작성). 구현 시 계획된 모노리포 구조 (PRD v3 §7.9):

```
foundry-x/
├── packages/
│   ├── cli/              # foundry-x CLI (TypeScript)
│   │   └── src/commands/ # init.ts, sync.ts, status.ts
│   └── shared/           # 공유 타입, 설정
├── templates/            # 하네스 스타터 킷 (CLAUDE.md, AGENTS.md, specs/)
├── examples/             # 샘플 프로젝트
├── docs/adr/             # Architecture Decision Records
├── package.json          # 루트 (pnpm workspace)
├── pnpm-workspace.yaml
└── turbo.json
```

## Key Documents

| 문서 | 용도 |
|------|------|
| `prd-v3.md` | 현행 PRD (권위 문서) |
| `tech-stack-review.md` | 기술 스택 결정 근거 |
| `interview-log.md` | 요구사항 인터뷰 종합 (Part 1-5) |
| `review/round-1/` | 1차 다중 AI 검토 (ChatGPT, Gemini, Claude, Grok) |
| `review/round-2/` | 2차 검토 및 최종 착수 판정 |
| `review/round-*/review-synthesis.md` | 각 라운드 종합 분석 |

## Development Setup (구현 착수 시)

```bash
# 모노리포 의존성
pnpm install
turbo build

# SDD Engine (Python)
pip install plumb-dev

# CLI 로컬 테스트
npx foundry-x init
```

## Sprint 1 Checklist (착수 즉시 과제)

### Day 1 전
- [ ] ADR-000: v3가 기존 멀티리포/AI Foundry 문서를 대체한다는 선언
- [ ] Phase 1 Git provider 확정 (GitHub 또는 GitLab)

### Week 1~2
- [ ] `.plumb` 출력 형식 + `decisions.jsonl` 필드 내부 계약 문서화
- [ ] subprocess 래퍼 오류 처리 계약 (timeout, exit code, stderr)
- [ ] Phase 1 메타데이터 저장 방식 결정 (`.foundry-x/` JSON)
- [ ] `packages/cli` 핵심 모듈을 독립 패키지로 분리 설계
- [ ] TS+Python 빌드 파이프라인 검증 (Turborepo + Python 독립 빌드)
- [ ] `status` 커맨드에 Triangle Health Score 포함

## Design Decisions & Constraints

- **모노리포 (v3 확정)**: TS+Python 공존, Turborepo + Python 독립 빌드 단위. 안정화 후 분리 가능
- **3개월 Go/Kill 마일스톤**: Month 3에 KPI 기반 착수 지속/중단 판정
- **Phase 1 범위 엄수**: CLI 3개 커맨드만. 웹/API/오케스트레이션은 Phase 2로 이관
- **Git hook 우회 금지**: `--no-verify` 비율 < 20% 목표. hook 실패 시 human escalation
- **NL→Spec 변환은 Phase 2**: Phase 1에서는 수동 명세 작성
- **내부 계약 문서화 필요**: `.plumb` 출력 형식, `decisions.jsonl` 스키마 (Sprint 1 과제)
- **메타데이터 저장**: Phase 1은 DB 없이 `.foundry-x/` 디렉토리에 JSON 파일로 저장
- **status Triangle Health Score**: `foundry-x status`에 Spec↔Code↔Test 건강도 점수 표시 (Gemini 권고)
- **subprocess 오류 처리**: Plumb subprocess timeout/exit code/stderr 계약 문서화 필수 (Sprint 1)
- **자동 커밋 절대 금지**: NL→Spec 변환 결과는 반드시 사람이 확인 후 커밋

## 성공 지표 (구현 시 참고)

| 지표 | 목표 |
|------|------|
| CLI 주간 호출/사용자 | 10회+ |
| `--no-verify` 우회 비율 | < 20% |
| sync 후 수동 수정 파일 | 감소 추세 |
| 결정 승인율 | > 70% |
