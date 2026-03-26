---
code: FX-GUID-002
title: "CC 스킬 카탈로그"
version: 1.0
status: Active
category: GUID
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
---

# CC 스킬 카탈로그

> 총 **82개** 스킬 (sf-scan 기준)

## business-automation (9개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `agent-development` | plugin | This skill should be used when the user asks to "create an agent", "add an agent |
| `ax-git-team` | user | Agent Teams를 tmux in-window split에서 병렬 수행한다. |
| `ax-session-end` | user | 세션 종료 시 코드 커밋 + 문서 갱신 + git push + CI/CD 배포. |
| `ax-session-start` | user | 세션 시작 시 프로젝트 컨텍스트를 복원한다. |
| `claude-automation-recommender` | plugin | Analyze a codebase and recommend Claude Code automations (hooks, subagents, skil |
| `hook-development` | plugin | This skill should be used when the user asks to "create a hook", "add a PreToolU |
| `sf-deploy` | plugin | Deploy selected skills to team Git repo or local directory. |
| `tdd` | project | TDD 자동화 — Red→Green→Refactor 사이클 오케스트레이터. |
| `writing-hookify-rules` | plugin | This skill should be used when the user asks to "create a hookify rule", "write  |

## cicd-deployment (3개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `ax-code-deploy` | user | 프리뷰 배포 또는 명시적 재배포. |
| `npm-release` | project | foundry-x CLI npm 배포 — version bump, 검증, build, publish 자동화. Use when: npm publi |
| `phase-9-deployment` | plugin | Skill for deploying to production environment. |

## code-quality (10개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `ax-sprint` | user | Sprint worktree 오케스트레이션 — Master에서 Sprint 생성/리뷰/머지/정리. |
| `bkit-rules` | plugin | Core rules for bkit plugin. PDCA methodology, level detection, agent auto-trigge |
| `claude-md-improver` | plugin | Audit and improve CLAUDE.md files in repositories. Use when user asks to check,  |
| `code-review` | plugin | Code review skill for analyzing code quality, detecting bugs, and ensuring best  |
| `phase-2-convention` | plugin | Skill for defining coding rules and conventions. |
| `sf-catalog` | plugin | Generate skill catalog markdown document from skill-catalog.json. |
| `sf-deps` | plugin | Skill dependency graph — Mermaid diagram, cycle detection, dependency table. |
| `sf-lint` | plugin | Check skill quality against lint rules and optionally auto-fix issues. |
| `sf-refactor` | plugin | Batch refactoring of skills to match guidelines — adds gotchas scaffold and refe |
| `sf-scan` | plugin | Scan all Claude Code skills (user/project/plugin) and build skill-catalog.json. |

## code-scaffolding (18개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `bkend-cookbook` | plugin | bkend.ai practical project tutorials and troubleshooting guide. |
| `build-mcp-server` | plugin | This skill should be used when the user asks to "build an MCP server", "create a |
| `build-mcpb` | plugin | This skill should be used when the user wants to "package an MCP server", "bundl |
| `command-development` | plugin | This skill should be used when the user asks to "create a slash command", "add a |
| `desktop-app` | plugin | Desktop app development guide for cross-platform desktop applications. |
| `dynamic` | plugin | Fullstack development skill using bkend.ai BaaS platform. |
| `example-skill` | plugin | This skill should be used when the user asks to "demonstrate skills", "show skil |
| `frontend-design` | plugin | Create distinctive, production-grade frontend interfaces with high design qualit |
| `mobile-app` | plugin | Mobile app development guide for cross-platform apps. |
| `phase-1-schema` | plugin | Skill for defining terminology and data structures used throughout the project. |
| `phase-3-mockup` | plugin | Skill for creating mockups with UI/UX trends without a designer. |
| `phase-5-design-system` | plugin | Skill for building platform-independent design systems. |
| `phase-6-ui-integration` | plugin | Skill for implementing actual UI and integrating with APIs. |
| `playground` | plugin | Creates interactive HTML playgrounds — self-contained single-file explorers that |
| `plugin-settings` | plugin | This skill should be used when the user asks about "plugin settings", "store plu |
| `plugin-structure` | plugin | This skill should be used when the user asks to "create a plugin", "scaffold a p |
| `skill-development` | plugin | This skill should be used when the user wants to "create a skill", "add a skill  |
| `starter` | plugin | Static web development skill for beginners and non-developers. |

## data-analysis (2개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `sf-search` | plugin | Search skills by keyword, category, or scope. |
| `sf-usage` | plugin | Skill usage analytics — report, deprecation candidates, log rotation, catalog sy |

## doc-governance (9개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `ax-gov-doc` | user | 문서 관리 — 새 문서 생성, 인덱스 갱신, 버전 관리, 아카이브, 메타데이터 검증. |
| `ax-gov-retro` | user | 마일스톤 회고 — SemVer Minor 태그 시점에 지표 수집, 회고 작성, CHANGELOG/MEMORY 반영. Use when: 회고, r |
| `ax-gov-risk` | user | 리스크 관리 — 블로커/의존성/기술부채/제약 등록, 목록 조회, 해소 처리. Use when: 리스크, 블로커, 기술부채, risk, block |
| `ax-gov-standards` | user | 거버넌스 표준 관리 — 표준 목록 조회, 갭 분석, 적용 상태 확인. |
| `ax-gov-version` | user | 버전 관리 — 현재 버전 상태 확인, 범프, 태그 생성, 일관성 검증. |
| `ax-help` | user | ax 스킬셋 사용 가이드 — 16개 명령 + 1개 스킬의 용도, 서브커맨드, 실전 사례 안내. |
| `bkit-templates` | plugin | PDCA document templates for consistent documentation. |
| `claude-code-learning` | plugin | Claude Code learning and education skill. |
| `example-command` | plugin | An example user-invoked skill that demonstrates frontmatter options and the skil |

## infra-operations (3개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `ax-git-sync` | user | Git을 통한 멀티 환경(Windows/WSL/Mac) 간 프로젝트 동기화. |
| `ax-infra-statusline` | user | StatusLine 요구사항 표시를 관리한다. |
| `enterprise` | plugin | Enterprise-grade system development with microservices, Kubernetes, and Terrafor |

## library-reference (7개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `bkend-auth` | plugin | bkend.ai authentication and security expert skill. |
| `bkend-data` | plugin | bkend.ai database expert skill. |
| `bkend-quickstart` | plugin | bkend.ai platform onboarding and core concepts guide. |
| `bkend-storage` | plugin | bkend.ai file storage expert skill. |
| `build-mcp-app` | plugin | This skill should be used when the user wants to build an "MCP app", add "intera |
| `firecrawl` | plugin | Firecrawl handles all web operations with superior accuracy, speed, and LLM-opti |
| `mcp-integration` | plugin | This skill should be used when the user asks to "add MCP server", "integrate MCP |

## product-verification (12개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `access` | plugin | Manage Discord channel access — approve pairings, edit allowlists, set DM/group  |
| `ax-code-verify` | user | 코드 검증 — lint + typecheck + test를 한 번에 실행한다. |
| `ax-infra-selfcheck` | user | ax plugin 자율점검 — commands, standards, hooks, 참조 정합성을 자동 검증한다. |
| `ax-sprint-pipeline` | user | Master에서 복수 Sprint를 의존성 분석→배치 병렬 실행→자동 merge 파이프라인 오케스트레이션 |
| `configure` | plugin | Set up the Discord channel — save the bot token and review access policy. Use wh |
| `development-pipeline` | plugin | 9-phase Development Pipeline complete knowledge. |
| `gstack` | user | Fast headless browser for QA testing and site dogfooding. Navigate any URL, inte |
| `math-olympiad` | plugin | Solve competition math problems (IMO, Putnam, USAMO, AIME) with adversarial veri |
| `phase-7-seo-security` | plugin | Skill for enhancing search optimization (SEO) and security. |
| `phase-8-review` | plugin | Skill for verifying overall codebase quality and gap analysis. |
| `skill-creator` | plugin | Create new skills, modify and improve existing skills, and measure skill perform |
| `zero-script-qa` | plugin | Zero Script QA - Testing methodology without test scripts. |

## requirements-planning (9개)

| 스킬 | Scope | 설명 |
|------|:-----:|------|
| `ax-bd-discovery` | project | AX BD 2단계 발굴 프로세스 오케스트레이터 (v8.2) — 5유형(I/M/P/T/S) 분류, 11단계 분석(2-0~2-10), 사업성 체크포 |
| `ax-req-integrity` | user | 요구사항 정합성 검증 — SPEC ↔ GitHub Issues ↔ Execution Plan 3-way 비교. |
| `ax-req-interview` | user | 요구사항 기획 단계에서 인터뷰 → PRD 작성 → 외부 AI 다중 검토 → 반복 개선 → 착수 판단까지의 전체 워크플로우를 자동화하는 스킬. |
| `ax-req-manage` | user | 요구사항 관리 — 등록/분류/상태변경/목록/SPEC 동기화. Use when: 요구사항 등록, REQ, 상태 변경, requirement, SP |
| `ax-sprint-autopilot` | user | Sprint WT 전체 자동화 — Plan→Design→Implement→Analyze→Report→Session-End |
| `pdca` | plugin | Unified skill for managing the entire PDCA cycle. |
| `phase-4-api` | plugin | Skill for designing and implementing backend APIs. |
| `plan-plus` | plugin | Plan Plus — Brainstorming-Enhanced PDCA Planning. |
| `pm-discovery` | plugin | PM Agent Team - Automated product discovery, strategy, and PRD generation. |
