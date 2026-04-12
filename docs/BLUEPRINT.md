---
code: FX-DOC-BLUEPRINT
title: Foundry-X Blueprint
version: 1.36
status: Active
created: 2026-04-12
updated: 2026-04-12
author: Sinclair Seo
---

# Foundry-X Blueprint v1.36

> "Git이 진실, Foundry-X는 렌즈" — 명세/코드/테스트/결정 이력은 Git에, Foundry-X는 읽기/분석/동기화 레이어.

## 1. Vision

AX 사업개발 라이프사이클을 AI 에이전트로 자동화하는 오케스트레이션 플랫폼.
사람과 AI 에이전트가 동등한 팀원으로 협업하는 1인 AI-native 개발 환경.

**핵심 철학**:
- **SDD Triangle**: Spec ↔ Code ↔ Test 상시 동기화
- **SPEC.md = SSOT**: 모든 F-item, Phase, Sprint 상태의 권위 소스
- **Git-centric**: GitHub를 핵심 레이어, Foundry-X는 그 위의 렌즈

## 2. Architecture

모노리포 (pnpm workspace + Turborepo), 4개 패키지:

```
┌─────────────────────────────────────────────────────────┐
│                    Foundry-X Monorepo                    │
├──────────┬──────────┬──────────┬────────────────────────┤
│   cli    │   api    │   web    │        shared          │
│ TS       │ Hono     │ Vite 8   │ 공유 타입              │
│ Commander│ CF       │ React 18 │ types, web, agent,     │
│ Ink 5    │ Workers  │ RR7      │ plugin, sso,           │
│ TUI      │ D1       │ Zustand  │ methodology,           │
│          │          │          │ discovery-x, ax-bd, kg │
├──────────┴──────────┴──────────┴────────────────────────┤
│ Infra: Cloudflare Workers + Pages + D1                  │
│ CI/CD: GitHub Actions (deploy.yml)                      │
│ Multi-agent: Claude Squad v1.0.17                       │
└─────────────────────────────────────────────────────────┘
```

**외부 연동**: GitHub API, OpenRouter (LLM), Google OAuth, Marker.io (피드백)

## 3. Phase Map

### 완료 (Phase 1~35)

| Phase | 이름 | 핵심 산출물 |
|:-----:|------|------------|
| 1 | Go 판정 | 모노리포 + CLI + Ink 5 TUI, Go 정성 판정 (2026-03-17) |
| 2 | API + Web + 인프라 | Hono API, CF Workers, D1, JWT 인증, Web Dashboard |
| 3 | 기술 스택 점검 | PRD v5, AXIS DS 전환, Plumb Track B 보류 |
| 4 | 프론트/인증/API/데이터 통합 | Phase 4-A~E, 외부 연동 + 온보딩 |
| 5 | Agent Evolution + 고객 파일럿 | 멀티모델, 역할 에이전트 12종, 에이전트 마켓플레이스 |
| 5c~5f | 방법론 + BD 체계 | 플러그인 아키텍처, BMC 에디터, BD A-to-Z |
| 7~8 | BD Pipeline E2E | Vite 전환, IA 개선, 2475 tests |
| 9 | GIVC PoC + 발굴 UX | Ontology, 위저드 UI, Help Agent, HITL 패널 |
| 11~15 | IA + Skill + Discovery 고도화 | Figma IA, 3시스템 통합, 2계층 루프, 9탭 UI |
| 16~28 | 발굴 고도화 + Knowledge Graph | 발굴 데이터 강화, KG 모델링, 인프라 정비 |
| 29 | 요구사항 거버넌스 자동화 | REQ 관리 표준, SPEC↔Issue 3-way 정합성 |
| 30 | 발굴 평가결과서 v2 | AX BD 9-스테이지 리치 리포트 |
| 31 | Task Orchestrator | Master pane F/B/C/X 4트랙, flock 동시성 |
| 32 | Work Management System | 4-Layer 체계, GitHub Projects, Velocity, Priority |
| 33 | Work Management Observability | F509 Walking Skeleton (Kanban + Context + Classify) |
| 34 | 멀티 에이전트 세션 표준화 | Claude Squad 도입, Sessions 탭, C28 3중 방어선 |
| 35 | Work Management 품질 보강 | SQL injection 방어, 에러 UI, E2E 보강 |

### 진행 중

| Phase | 이름 | 상태 |
|:-----:|------|:----:|
| 36 | Work Management Enhancement | 📋 착수 준비 |

### 장기 Backlog

| F-item | 내용 | 상태 |
|--------|------|:----:|
| F112 | — | 수요 대기 |
| F117 | — | 수요 대기 |

## 4. Key Decisions

| 결정 | 선택 | 근거 |
|------|------|------|
| 저장소 | Git (SSOT) + D1 (캐시) | "Git이 진실" 철학. DB는 조회 최적화만 |
| 프레임워크 | TS 전역 (CLI/API/Web) | 타입 공유, 모노리포 시너지 |
| 배포 | Cloudflare Workers + Pages | 무료 플랜, Edge 성능, D1 SQLite |
| 상태 관리 | SPEC.md 텍스트 → 스크립트 파싱 | Jira 불요, 1인 개발에 최적 |
| 테스트 | Vitest + Playwright | TDD Red→Green, Hono app.request() 패턴 |
| 멀티 에이전트 | Claude Squad + Sprint WT | Opus(Master) + Sonnet(Worker) 분리 |

## 5. Metrics Snapshot

> 하드코딩 금지 — 실측은 `/ax:daily-check` 또는 SPEC.md §2 참조

- Routes: ~10
- Services: ~28
- Schemas: ~14
- D1 Migrations: 0126
- Tests: ~3452 (E2E 273)
- Phases: 35 완료 + 1 진행

---

## Version History

| 버전 | 날짜 | 변경 |
|------|------|------|
| 1.36 | 2026-04-12 | 초판. Phase 36 착수 시점 기준 |
