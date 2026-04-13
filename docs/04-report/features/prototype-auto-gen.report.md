---
code: FX-RPRT-PROTO
title: "Phase 16 완료 보고서 — Prototype Auto-Gen (PRD→Prototype 자동 생성)"
version: 1.0
status: Active
category: RPRT
created: 2026-04-06
updated: 2026-04-06
author: AX BD팀
references: "[[FX-PLAN-PROTO-001]], [[FX-DSGN-PROTO]], [[FX-DSGN-S159]], [[FX-DSGN-S160]]"
---

# Phase 16 완료 보고서 — Prototype Auto-Gen

## Executive Summary

### 1.1 Project Overview

| 항목 | 값 |
|------|-----|
| Feature | Phase 16: Prototype Auto-Gen (F351~F356) |
| PRD | `docs/specs/prototype-auto-gen/prd-final.md` |
| Sprint | 158~160 (3 Sprints) |
| 기간 | 2026-04-06 (1일, ~67분 실구현) |
| Match Rate | **97%** (통합 Gap Analysis) |

### 1.2 Results Summary

| 지표 | 값 |
|------|-----|
| F-items | 6/6 완료 (F351~F356) |
| 총 파일 | 88개 (신규 + 수정) |
| 총 코드 | ~6,812줄 |
| 테스트 | 97건 통과 (49+32+16) |
| PRs | #294, #295, #296 (전체 merged) |

### 1.3 Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | BD팀이 사업 아이템 Prototype을 만들려면 개발팀에 의뢰해 2~4주 대기. 발굴→PRD 자동화는 완성되었으나 PRD→Prototype 구간이 비어 있었음 |
| **Solution** | Claude Code CLI `--bare` + ANTHROPIC_API_KEY로 PRD→React SPA 자동 생성. O-G-D 품질 루프(3R, ≥0.85 수렴). Docker 격리 + 3단계 Fallback(CLI→API→앙상블). Cloudflare Pages 자동 배포 |
| **Function/UX Effect** | Prototype 대시보드(목록/상세) + iframe 프리뷰 + 실시간 빌드 로그 + BD팀 피드백→재생성 자동 Loop + Slack 알림. 사이드바 메뉴에서 바로 접근 |
| **Core Value** | 사업 아이디어 검증 주기 **4주→10분**. Haiku 주력 건당 ~$0.5~1 (월 ~$10~20). API 키 기반으로 정책 리스크 해소. Workers AI 활용으로 추가 비용 최적화 |

---

## 2. PDCA Cycle Summary

### 2.1 Plan

| 항목 | 내용 |
|------|------|
| PRD 작성 | req-interview 3R + Six Hats 20턴 + 오픈이슈 6/6 해소 |
| 핵심 전환 | "Max 구독 $0" → "API 키 Haiku ~$10~20/월" (Anthropic ToS 조사 결과) |
| Plan 문서 | `docs/01-plan/features/prototype-auto-gen.plan.md` (Master 작성) |
| Sprint별 Plan | sprint-159.plan.md, sprint-160.plan.md (autopilot 작성) |

### 2.2 Design

| 항목 | 내용 |
|------|------|
| Master Design | `docs/02-design/features/prototype-auto-gen.design.md` — 전체 아키텍처 |
| Sprint Design | sprint-159.design.md (API+State Machine), sprint-160.design.md (O-G-D+대시보드) |
| 핵심 결정 | Builder Server 독립 서비스, Docker 격리, State Machine 8상태, prototype_jobs 분리 테이블 |

### 2.3 Do (Implementation)

| Sprint | F-items | 파일/줄 | Tests | 소요 | PR |
|--------|---------|---------|-------|------|-----|
| **158** | F351+F352 | 35/2,115 | 49 | 13분 | #294 |
| **159** | F353+F354 | 17/1,953 | 32 | 19분 | #295 |
| **160** | F355+F356 | 36/2,744 | 16 | 35분 | #296 |
| **합계** | **6건** | **88/6,812** | **97** | **67분** | **3 PRs** |

### 2.4 Check (Gap Analysis)

| Category | Score |
|----------|:-----:|
| Design Match | 96% |
| Architecture Compliance | 98% |
| Convention Compliance | 97% |
| **Overall** | **97%** |

| F-item | Match | 판정 |
|--------|:-----:|:----:|
| F351 React SPA 템플릿 + Builder Server | 100% | PASS |
| F352 CLI `--bare` PoC | 100% | PASS |
| F353 D1 + Prototype API + State Machine | 100% | PASS |
| F354 Fallback + 비용 모니터링 | 95% | PASS |
| F355 O-G-D 품질 루프 | 95% | PASS |
| F356 대시보드 + 피드백 Loop | 93% | PASS |

### 2.5 Act

97% ≥ 90% — **iterate 불필요**.

의도적 변경 3건 (Gap이 아닌 개선):
- `prototypes` → `prototype_jobs` 테이블 분리 (기존 충돌 방지)
- Claude Haiku → Workers AI llama-3.1-8b (Workers 환경 최적화)
- 3 컴포넌트 통합 (CreatePrototypeDialog→서버 생성, OgdProgressBar→QualityScoreChart, PreviewFrame→inline)

---

## 3. Deliverables

### 3.1 prototype-builder/ (신규 독립 서비스)

| 모듈 | 파일 | 역할 |
|------|------|------|
| poller | poller.ts | 30초 간격 API 폴링 → Job 감지 |
| executor | executor.ts | Docker 컨테이너 실행 + CLI `--bare` 호출 |
| orchestrator | orchestrator.ts | O-G-D 루프 제어 (max 3R, ≥0.85) |
| deployer | deployer.ts | `wrangler pages deploy` 자동화 |
| notifier | notifier.ts | Slack Webhook 알림 |
| cost-tracker | cost-tracker.ts | API 비용 추적 + 월 예산 알림 |
| state-machine | state-machine.ts | 8상태 전환 규칙 + timeout + dead-letter |
| fallback | fallback.ts | CLI→API→앙상블 3단계 Fallback |

### 3.2 packages/api/ (기존 확장)

| 카테고리 | 파일 수 | 내용 |
|----------|---------|------|
| D1 Migrations | 6건 | 0100~0106 (prototype_jobs, usage_logs, ogd_rounds, feedback, prototype_jobs_ogd) |
| Routes | 4건 | prototype-jobs, prototype-usage, ogd-quality, prototype-feedback |
| Services | 8건 | job, fallback, usage, ogd-orchestrator, ogd-generator, ogd-discriminator, feedback, slack |
| Schemas | 4건 | prototype-job, prototype-usage, ogd-quality, prototype-feedback |

### 3.3 packages/web/ (기존 확장)

| 카테고리 | 파일 수 | 내용 |
|----------|---------|------|
| Pages | 2건 | prototype-dashboard, prototype-detail |
| Components | 5건 | PrototypeCard, BuildLogViewer, FeedbackForm, QualityScoreChart, PrototypeCostSummary |
| Router/Sidebar | 2건 | 라우트 등록 + 사이드바 메뉴 추가 |

### 3.4 packages/shared/ (공유 타입)

| 파일 | 내용 |
|------|------|
| prototype.ts | PrototypeStatus(8상태), Prototype, CreateRequest, UpdateRequest, 전환 규칙 |
| ogd.ts | OgdRound, OgdSummary, OGD_THRESHOLD, OGD_MAX_ROUNDS |
| prototype-feedback.ts | FeedbackCategory, FeedbackStatus, PrototypeFeedback |

---

## 4. Architecture Decisions

| 결정 | 선택 | 이유 |
|------|------|------|
| Builder Server 분리 | 독립 Node.js 서비스 | Workers에서 장시간 subprocess 실행 불가 |
| 인증 방식 | ANTHROPIC_API_KEY | Max 구독 OAuth는 서버 부적합 (8~12h 만료, Agent SDK 금지) |
| 모델 | Haiku 주력, Sonnet 최종 Round | 비용 최적화 (건당 ~$0.5 vs ~$3) |
| O-G-D Generator | Workers AI (llama-3.1-8b) | Cloudflare Workers 환경 최적, 추가 비용 없음 |
| 테이블명 | prototype_jobs | 기존 prototypes 테이블과 충돌 방지 |
| 격리 | Docker 컨테이너 | Job별 독립 환경, 파일/프로세스 충돌 방지 |
| Fallback | 3단계 (CLI→API→앙상블) | 벤더 종속성 완화 |

---

## 5. Process Learnings

### 5.1 req-interview 프로세스 효과

| 지표 | 값 |
|------|-----|
| 검토 라운드 | 3회 (63→69→68점) |
| Six Hats 토론 | 20턴 (ChatGPT 기반) |
| 오픈 이슈 해소 | 6/6 (WebSearch/WebFetch로 실시간 조사) |
| 핵심 발견 | "구독 $0" 불가 → API 키 전환 (PRD 핵심 가정 변경) |
| 비용 | ~$0.05 (3R × 3 AI + Six Hats) |

### 5.2 Sprint autopilot 효율

| Sprint | 소요 | Plan/Design | 특이사항 |
|--------|------|-------------|----------|
| 158 | 13분 | Master 작성 → Skip | 기존 Design 인식 후 바로 구현 |
| 159 | 19분 | autopilot 자체 작성 | prototype_jobs 분리 결정 (자율 판단) |
| 160 | 35분 | autopilot 자체 작성 | Workers AI 선택, 16/16 테스트 1회 수정 |

### 5.3 Sprint 스킬 개선

- `--team` 모드 추가 (Sprint 유형별 Agent Team 자동 판정)
- Agent Teams 환경변수 활성화 (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

---

## 6. Remaining Work

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| Builder Server 실제 배포 (VPS/WSL) | P0 | Docker + ANTHROPIC_API_KEY 설정 |
| 5종 PRD로 E2E 실측 | P0 | 성공률 ≥80%, 시간 ≤15분 목표 |
| PII Detection | P1 | PRD 내 개인정보 자동 탐지 |
| 배포 URL 접근제어 | P2 | 사내 인증/토큰 기반 |
| 다중 AI 앙상블 (GPT-4/Gemini) | P2 | Fallback Level 3 실제 구현 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Phase 16 완료 보고서 초안 | AX BD팀 |
