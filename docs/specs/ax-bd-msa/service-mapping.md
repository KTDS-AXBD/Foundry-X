---
code: FX-SPEC-MSA-MAP
title: "Foundry-X 서비스 매핑 — 전수 태깅"
version: "1.0"
status: Active
category: SPEC
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint 179 Autopilot)
---

# Foundry-X 서비스 매핑 — 전수 태깅

> **실측 기준**: Sprint 179 시점
> **대상**: 118 routes / 252 services / 133 schemas
> **서비스 코드**: S0(포털), S1(수집), S3(발굴+형상화), S4(검증), S5(제품화+GTM), S6(평가), SX(인프라)

---

## 1. Routes 서비스 태깅 (118건)

| # | 파일명 | 서비스 | 도메인 |
|---|--------|--------|--------|
| 1 | admin.ts | S0 | 관리자 |
| 2 | agent.ts | SX | Agent 인프라 |
| 3 | agent-adapters.ts | SX | Agent 어댑터 |
| 4 | agent-definition.ts | SX | Agent 정의 |
| 5 | audit.ts | S0 | 감사 로그 |
| 6 | auth.ts | S0 | 인증 |
| 7 | automation-quality.ts | SX | 자동화 품질 |
| 8 | ax-bd-agent.ts | SX | BD 에이전트 |
| 9 | ax-bd-artifacts.ts | SX | BD 산출물 |
| 10 | ax-bd-bmc.ts | S3 | BMC Canvas |
| 11 | ax-bd-comments.ts | S3 | BMC 댓글 |
| 12 | ax-bd-discovery.ts | S3 | 발굴 메인 |
| 13 | ax-bd-evaluations.ts | S4 | 평가 |
| 14 | ax-bd-history.ts | S3 | 발굴 이력 |
| 15 | ax-bd-ideas.ts | S1 | 아이디어 |
| 16 | ax-bd-insights.ts | S1 | 인사이트 |
| 17 | ax-bd-kg.ts | S3 | 지식 그래프 |
| 18 | ax-bd-links.ts | S3 | 아이템 연결 |
| 19 | ax-bd-persona-eval.ts | S3 | 페르소나 평가 |
| 20 | ax-bd-progress.ts | S3 | 진행 추적 |
| 21 | ax-bd-prototypes.ts | S3 | 프로토타입 |
| 22 | ax-bd-skills.ts | S3 | 스킬 실행 |
| 23 | ax-bd-viability.ts | S3 | 사업성 체크 |
| 24 | backup-restore.ts | S0 | 백업/복원 |
| 25 | bdp.ts | S3 | BDP 사업계획서 |
| 26 | biz-items.ts | S3 | 비즈 아이템 |
| 27 | builder.ts | S3 | 빌더 |
| 28 | captured-engine.ts | S3 | Captured 엔진 |
| 29 | collection.ts | S1 | 수집 |
| 30 | command-registry.ts | SX | 명령 레지스트리 |
| 31 | content-adapter.ts | S3 | 콘텐츠 어댑터 |
| 32 | context-passthrough.ts | SX | 컨텍스트 패스스루 |
| 33 | decisions.ts | S4 | 의사결정 |
| 34 | derived-engine.ts | S3 | Derived 엔진 |
| 35 | design-tokens.ts | SX | 디자인 토큰 |
| 36 | discovery.ts | S3 | 발굴 통합 |
| 37 | discovery-pipeline.ts | S3 | 발굴 파이프라인 |
| 38 | discovery-report.ts | S3 | 발굴 리포트(단건) |
| 39 | discovery-reports.ts | S3 | 발굴 리포트(목록) |
| 40 | discovery-shape-pipeline.ts | S3 | 발굴→형상화 |
| 41 | discovery-stages.ts | S3 | 발굴 스테이지 |
| 42 | entities.ts | SX | 엔티티 |
| 43 | evaluation-report.ts | S4 | 평가 리포트 |
| 44 | execution-events.ts | SX | 실행 이벤트 |
| 45 | expansion-pack.ts | SX | 확장팩 |
| 46 | feedback.ts | S0 | 피드백 |
| 47 | feedback-queue.ts | S0 | 피드백 큐 |
| 48 | freshness.ts | SX | 신선도 |
| 49 | gate-package.ts | S4 | 게이트 패키지 |
| 50 | github.ts | SX | GitHub |
| 51 | governance.ts | SX | 거버넌스 |
| 52 | gtm-customers.ts | S5 | GTM 고객 |
| 53 | gtm-outreach.ts | S5 | GTM 아웃리치 |
| 54 | guard-rail.ts | SX | 가드레일 |
| 55 | harness.ts | SX | 하네스 |
| 56 | health.ts | SX | 헬스 |
| 57 | help-agent.ts | S3 | 도움 에이전트 |
| 58 | hitl-review.ts | S3 | HITL 리뷰 |
| 59 | inbox.ts | S0 | Agent Inbox |
| 60 | integrity.ts | SX | 무결성 |
| 61 | ir-proposals.ts | S1 | IR 제안 |
| 62 | jira.ts | SX | Jira |
| 63 | kpi.ts | S0 | KPI |
| 64 | mcp.ts | SX | MCP |
| 65 | methodology.ts | S3 | 방법론 |
| 66 | metrics.ts | SX | 메트릭 |
| 67 | mvp-tracking.ts | S5 | MVP 추적 |
| 68 | notifications.ts | S0 | 알림 |
| 69 | nps.ts | S0 | NPS |
| 70 | offering-export.ts | S3 | Offering 내보내기 |
| 71 | offering-metrics.ts | S3 | Offering 메트릭 |
| 72 | offering-packs.ts | S5 | Offering Pack |
| 73 | offering-prototype.ts | S3 | Offering 프로토타입 |
| 74 | offering-sections.ts | S3 | Offering 섹션 |
| 75 | offering-validate.ts | S3 | Offering 검증 |
| 76 | offerings.ts | S3 | Offering 메인 |
| 77 | ogd-generic.ts | S3 | OGD 범용 |
| 78 | ogd-quality.ts | S3 | OGD 품질 |
| 79 | onboarding.ts | S0 | 온보딩 |
| 80 | orchestration.ts | SX | 오케스트레이션 |
| 81 | org.ts | S0 | 조직 |
| 82 | org-shared.ts | S0 | 조직 공유 |
| 83 | party-session.ts | S0 | 파티 세션 |
| 84 | persona-configs.ts | S3 | 페르소나 설정 |
| 85 | persona-evals.ts | S3 | 페르소나 평가 |
| 86 | pipeline.ts | S5 | 파이프라인 |
| 87 | pipeline-monitoring.ts | S5 | 파이프라인 모니터링 |
| 88 | poc.ts | S5 | PoC |
| 89 | profile.ts | S0 | 프로필 |
| 90 | project-overview.ts | S0 | 프로젝트 개요 |
| 91 | prototype-feedback.ts | S3 | 프로토타입 피드백 |
| 92 | prototype-jobs.ts | S3 | 프로토타입 작업 |
| 93 | prototype-usage.ts | S3 | 프로토타입 사용 |
| 94 | proxy.ts | SX | 프록시 |
| 95 | quality-dashboard.ts | S3 | 품질 대시보드 |
| 96 | reconciliation.ts | SX | 조정 |
| 97 | requirements.ts | SX | 요구사항 |
| 98 | roi-benchmark.ts | S6 | ROI 벤치마크 |
| 99 | shaping.ts | S3 | 형상화 |
| 100 | shard-doc.ts | SX | 샤드 문서 |
| 101 | share-links.ts | S5 | 공유 링크 |
| 102 | skill-metrics.ts | S3 | 스킬 메트릭 |
| 103 | skill-registry.ts | S3 | 스킬 레지스트리 |
| 104 | slack.ts | S0 | Slack |
| 105 | spec.ts | SX | 스펙 |
| 106 | spec-library.ts | S3 | 스펙 라이브러리 |
| 107 | sr.ts | SX | SR |
| 108 | sso.ts | S0 | SSO |
| 109 | task-state.ts | SX | 태스크 상태 |
| 110 | team-reviews.ts | S4 | 팀 리뷰 |
| 111 | token.ts | S0 | 토큰 |
| 112 | user-evaluations.ts | S6 | 사용자 평가 |
| 113 | validation-meetings.ts | S4 | 검증 미팅 |
| 114 | validation-tier.ts | S4 | 검증 티어 |
| 115 | webhook.ts | SX | 웹훅 |
| 116 | webhook-registry.ts | SX | 웹훅 레지스트리 |
| 117 | wiki.ts | S0 | Wiki |
| 118 | workflow.ts | SX | 워크플로 |

### Routes 서비스별 집계

| 서비스 | 건수 | 비율 |
|--------|------|------|
| S0 AI Foundry (포털) | 20 | 16.9% |
| S1 Discovery-X (수집) | 4 | 3.4% |
| **S3 Foundry-X (잔류)** | **44** | **37.3%** |
| S4 Gate-X (검증) | 7 | 5.9% |
| S5 Launch-X (제품화+GTM) | 8 | 6.8% |
| S6 Eval-X (평가) | 2 | 1.7% |
| SX Infra (공유) | 33 | 28.0% |
| **합계** | **118** | **100%** |

---

## 2. Services 서비스 태깅 (252건)

| # | 파일명 | 서비스 | 도메인 |
|---|--------|--------|--------|
| 1 | admin-service.ts | S0 | 관리자 |
| 2 | agent-adapter-factory.ts | SX | Agent |
| 3 | agent-adapter-registry.ts | SX | Agent |
| 4 | agent-collection.ts | SX | Agent 수집 |
| 5 | agent-collector.ts | SX | Agent 수집 |
| 6 | agent-collector-prompts.ts | SX | Agent 수집 프롬프트 |
| 7 | agent-definition-loader.ts | SX | Agent 정의 |
| 8 | agent-feedback-loop.ts | SX | Agent 피드백 |
| 9 | agent-inbox.ts | S0 | Agent Inbox |
| 10 | agent-marketplace.ts | SX | Agent 마켓플레이스 |
| 11 | agent-orchestrator.ts | SX | Agent 오케스트레이션 |
| 12 | agent-runner.ts | SX | Agent 실행 |
| 13 | agent-self-reflection.ts | SX | Agent 자기반성 |
| 14 | analysis-context.ts | S3 | 분석 컨텍스트 |
| 15 | analysis-path-v82.ts | S3 | 분석 경로 v8.2 |
| 16 | analysis-paths.ts | S3 | 분석 경로 |
| 17 | architect-agent.ts | SX | 아키텍트 에이전트 |
| 18 | architect-prompts.ts | SX | 아키텍트 프롬프트 |
| 19 | audit-logger.ts | S0 | 감사 로그 |
| 20 | auto-fix.ts | SX | 자동 수정 |
| 21 | auto-rebase.ts | SX | 자동 리베이스 |
| 22 | automation-quality-reporter.ts | SX | 자동화 품질 |
| 23 | backup-restore-service.ts | S0 | 백업/복원 |
| 24 | bd-artifact-service.ts | SX | BD 산출물 |
| 25 | bd-process-tracker.ts | S3 | BD 프로세스 추적 |
| 26 | bd-roi-calculator.ts | S6 | ROI 계산 |
| 27 | bd-skill-executor.ts | S3 | 스킬 실행 |
| 28 | bd-skill-prompts.ts | S3 | 스킬 프롬프트 |
| 29 | bdp-methodology-module.ts | S3 | BDP 방법론 |
| 30 | bdp-review-service.ts | S3 | BDP 리뷰 |
| 31 | bdp-service.ts | S3 | BDP 서비스 |
| 32 | biz-item-service.ts | S3 | 비즈 아이템 |
| 33 | biz-persona-evaluator.ts | S3 | 페르소나 평가 |
| 34 | biz-persona-prompts.ts | S3 | 페르소나 프롬프트 |
| 35 | bmc-agent.ts | S3 | BMC 에이전트 |
| 36 | bmc-comment-service.ts | S3 | BMC 댓글 |
| 37 | bmc-history.ts | S3 | BMC 이력 |
| 38 | bmc-insight-service.ts | S3 | BMC 인사이트 |
| 39 | bmc-service.ts | S3 | BMC 서비스 |
| 40 | business-plan-generator.ts | S3 | 사업계획서 생성 |
| 41 | business-plan-template.ts | S3 | 사업계획서 템플릿 |
| 42 | calibration-service.ts | S6 | 캘리브레이션 |
| 43 | captured-review.ts | S3 | Captured 리뷰 |
| 44 | captured-skill-generator.ts | S3 | Captured 스킬 |
| 45 | claude-api-runner.ts | SX | Claude API |
| 46 | collection-pipeline.ts | S1 | 수집 파이프라인 |
| 47 | command-registry.ts | SX | 명령 레지스트리 |
| 48 | commit-gate-service.ts | S3 | 커밋 게이트 |
| 49 | competitor-scanner.ts | S3 | 경쟁사 스캐너 |
| 50 | competitor-scanner-prompts.ts | S3 | 경쟁사 스캐너 프롬프트 |
| 51 | conflict-detector.ts | SX | 충돌 감지 |
| 52 | content-adapter-service.ts | S3 | 콘텐츠 어댑터 |
| 53 | context-passthrough.ts | SX | 컨텍스트 패스스루 |
| 54 | custom-role-manager.ts | S0 | 커스텀 역할 |
| 55 | data-diagnostic-service.ts | SX | 데이터 진단 |
| 56 | decision-service.ts | S4 | 의사결정 |
| 57 | derived-review.ts | S3 | Derived 리뷰 |
| 58 | derived-skill-generator.ts | S3 | Derived 스킬 |
| 59 | design-token-service.ts | SX | 디자인 토큰 |
| 60 | discovery-criteria.ts | S3 | 발굴 기준 |
| 61 | discovery-pipeline-service.ts | S3 | 발굴 파이프라인 |
| 62 | discovery-progress.ts | S3 | 발굴 진행 |
| 63 | discovery-report-service.ts | S3 | 발굴 리포트 |
| 64 | discovery-shape-pipeline-service.ts | S3 | 발굴→형상화 |
| 65 | discovery-stage-service.ts | S3 | 발굴 스테이지 |
| 66 | discovery-x-ingest-service.ts | S1 | Discovery-X 인제스트 |
| 67 | email-service.ts | S0 | 이메일 |
| 68 | ensemble-voting.ts | SX | 앙상블 투표 |
| 69 | entity-registry.ts | SX | 엔티티 레지스트리 |
| 70 | entity-sync.ts | SX | 엔티티 동기화 |
| 71 | evaluation-criteria.ts | S4 | 평가 기준 |
| 72 | evaluation-report-service.ts | S4 | 평가 리포트 |
| 73 | evaluation-service.ts | S4 | 평가 서비스 |
| 74 | evaluator-optimizer.ts | SX | 평가-최적화 |
| 75 | event-bus.ts | SX | 이벤트 버스 |
| 76 | execution-event-service.ts | SX | 실행 이벤트 |
| 77 | execution-types.ts | SX | 실행 타입 |
| 78 | expansion-pack.ts | SX | 확장팩 |
| 79 | external-ai-reviewer.ts | S3 | 외부 AI 리뷰어 |
| 80 | fallback-chain.ts | SX | 폴백 체인 |
| 81 | feedback-loop-context.ts | SX | 피드백 루프 |
| 82 | feedback-queue-service.ts | S0 | 피드백 큐 |
| 83 | feedback.ts | S0 | 피드백 |
| 84 | file-context-collector.ts | SX | 파일 컨텍스트 |
| 85 | freshness-checker.ts | SX | 신선도 체커 |
| 86 | gate-package-service.ts | S4 | 게이트 패키지 |
| 87 | github-review.ts | SX | GitHub 리뷰 |
| 88 | github-sync.ts | SX | GitHub 동기화 |
| 89 | github.ts | SX | GitHub |
| 90 | gtm-customer-service.ts | S5 | GTM 고객 |
| 91 | gtm-outreach-service.ts | S5 | GTM 아웃리치 |
| 92 | guard-rail-deploy-service.ts | SX | 가드레일 배포 |
| 93 | harness-rules.ts | SX | 하네스 규칙 |
| 94 | health-calc.ts | SX | 헬스 계산 |
| 95 | help-agent-service.ts | S3 | 도움 에이전트 |
| 96 | hitl-review-service.ts | S3 | HITL 리뷰 |
| 97 | hook-result-processor.ts | SX | 훅 결과 처리 |
| 98 | hybrid-sr-classifier.ts | SX | 하이브리드 SR 분류 |
| 99 | idea-bmc-link-service.ts | S3 | 아이디어-BMC 연결 |
| 100 | idea-service.ts | S1 | 아이디어 서비스 |
| 101 | infra-agent.ts | SX | 인프라 에이전트 |
| 102 | infra-agent-prompts.ts | SX | 인프라 에이전트 프롬프트 |
| 103 | insight-agent-service.ts | S1 | 인사이트 에이전트 |
| 104 | integrity-checker.ts | SX | 무결성 체커 |
| 105 | ir-proposal-service.ts | S1 | IR 제안 |
| 106 | item-classification-prompts.ts | S3 | 아이템 분류 프롬프트 |
| 107 | item-classifier.ts | S3 | 아이템 분류기 |
| 108 | jira-adapter.ts | SX | Jira 어댑터 |
| 109 | jira-sync.ts | SX | Jira 동기화 |
| 110 | kg-edge.ts | S3 | KG 엣지 |
| 111 | kg-node.ts | S3 | KG 노드 |
| 112 | kg-query.ts | S3 | KG 쿼리 |
| 113 | kg-scenario.ts | S3 | KG 시나리오 |
| 114 | kg-seed.ts | S3 | KG 시드 |
| 115 | kpi-logger.ts | S0 | KPI 로거 |
| 116 | kpi-service.ts | S0 | KPI 서비스 |
| 117 | kv-cache.ts | SX | KV 캐시 |
| 118 | llm.ts | SX | LLM |
| 119 | logger.ts | SX | 로거 |
| 120 | mcp-adapter.ts | SX | MCP 어댑터 |
| 121 | mcp-registry.ts | SX | MCP 레지스트리 |
| 122 | mcp-resources.ts | SX | MCP 리소스 |
| 123 | mcp-runner.ts | SX | MCP 러너 |
| 124 | mcp-sampling.ts | SX | MCP 샘플링 |
| 125 | mcp-transport.ts | SX | MCP 트랜스포트 |
| 126 | meeting-service.ts | S4 | 미팅 서비스 |
| 127 | merge-queue.ts | SX | 머지 큐 |
| 128 | methodology-module.ts | S3 | 방법론 모듈 |
| 129 | methodology-registry.ts | S3 | 방법론 레지스트리 |
| 130 | methodology-types.ts | S3 | 방법론 타입 |
| 131 | metrics-service.ts | SX | 메트릭 서비스 |
| 132 | model-metrics.ts | SX | 모델 메트릭 |
| 133 | model-router.ts | SX | 모델 라우터 |
| 134 | monitoring.ts | SX | 모니터링 |
| 135 | mvp-tracking-service.ts | S5 | MVP 추적 |
| 136 | notification-service.ts | S0 | 알림 |
| 137 | nps-service.ts | S0 | NPS |
| 138 | offering-brief-service.ts | S3 | Offering 브리프 |
| 139 | offering-export-service.ts | S3 | Offering 내보내기 |
| 140 | offering-metrics-service.ts | S3 | Offering 메트릭 |
| 141 | offering-pack-service.ts | S5 | Offering Pack |
| 142 | offering-prototype-service.ts | S3 | Offering 프로토타입 |
| 143 | offering-section-service.ts | S3 | Offering 섹션 |
| 144 | offering-service.ts | S3 | Offering 서비스 |
| 145 | offering-validate-service.ts | S3 | Offering 검증 |
| 146 | ogd-discriminator-service.ts | S3 | OGD 판별기 |
| 147 | ogd-domain-registry.ts | S3 | OGD 도메인 |
| 148 | ogd-generator-service.ts | S3 | OGD 생성기 |
| 149 | ogd-generic-runner.ts | S3 | OGD 범용 러너 |
| 150 | ogd-orchestrator-service.ts | S3 | OGD 오케스트레이터 |
| 151 | onboarding-progress.ts | S0 | 온보딩 진행 |
| 152 | openrouter-runner.ts | SX | OpenRouter 러너 |
| 153 | openrouter-service.ts | SX | OpenRouter 서비스 |
| 154 | orchestration-loop.ts | SX | 오케스트레이션 루프 |
| 155 | org.ts | S0 | 조직 |
| 156 | org-shared-service.ts | S0 | 조직 공유 |
| 157 | outreach-proposal-service.ts | S5 | 아웃리치 제안 |
| 158 | party-session.ts | S0 | 파티 세션 |
| 159 | password-reset-service.ts | S0 | 비밀번호 리셋 |
| 160 | pattern-detector-service.ts | SX | 패턴 감지 |
| 161 | pattern-extractor.ts | SX | 패턴 추출 |
| 162 | persona-config-service.ts | S3 | 페르소나 설정 |
| 163 | persona-eval-demo.ts | S3 | 페르소나 평가 데모 |
| 164 | persona-eval-service.ts | S3 | 페르소나 평가 |
| 165 | pii-masker.ts | SX | PII 마스킹 |
| 166 | pipeline-checkpoint-service.ts | S5 | 파이프라인 체크포인트 |
| 167 | pipeline-error-handler.ts | S5 | 파이프라인 에러 |
| 168 | pipeline-notification-service.ts | S5 | 파이프라인 알림 |
| 169 | pipeline-permission-service.ts | S5 | 파이프라인 권한 |
| 170 | pipeline-service.ts | S5 | 파이프라인 |
| 171 | pipeline-state-machine.ts | S5 | 파이프라인 상태머신 |
| 172 | planner-agent.ts | SX | 플래너 에이전트 |
| 173 | planner-prompts.ts | SX | 플래너 프롬프트 |
| 174 | pm-skills-criteria.ts | S3 | PM 스킬 기준 |
| 175 | pm-skills-guide.ts | S3 | PM 스킬 가이드 |
| 176 | pm-skills-module.ts | S3 | PM 스킬 모듈 |
| 177 | pm-skills-pipeline.ts | S3 | PM 스킬 파이프라인 |
| 178 | poc-env-service.ts | S5 | PoC 환경 |
| 179 | poc-service.ts | S5 | PoC |
| 180 | pptx-renderer.ts | S3 | PPTX 렌더러 |
| 181 | pptx-slide-types.ts | S3 | PPTX 슬라이드 타입 |
| 182 | pr-pipeline.ts | SX | PR 파이프라인 |
| 183 | prd-generator.ts | S3 | PRD 생성기 |
| 184 | prd-review-pipeline.ts | S3 | PRD 리뷰 파이프라인 |
| 185 | prd-template.ts | S3 | PRD 템플릿 |
| 186 | project-overview.ts | S0 | 프로젝트 개요 |
| 187 | prompt-gateway.ts | SX | 프롬프트 게이트웨이 |
| 188 | prompt-utils.ts | SX | 프롬프트 유틸 |
| 189 | proposal-generator.ts | S3 | 제안서 생성 |
| 190 | prototype-fallback.ts | S3 | 프로토타입 폴백 |
| 191 | prototype-feedback-service.ts | S3 | 프로토타입 피드백 |
| 192 | prototype-generator.ts | S3 | 프로토타입 생성 |
| 193 | prototype-job-service.ts | S3 | 프로토타입 작업 |
| 194 | prototype-quality-service.ts | S3 | 프로토타입 품질 |
| 195 | prototype-review-service.ts | S3 | 프로토타입 리뷰 |
| 196 | prototype-service.ts | S3 | 프로토타입 |
| 197 | prototype-styles.ts | S3 | 프로토타입 스타일 |
| 198 | prototype-templates.ts | S3 | 프로토타입 템플릿 |
| 199 | prototype-usage-service.ts | S3 | 프로토타입 사용 |
| 200 | qa-agent.ts | SX | QA 에이전트 |
| 201 | qa-agent-prompts.ts | SX | QA 에이전트 프롬프트 |
| 202 | quality-dashboard-service.ts | S3 | 품질 대시보드 |
| 203 | reconciliation.ts | SX | 조정 |
| 204 | reviewer-agent.ts | SX | 리뷰어 에이전트 |
| 205 | roi-benchmark.ts | S6 | ROI 벤치마크 |
| 206 | rule-effectiveness-service.ts | SX | 룰 효과 |
| 207 | rule-generator-service.ts | SX | 룰 생성 |
| 208 | safety-checker.ts | SX | 안전 체커 |
| 209 | security-agent.ts | SX | 보안 에이전트 |
| 210 | security-agent-prompts.ts | SX | 보안 에이전트 프롬프트 |
| 211 | service-proxy.ts | SX | 서비스 프록시 |
| 212 | shaping-orchestrator-service.ts | S3 | 형상화 오케스트레이터 |
| 213 | shaping-review-service.ts | S3 | 형상화 리뷰 |
| 214 | shaping-service.ts | S3 | 형상화 |
| 215 | shard-doc.ts | SX | 샤드 문서 |
| 216 | share-link-service.ts | S5 | 공유 링크 |
| 217 | signal-valuation.ts | S6 | 시그널 밸류에이션 |
| 218 | sixhats-debate.ts | S3 | 식스햇 토론 |
| 219 | sixhats-prompts.ts | S3 | 식스햇 프롬프트 |
| 220 | skill-guide.ts | S3 | 스킬 가이드 |
| 221 | skill-md-generator.ts | S3 | 스킬 MD 생성 |
| 222 | skill-metrics.ts | S3 | 스킬 메트릭 |
| 223 | skill-pipeline-runner.ts | S3 | 스킬 파이프라인 |
| 224 | skill-registry.ts | S3 | 스킬 레지스트리 |
| 225 | skill-search.ts | S3 | 스킬 검색 |
| 226 | slack.ts | S0 | Slack |
| 227 | slack-notification-service.ts | S0 | Slack 알림 |
| 228 | spec-library.ts | S3 | 스펙 라이브러리 |
| 229 | spec-parser.ts | SX | 스펙 파서 |
| 230 | sr-classifier.ts | SX | SR 분류기 |
| 231 | sr-workflow-mapper.ts | SX | SR 워크플로 매퍼 |
| 232 | sse-manager.ts | SX | SSE 관리자 |
| 233 | sso.ts | S0 | SSO |
| 234 | starting-point-classifier.ts | S3 | 시작점 분류기 |
| 235 | starting-point-prompts.ts | S3 | 시작점 프롬프트 |
| 236 | task-state-service.ts | SX | 태스크 상태 |
| 237 | tech-review-service.ts | S3 | 기술 리뷰 |
| 238 | telemetry-collector.ts | SX | 텔레메트리 |
| 239 | test-agent.ts | SX | 테스트 에이전트 |
| 240 | test-agent-prompts.ts | SX | 테스트 에이전트 프롬프트 |
| 241 | transition-guard.ts | SX | 전환 가드 |
| 242 | transition-trigger.ts | SX | 전환 트리거 |
| 243 | trend-data-prompts.ts | S3 | 트렌드 데이터 프롬프트 |
| 244 | trend-data-service.ts | S3 | 트렌드 데이터 |
| 245 | user-evaluation-service.ts | S6 | 사용자 평가 |
| 246 | validation-service.ts | S4 | 검증 |
| 247 | viability-checkpoint-service.ts | S3 | 사업성 체크포인트 |
| 248 | webhook-registry.ts | SX | 웹훅 레지스트리 |
| 249 | wiki-sync.ts | S0 | Wiki 동기화 |
| 250 | workflow-engine.ts | SX | 워크플로 엔진 |
| 251 | workflow-pattern-extractor.ts | SX | 워크플로 패턴 |
| 252 | worktree-manager.ts | SX | 워크트리 관리 |

### Services 서비스별 집계

| 서비스 | 건수 | 비율 |
|--------|------|------|
| S0 AI Foundry (포털) | 27 | 10.7% |
| S1 Discovery-X (수집) | 5 | 2.0% |
| **S3 Foundry-X (잔류)** | **97** | **38.5%** |
| S4 Gate-X (검증) | 6 | 2.4% |
| S5 Launch-X (제품화+GTM) | 12 | 4.8% |
| S6 Eval-X (평가) | 4 | 1.6% |
| SX Infra (공유) | 101 | 40.1% |
| **합계** | **252** | **100%** |

---

## 3. Schemas 서비스 태깅 (133건)

| # | 파일명 | 서비스 |
|---|--------|--------|
| 1 | admin.ts | S0 |
| 2 | agent.ts | SX |
| 3 | agent-adapter.ts | SX |
| 4 | agent-definition.ts | SX |
| 5 | analysis-context.ts | S3 |
| 6 | audit.ts | S0 |
| 7 | auth.ts | S0 |
| 8 | automation-quality.ts | SX |
| 9 | backup-restore.ts | S0 |
| 10 | bd-artifact.ts | SX |
| 11 | bd-progress.schema.ts | S3 |
| 12 | bdp.schema.ts | S3 |
| 13 | biz-item.ts | S3 |
| 14 | bmc.schema.ts | S3 |
| 15 | bmc-agent.schema.ts | S3 |
| 16 | bmc-comment.schema.ts | S3 |
| 17 | bmc-history.schema.ts | S3 |
| 18 | bmc-insight.schema.ts | S3 |
| 19 | business-plan.ts | S3 |
| 20 | captured-engine.ts | S3 |
| 21 | collection.ts | S1 |
| 22 | command-registry.ts | SX |
| 23 | commit-gate.schema.ts | S3 |
| 24 | common.ts | SX |
| 25 | content-adapter.schema.ts | S3 |
| 26 | context-passthrough.ts | SX |
| 27 | decision.schema.ts | S4 |
| 28 | derived-engine.ts | S3 |
| 29 | design-token.schema.ts | SX |
| 30 | discovery-criteria.ts | S3 |
| 31 | discovery-pipeline.ts | S3 |
| 32 | discovery-progress.ts | S3 |
| 33 | discovery-report.ts | S3 |
| 34 | discovery-report-schema.ts | S3 |
| 35 | discovery-shape-pipeline.schema.ts | S3 |
| 36 | discovery-stage.ts | S3 |
| 37 | discovery-x.schema.ts | S1 |
| 38 | entity.ts | SX |
| 39 | error.ts | SX |
| 40 | evaluation.schema.ts | S4 |
| 41 | evaluation-report.schema.ts | S4 |
| 42 | execution-event.ts | SX |
| 43 | expansion-pack.ts | SX |
| 44 | feedback.ts | S0 |
| 45 | feedback-queue.ts | S0 |
| 46 | freshness.ts | SX |
| 47 | gate-package.schema.ts | S4 |
| 48 | github.ts | SX |
| 49 | governance.ts | SX |
| 50 | gtm-customer.schema.ts | S5 |
| 51 | gtm-outreach.schema.ts | S5 |
| 52 | guard-rail-schema.ts | SX |
| 53 | harness.ts | SX |
| 54 | health.ts | SX |
| 55 | help-agent-schema.ts | S3 |
| 56 | hitl-review-schema.ts | S3 |
| 57 | hitl-section.schema.ts | S3 |
| 58 | idea.schema.ts | S1 |
| 59 | idea-bmc-link.schema.ts | S3 |
| 60 | inbox.ts | S0 |
| 61 | insight-job.schema.ts | S1 |
| 62 | integrity.ts | SX |
| 63 | ir-proposal.schema.ts | S1 |
| 64 | jira.ts | SX |
| 65 | kg-ontology.schema.ts | S3 |
| 66 | kpi.ts | S0 |
| 67 | mcp.ts | SX |
| 68 | methodology.ts | S3 |
| 69 | metrics-schema.ts | SX |
| 70 | mvp-tracking.schema.ts | S5 |
| 71 | notification.schema.ts | S0 |
| 72 | nps.ts | S0 |
| 73 | offering.schema.ts | S3 |
| 74 | offering-brief.schema.ts | S3 |
| 75 | offering-export.schema.ts | S3 |
| 76 | offering-metrics.schema.ts | S3 |
| 77 | offering-pack.schema.ts | S5 |
| 78 | offering-section.schema.ts | S3 |
| 79 | offering-validate.schema.ts | S3 |
| 80 | ogd-generic-schema.ts | S3 |
| 81 | ogd-quality-schema.ts | S3 |
| 82 | onboarding.ts | S0 |
| 83 | orchestration.ts | SX |
| 84 | org.ts | S0 |
| 85 | org-shared.ts | S0 |
| 86 | party-session.ts | S0 |
| 87 | password-reset.ts | S0 |
| 88 | persona-config.ts | S3 |
| 89 | persona-config-schema.ts | S3 |
| 90 | persona-eval.ts | S3 |
| 91 | persona-eval-schema.ts | S3 |
| 92 | pipeline.schema.ts | S5 |
| 93 | pipeline-monitoring.schema.ts | S5 |
| 94 | plan.ts | SX |
| 95 | pm-skills.ts | S3 |
| 96 | poc.schema.ts | S5 |
| 97 | prd.ts | S3 |
| 98 | prd-persona.ts | S3 |
| 99 | prd-review.ts | S3 |
| 100 | profile.ts | S0 |
| 101 | prototype.ts | S3 |
| 102 | prototype-ext.ts | S3 |
| 103 | prototype-feedback-schema.ts | S3 |
| 104 | prototype-job.ts | S3 |
| 105 | prototype-quality-schema.ts | S3 |
| 106 | prototype-usage.ts | S3 |
| 107 | quality-dashboard-schema.ts | S3 |
| 108 | reconciliation.ts | SX |
| 109 | requirements.ts | SX |
| 110 | roi-benchmark.ts | S6 |
| 111 | shaping.ts | S3 |
| 112 | shard-doc.ts | SX |
| 113 | share-link.schema.ts | S5 |
| 114 | sixhats.ts | S3 |
| 115 | skill-guide.ts | S3 |
| 116 | skill-metrics.ts | S3 |
| 117 | skill-registry.ts | S3 |
| 118 | slack.ts | S0 |
| 119 | spec.ts | SX |
| 120 | spec-library.ts | S3 |
| 121 | sr.ts | SX |
| 122 | sso.ts | S0 |
| 123 | starting-point.ts | S3 |
| 124 | task-state.ts | SX |
| 125 | team-review-schema.ts | S4 |
| 126 | token.ts | S0 |
| 127 | trend.ts | S3 |
| 128 | user-evaluation-schema.ts | S6 |
| 129 | validation.schema.ts | S4 |
| 130 | viability-checkpoint.schema.ts | S3 |
| 131 | webhook.ts | SX |
| 132 | wiki.ts | S0 |
| 133 | workflow.ts | SX |

### Schemas 서비스별 집계

| 서비스 | 건수 | 비율 |
|--------|------|------|
| S0 AI Foundry (포털) | 21 | 15.8% |
| S1 Discovery-X (수집) | 5 | 3.8% |
| **S3 Foundry-X (잔류)** | **55** | **41.4%** |
| S4 Gate-X (검증) | 6 | 4.5% |
| S5 Launch-X (제품화+GTM) | 8 | 6.0% |
| S6 Eval-X (평가) | 2 | 1.5% |
| SX Infra (공유) | 36 | 27.1% |
| **합계** | **133** | **100%** |

---

## 4. 전체 서비스별 자산 집계

| 서비스 | Routes | Services | Schemas | **합계** | 비율 |
|--------|--------|----------|---------|---------|------|
| S0 AI Foundry (이관) | 20 | 27 | 21 | **68** | 13.5% |
| S1 Discovery-X (이관) | 4 | 5 | 5 | **14** | 2.8% |
| **S3 Foundry-X (잔류)** | **44** | **97** | **55** | **196** | **39.0%** |
| S4 Gate-X (이관) | 7 | 6 | 6 | **19** | 3.8% |
| S5 Launch-X (이관) | 8 | 12 | 8 | **28** | 5.6% |
| S6 Eval-X (이관) | 2 | 4 | 2 | **8** | 1.6% |
| SX Infra (공유) | 33 | 101 | 36 | **170** | 33.8% |
| **합계** | **118** | **252** | **133** | **503** | **100%** |
