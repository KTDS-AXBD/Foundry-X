---
code: FX-RPRT-S96
title: "Sprint 96 완료 보고서 — HITL 인터랙션 패널 (F266)"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S96]], [[FX-DSGN-S96]]"
---

# Sprint 96 완료 보고서: HITL 인터랙션 패널 (F266)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F266 HITL 인터랙션 + 결과물 확인 — 인라인 패널 |
| Sprint | 96 |
| 기간 | 2026-03-31 (단일 세션) |
| Match Rate | 100% (11/11 항목) |

### Results Summary

| 항목 | 수치 |
|------|------|
| 신규 파일 | 7개 |
| 수정 파일 | 4개 |
| 신규 테스트 | 16건 (서비스 8 + 라우트 8) |
| D1 마이그레이션 | 0078 (hitl_artifact_reviews 테이블) |
| API 엔드포인트 | 2개 (POST /hitl/review, GET /hitl/history/:artifactId) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 스킬 실행 결과를 확인·검증할 인터페이스 없음 |
| Solution | 사이드 드로어 HITL 패널 + 리뷰 이력 + 4-action |
| Function UX Effect | 스킬 실행 → 즉시 결과 검토 → 승인 시 다음 단계 자동 연결 |
| Core Value | Human-in-the-Loop 워크플로우로 AI 산출물 품질 보장 |

---

## 구현 상세

### API 레이어

| 파일 | 설명 |
|------|------|
| `services/hitl-review-service.ts` | 리뷰 CRUD + artifact 상태 전환 (BdArtifactService 위임) |
| `routes/hitl-review.ts` | POST /hitl/review + GET /hitl/history/:artifactId |
| `schemas/hitl-review-schema.ts` | Zod 스키마 + refine (거부 시 reason 필수, 수정 시 content 필수) |
| `schemas/bd-artifact.ts` | status enum에 approved/rejected 추가 |
| `db/migrations/0078_hitl_reviews.sql` | hitl_artifact_reviews 테이블 + 인덱스 |

### Web 레이어

| 파일 | 설명 |
|------|------|
| `HitlReviewPanel.tsx` | 사이드 드로어 (480px, 4-action, 수정 에디터, 거부 사유, 리뷰 이력) |
| `DiscoveryWizard.tsx` | HITL 패널 연결 (hitlArtifact 상태 + onArtifactReview 콜백) |
| `WizardStepDetail.tsx` | onArtifactReview prop 추가 |
| `api-client.ts` | submitHitlReview + getHitlHistory 함수 |

### 검증 결과

| 항목 | 결과 |
|------|------|
| typecheck | ✅ api + web 모두 통과 |
| API 테스트 | ✅ 2232/2232 (기존 2205 + 신규 16 + 기타 11) |
| HITL 테스트 | ✅ 16/16 (서비스 8 + 라우트 8) |

---

## PDCA 학습

### 잘 된 것
- 기존 `BdArtifactService.updateStatus()` 활용으로 상태 전환 로직 중복 방지
- Zod `refine()` 사용으로 조건부 필수 검증 (거부 시 reason, 수정 시 content) 구현
- 사이드 드로어 UX로 위저드 컨텍스트 유지하면서 리뷰 가능

### 개선점
- react-markdown 미사용 → 마크다운 산출물이 plain text로 렌더링됨 (P2 개선 항목)
- HITL 재생성(regenerated) 시 실제 스킬 재실행 호출은 미구현 (콜백만 제공)
