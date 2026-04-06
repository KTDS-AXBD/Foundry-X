# Prototype Auto-Gen Planning Document

> **Summary**: PRD를 입력하면 AI 에이전트가 인터랙티브 데모 Prototype을 자동 생성·배포하는 파이프라인
>
> **Project**: Foundry-X
> **Version**: Phase 16 (Sprint 158~160)
> **Author**: AX BD팀
> **Date**: 2026-04-06
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | BD팀이 사업 아이템을 시각적으로 검증하려면 개발팀에 의뢰해 2~4주 대기해야 함. 발굴→PRD 파이프라인은 자동화되었으나 PRD→Prototype 구간이 완전히 비어 있음 |
| **Solution** | Claude Code CLI(`--bare`, API 키)로 PRD 기반 React SPA를 자동 생성하고, O-G-D 품질 루프로 검증 후 Cloudflare Pages에 배포. Docker 격리 + 3단계 Fallback으로 안정성 확보 |
| **Function/UX Effect** | BD팀이 "Prototype 생성" 버튼 하나로 10분 이내 배포 완료. 빌드 로그 실시간 확인 + iframe 프리뷰 + 피드백→재생성 Loop |
| **Core Value** | 사업 아이디어 검증 주기를 4주→10분으로 단축. Haiku 모델 주력으로 건당 ~$0.5~1, 월 ~$10~20 비용으로 지속 가능 |

---

## 1. Overview

### 1.1 Purpose

Foundry-X의 AX BD 파이프라인에서 **PRD→Prototype** 구간을 자동화하여, 비개발자(BD팀)가 사업 아이템의 실물 데모를 즉시 확인하고 검증할 수 있게 한다.

### 1.2 Background

- Phase 14(Agent Orchestration) 완료로 에이전트 인프라 확보
- 발굴(Discovery)→PRD 자동 생성→멀티 AI 리뷰 파이프라인 완성
- PRD→Prototype 구간만 수동 — BD팀이 개발팀에 의뢰해 2~4주 대기
- 경쟁사(Vercel v0, Bolt.new) AI 코드 생성 서비스 급성장
- Dry-Run 실측: O-G-D 2라운드 만에 quality 0.45→0.72, 전체 ~10.5분

### 1.3 Related Documents

- PRD: `docs/specs/prototype-auto-gen/prd-final.md` (3R + Six Hats + 오픈이슈 해소)
- Dry-Run 산출물: `docs/specs/prototype-auto-gen/dry-run-v1-dashboard.html`, `dry-run-v2-full.html`
- 검토 아카이브: `docs/specs/prototype-auto-gen/archive/` (Round 1~3 + Six Hats 토론)
- SPEC: F351~F356 (FX-REQ-343~348)

---

## 2. Scope

### 2.1 In Scope

- [ ] **F351**: React SPA 템플릿(Vite+React18+TailwindCSS+shadcn/ui) + Builder Server 스캐폴딩 + Docker 격리 실행 환경
- [ ] **F352**: Claude Code CLI `--bare` 모드 서버 실행 PoC — E2E(PRD→CLI→빌드→Pages배포→URL) + Haiku 비용 실측
- [ ] **F353**: D1 마이그레이션(prototypes 테이블) + Prototype API 3 라우트 + State Machine
- [ ] **F354**: Fallback 아키텍처(CLI→API직접호출) + API 비용 모니터링 + 월 예산 알림
- [ ] **F355**: O-G-D 품질 루프(Orchestrator+Generator+Discriminator, max 3 rounds)
- [ ] **F356**: Prototype 대시보드(목록/상세/로그/프리뷰) + BD팀 피드백→재생성 Loop + Slack 알림

### 2.2 Out of Scope

- 실제 제품 코드 생성 (Prototype은 데모용)
- Figma/XD 등 디자인 도구 연동 (입력은 PRD 텍스트만)
- Vue/Angular/Flutter 등 멀티 프레임워크
- 온라인 코드 편집기/IDE 통합
- Builder Server HA(고가용성)/멀티 리전

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item | Sprint |
|----|-------------|----------|--------|--------|
| FR-01 | PRD 입력 → React SPA 자동 생성 (Claude Code CLI `--bare`) | P0 | F351+F352 | 158 |
| FR-02 | 자동 빌드(`vite build`) + Cloudflare Pages 배포 + URL 반환 | P0 | F351 | 158 |
| FR-03 | Docker 컨테이너 격리 실행 (Job별 독립 환경) | P0 | F351 | 158 |
| FR-04 | D1 prototypes 테이블 + CRUD API + State Machine | P0 | F353 | 159 |
| FR-05 | CLI→API 자동 Fallback + 비용 모니터링 | P0 | F354 | 159 |
| FR-06 | O-G-D 품질 루프 (Generator→Discriminator→재생성, max 3R) | P0 | F355 | 160 |
| FR-07 | Web 대시보드 (목록/상세/빌드로그/iframe 프리뷰) | P1 | F356 | 160 |
| FR-08 | BD팀 피드백 입력 → Generator 재생성 자동 반영 | P1 | F356 | 160 |
| FR-09 | Slack 완료/실패 알림 | P1 | F356 | 160 |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 생성 시간 ≤ 15분 (MVP), 목표 ≤ 10분 | queued → live 소요 시간 |
| Cost | 월 API 비용 ≤ $100 (Haiku 주력) | API 사용량 대시보드 |
| Reliability | 생성 성공률 ≥ 80% | 빌드 성공 + 배포 완료 비율 |
| Security | PII 자동 탐지, Docker 격리, API 키 환경변수 관리 | 보안 체크리스트 |
| Isolation | Job별 Docker 컨테이너 격리 | 파일/프로세스 충돌 없음 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] E2E: 단일 PRD → React SPA Prototype → Cloudflare Pages 배포 → URL 반환
- [ ] 5종 이상 PRD 테스트에서 생성 성공률 ≥ 80%
- [ ] O-G-D 품질 루프 동작 (quality ≥ 0.85 수렴)
- [ ] Docker 격리 실행 확인
- [ ] CLI→API Fallback 자동 전환 테스트
- [ ] BD팀 1명 이상 실 사용 + 피드백

### 4.2 Quality Criteria

- [ ] Builder Server 48시간 연속 운영 안정성
- [ ] API 테스트 커버리지 ≥ 80%
- [ ] typecheck + lint 통과
- [ ] 월 비용 ≤ $100

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| API 비용 증가 (Haiku→Sonnet 전환) | Medium | Medium | Haiku 주력, 월 예산 상한, 사용량 모니터링 |
| API Rate Limit 초과 | Medium | Low | 큐 순차 처리, 다중 AI Fallback |
| 생성 품질 편차 (PRD 복잡도별) | Medium | High | O-G-D 루프, 체크리스트 전처리, 다양한 PRD Dry-run |
| Builder Server 장애 (SPOF) | Medium | Low | 헬스체크 + systemd 자동 재시작 |
| 보안/민감정보 노출 | High | Low | PII Detection, Docker 격리, API 키 분리 |
| PRD 전처리 실패 | Medium | Medium | 수동 fallback, 운영자 알림, PRD 표준 가이드 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | Simple structure | ☐ |
| **Dynamic** | Feature-based modules, BaaS integration | ☒ |
| **Enterprise** | Strict layer separation, microservices | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Generator 실행 | Claude Code CLI / Claude API 직접 / OpenAI | **CLI `--bare`** (Primary) | 공식 자동화 도구, 도구 사용(Bash/Read/Edit) 가능 |
| 인증 방식 | Max 구독 OAuth / API 키 | **API 키** | OAuth 서버 부적합(8~12h 만료), Agent SDK OAuth 금지 |
| 모델 | Opus / Sonnet / Haiku | **Haiku** (주력) | 비용 최적화 (~$0.5/건), 최종 Round만 Sonnet |
| 격리 | 공유 파일시스템 / Docker | **Docker** | 리소스 격리, 보안, 재현 가능성 |
| 상태 관리 | 단순 status 필드 / State Machine | **State Machine** | dead-letter queue, timeout rollback 필요 |
| 배포 | Vercel / Netlify / Cloudflare Pages | **Cloudflare Pages** | 기존 인프라, wrangler 자동 프로젝트 생성 |
| 피드백 | 없음 / 수동 / 자동 Loop | **자동 Loop** | feedback.md → Generator 재입력 |

### 6.3 시스템 구성

```
Foundry-X 기존 인프라 (변경 없음)
├── packages/api/     → Prototype API 라우트 추가 (F353)
├── packages/web/     → Prototype 대시보드 추가 (F356)
└── packages/shared/  → Prototype 타입 추가

신규 (독립 서비스)
└── prototype-builder/  → Builder Server (F351)
    ├── src/
    │   ├── poller.ts          # API 폴링 → Job 감지
    │   ├── executor.ts        # Docker 컨테이너 실행 + CLI 호출
    │   ├── deployer.ts        # wrangler pages deploy
    │   ├── orchestrator.ts    # O-G-D 루프 제어 (F355)
    │   ├── notifier.ts        # Slack 알림
    │   └── cost-tracker.ts    # API 비용 모니터링 (F354)
    ├── templates/react-spa/   # 프로젝트 템플릿
    └── Dockerfile
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config, 3 custom rules)
- [x] TypeScript strict mode
- [x] Vitest testing framework
- [x] Hono API pattern (route→schema→service)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **Builder Server 구조** | missing | poller/executor/deployer 패턴 | High |
| **Docker 실행 규칙** | missing | 컨테이너 lifecycle, 정리 정책 | High |
| **CLI 호출 패턴** | missing | `--bare --allowedTools` 표준 플래그 | High |
| **비용 추적** | missing | API 호출별 토큰/비용 로깅 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `ANTHROPIC_API_KEY` | Claude CLI + API 인증 | Builder Server | ☒ (기존) |
| `CLOUDFLARE_API_TOKEN` | Pages 배포 | Builder Server | ☐ |
| `CLOUDFLARE_ACCOUNT_ID` | Pages 배포 | Builder Server | ☒ (기존) |
| `SLACK_WEBHOOK_URL` | 알림 발송 | Builder Server | ☐ |
| `COST_BUDGET_MONTHLY` | 월 예산 상한 ($) | Builder Server | ☐ |

---

## 8. Implementation Plan

### Sprint 158 — Foundation (F351 + F352)

| 순서 | 작업 | 산출물 | 예상 |
|------|------|--------|------|
| 1 | React SPA 템플릿 생성 (Vite+React18+TailwindCSS+shadcn/ui) | `templates/react-spa/` | 1h |
| 2 | Builder Server 스캐폴딩 (poller, executor, deployer, Dockerfile) | `prototype-builder/` | 3h |
| 3 | Docker 격리 실행 환경 설정 | Dockerfile + docker-compose | 2h |
| 4 | CLI `--bare` PoC: PRD→생성→빌드→배포→URL | E2E 검증 완료 | 3h |
| 5 | Haiku 모델 비용 실측 (5종 PRD) | 비용 보고서 | 1h |

### Sprint 159 — Core Pipeline (F353 + F354)

| 순서 | 작업 | 산출물 | 예상 |
|------|------|--------|------|
| 1 | D1 마이그레이션: prototypes 테이블 | `migrations/0100_prototypes.sql` | 0.5h |
| 2 | Zod 스키마 + PrototypeService | schemas + services | 2h |
| 3 | API 라우트 3개 (POST/GET/PATCH) | routes/prototype.ts | 2h |
| 4 | State Machine (queued→building→live→failed→dead_letter) | state-machine.ts | 2h |
| 5 | Fallback 아키텍처 (CLI→API 자동 전환) | executor.ts 확장 | 2h |
| 6 | 비용 모니터링 + 월 예산 알림 | cost-tracker.ts | 1h |

### Sprint 160 — Integration (F355 + F356)

| 순서 | 작업 | 산출물 | 예상 |
|------|------|--------|------|
| 1 | O-G-D Orchestrator (체크리스트 전처리 + 루프 제어) | orchestrator.ts | 3h |
| 2 | Generator + Discriminator 연동 | executor 확장 | 2h |
| 3 | Prototype 대시보드 (목록/상세/빌드로그/iframe) | web/routes/prototype/ | 3h |
| 4 | 실사용자 피드백 Loop (feedback→재생성) | feedback-loop.ts + UI | 2h |
| 5 | Slack 알림 연동 | notifier.ts | 0.5h |
| 6 | E2E 통합 테스트 | tests | 1h |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`/pdca design prototype-auto-gen`)
2. [ ] Builder Server 호스팅 환경 결정 (오픈 이슈 #5)
3. [ ] Sprint 158 착수 (Phase 15와 독립 병렬 가능)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-06 | Initial draft — PRD final 기반 | AX BD팀 |
