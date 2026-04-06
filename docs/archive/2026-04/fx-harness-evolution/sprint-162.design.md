---
code: FX-DSGN-S162
title: "Sprint 162 — 세션 내 Rule 승인 플로우 (F359) Design"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S162]], [[FX-SPEC-001]], [[FX-DSGN-S161]]"
---

# Sprint 162: 세션 내 Rule 승인 플로우 (F359) Design

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F359 세션 내 Rule 승인 플로우 — 승인 배치 API + 감사 로그 |
| Sprint | 162 |
| 예상 변경 | API 3파일 신규 + 2파일 수정, Shared 1파일 수정, 테스트 2파일 수정/신규 |
| D1 마이그레이션 | 없음 (guard_rail_proposals 테이블은 Sprint 161에서 생성 완료) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Rule 초안이 D1에 pending으로 존재하지만, 승인→파일 배치 경로가 없음 |
| Solution | Deploy 서비스(Rule 파일 포맷 생성) + Deploy API + session-start 통합 플로우 |
| Function UX Effect | 세션 시작 시 "새 Rule N건" → 근거 확인 → 승인 → .claude/rules/ 자동 배치 |
| Core Value | 데이터→패턴→Rule→승인→배치 자가 발전 루프 완성 |

## 2. Architecture

### 2.1 시퀀스 다이어그램

```
/ax:session-start (Step 4b)
  │
  ├── GET /api/guard-rail/proposals?status=pending
  │     │
  │     └─ 0건 → "Rule 제안 없음" → 기존 플로우 계속
  │     └─ N건 → AskUserQuestion
  │           │
  │           ├─ "전체 승인"
  │           ├─ "개별 검토" → 순차 표시
  │           ├─ "나중에" → pending 유지
  │           └─ 각 승인 시:
  │                │
  │                ├─ PATCH /api/guard-rail/proposals/:id
  │                │     { status: "approved", reviewedBy: "user" }
  │                │
  │                └─ POST /api/guard-rail/proposals/:id/deploy
  │                      │
  │                      ▼
  │                    GuardRailDeployService.generateRuleFile(proposal)
  │                      │
  │                      ▼
  │                    { filename, content } → session-start가 Write 도구로 저장
```

### 2.2 컴포넌트 구조

```
packages/
├── shared/src/
│   └── guard-rail.ts          # DeployResult 타입 추가
├── api/src/
│   ├── services/
│   │   └── guard-rail-deploy-service.ts  # [NEW] Rule 파일 생성 로직
│   ├── schemas/
│   │   └── guard-rail-schema.ts          # [MOD] DeployRequest/Response 추가
│   ├── routes/
│   │   └── guard-rail.ts                 # [MOD] POST deploy 엔드포인트 추가
│   └── __tests__/
│       ├── guard-rail-routes.test.ts     # [MOD] deploy 테스트 추가
│       └── guard-rail-deploy.test.ts     # [NEW] 배치 서비스 단위 테스트
```

## 3. Detailed Design

### 3.1 GuardRailDeployService (신규)

**파일**: `packages/api/src/services/guard-rail-deploy-service.ts`

```typescript
export class GuardRailDeployService {
  constructor(private db: D1Database) {}

  /** 승인된 proposal을 Rule 파일 컨텐츠로 변환 */
  async generateRuleFile(proposalId: string, tenantId: string): Promise<DeployResult>

  /** proposal 조회 + 상태 검증 (approved만 deploy 가능) */
  private async getApprovedProposal(proposalId: string, tenantId: string): Promise<GuardRailProposal>

  /** Rule 파일명 결정 — 기존 auto-guard-*.md 중 최대 번호 + 1 */
  private async nextRuleNumber(tenantId: string): Promise<number>

  /** YAML frontmatter + Rule 본문 + 근거 조합 */
  private formatRuleContent(proposal: GuardRailProposal, ruleNumber: number): string
}
```

**메서드 상세**:

`generateRuleFile`:
1. `getApprovedProposal(proposalId, tenantId)` — status !== 'approved'면 에러
2. `nextRuleNumber(tenantId)` — DB에서 approved proposals 수 기반
3. `formatRuleContent(proposal, num)` — YAML frontmatter + body
4. guard_rail_proposals에 deployed_filename 갱신 (정보 추적용)
5. `{ filename: "auto-guard-{NNN}.md", content: "..." }` 반환

`formatRuleContent` 출력 포맷:
```markdown
---
source: auto-generated
pattern_id: {proposal.patternId}
generated_at: {proposal.createdAt}
approved_at: {proposal.reviewedAt}
llm_model: {proposal.llmModel}
---

{proposal.ruleContent}

## 근거

{proposal.rationale}
```

### 3.2 스키마 추가

**파일**: `packages/api/src/schemas/guard-rail-schema.ts`

```typescript
// POST /guard-rail/proposals/:id/deploy — 응답
export const DeployResultSchema = z.object({
  filename: z.string(),
  content: z.string(),
  proposalId: z.string(),
  patternId: z.string(),
});
```

### 3.3 라우트 추가

**파일**: `packages/api/src/routes/guard-rail.ts`

```
POST /guard-rail/proposals/:id/deploy
  - params: { id: string }
  - response 200: DeployResultSchema
  - response 404: { error: "Proposal not found" }
  - response 400: { error: "Only approved proposals can be deployed" }
```

로직:
1. `GuardRailDeployService.generateRuleFile(id, tenantId)` 호출
2. 200으로 `{ filename, content, proposalId, patternId }` 반환
3. 실제 파일 생성은 클라이언트(session-start)가 Write 도구로 수행

### 3.4 Shared 타입 추가

**파일**: `packages/shared/src/guard-rail.ts`

```typescript
/** F359: Rule 배치 결과 */
export interface DeployResult {
  filename: string;
  content: string;
  proposalId: string;
  patternId: string;
}
```

### 3.5 기존 PATCH 라우트 보완

Sprint 161 PATCH `/guard-rail/proposals/:id`는 이미 동작하지만, Sprint 162에서 보완:
- `modified` 상태일 때 `ruleContent` 필수 검증 추가
- 응답에 `ruleFilename` 포함 확인

## 4. Test Plan

### 4.1 GuardRailDeployService 단위 테스트

**파일**: `packages/api/src/__tests__/guard-rail-deploy.test.ts`

| # | 테스트 | 검증 |
|---|--------|------|
| T1 | approved proposal → generateRuleFile 성공 | filename, content 형식 |
| T2 | pending proposal → deploy 거부 | 에러 메시지 |
| T3 | rejected proposal → deploy 거부 | 에러 메시지 |
| T4 | 존재하지 않는 ID → 404 | 에러 메시지 |
| T5 | 파일명 순번 — 이미 2개 approved 존재 시 003 | 번호 정확성 |
| T6 | formatRuleContent — YAML frontmatter 포함 | frontmatter 키 존재 |
| T7 | formatRuleContent — 근거 섹션 포함 | rationale 포함 |

### 4.2 라우트 통합 테스트

**파일**: `packages/api/src/__tests__/guard-rail-routes.test.ts` (기존 파일 확장)

| # | 테스트 | 검증 |
|---|--------|------|
| T8 | POST /guard-rail/proposals/:id/deploy — approved → 200 | filename, content |
| T9 | POST /guard-rail/proposals/:id/deploy — pending → 400 | 에러 |
| T10 | POST /guard-rail/proposals/:id/deploy — 존재하지 않음 → 404 | 에러 |
| T11 | PATCH → approved + deploy → filename 일관성 | 동일 proposal |

## 5. Implementation Checklist

| # | 파일 | 작업 | LOC |
|---|------|------|-----|
| 1 | `packages/shared/src/guard-rail.ts` | DeployResult 인터페이스 추가 | ~10 |
| 2 | `packages/api/src/schemas/guard-rail-schema.ts` | DeployResultSchema 추가 | ~10 |
| 3 | `packages/api/src/services/guard-rail-deploy-service.ts` | [NEW] 배치 서비스 | ~80 |
| 4 | `packages/api/src/routes/guard-rail.ts` | POST deploy 엔드포인트 추가 | ~40 |
| 5 | `packages/api/src/__tests__/guard-rail-deploy.test.ts` | [NEW] 배치 서비스 단위 테스트 | ~120 |
| 6 | `packages/api/src/__tests__/guard-rail-routes.test.ts` | deploy 라우트 통합 테스트 추가 | ~60 |

**총 예상**: ~320 LOC, 파일 6개 (신규 2 + 수정 4)

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Rule 파일명 번호 충돌 (동시 승인 시) | DB COUNT 기반 + UUID fallback |
| 긴 ruleContent가 파일 포맷 깨뜨림 | YAML frontmatter와 본문 분리, 특수문자 이스케이프 불필요 (markdown) |
| session-start 스킬 수정은 별도 PR | 이번 Sprint는 API만 — 스킬 통합은 ax plugin 업데이트로 분리 |

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-06 | Initial — Deploy 서비스 + API + 테스트 설계 | Sinclair Seo |
