---
code: FX-DSGN-S179
title: "Sprint 179 Design — M1: 분류 + 아키텍처 결정"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint Autopilot)
system-version: "cli 0.5.0 / api 0.1.0 / web 0.1.0 / shared 0.1.0"
---

# Sprint 179 Design — M1: 분류 + 아키텍처 결정

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | F392 + F393 |
| **실측 규모** | 118 routes / 252 services / 133 schemas / 123 migrations / ~170 D1 테이블 |
| **핵심 산출물** | service-mapping.md + d1-ownership.md + adr-001 + 설계서 v4 |

---

## 1. 서비스 분류 체계

### 1.1 서비스 코드 + 분류 기준

| 코드 | 서비스 | 잔류/이관 | 파일명 키워드 패턴 |
|------|--------|-----------|-------------------|
| **S0** | AI Foundry (포털) | 이관 | `auth`, `sso`, `org`, `admin`, `dashboard`, `kpi`, `wiki`, `workspace`, `onboarding`, `feedback`, `nps`, `notification`, `inbox`, `slack`, `token`, `profile`, `project-overview`, `backup-restore` |
| **S1** | Discovery-X (수집) | 이관 | `collection`, `ideas`, `insights`, `ir-proposals` |
| **S3** | Foundry-X (발굴+형상화) | **잔류** | `discovery-*`, `biz-item*`, `bmc*`, `bdp*`, `offering*`, `shaping*`, `prototype*`, `persona*`, `hitl*`, `methodology*`, `skill*`, `prd*`, `captured*`, `derived*`, `ogd*`, `content-adapter*`, `builder*`, `quality-dashboard*` |
| **S4** | Gate-X (검증) | 이관 | `validation*`, `decision*`, `gate-package*`, `team-review*`, `evaluation*` (biz-evaluation 제외) |
| **S5** | Launch-X (제품화+GTM) | 이관 | `pipeline*`, `mvp*`, `offering-pack*`, `gtm*`, `outreach*`, `poc*`, `share-link*` |
| **S6** | Eval-X (평가) | 이관 | `user-evaluation*`, `roi-benchmark*`, `calibration*` |
| **SX** | Infra (공통) | 공유 | `agent*` (inbox 제외), `orchestration*`, `harness*`, `guard-rail*`, `governance*`, `health*`, `reconciliation*`, `mcp*`, `github*`, `webhook*`, `jira*`, `workflow*`, `execution-event*`, `task-state*`, `entity*`, `spec*`, `freshness*`, `proxy*`, `automation-quality*`, `context-passthrough*`, `command-registry*`, `design-token*`, `expansion-pack*` |

### 1.2 분류 규칙

1. **Primary Service**: 파일명 키워드 매칭으로 1차 분류
2. **Import Chain**: 1차 분류 모호 시 `import` 패턴으로 주 의존 서비스 확인
3. **DB Access**: 서비스가 접근하는 D1 테이블로 소유 서비스 결정
4. **Cross-service**: 2개 이상 서비스에 걸치면 primary(주) + secondary(부) 태깅
5. **Infra(SX)**: 비즈니스 로직 없이 공통 인프라만 제공하는 파일

---

## 2. Route 분류 상세 (118건)

### 2.1 S0: AI Foundry 포털 (이관 대상)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | admin.ts | 관리자 기능 |
| 2 | audit.ts | 감사 로그 |
| 3 | auth.ts | 인증/로그인 |
| 4 | backup-restore.ts | 백업/복원 |
| 5 | feedback.ts | 피드백 수집 |
| 6 | feedback-queue.ts | 피드백 큐 |
| 7 | inbox.ts | Agent Inbox |
| 8 | kpi.ts | KPI 대시보드 |
| 9 | notifications.ts | 알림 |
| 10 | nps.ts | NPS 서베이 |
| 11 | onboarding.ts | 온보딩 |
| 12 | org.ts | 조직 관리 |
| 13 | org-shared.ts | 조직 공유 |
| 14 | party-session.ts | 파티 세션 |
| 15 | profile.ts | 프로필 |
| 16 | project-overview.ts | 프로젝트 개요 |
| 17 | slack.ts | Slack 연동 |
| 18 | sso.ts | SSO |
| 19 | token.ts | 토큰 관리 |
| 20 | wiki.ts | Wiki |
| **소계** | **20건** | |

### 2.2 S1: Discovery-X 수집 (이관 대상)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | ax-bd-ideas.ts | 아이디어 등록 |
| 2 | ax-bd-insights.ts | 인사이트 |
| 3 | collection.ts | 수집 |
| 4 | ir-proposals.ts | IR 제안 |
| **소계** | **4건** | |

### 2.3 S3: Foundry-X 발굴+형상화 (잔류)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | ax-bd-bmc.ts | BMC Canvas |
| 2 | ax-bd-comments.ts | BMC 댓글 |
| 3 | ax-bd-discovery.ts | 발굴 메인 |
| 4 | ax-bd-history.ts | 발굴 이력 |
| 5 | ax-bd-kg.ts | 지식 그래프 |
| 6 | ax-bd-links.ts | 아이템 연결 |
| 7 | ax-bd-persona-eval.ts | 페르소나 평가 |
| 8 | ax-bd-progress.ts | 진행 추적 |
| 9 | ax-bd-prototypes.ts | 프로토타입 |
| 10 | ax-bd-skills.ts | 스킬 실행 |
| 11 | ax-bd-viability.ts | 사업성 체크 |
| 12 | bdp.ts | BDP 사업계획서 |
| 13 | biz-items.ts | 비즈 아이템 |
| 14 | builder.ts | 빌더 |
| 15 | captured-engine.ts | Captured 엔진 |
| 16 | content-adapter.ts | 콘텐츠 어댑터 |
| 17 | derived-engine.ts | Derived 엔진 |
| 18 | discovery-pipeline.ts | 발굴 파이프라인 |
| 19 | discovery-report.ts | 발굴 리포트 (단건) |
| 20 | discovery-reports.ts | 발굴 리포트 (목록) |
| 21 | discovery-shape-pipeline.ts | 발굴→형상화 파이프라인 |
| 22 | discovery-stages.ts | 발굴 스테이지 |
| 23 | discovery.ts | 발굴 통합 |
| 24 | help-agent.ts | 도움 에이전트 |
| 25 | hitl-review.ts | HITL 리뷰 |
| 26 | methodology.ts | 방법론 |
| 27 | offering-export.ts | Offering 내보내기 |
| 28 | offering-metrics.ts | Offering 메트릭 |
| 29 | offering-prototype.ts | Offering 프로토타입 |
| 30 | offering-sections.ts | Offering 섹션 |
| 31 | offering-validate.ts | Offering 검증 |
| 32 | offerings.ts | Offering 메인 |
| 33 | ogd-generic.ts | OGD 범용 |
| 34 | ogd-quality.ts | OGD 품질 |
| 35 | persona-configs.ts | 페르소나 설정 |
| 36 | persona-evals.ts | 페르소나 평가 |
| 37 | prototype-feedback.ts | 프로토타입 피드백 |
| 38 | prototype-jobs.ts | 프로토타입 작업 |
| 39 | prototype-usage.ts | 프로토타입 사용 |
| 40 | quality-dashboard.ts | 품질 대시보드 |
| 41 | shaping.ts | 형상화 |
| 42 | skill-metrics.ts | 스킬 메트릭 |
| 43 | skill-registry.ts | 스킬 레지스트리 |
| 44 | spec-library.ts | 스펙 라이브러리 |
| **소계** | **44건** | |

### 2.4 S4: Gate-X 검증 (이관 대상)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | ax-bd-evaluations.ts | 평가 |
| 2 | decisions.ts | 의사결정 |
| 3 | evaluation-report.ts | 평가 리포트 |
| 4 | gate-package.ts | 게이트 패키지 |
| 5 | team-reviews.ts | 팀 리뷰 |
| 6 | validation-meetings.ts | 검증 미팅 |
| 7 | validation-tier.ts | 검증 티어 |
| **소계** | **7건** | |

### 2.5 S5: Launch-X 제품화+GTM (이관 대상)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | gtm-customers.ts | GTM 고객 |
| 2 | gtm-outreach.ts | GTM 아웃리치 |
| 3 | mvp-tracking.ts | MVP 추적 |
| 4 | offering-packs.ts | Offering Pack |
| 5 | pipeline.ts | 파이프라인 |
| 6 | pipeline-monitoring.ts | 파이프라인 모니터링 |
| 7 | poc.ts | PoC |
| 8 | share-links.ts | 공유 링크 |
| **소계** | **8건** | |

### 2.6 S6: Eval-X 평가 (이관 대상)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | roi-benchmark.ts | ROI 벤치마크 |
| 2 | user-evaluations.ts | 사용자 평가 |
| **소계** | **2건** | |

### 2.7 SX: Infra 공통 (공유)

| # | Route 파일 | 역할 |
|---|-----------|------|
| 1 | agent.ts | 에이전트 |
| 2 | agent-adapters.ts | 에이전트 어댑터 |
| 3 | agent-definition.ts | 에이전트 정의 |
| 4 | automation-quality.ts | 자동화 품질 |
| 5 | ax-bd-agent.ts | BD 에이전트 |
| 6 | ax-bd-artifacts.ts | BD 산출물 |
| 7 | command-registry.ts | 명령 레지스트리 |
| 8 | context-passthrough.ts | 컨텍스트 패스스루 |
| 9 | design-tokens.ts | 디자인 토큰 |
| 10 | entities.ts | 엔티티 |
| 11 | execution-events.ts | 실행 이벤트 |
| 12 | expansion-pack.ts | 확장팩 |
| 13 | freshness.ts | 신선도 |
| 14 | github.ts | GitHub |
| 15 | governance.ts | 거버넌스 |
| 16 | guard-rail.ts | 가드레일 |
| 17 | harness.ts | 하네스 |
| 18 | health.ts | 헬스 |
| 19 | integrity.ts | 무결성 |
| 20 | jira.ts | Jira |
| 21 | mcp.ts | MCP |
| 22 | metrics.ts | 메트릭 |
| 23 | orchestration.ts | 오케스트레이션 |
| 24 | proxy.ts | 프록시 |
| 25 | reconciliation.ts | 조정 |
| 26 | requirements.ts | 요구사항 |
| 27 | shard-doc.ts | 샤드 문서 |
| 28 | spec.ts | 스펙 |
| 29 | sr.ts | SR |
| 30 | task-state.ts | 태스크 상태 |
| 31 | webhook.ts | 웹훅 |
| 32 | webhook-registry.ts | 웹훅 레지스트리 |
| 33 | workflow.ts | 워크플로 |
| **소계** | **33건** | |

### 2.8 분류 요약

| 서비스 | Routes | 비율 |
|--------|--------|------|
| S0 AI Foundry (이관) | 20 | 16.9% |
| S1 Discovery-X (이관) | 4 | 3.4% |
| **S3 Foundry-X (잔류)** | **44** | **37.3%** |
| S4 Gate-X (이관) | 7 | 5.9% |
| S5 Launch-X (이관) | 8 | 6.8% |
| S6 Eval-X (이관) | 2 | 1.7% |
| SX Infra (공유) | 33 | 28.0% |
| **합계** | **118** | **100%** |

> **잔류(S3)**: 44건 (37%) — PRD 목표 ~60~70건은 S3+SX 일부 포함 시 충족
> **이관 대상(S0+S1+S4+S5+S6)**: 41건 (35%)
> **공유(SX)**: 33건 (28%) — harness-kit으로 점진적 이관 or Foundry-X에 잔류

---

## 3. D1 테이블 소유권 설계

### 3.1 소유권 태깅 기준

각 테이블의 소유 서비스는 해당 테이블을 **생성(INSERT)하고 주로 갱신(UPDATE)하는 서비스**로 결정한다. 읽기(SELECT)만 하는 서비스는 소유자가 아니다.

### 3.2 크로스 서비스 FK 핫스팟

실측 데이터 기반 FK REFERENCES 빈도:

| 참조 대상 테이블 | FK 참조 횟수 | 소유 서비스 | 크로스 서비스 영향 |
|-----------------|-------------|-----------|------------------|
| `biz_items` | 30 | S3 Foundry-X | S4, S5, S6 모두 참조 — **최대 핫스팟** |
| `organizations` | 25 | S0 AI Foundry | 전 서비스 참조 — **테넌시 키** |
| `users` | 7 | S0 AI Foundry | 전 서비스 참조 — **인증 키** |
| `offerings` | 5 | S3 Foundry-X | S5 Launch-X 참조 |
| `biz_generated_prds` | 5 | S3 Foundry-X | S4 Gate-X 참조 |
| `prototype_jobs` | 4 | S3 Foundry-X | 내부 참조 |
| `projects` | 4 | S0 AI Foundry | 전 서비스 참조 |

### 3.3 D1 분리 전략 (ADR-001 요약)

PRD §7c 결정 채택:
- **Phase 20**: Shared DB + 논리적 분리 (테이블 소유권 태깅만)
- **Phase 20 이후**: 이벤트 기반 eventual consistency로 물리적 분리
- **공유 키 전략**: `users.id`, `organizations.id`, `biz_items.id`는 이벤트 기반 동기화

---

## 4. F268~F391 증분 배정 검증 방법

### 4.1 접근법

PRD §7 에 이미 F268~F391 배정표가 존재한다. Design에서는 이를 **검증**한다:

1. 각 F-item의 SPEC.md 제목을 확인
2. 해당 F-item이 추가한 실제 route/service 파일을 `git log` 또는 파일명으로 매칭
3. PRD 배정과 실제 코드 위치가 일치하는지 확인
4. 불일치가 있으면 코드 기준으로 보정

### 4.2 설계서 v4 갱신 범위

기존 v3 (`docs/specs/AX-BD-MSA-Restructuring-Plan.md`) 대비 변경:

| 섹션 | 변경 내용 |
|------|----------|
| §0 메타데이터 | v3 → v4, 수치 갱신 (118/252/133/123) |
| §1.2 서비스 매트릭스 | 현재 수치 반영 |
| §5 기능 마이그레이션 맵 | F268~F391 추가 (현재 F1~F267만) |
| §5 수치 갱신 | routes 73→118, services 169→252, schemas 87→133, D1 0078→0113 |

---

## 5. 산출물 파일 목록

| # | 파일 | 내용 | 구현 방법 |
|---|------|------|----------|
| 1 | `docs/specs/ax-bd-msa/service-mapping.md` | 118 routes + 252 services + 133 schemas 전수 태깅 | 코드 분석 → 문서 생성 |
| 2 | `docs/specs/ax-bd-msa/d1-ownership.md` | ~170 D1 테이블 소유권 + FK 의존성 그래프 | 마이그레이션 SQL 분석 |
| 3 | `docs/specs/ax-bd-msa/adr-001-d1-shared-db.md` | Shared DB 논리적 분리 ADR | PRD §7c 기반 결정 문서화 |
| 4 | `docs/specs/AX-BD-MSA-Restructuring-Plan.md` | v3 → v4 갱신 (F1~F391 전체 커버) | 기존 문서 갱신 |

> **코드 변경 없음** — 이번 Sprint는 순수 분석/문서 Sprint이므로 packages/ 하위에 코드 변경이 발생하지 않는다.

---

## 6. 완료 기준 체크리스트

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | service-mapping.md에 118 routes 전수 태깅 | route 수 카운트 = 118 |
| 2 | service-mapping.md에 252 services 전수 태깅 | service 수 카운트 = 252 |
| 3 | service-mapping.md에 133 schemas 전수 태깅 | schema 수 카운트 = 133 |
| 4 | d1-ownership.md에 전체 테이블 소유권 기록 | CREATE TABLE 수와 일치 |
| 5 | d1-ownership.md에 크로스 서비스 FK 목록 | REFERENCES 분석 결과 포함 |
| 6 | adr-001 Shared DB 결정 문서화 | ADR 형식 완성 |
| 7 | F268~F391 배정 검증 완료 | 설계서 v4 §5에 반영 |
| 8 | 설계서 v4 수치 정확 | 실측값과 일치 |
| 9 | typecheck 통과 | `turbo typecheck` (코드 변경 없으므로 기존 통과) |
| 10 | test 통과 | `turbo test` (코드 변경 없으므로 기존 통과) |
