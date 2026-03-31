---
code: FX-PLAN-FDU
title: "fx-discovery-ux — 발굴 프로세스 사용자 관점 사용성 개선"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-SPEC-FDU-PRD]]"
---

# fx-discovery-ux: 발굴 프로세스 사용자 관점 사용성 개선

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263~F266 발굴 프로세스 UX 개선 (4 Must Have) |
| 기간 | 2026-04-01 ~ 2026-04-14 (2주, Sprint 94~97) |
| 우선순위 | P0 |
| PRD | docs/specs/fx-discovery-ux/prd-final.md |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | AX BD팀이 Foundry-X 발굴 기능 대신 CC Cowork을 사용. 진입 장벽(메뉴 과다, 시작점 불명, 인터랙션 부재)이 핵심 원인 |
| Solution | 단계별 위저드 UI + AI Help Agent(OpenRouter SSE) + 인터랙티브 온보딩 + HITL 결과물 패널 4가지 UX 구축 |
| Function UX Effect | 초보 사용자가 5분 안에 발굴 프로세스 시작 가능, AI 비서가 컨텍스트 인식 단계별 안내 |
| Core Value | 기존 76스킬+프로세스 인프라가 실사용으로 전환, CC Cowork 대비 "프로세스 기반 협업" 차별화 실현 |

## 목표

1. **단계별 안내 UI**: 나열형 메뉴 → 위저드/스텝퍼 전환, biz-item별 진행 단계 자동 추적
2. **Help Agent**: OpenRouter SSE 스트리밍 챗봇, 현재 컨텍스트(아이템+단계+역할) 인식
3. **온보딩 투어 개선**: 발굴 특화 3~5스텝 인터랙티브 투어, F252 연계
4. **HITL 인터랙션**: 스킬 실행 결과물 인라인 패널 (승인/수정/재생성/거부)

## F-Items

| F-Item | 제목 | 우선순위 | Sprint | 비고 |
|--------|------|---------|--------|------|
| F263 | 발굴 프로세스 단계별 안내 UI — 위저드/스텝퍼 재구성 + biz-item별 진행 추적 | P0 | 94 | F241(사이드바 재구조화) 확장, F258(BD 프로세스 가이드) 기반 |
| F264 | Help Agent (개인 비서) — OpenRouter SSE 스트리밍 챗 + 컨텍스트 인식 | P0 | 95 | OpenRouter API, F57(SSE), F260(스킬 실행) 의존 |
| F265 | 발굴 온보딩 투어 개선 — 인터랙티브 3~5스텝 가이드 | P0 | 94 | F252(온보딩) 연계, F263과 동일 Sprint |
| F266 | HITL 인터랙션 + 결과물 확인 — 인라인 패널 (승인/수정/재생성/거부) | P0 | 96 | F260(스킬 실행 엔진), F261(산출물 저장) 기반 |

## 기술 결정

### 1. Help Agent LLM: OpenRouter 경유 (확정)

인터뷰에서 확정. OpenRouter 경유로 멀티모델 유연성 확보.

- **엔드포인트**: `https://openrouter.ai/api/v1/chat/completions`
- **인증**: `OPENROUTER_API_KEY` (Workers secret)
- **모델**: 초기 `anthropic/claude-sonnet-4-6`, 필요 시 전환
- **SSE**: `stream: true` + EventSource 클라이언트
- **Hybrid 처리**: 단순 질문(다음 단계, 스킬 설명)은 로컬 DB 즉시 응답, 복잡 질문만 LLM

### 2. 위저드 UI: 기존 Discovery 페이지 확장 (vs 새 페이지)

기존 `/ax-bd/discovery` 페이지를 위저드 모드로 전환. 새 페이지 생성 대신 기존 라우트 활용.

- **Stepper 컴포넌트**: 2-0~2-10 단계를 좌측 사이드바 또는 상단 스텝퍼로 표시
- **단계별 콘텐츠**: 목적 + 사용 스킬 + 예상 산출물 + 다음 단계
- **진행 상태**: `discovery_progress` API(F262) 활용

### 3. HITL 패널: 사이드 드로어 (vs 모달)

산출물 확인 패널을 사이드 드로어 방식으로 구현. 메인 콘텐츠를 보면서 동시에 결과 검토 가능.

- **액션**: ✅ 승인 → D1 저장 + 다음 단계 자동 연결 / ✏️ 수정 → 에디터 전환 / 🔄 재생성 → F260 재호출 / ❌ 거부 → 사유 입력
- **상태 관리**: Zustand store, Optimistic UI

### 4. D1 스키마 확장

```sql
-- 0078: Help Agent 대화 이력
CREATE TABLE IF NOT EXISTS help_agent_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  biz_item_id TEXT,
  discovery_stage TEXT,
  role TEXT DEFAULT 'user',
  content TEXT NOT NULL,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 0079: HITL 산출물 승인 이력
CREATE TABLE IF NOT EXISTS hitl_artifact_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  artifact_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('approved', 'modified', 'regenerated', 'rejected')),
  reason TEXT,
  previous_version TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Sprint 구성

### Sprint 94 (마일스톤 1-A): F263 + F265

**목표**: 단계별 안내 UI + 온보딩 투어
**변경 범위**: `packages/web/src/app/(app)/ax-bd/`, `packages/api/src/routes/`, `packages/api/src/services/`

| 작업 | 파일 | 설명 |
|------|------|------|
| DiscoveryWizard 컴포넌트 | `web/src/components/feature/discovery/DiscoveryWizard.tsx` | 2-0~2-10 스텝퍼 + 단계별 콘텐츠 패널 |
| 위저드 데이터 | `web/src/lib/discovery-wizard-data.ts` | 각 단계 목적/스킬/산출물/다음단계 정적 데이터 |
| Discovery 페이지 전환 | `web/src/app/(app)/ax-bd/discovery/page.tsx` | 나열형 → 위저드 모드 전환 |
| 온보딩 투어 | `web/src/components/feature/discovery/DiscoveryTour.tsx` | 5스텝 인터랙티브 투어 (F252 패턴 재사용) |
| API: 단계별 진행 상태 | `api/src/routes/discovery-wizard.ts` | biz-item별 현재 단계 + 완료 단계 조회 |

### Sprint 95 (마일스톤 1-B): F264

**목표**: Help Agent 챗봇
**변경 범위**: 신규 라우트/서비스 + 웹 챗 UI
**사전 조건**: OpenRouter API Key 설정, Help Agent 시스템 프롬프트 설계

| 작업 | 파일 | 설명 |
|------|------|------|
| OpenRouter 프록시 서비스 | `api/src/services/openrouter-service.ts` | SSE 스트리밍 + 모델 라우팅 |
| Help Agent 서비스 | `api/src/services/help-agent-service.ts` | 컨텍스트 조립 + 프롬프트 관리 + Hybrid 분기 |
| Help Agent 라우트 | `api/src/routes/help-agent.ts` | POST /help-agent/chat (SSE), GET /help-agent/history |
| Help Agent 스키마 | `api/src/schemas/help-agent-schema.ts` | 요청/응답 Zod 스키마 |
| D1 마이그레이션 0078 | `api/src/db/migrations/0078_help_agent.sql` | help_agent_conversations 테이블 |
| 챗 UI | `web/src/components/feature/discovery/HelpAgentChat.tsx` | 사이드패널 챗 + SSE EventSource + 타이핑 애니메이션 |
| 챗 Store | `web/src/stores/help-agent-store.ts` | Zustand: 대화 이력, 스트리밍 상태 |

### Sprint 96 (마일스톤 2): F266

**목표**: HITL 인터랙션 패널
**변경 범위**: 스킬 실행 결과 연동 + 인라인 패널

| 작업 | 파일 | 설명 |
|------|------|------|
| HITL 패널 컴포넌트 | `web/src/components/feature/discovery/HitlReviewPanel.tsx` | 사이드 드로어, 승인/수정/재생성/거부 |
| HITL 서비스 | `api/src/services/hitl-review-service.ts` | 리뷰 기록 + 산출물 상태 전환 |
| HITL 라우트 | `api/src/routes/hitl-review.ts` | POST /hitl/review, GET /hitl/history |
| D1 마이그레이션 0079 | `api/src/db/migrations/0079_hitl_reviews.sql` | hitl_artifact_reviews 테이블 |
| 위저드 통합 | 기존 DiscoveryWizard 확장 | 각 단계에서 실행 → 결과 → HITL 패널 흐름 연결 |

### Sprint 97 (통합 + QA + 데모)

**목표**: 전체 통합 + E2E + 팀 데모
**변경 범위**: E2E 테스트 + 배포 + 데모 준비

| 작업 | 설명 |
|------|------|
| E2E 테스트 | 위저드 흐름, Help Agent 질의, HITL 승인 시나리오 |
| Help Agent PoC 검증 | 대표 시나리오 10건 테스트, 만족도 측정 |
| 점진적 롤아웃 | Feature Flag로 2명 먼저 배포 |
| 팀 데모 | 전체 흐름 시연 + 피드백 수집 |

## 의존성

```
F263 (위저드 UI)     ← F241, F258, F262
F264 (Help Agent)    ← F57(SSE), F260(스킬 실행), OpenRouter API Key
F265 (온보딩)        ← F252, F263 (같은 Sprint)
F266 (HITL)          ← F260, F261, F263

Sprint 94: F263 + F265 (병렬)
Sprint 95+96: F264 + F266 (병렬 — 코드 의존 없음, merge 시 충돌 2건 해결)
Sprint 97: 통합 QA + 데모 (94~96 모두 merge 후)
```

## 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| OpenRouter 응답 품질 | Help Agent 핵심 가치 훼손 | PoC 10건 사전 검증, Hybrid 처리로 단순 질문은 로컬 응답 |
| 2주 1인 체제 | 일정 초과 | Sprint 95를 버퍼로 활용, 최악 시 F266 2차 이관 |
| SSE 연결 불안정 | UX 저하 | Polling 폴백 구현 (P2이지만 Sprint 93에 최소 구현) |
| 데이터 보안 정책 미승인 | 착수 차단 | Sprint 92 초반에 BD팀 리드와 사전 확인 |

## 성공 기준 (MVP)

- [ ] 4가지 Must Have 기능(F263~F266) 모두 동작
- [ ] AX BD팀 대상 데모 완료
- [ ] 1건 이상의 biz-item을 위저드로 시작~2단계까지 진행 가능
- [ ] Help Agent PoC: 10건 중 8건 만족
