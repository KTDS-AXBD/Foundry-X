---
code: FX-SPEC-GO4
title: Phase 4 Go/Pivot/Kill 판정
version: 0.1
status: Draft
category: SPEC
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Phase 4 Go/Pivot/Kill 판정

## 1. Go 조건 (PRD v5 §7.10)

> Go 조건 (하나 이상): NPS 6+ (K12), WAU 60%+ (K7), "개별 서비스로 돌아가고 싶지 않다" 피드백 2명 이상

| 조건 | 현재 상태 | 판정 |
|------|-----------|:----:|
| NPS 6+ (K12) | 실사용자 미참여, 측정 불가 | ⏳ |
| WAU 60%+ (K7 — 5명 중 3명 이상) | KPI 인프라 배포 완료, 데이터 수집 대기 | ⏳ |
| "돌아가고 싶지 않다" 피드백 2명+ | 실사용자 미참여 | ⏳ |

## 2. 기술적 준비 상태

### 2.1 Phase 3 완료 현황 (PRD v5 MVP 최소 기준)

| MVP 기준 | 완료 | Sprint | 비고 |
|----------|:----:|:------:|------|
| 기술 스택 점검(Sprint 0) | ✅ | 25 | F98, Kill→Go (호환성 매트릭스) |
| KPI 측정 인프라 | ✅ | 27 | F100, kpi_events + /analytics 대시보드 |
| AXIS DS UI 전환 | ✅ | 25 | F104, 11 컴포넌트 전환 |
| Plumb Track B 판정 | ✅ | 28 | F105, Stay Track A (ADR-001) |
| 에이전트 자동 수정/rebase | ✅ | 27~28 | F101 AutoFix + F102 AutoRebase |
| Git↔D1 Reconciliation | ✅ | 27 | F99, Cron 6h |

**Phase 3 MVP: 6/6 달성 (100%)**

### 2.2 Phase 4 통합 Step 완료 현황

| Step | 내용 | F# | Match | 상태 |
|:----:|------|:--:|:-----:|:----:|
| 1 | AXIS DS UI 적용 | F104 | 95% | ✅ |
| 2 | 프론트엔드 통합 (iframe) | F106 | 85%→ | 🔧 Sprint 30 F124 개선 중 |
| 3 | 인증/테넌시 통합 (SSO) | F108 | 100% | ✅ |
| 4 | API 점진적 통합 (BFF) | F109 | 94% | ✅ |
| 5 | 데이터 통합 (D1 entity_registry) | F111 | 95% | ✅ |

**Phase 4 통합: 5/5 Step 완료 (Step 2 개선 진행 중)**

### 2.3 인프라 및 배포

| 항목 | 상태 |
|------|:----:|
| Workers v2.2.0 프로덕션 배포 | ✅ |
| D1 migrations 0001~0018 remote | ✅ |
| Cron Trigger (6h Reconciliation) | ✅ |
| Pages (fx.minu.best) | ✅ |
| KPI 수집 파이프라인 | ✅ |
| E2E 테스트 (51+ specs) | ✅ |

## 3. codegen-core 재활용 판정

PRD v5 §9: "codegen-core | Phase 4에서 검토 | AI Foundry 통합 시 | AST/파일 생성 로직 재활용 가능"

**판정: 보류 (Defer)**

| 항목 | 분석 |
|------|------|
| 현재 통합 방식 | MCP 경유 패턴 (AI Foundry를 MCP 서버로 등록) |
| codegen-core 필요성 | MCP tool.call()로 충분, 직접 import 불필요 |
| 재활용 시점 | AI Foundry Workers 모듈 통합 시 (Phase 4-C 후반) |
| 결론 | 현재는 MCP 경유로 충분. Workers 모듈 통합 단계에서 재검토 |

## 4. 미달 항목 + 대응 방안

| 미달 항목 | 원인 | 대응 |
|-----------|------|------|
| K12 NPS | 실사용자 온보딩 미실시 | Sprint 29 F120~F122 온보딩 후 측정 |
| K7 WAU | KPI 인프라 배포 직후, 데이터 없음 | 온보딩 시작 후 4주 수집 필요 |
| 피드백 2명+ | 실사용자 부재 | 내부 5명 강제 온보딩(F114) 후 수집 |

## 5. 판정

### **Conditional Go**

**근거:**
1. 기술적 준비 100% 완료 — Phase 3 MVP 6/6 + Phase 4 통합 Step 5/5
2. 프로덕션 인프라 안정 — Workers + Pages + D1 + Cron 모두 정상 가동
3. 코드 품질 — 550+ API tests + 51 E2E + typecheck 0 error
4. 유일한 블로커: **실사용자 데이터 부재** — 기술이 아닌 운영(온보딩) 문제

**조건:**
- Sprint 29(F120~F122) 온보딩 인프라 완성 후 내부 5명 온보딩 시작
- 온보딩 시작 4주 후 K7/K12 데이터 기반 최종 Go/Pivot/Kill 결정
- 최종 판정 예정일: 온보딩 시작 + 4주

**Pivot 경로 (필요 시):**
- 일부 서비스만 통합 유지 (예: AXIS DS + Foundry-X만)
- 통합 대신 API 연동으로 회귀 (F73 C1/C2/C3 경로)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft — Conditional Go (기술 100%, 실사용 데이터 대기) | Sinclair Seo |
