---
code: FX-RPRT-S137-138
title: "Sprint 137~138 — FX-PLAN-014 Marker.io 자동화 + TinaCMS 네비게이션 통합 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: "137~138"
f_items: [F319, F320, F321]
---

# FX-RPRT-S137-138 — Marker.io 자동화 + TinaCMS 네비게이션 통합 완료 보고서

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | FX-PLAN-014: Marker.io 피드백 자동화 + TinaCMS 네비게이션 |
| Sprint | 137 (F319+F320) + 138 (F321) |
| Duration | 2026-04-05 단일 세션 |
| Match Rate | **100%** (Sprint 137: 100%, Sprint 138: 100%) |
| PRs | #271 (Sprint 137) + #272 (Sprint 138) |
| 변경 파일 | 21개 (Sprint 137: 10파일 743 lines + Sprint 138: 11파일 681 lines) |
| 테스트 | Sprint 137: 12 신규 + Sprint 138: 330 pass (회귀 0건) |
| D1 | 0094_feedback_queue.sql |

### Value Delivered

| 관점 | Sprint 137 (Marker.io 자동화) | Sprint 138 (TinaCMS 네비게이션) |
|------|------|------|
| **Problem** | Marker.io 피드백이 GitHub Issue로 생성되지만 수동 처리 필요 | 사이드바/랜딩 메뉴가 코드 하드코딩이라 비개발자 변경 불가 |
| **Solution** | Webhook→D1큐→Claude Code Agent→PR 자동 파이프라인 | TinaCMS navigation collection + 동적 로더 + fallback |
| **Function UX Effect** | 피드백 제출 → 자동 코드 수정 → PR Review만 하면 배포 완료 | `/admin`에서 메뉴 순서/표시 변경 → PR → 자동 재배포 |
| **Core Value** | **개발자 개입 최소화** — Agent가 피드백→PR 전과정 자동화 | **비개발자 자율 관리** — CMS로 메뉴 구조 직접 변경 |

## Sprint 137: Marker.io 피드백 자동화 파이프라인

### 아키텍처

```
[Marker.io Widget] → [GitHub Issue (visual-feedback 라벨)]
       ↓ webhook
[Workers API /webhook/git] → visual-feedback 감지
       ↓
[D1 feedback_queue (pending)]
       ↓ WSL polling (60s)
[feedback-consumer.sh] → [Claude Code CLI]
       ↓
[PR 자동 생성] → [관리자 Review/Approve] → [deploy.yml 자동 배포]
```

### 구현 파일

| # | 파일 | 유형 | 설명 |
|:--:|------|:----:|------|
| 1 | `0094_feedback_queue.sql` | D1 | 큐 테이블 + INDEX 3개 |
| 2 | `schemas/feedback-queue.ts` | 신규 | Zod 스키마 3개 (item, list, update) |
| 3 | `services/feedback-queue-service.ts` | 신규 | enqueue/consume/complete/fail/skip/list/update |
| 4 | `routes/feedback-queue.ts` | 신규 | 4 API endpoints (GET list/detail, PATCH, POST consume) |
| 5 | `routes/webhook.ts` | 수정 | visual-feedback 라벨 감지 + 큐 등록 |
| 6 | `app.ts` | 수정 | 라우트 등록 (auth+tenant) |
| 7 | `__tests__/feedback-queue.test.ts` | 신규 | 12 unit tests |
| 8 | `scripts/feedback-consumer.sh` | 신규 | WSL 큐 소비자 (polling loop) |
| 9 | `scripts/feedback-agent-prompt.md` | 신규 | Claude Code Agent 가이드라인 |

### 핵심 설계 결정

1. **Workers = stateless 중계자**: Webhook 수신 → D1 큐 저장만. 코드 수정은 WSL에서 수행 (Workers 30초 제한 우회)
2. **원자적 consume**: `UPDATE...WHERE id=(SELECT...LIMIT 1) RETURNING *` 단일 쿼리로 동시 실행 방지
3. **기존 webhook 확장**: 새 endpoint가 아닌 기존 `/webhook/git` 내부 분기 추가 → GitHub webhook 재설정 불필요

## Sprint 138: TinaCMS 네비게이션 동적 관리

### 구현 파일

| # | 파일 | 유형 | 설명 |
|:--:|------|:----:|------|
| 1 | `tina/config.ts` | 수정 | navigation collection + landing sort_order |
| 2 | `content/navigation/sidebar.json` | 신규 | 사이드바 메뉴 CMS 데이터 (4+6+3 항목) |
| 3 | `content/landing/features.md` | 신규 | Features 섹션 sort_order |
| 4 | `content/landing/stats.md` | 신규 | Stats 섹션 sort_order |
| 5 | `content/landing/cta.md` | 신규 | CTA 섹션 sort_order |
| 6 | `content/landing/hero.md` | 수정 | sort_order 추가 |
| 7 | `src/lib/navigation-loader.ts` | 신규 | CMS JSON 로더 + 38개 아이콘 매핑 |
| 8 | `src/components/sidebar.tsx` | 수정 | CMS 동적 로딩 + DEFAULT_* fallback |
| 9 | `src/routes/landing.tsx` | 수정 | 9개 섹션 컴포넌트 추출 + Section Registry 정렬 |

### 핵심 설계 결정

1. **CMS-first + Code-fallback 패턴**: sidebar.json 존재 시 동적, 없으면 하드코딩 — 점진적 전환 가능
2. **Section Registry 패턴**: 랜딩 페이지 9개 섹션을 독립 컴포넌트화 → sort_order로 순서 제어
3. **Icon key 매핑**: content에는 문자열 key (`"LayoutDashboard"`)만 저장, 코드에서 LucideIcon으로 매핑

## Gap Analysis 요약

| Sprint | Match Rate | PASS | FAIL | 미구현 |
|--------|:----------:|:----:|:----:|:------:|
| 137 | 100% | 9파일 / 12테스트 / 7체크리스트 | 0 | 0 |
| 138 | 100% | 10/10 체크리스트 | 0 | 0 |
| **통합** | **100%** | **전체 PASS** | **0** | **0** |

## PDCA 사이클 요약

| Phase | Sprint 137 | Sprint 138 |
|-------|-----------|-----------|
| Plan | FX-PLAN-S137 | FX-PLAN-S138 |
| Design | FX-DSGN-S137 | FX-DSGN-S138 |
| Do | PR #271 (autopilot ~8분) | PR #272 (autopilot ~9분) |
| Check | FX-ANLS-S137 (100%) | FX-ANLS-S138 (100%) |
| Report | 본 보고서 | FX-RPRT-S138 |

## 후속 작업 (운영)

| # | 작업 | 우선순위 | 상태 |
|:--:|------|:--------:|:----:|
| 1 | feedback-consumer.sh WSL 상시 실행 설정 (systemd/cron) | P1 | 수동 |
| 2 | D1 0094 production 마이그레이션 적용 | P0 | CI/CD 자동 |
| 3 | TinaCMS /admin에서 Navigation 편집 테스트 | P2 | 수동 |
| 4 | Marker.io 4주 운영 모니터링 | P3 | 진행 중 |
