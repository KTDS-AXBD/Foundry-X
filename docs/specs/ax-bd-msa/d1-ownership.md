---
code: FX-SPEC-MSA-D1
title: "D1 테이블 소유권 + 크로스 서비스 FK 목록"
version: "1.0"
status: Active
category: SPEC
created: 2026-04-07
updated: 2026-04-07
author: Claude (Sprint 179 Autopilot)
---

# D1 테이블 ��유권 + 크로스 서비스 FK 목록

> **실측 기준**: Sprint 179 시점, 123 migration 파일, 174 테이블

---

## 1. 테이블 소유권 태깅

### 1.1 S0: AI Foundry 포털 (이관 대상)

| # | 테이블 | 생성 마이그레이션 | 비고 |
|---|--------|------------------|------|
| 1 | users | 0001_initial.sql | **전역 참조 키** — 7회 FK |
| 2 | organizations | 0001_initial.sql | **테넌시 키** — 25회 FK |
| 3 | org_members | 0001_initial.sql | |
| 4 | org_invitations | 0001_initial.sql | |
| 5 | projects | 0001_initial.sql | 4회 FK |
| 6 | refresh_tokens | 0001_initial.sql | |
| 7 | sessions (※ 존재 시) | 초기 | |
| 8 | password_reset_tokens | - | |
| 9 | audit_logs | - | |
| 10 | kpi_events | - | |
| 11 | kpi_snapshots | - | |
| 12 | notifications | - | |
| 13 | nps_surveys | - | |
| 14 | onboarding_progress | - | |
| 15 | onboarding_feedback | - | |
| 16 | wiki_pages | - | |
| 17 | token_usage | - | |
| 18 | slack_notification_configs | - | |
| 19 | party_sessions | - | 2회 FK |
| 20 | party_participants | - | |
| 21 | party_messages | - | |
| 22 | backup_metadata | - | |
| 23 | custom_agent_roles | - | |
| 24 | org_services | - | |

### 1.2 S1: Discovery-X 수집 (이관 대상)

| # | 테이블 | 비고 |
|---|--------|------|
| 1 | collection_jobs | |
| 2 | ax_ideas | |
| 3 | ax_insight_jobs | |
| 4 | ir_proposals | |
| 5 | agent_collection_runs | |
| 6 | agent_collection_schedules | |

### 1.3 S3: Foundry-X 발굴+형상화 (잔류)

| # | 테이블 | 비고 |
|---|--------|------|
| 1 | biz_items | **최대 핫스팟** — 30회 FK |
| 2 | biz_item_classifications | |
| 3 | biz_item_starting_points | |
| 4 | biz_item_discovery_stages | |
| 5 | biz_item_trend_reports | |
| 6 | biz_analysis_contexts | |
| 7 | biz_discovery_criteria | |
| 8 | biz_generated_prds | 5회 FK |
| 9 | ax_bmcs | 1회 FK |
| 10 | ax_bmc_blocks | |
| 11 | ax_bmc_comments | |
| 12 | ax_bmc_versions | |
| 13 | ax_idea_bmc_links | |
| 14 | ax_persona_configs | |
| 15 | ax_persona_evals | |
| 16 | ax_commit_gates | |
| 17 | ax_viability_checkpoints | |
| 18 | ax_discovery_reports | |
| 19 | ax_team_reviews | |
| 20 | business_plan_drafts | |
| 21 | bdp_versions | |
| 22 | bdp_section_reviews | |
| 23 | offerings | 5회 FK |
| 24 | offering_versions | |
| 25 | offering_sections | |
| 26 | offering_briefs | |
| 27 | offering_design_tokens | |
| 28 | offering_validations | |
| 29 | offering_prototypes | |
| 30 | prototypes | 3회 FK |
| 31 | prototype_jobs | 4��� FK |
| 32 | prototype_feedback | |
| 33 | prototype_usage_logs | |
| 34 | prototype_quality | |
| 35 | prototype_section_reviews | |
| 36 | shaping_runs | |
| 37 | shaping_phase_logs | |
| 38 | shaping_expert_reviews | |
| 39 | shaping_six_hats | |
| 40 | sixhats_debates | 1회 FK |
| 41 | sixhats_turns | |
| 42 | hitl_artifact_reviews | |
| 43 | methodology_modules | |
| 44 | methodology_selections | |
| 45 | pm_skills_criteria | |
| 46 | skill_registry | |
| 47 | skill_versions | |
| 48 | skill_executions | |
| 49 | skill_search_index | |
| 50 | skill_lineage | |
| 51 | skill_audit_log | |
| 52 | kg_nodes | 2회 FK |
| 53 | kg_edges | |
| 54 | kg_properties | |
| 55 | ogd_runs | 1회 FK |
| 56 | ogd_run_rounds | |
| 57 | ogd_rounds | |
| 58 | ogd_domains | |
| 59 | captured_candidates | |
| 60 | captured_reviews | |
| 61 | captured_workflow_patterns | |
| 62 | derived_candidates | |
| 63 | derived_patterns | |
| 64 | derived_reviews | |
| 65 | discovery_pipeline_runs | |
| 66 | document_shards | |
| 67 | help_agent_conversations | |
| 68 | spec_library | |
| 69 | spec_conflicts | |
| 70 | prd_reviews | |
| 71 | prd_review_scorecards | |
| 72 | prd_persona_evaluations | |
| 73 | prd_persona_verdicts | |
| 74 | offering_metrics (※) | |
| 75 | content_adapter (※) | |

### 1.4 S4: Gate-X 검증 (이관 대상)

| # | 테이블 | 비고 |
|---|--------|------|
| 1 | ax_evaluations | 2회 FK |
| 2 | ax_evaluation_history | |
| 3 | biz_evaluations | 1회 FK |
| 4 | biz_evaluation_scores | |
| 5 | decisions | |
| 6 | gate_packages | |
| 7 | validation_history | |
| 8 | evaluation_reports | |
| 9 | expert_meetings | |
| 10 | tech_reviews | |

### 1.5 S5: Launch-X 제품화+GTM (이관 대상)

| # | 테이블 | 비고 |
|---|--------|------|
| 1 | pipeline_stages | |
| 2 | pipeline_events | |
| 3 | pipeline_checkpoints | |
| 4 | pipeline_permissions | |
| 5 | mvp_tracking | 1회 FK |
| 6 | mvp_status_history | |
| 7 | offering_packs | 3회 FK |
| 8 | offering_pack_items | |
| 9 | pack_installations | |
| 10 | gtm_customers | 1회 FK |
| 11 | gtm_outreach | |
| 12 | poc_projects | 1회 FK |
| 13 | poc_kpis | |
| 14 | poc_environments | |
| 15 | share_links | |

### 1.6 S6: Eval-X 평가 (이관 대상)

| # | 테이�� | 비고 |
|---|--------|------|
| 1 | user_evaluations | |
| 2 | roi_benchmarks | |
| 3 | roi_signal_valuations | |

### 1.7 SX: Infra 공통 (공유)

| # | 테이블 | 비고 |
|---|--------|------|
| 1 | agents | 1회 FK |
| 2 | agent_sessions | 1회 FK |
| 3 | agent_tasks | 1회 FK |
| 4 | agent_plans | |
| 5 | agent_messages | |
| 6 | agent_prs | 1회 FK |
| 7 | agent_capabilities | |
| 8 | agent_constraints | |
| 9 | agent_worktrees | |
| 10 | agent_feedback | |
| 11 | agent_marketplace_items | 2회 FK |
| 12 | agent_marketplace_installs | |
| 13 | agent_marketplace_ratings | |
| 14 | automation_quality_snapshots | |
| 15 | data_classification_rules | |
| 16 | entity_links | |
| 17 | event_bus (※) | |
| 18 | execution_events | |
| 19 | expansion_packs | 1회 FK |
| 20 | failure_patterns | 1회 FK |
| 21 | fallback_events | |
| 22 | feedback_queue | |
| 23 | guard_rail_proposals | |
| 24 | loop_contexts | |
| 25 | mcp_servers | 1회 FK |
| 26 | mcp_sampling_log | |
| 27 | merge_queue | |
| 28 | model_execution_metrics | |
| 29 | model_routing_rules | |
| 30 | parallel_executions | |
| 31 | prompt_sanitization_rules | |
| 32 | reconciliation_runs | |
| 33 | service_entities | 2회 FK |
| 34 | sr_requests | 2회 FK |
| 35 | sr_classification_feedback | |
| 36 | sr_workflow_runs | |
| 37 | sync_failures | |
| 38 | task_states | |
| 39 | task_state_history | |
| 40 | webhooks | |
| 41 | webhook_deliveries | |
| 42 | workflow_executions | |
| 43 | workflows | |

---

## 2. 크로��� 서비스 FK 의존성 그래��

### 2.1 FK 참조 빈도 (상위 10)

| 순위 | 대상 테이블 | 소유 서비스 | FK 참조 횟수 | 참조하는 서비스 |
|------|------------|-----------|-------------|----------------|
| 1 | `biz_items` | S3 | 30 | S3, S4, S5, S6 |
| 2 | `organizations` | S0 | 25 | 전 서비스 |
| 3 | `users` | S0 | 7 | 전 서���스 |
| 4 | `offerings` | S3 | 5 | S3, S5 |
| 5 | `biz_generated_prds` | S3 | 5 | S3, S4 |
| 6 | `prototype_jobs` | S3 | 4 | S3 |
| 7 | `projects` | S0 | 4 | S0, SX |
| 8 | `prototypes` | S3 | 3 | S3 |
| 9 | `offering_packs` | S5 | 3 | S5 |
| 10 | `sr_requests` | SX | 2 | SX |

### 2.2 크로스 서비스 FK 관계도

```
S0 (AI Foundry)
  users.id ──────────────▶ [S0, S1, S3, S4, S5, S6, SX]  (7 FK)
  organizations.id ──────▶ [S0, S1, S3, S4, S5, S6, SX]  (25 FK)
  projects.id ───────────▶ [S0, SX]                        (4 FK)

S3 (Foundry-X)
  biz_items.id ──────────▶ [S3, S4, S5, S6]               (30 FK) ★★★
  offerings.id ──────────▶ [S3, S5]                         (5 FK)
  biz_generated_prds.id ─▶ [S3, S4]                         (5 FK)
  prototype_jobs.id ─���───▶ [S3]                              (4 FK)
  prototypes.id ─────────▶ [S3]                              (3 FK)

S5 (Launch-X)
  offering_packs.id ─────▶ [S5]                              (3 FK)
  mvp_tracking.id ───────▶ [S5]                              (1 FK)
```

### 2.3 핫스팟 분석

| 핫스팟 | 위험도 | MSA 분리 시 대응 |
|--------|--------|-----------------|
| `biz_items` (30 FK) | **Critical** | 이벤트 기반 동기화 필수. `biz_items.id`를 로컬 캐시로 복제 + `item.updated` 이벤트 구독 |
| `organizations` (25 FK) | **Critical** | 전 서비스 테넌시 키. JWT 토큰에 org_id 포함하여 DB 조회 최소화 |
| `users` (7 FK) | **High** | JWT에 user_id 포함. 프로필 조회만 AI Foundry API 호출 |
| `offerings` (5 FK) | **Medium** | S3→S5 방향만. 이벤트 `offering.created` 구독으로 해결 |
| `biz_generated_prds` (5 FK) | **Medium** | S3→S4 방향만. 이벤트 `prd.generated` 구독 |

---

## 3. 서비스별 테이블 집계

| 서비스 | 테이블 수 | 비율 | FK 대상 횟수 |
|--------|----------|------|-------------|
| S0 AI Foundry | ~24 | 14% | 36 (users+orgs+projects) |
| S1 Discovery-X | ~6 | 3% | 0 |
| **S3 Foundry-X** | **~75** | **43%** | 48 (biz_items+offerings+prds+...) |
| S4 Gate-X | ~10 | 6% | 3 |
| S5 Launch-X | ~15 | 9% | 5 |
| S6 Eval-X | ~3 | 2% | 0 |
| SX Infra | ~43 | 25% | 8 |
| **합계** | **~174** | **100%** | |
