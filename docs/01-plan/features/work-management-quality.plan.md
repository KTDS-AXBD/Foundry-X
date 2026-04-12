# Plan: F511 Work Management 품질 보강

> Phase 35 · Sprint 263 · FX-REQ-534 · P1

## 1. 배경 및 목적

F509(Walking Skeleton, Sprint 261)과 F510(멀티 에이전트 세션, Sprint 262)이 autopilot으로 빠르게 구현됐지만, 프로덕션 점검에서 다음 품질 이슈가 발견됨:

| 발견 시점 | 이슈 | 심각도 | 상태 |
|-----------|------|--------|------|
| S264 점검 | `/api/work/*` 401 Unauthorized — plain fetch에 JWT 누락 | P0 | ✅ PR #514 핫픽스 완료 |
| S264 점검 | `/api/work/sessions` 500 — D1 agent_sessions 스키마 불일치 (Sprint 8 구 스키마) | P0 | ✅ 수동 D1 DROP+재생성 |
| S264 점검 | sidebar에서 작업 현황 진입 불가 — admin-core 그룹 (admin 전용) | P1 | ✅ PR #515 topItems 이동 |
| S264 분석 | `syncSessions` SQL injection 위험 — string interpolation | P1 | 📋 F511 |
| S264 분석 | E2E edge case 미커버 — 빈 세션/에러/polling | P2 | 📋 F511 |
| S264 분석 | `getSessions` ORDER BY 의도 불명확 | P3 | 📋 F511 |

**목적**: Walking Skeleton의 "동작은 하지만 취약한" 상태를 production-grade로 끌어올리기.

## 2. 스코프

### In-Scope (Must)

| ID | 항목 | 설명 | 수정 대상 |
|----|------|------|----------|
| G1 | API 에러 핸들링 UI | 401/500 시 fallback 메시지 + 재시도 버튼. 현재 silent catch | `work-management.tsx` |
| T1 | Sessions E2E edge case | 빈 세션 목록, API 에러 fallback, 상태 전환 (busy→idle→done) | `work-management.spec.ts` |
| T2 | Sessions polling E2E | 5초 polling 갱신 검증 (`waitForResponse` 패턴) | `work-management.spec.ts` |
| T3 | syncSessions SQL 안전성 | `activeNames` string interpolation → prepared statement bind 교체 | `work.service.ts` |
| T4 | getSessions ORDER BY 정교화 | `status ASC` → `CASE WHEN` 명시적 순서 (busy→idle→done) + unit test | `work.service.ts`, `work-sessions.test.ts` |

### Out-of-Scope

- Burndown chart (별도 F-item 후보)
- 편집 UI (PRD Out-of-scope 유지)
- WebSocket 전환 (CF Workers 제약, 복잡도 높음)
- 0126 migration 파일 수정 (이미 remote 적용 완료, IF NOT EXISTS 함정은 문서화만)

## 3. 기술 설계 요약

### G1: 에러 핸들링 UI

```
fetchApi<T>() 호출
  ├─ 성공 → 기존 렌더링
  └─ 실패 (catch)
       ├─ ApiError(401) → "로그인이 필요해요" + 로그인 링크
       ├─ ApiError(500) → "서버 오류가 발생했어요" + 재시도 버튼
       └─ NetworkError → "네트워크 연결을 확인해주세요" + 재시도 버튼
```

### T3: SQL Injection 방어

**Before** (위험):
```ts
const activeNames = input.sessions.map(s => `'${s.name.replace(/'/g, "''")}'`).join(",");
await this.env.DB.prepare(`DELETE FROM agent_sessions WHERE id NOT IN (${activeNames})`).run();
```

**After** (안전):
```ts
// D1은 ? placeholder만 지원, IN 절에 동적 개수 바인딩
const placeholders = input.sessions.map(() => "?").join(",");
await this.env.DB.prepare(
  `DELETE FROM agent_sessions WHERE id NOT IN (${placeholders})`
).bind(...input.sessions.map(s => s.name)).run();
```

### T4: ORDER BY 명시적 순서

```sql
ORDER BY CASE status
  WHEN 'busy' THEN 0
  WHEN 'idle' THEN 1
  WHEN 'done' THEN 2
  ELSE 3
END, last_activity DESC
```

## 4. 구현 순서

```
T3 (SQL 방어) → T4 (ORDER BY) → G1 (에러 UI) → T1 (E2E edge) → T2 (polling E2E)
```

1. **T3+T4**: API 서비스 수정 (unit test 포함, TDD Red→Green)
2. **G1**: 에러 핸들링 UI 컴포넌트 추가
3. **T1+T2**: E2E 테스트 보강

## 5. 선행 조건

- [x] PR #514 merged (401 핫픽스)
- [x] PR #515 merged (sidebar topItems 이동)
- [x] D1 agent_sessions 스키마 재생성 완료
- [ ] SPEC.md F511 등록 ✅ (FX-REQ-534, Sprint 263, 📋)

## 6. 성공 기준

- [ ] `/work-management` 4탭 모두 정상 데이터 로드 (인증된 사용자)
- [ ] API 에러 시 사용자에게 의미 있는 메시지 표시
- [ ] `syncSessions`에서 SQL injection 불가
- [ ] E2E work-management 테스트 10건+ (현재 6건 → 4건 이상 추가)
- [ ] Gap Analysis ≥ 90%

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| D1 IN 절 placeholder 개수 제한 | 세션 수가 수십 개 미만이라 실질적 위험 없음 |
| polling E2E flaky | `waitForResponse` + `expect.poll()` 패턴으로 안정화 |
| 0126 migration IF NOT EXISTS 함정 재발 | feedback memory에 문서화, 향후 migration은 ALTER/DROP 패턴 사용 |
