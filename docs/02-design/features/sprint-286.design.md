# Sprint 286 Design — F533 MetaAgent 실전 검증

> 작성일: 2026-04-14 | Sprint: 286

## §1 배경

F530 (Sprint 283)에서 MetaAgent 인프라를 구현했다. F533은 "실전 검증" — 발굴 Graph 실행 후 MetaAgent full loop이 실제로 동작함을 E2E로 증명한다.

## §2 설계 결정

### D2-1: ProposalApplyService — yamlDiff 반영 전략

`yamlDiff`는 LLM이 생성한 자유 형식 텍스트이므로 완전한 파싱 대신 **타입별 필드 매핑** 전략을 사용한다.

| proposal.type | 반영 대상 | DB 업데이트 |
|--------------|----------|-------------|
| `prompt` | `agent_marketplace_items.system_prompt` | UPDATE WHERE role_id = agentId |
| `model` | `agent_marketplace_items.preferred_model` | UPDATE WHERE role_id = agentId |
| `tool` | `agent_marketplace_items.allowed_tools` | 목록 추가 (JSON array merge) |
| `graph` | 기록만 (D1 연동 없음) | 없음 |

**이유**: LLM-generated yamlDiff는 형식이 일정하지 않으므로 파싱보다 semantic 매핑이 안정적이다.

### D2-2: applied_at 컬럼 추가 (새 migration)

`agent_improvement_proposals.applied_at TEXT` 추가로 반영 여부를 추적한다.
`status` CHECK 제약 변경 없이 `approved + applied_at IS NOT NULL`로 판정한다.

**이유**: SQLite ALTER TABLE은 CHECK 제약 수정을 지원하지 않아 테이블 재생성이 필요하다. `applied_at` 컬럼 추가가 더 단순하다.

### D2-3: 테스트 시나리오 — 발굴 Graph 실행 시뮬레이션

실제 LLM 호출 없이 `agent_run_metrics`에 seed 데이터를 삽입하여 발굴 Graph 1회 실행을 시뮬레이션한다. Anthropic API는 `vi.stubGlobal("fetch", ...)` mock으로 대체.

## §3 API 설계

### 신규 엔드포인트: POST /api/meta/proposals/:id/apply

```
POST /api/meta/proposals/:id/apply

요청: (body 없음)

응답 200:
{
  "proposal": { ...ImprovementProposal, appliedAt: "ISO8601" }
}

응답 404: { "error": "Proposal not found: {id}" }
응답 422: { "error": "Proposal must be approved before applying. Current status: {status}" }
응답 409: { "error": "Proposal already applied at {appliedAt}" }
```

## §4 테스트 계약 (TDD Red Target)

### API Integration (meta-agent-full-loop.test.ts)

```
F533 MetaAgent Full Loop Integration
  ✓ 발굴 Graph 실행 시뮬레이션 → agent_run_metrics 2행 시드
  ✓ POST /api/meta/diagnose → report(6축) + proposals 반환
  ✓ GET /api/meta/proposals → 생성된 proposals 조회
  ✓ POST /api/meta/proposals/:id/approve → status=approved
  ✓ POST /api/meta/proposals/:id/apply → applied_at 기록됨
  ✓ 미승인 proposal apply → 422
  ✓ 이미 반영된 proposal apply → 409
  ✓ 없는 ID apply → 404
```

### E2E (meta-agent.spec.ts)

```
Agent Meta Dashboard
  ✓ 진단 폼 렌더링 확인
  ✓ 세션 ID 없으면 진단 실행 버튼 비활성화 (UX 방어)
  ✓ 진단 실행 → 6축 결과 표시
  ✓ 승인 버튼 클릭 → 상태 approved로 변경
  ✓ 거부 폼 → 사유 입력 → rejected 상태
  ✓ 필터 탭 (전체/대기중/승인/거부) 동작
```

## §5 파일 매핑

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0134_proposal_applied_at.sql` | applied_at 컬럼 추가 |
| `packages/api/src/core/agent/services/proposal-apply.ts` | ProposalApplyService (신규) + 커스텀 Error 3종 (`AlreadyAppliedError`, `NotApprovedError`, `ProposalNotFoundError`) |
| `packages/api/src/core/agent/routes/meta.ts` | POST /meta/proposals/:id/apply 추가 |
| `packages/api/src/__tests__/integration/meta-agent-full-loop.test.ts` | Integration 테스트 (신규) |
| `packages/web/e2e/meta-agent.spec.ts` | E2E 테스트 (신규) |
