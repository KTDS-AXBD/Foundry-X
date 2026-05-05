---
title: AI Foundry Master Plan — Index
version: v1
date: 2026-05-05
owner: Sinclair Seo
status: 별 트랙 정리 + Foundry-X SPEC backlog 매핑 완료
classification: 기업비밀II급 / Enterprise부문
---

# AI Foundry Master Plan — Index

> 폴더 정리: 2026-05-05 (S332). 한글 폴더명 `기업 의사결정 업무 Agentic AI 플랫폼` → `ai-foundry-master-plan`.
> Secrets `.dev.vars` → `~/work/axbd/.secrets/ai-foundry/.dev.vars` (외부 안전 위치, 600 권한).

## 1. 한 줄 정의

**AI Foundry는 기업의 의사결정을 자산으로 만드는 Agentic AI 플랫폼.** Policy Pack · Ontology · Skill Package · Decision Log 4-Asset 모델로 의사결정의 근거·맥락·반복가능성을 영구 자산화.

## 2. 5 repo 구성 (KTDS-AXBD org)

| Repo | 역할 | Plane | 현재 상태 |
|------|------|-------|----------|
| **Foundry-X** | Control Plane 후보 | 5-Layer 통합 운영 + Multi-Tenant + 4대 진단 + Cross-Org + KPI/HITL/Audit | Phase 47 / Sprint 341 / v1.9.0 / 15 packages |
| Decode-X | Input Plane | SI 프로젝트 역공학 엔진 (퇴직연금 + 온누리상품권 Pilot) | v0.7.0 / 7 Workers / 5 D1 / Phase 2-E 머지, 도메인 실측 부재 |
| Discovery-X | 발굴 | 사업 발굴 + BC 카드 export | v0.x / 47일 정체 ★ |
| AXIS-DS | Design System | KPI 위젯 + HITL Console + agentic-ui | v1.x / 93일 정체 ★ / PR #55 14일 미머지 |
| ax-plugin | Skill Marketplace | /ax:* 24 스킬 + 신규 5 스킬 후보 | 활성 (2026-05-04 Phase 5d 자동화 추가) |

## 3. 3 Phase 로드맵

| Phase | 기간 | 본질 | 종료 시 산출물 |
|-------|------|------|----------------|
| Phase 1 | ~2026-05-31 | 기획 확정 — AI Foundry 정의서 + 5-Layer 모듈 스펙 | 본 문서 v1.0 + 모듈 스펙 v1.0 |
| Phase 2 | 2026-06-01 ~ 2026-06-30 | Prototype — 가상 도메인 1개 5-Layer E2E | 시연 빌드 + 영상 + 측정 결과 |
| Phase 3 | 2026-08-01 ~ | 실제 사업 적용 — 첫 도메인 인스턴스화 + 운영 | 도메인 정책팩 v1.0 + GTM 1차 |

W18(현재) → W19 BeSir 미팅 + Conditional 게이트 → W20~W22 Foundry-X 5 sub-app 스캐폴드 → W26 5-Layer 통합 → W29 Phase 3 진입 정비.

## 4. 문서 Navigation (16건)

### 마스터 기획 (활성)
- **02_ai_foundry_phase1_v0.3.md** — Phase 1 정의서 (BeSir 정합성 P0 10건 반영판) ★ SSOT
- **07_ai_foundry_os_target_architecture.md** — Target Architecture (5-Layer + 4-Asset)
- **08_build_plan_v1.md** — 마스터 빌드 플랜 (W18~W29 12주 매핑)

### Sub-App Dev Plan (W20~W26 구현 베이스)
- **09_dev_plan_guard_x_v1.md** — Guard-X (Policy 평가 + default-deny + PII Mask)
- **10_dev_plan_launch_x_v1.md** — Launch-X (정책팩 zip 패키징 + canary + rollback < 30s)
- **11_dev_plan_diagnostic_v1.md** — 4대 진단 (missing/duplicate/overspec/inconsistency)
- **12_dev_plan_cross_org_v1.md** — Cross-Org 4그룹 분류 + core_differentiator default-deny

### Live Audit + Implementation (2026-05-04)
- **14_repo_status_audit_v1.md** — 5 repo 라이브 정밀 분석 (PRD P0 평균 25% 충족, Foundry-X P0-4 0%)
- **15_msa_implementation_plan_v1.md** ★ — 5 sub-app + 3 횡단 레이어 + W18~W29 통합 sprint 매핑
- **16_validation_report_v1.md** — 14·15 검증 + v1.1 patch 권고 10건

### 검토 + 임원 보고
- **03_cross_review_prompts.md / 04_cross_review_consolidation_v1.md** — 외부 LLM 교차 검토 프롬프트 + 통합본
- **05_executive_one_pager_v1/v2.md/docx/pdf** — 임원 1페이지 (8월 Show & Tell용)
- **06_architecture_alignment_with_besir_v1.md** — BeSir 정합성 분석 (P0 10건)
- **13_cross_review_prompts_for_build_plan_v1.md** — Build Plan 외부 검토용 프롬프트

### Deprecated
- **01_master_plan_v0.1.md** — Decision Foundry 명칭 시절 (2026-04-29 v0.2 방향 전환으로 폐기)

### 기타 자산
- `ai-foundry-os/` — 서브 자료 보관소 (review round-1 archive 포함)
- `ai_foundry_os_target_architecture.{png,svg}` — 아키텍처 다이어그램

## 5. Foundry-X 영향도 — PRD P0 8개

| P0 | 책임 영역 | 현재 충족률 | Foundry-X 신규 작업 |
|----|----------|------------|---------------------|
| P0-1 | 5-Layer 통합 운영 | 15% | 5 sub-app 통합 컨트롤 (5 repo orchestration 패턴) |
| P0-2 | Multi-Tenant PG + RBAC 5역할 + KT DS SSO | 20% ★ | **PostgreSQL 도입 + core/multi-tenant/ sub-app 신설** |
| P0-3 | 4대 진단 자동 실행 | 45% | core/diagnostic/ sub-app 신설 + Decode-X publisher 수신 |
| P0-4 | Cross-Org 4그룹 + core_differentiator default-deny | **0% ★★** | core/cross-org/ sub-app 신설 + default-deny 코드 강제 |
| P0-5 | KPI 대시보드 8개 | 40% | AXIS-DS v1.2 KPI 위젯 4종 + 산정 코드 매핑 |
| P0-6 | HITL Console | 35% | AXIS-DS v1.2 agentic-ui + Foundry-X HITL escalation 룰 |
| P0-7 | Audit Log Bus | 25% | trace_id chain + HMAC + SIEM 발행 횡단 레이어 신설 |
| P0-8 | AI 에이전트 투명성 | 50% | dual_ai_reviews + 6축 점수 + confidence < 0.7 HITL escalation |

## 6. Foundry-X 신규 작업 — 5 sub-app + 3 횡단 레이어

### Sub-App (`packages/api/src/core/`)

```
├── (기존 10: agent/ collection/ decode-bridge/ discovery/ events/ files/ harness/ offering/ shaping/ verification/)
├── guard/                [NEW] mount: /api/v1/guard
├── launch/               [NEW] mount: /api/v1/launch
├── diagnostic/           [NEW] mount: /api/v1/diagnostic
├── cross-org/            [NEW] mount: /api/v1/cross-org
└── multi-tenant/         [NEW] mount: /api/v1/multi-tenant
```

각 sub-app: `index.ts` + `types.ts` (zod contract) + `routes/` + `services/` + `tests/`. Foundry-X MSA 원칙(`core/{domain}/` 전용, types.ts contract, Hono sub-app) 준수.

### 횡단 레이어

1. **PostgreSQL Schema 격리** — D1 dual storage, 본부별 schema (Foundry-X 외부 인프라 1건 결정 필요)
2. **KT DS SSO 어댑터** — OIDC/SAML, arctic 또는 자체
3. **Audit Log Bus** — trace_id chain + HMAC + append-only + SIEM 발행, 5 repo 모두 수신·발행

## 7. 12주 Critical Path (W18 ~ W29)

| 주차 | 게이트 / 작업 | Phase |
|------|--------------|-------|
| W18 (현재, 5/5) | Foundry-X SPEC backlog 등록 + 별 트랙 정리 | Phase 1 |
| W19 (5/15 BeSir 미팅 D-day, **D-10**) | BeSir Conditional C-1·C-2·C-4 게이트 통과 | Phase 1 |
| W20~W22 | 5 sub-app 스캐폴드 + types.ts + PG PoC | Phase 2 |
| W22~W26 | 5-Layer α1~α4 통합 빌드 + Cross-Org default-deny 코드 강제 | Phase 2 |
| W26 | KPI 위젯 + HITL Console + Audit Bus 통합 시연 | Phase 2 |
| W29 (8월 초) | Phase 3 진입 정비 — 도메인 합의·데이터 협조·KT 본부 align | Phase 3 |

## 8. 누락 발견 (16 v1 → v1.1 patch 후보, W18~W19 처리)

- **P1 누락 3건**: /ax:domain-init β / Six Hats 외부 LLM 호출 패턴 / CQ 5축 운영 검증 (BeSir 정합성 핵심)
- **§6.4 윤리 AI 임계 정책 누락** — confidence < 0.7 HITL + FP 주간 측정 + 오분류 즉시 중단
- **§5.3 core_diff 차단율 < 100% 측정 코드 부재**
- **§5.1 KPI 8개 산정 코드/UI 매핑 1:1 부재**
- **오픈이슈 3건 미반영**: #5 외부 자료 마스킹 가이드 v2 / #6 BeSir MCP Tools 통합 시점 / #9 본부 비개발자 교육 영상
- **Foundry-X 24h 드리프트**: 14·15 baseline (Phase 46 / Sprint 331) → 실제 (Phase 47 / Sprint 341)

## 9. SPEC.md 매핑 (S332 등록)

| AI Foundry | Foundry-X SPEC §5 | REQ |
|-----------|------------------|-----|
| P0-1 5-Layer 통합 | F600 (idea, Phase 48 후보) | FX-REQ-664 |
| P0-2 Multi-Tenant PG+RBAC+SSO | F601 (idea, Phase 48 후보) | FX-REQ-665 |
| P0-3 4대 진단 자동 실행 | F602 (idea, Phase 48 후보) | FX-REQ-666 |
| P0-4 Cross-Org default-deny | F603 (idea, Phase 48 후보) | FX-REQ-667 |
| P0-5 KPI 대시보드 8개 | F604 (idea, Phase 48 후보) | FX-REQ-668 |
| P0-6 HITL Console | F605 (idea, Phase 48 후보) | FX-REQ-669 |
| P0-7 Audit Log Bus | F606 (idea, Phase 48 후보) | FX-REQ-670 |
| P0-8 AI 에이전트 투명성 | F607 (idea, Phase 48 후보) | FX-REQ-671 |

> Phase 48은 잠정 명칭. 사용자 PM 확정 시 (W19 BeSir 미팅 후) 정식 Phase 등록 + Sprint 분해 진행.

## 10. 다음 액션

1. **W18 (이번 주)**: 본 INDEX.md 합의 + SPEC.md F600~F607 idea 등록
2. **W19 (5/15 D-day)**: BeSir 미팅 + Conditional 게이트 + v1.1 patch 10건 처리
3. **W20+**: F600~F607 중 P0-2 (multi-tenant) + P0-4 (cross-org) 우선 sub-app 스캐폴드 sprint 분해

---

**관련 외부 자산**: `~/work/axbd/.secrets/ai-foundry/` (live API key, 600 권한, repo 외부)
