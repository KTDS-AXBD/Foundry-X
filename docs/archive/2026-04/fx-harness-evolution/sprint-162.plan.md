---
code: FX-PLAN-S162
title: "Sprint 162 — 세션 내 Rule 승인 플로우"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S161]], fx-harness-evolution/prd-final.md"
---

# Sprint 162: 세션 내 Rule 승인 플로우

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F359 세션 내 Rule 승인 플로우 |
| Sprint | 162 |
| 우선순위 | P0 |
| 의존성 | Sprint 161 (F357+F358) — PatternDetector + RuleGenerator + guard_rail_proposals 테이블 |
| Phase | 17 — Self-Evolving Harness v2 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Rule 초안이 D1에 생성되지만 사람이 승인/배치하는 경로가 없음 |
| Solution | `/ax:session-start`에 통합된 승인 플로우 — 알림 → 검토 → 승인/거부 → 자동 배치 |
| Function UX Effect | 세션 시작 시 "새 Rule 제안 N건" 알림 → 근거 확인 → 한 번에 승인 → 즉시 적용 |
| Core Value | 데이터→Rule→에이전트 행동 변화 루프 완성. "인간은 판사" 원칙 유지 |

---

## 1. Overview

### 1.1 Purpose

Sprint 161에서 생성된 Guard Rail Rule 초안(guard_rail_proposals)을 세션 시작 시 사용자에게 제안하고, 승인된 Rule을 `.claude/rules/`에 자동 배치하는 플로우를 구축한다. 이것으로 "데이터 → 패턴 감지 → Rule 생성 → 승인 → 배치 → 에이전트 준수" 자가 발전 루프가 완성된다.

### 1.2 Background

- **PRD M4**: 세션 내 승인 플로우 — `/ax:session-start`에 통합
- **인터뷰 결과**: CLI/세션 내 프롬프트 방식 선택. 대시보드/PR 없이 가벼운 방식
- **전략 문서 원칙 3**: "인간은 판사, 시스템은 변호사" — 최종 배치 권한은 사람

### 1.3 Related Documents

- PRD: `docs/specs/fx-harness-evolution/prd-final.md` (§4.1 M4)
- Sprint 161 Plan: `docs/01-plan/features/sprint-161.plan.md`
- session-start 스킬: `~/.claude/plugins/marketplaces/ax-marketplace/skills/session-start/SKILL.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] session-start Step 4 확장 — guard_rail_proposals에서 pending 상태 Rule 조회
- [ ] AskUserQuestion 기반 승인 플로우 UI — 각 Rule의 내용·근거 표시 + 승인/거부/수정
- [ ] 승인된 Rule → `.claude/rules/auto-guard-{NNN}.md` 파일 자동 생성
- [ ] guard_rail_proposals 상태 갱신 (pending → approved/rejected/modified)
- [ ] 감사 로그 — 승인/거부 이력을 guard_rail_proposals.reviewed_at, reviewed_by에 기록
- [ ] Rule 배치 후 "N건 적용 완료" 안내 메시지
- [ ] API: PATCH /guard-rail/proposals/:id (상태 변경 + 수정된 내용 저장)
- [ ] API: POST /guard-rail/proposals/:id/deploy (승인 후 파일 배치 트리거)

### 2.2 Out of Scope

- 웹 대시보드 UI (CLI 전용)
- 다중 승인자 (단일 승인자 — Sinclair Seo)
- Rule 충돌 감지 (Sprint 164+ S5)
- Rule 효과 측정 (Sprint 164 F361)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | session-start에서 pending proposals 조회 (GET /guard-rail/proposals?status=pending) | High | Pending |
| FR-02 | pending 0건이면 "Rule 제안 없음" 표시 후 기존 플로우 진행 | High | Pending |
| FR-03 | pending N건이면 AskUserQuestion으로 각 Rule 요약 표시 + 승인/거부/수정/전체스킵 옵션 | High | Pending |
| FR-04 | 승인 시 `.claude/rules/auto-guard-{NNN}.md` 파일 생성 (Write 도구) | High | Pending |
| FR-05 | 수정 시 사용자 입력을 반영한 수정본으로 파일 생성 | Medium | Pending |
| FR-06 | 거부 시 guard_rail_proposals.status = 'rejected' + reviewed_at 기록 | High | Pending |
| FR-07 | Rule 파일에 YAML frontmatter 포함 (source, pattern_id, generated_at, approved_at) | High | Pending |
| FR-08 | 배치 완료 후 "N건 Rule 적용 완료 — 다음 세션부터 에이전트가 자동 준수" 안내 | Medium | Pending |
| FR-09 | PATCH /guard-rail/proposals/:id API — status 변경 + 수정 내용 저장 | High | Pending |
| FR-10 | Rule 파일 네이밍: 기존 auto-guard-*.md 중 최대 번호 + 1 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| UX | 승인 플로우 3건 이하일 때 30초 내 완료 | 수동 확인 |
| Reliability | 파일 생성 실패 시 graceful error (DB 상태는 롤백) | 단위 테스트 |
| Security | .claude/rules/ 외 경로에 파일 생성 차단 | 경로 검증 로직 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] session-start에서 pending proposals 감지 → AskUserQuestion 승인 플로우 동작
- [ ] 승인된 Rule이 `.claude/rules/auto-guard-{NNN}.md`로 정상 생성
- [ ] guard_rail_proposals 상태가 정확히 갱신 (approved/rejected/modified + reviewed_at)
- [ ] API 라우트 2개 동작 (PATCH proposals/:id, POST proposals/:id/deploy)
- [ ] 단위 테스트 pass

### 4.2 Quality Criteria

- [ ] Zero lint errors
- [ ] TypeScript strict mode 통과
- [ ] session-start 통합 테스트 (pending 0건, 1건, 다건)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| session-start 스킬 수정 범위 과대 | Medium | Medium | Step 4에 조건부 호출만 추가. 핵심 로직은 별도 함수로 분리 |
| AskUserQuestion 옵션 수 제한 (max 4) | Low | Certain | Rule 3건 이상이면 "전체 목록 보기" 옵션으로 순차 표시 |
| .claude/rules/ 파일 생성 권한 | Low | Low | Write 도구 사용 — CC 세션 내에서 항상 가능. PreToolUse hook에 auto-guard-* 예외 추가 |
| 수정 모드 UX 복잡도 | Medium | Medium | MVP에서는 수정 = 사용자가 직접 텍스트 입력. 에디터 연동은 후속 |

---

## 6. Architecture Considerations

### 6.1 session-start 통합 설계

```
/ax:session-start 실행
  ↓
Step 1~3: 기존 로직 (MEMORY, SPEC, git status)
  ↓
Step 4: F항목 감지 (기존)
  ↓
Step 4b: Guard Rail 제안 확인 (신규)
  │
  ├─ GET /guard-rail/proposals?status=pending
  │
  ├─ 0건 → "Rule 제안 없음" → Step 5로
  │
  └─ N건 → AskUserQuestion
       │
       ├─ "전체 승인" → 각 Rule 파일 생성 + status=approved
       ├─ "개별 검토" → 순차 표시 → 승인/거부/수정
       ├─ "나중에" → 스킵 (pending 유지)
       └─ 각 승인 → Write(.claude/rules/auto-guard-{NNN}.md)
                   → PATCH proposals/:id {status: 'approved'}
  ↓
Step 5~6: 기존 로직 (Pane Baseline, 세션 안내)
```

### 6.2 Rule 파일 포맷

```markdown
---
source: auto-generated
pattern_id: fp_xxxxx
generated_at: 2026-04-06T10:30:00Z
approved_at: 2026-04-06T10:35:00Z
llm_model: haiku
occurrence_count: 12
---

# {Rule 제목}

{Rule 본문 — Claude Code 에이전트가 준수할 규칙}

## 근거

- 패턴: {source}:{severity} 조합에서 {N}회 반복 실패 감지
- 기간: {first_seen} ~ {last_seen}
- 대표 사례: {sample payloads 요약}
```

### 6.3 기존 코드 활용

| 컴포넌트 | 파일 경로 | 활용 방식 |
|----------|----------|-----------|
| session-start SKILL.md | `~/.claude/plugins/.../session-start/SKILL.md` | Step 4b 로직 추가 위치 |
| guard_rail_proposals (D1) | Sprint 161에서 생성 | pending 조회 + 상태 갱신 |
| AskUserQuestion | CC 빌트인 도구 | 승인 플로우 UI |
| Write | CC 빌트인 도구 | .claude/rules/ 파일 생성 |

### 6.4 API 엔드포인트 추가

| Method | Path | 설명 |
|--------|------|------|
| PATCH | `/guard-rail/proposals/:id` | 상태 변경 (approved/rejected/modified) + reviewed_at/by |
| POST | `/guard-rail/proposals/:id/deploy` | 승인된 Rule을 파일로 배치 (서버사이드 옵션) |

> **참고**: 실제 파일 생성은 CLI 세션에서 Write 도구로 수행하는 것이 더 자연스러움.
> deploy API는 웹 대시보드에서 배치할 때를 대비한 선행 작업.

---

## 7. 작업 목록

| # | 영역 | 파일 | 작업 내용 |
|---|------|------|-----------|
| 1 | Shared | `shared/src/guard-rail.ts` | ProposalStatus enum 추가 (pending/approved/rejected/modified) |
| 2 | Schema | `api/src/schemas/guard-rail-schema.ts` | ProposalUpdateRequest, DeployRequest Zod 추가 |
| 3 | Service | `api/src/services/guard-rail-deploy-service.ts` | Rule 파일 포맷 생성 + 파일명 결정 로직 |
| 4 | Route | `api/src/routes/guard-rail.ts` | PATCH proposals/:id + POST proposals/:id/deploy 추가 |
| 5 | Skill | session-start SKILL.md Step 4b | Guard Rail 제안 확인 로직 추가 |
| 6 | Test | `api/src/__tests__/guard-rail-deploy.test.ts` | 배치 서비스 단위 테스트 |
| 7 | Test | `api/src/__tests__/guard-rail-routes.test.ts` | PATCH + POST 라우트 테스트 추가 |

---

## 8. Implementation Order

```
1. shared/src/guard-rail.ts          — ProposalStatus enum 추가
2. schemas/guard-rail-schema.ts      — Zod 스키마 추가
3. services/guard-rail-deploy-service.ts — Rule 파일 포맷 + 파일명 로직
4. routes/guard-rail.ts              — PATCH + POST 엔드포인트
5. session-start SKILL.md            — Step 4b 승인 플로우
6. tests (2파일)                     — 단위 + 라우트 테스트
```

---

## 9. Next Steps

1. [ ] Sprint 161 merge 완료 후 착수
2. [ ] Design 문서 작성 (`sprint-162.design.md`)
3. [ ] Sprint 163 Plan 작성 (O-G-D 범용화)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial draft — PRD M4 + session-start 통합 설계 | Sinclair Seo |
