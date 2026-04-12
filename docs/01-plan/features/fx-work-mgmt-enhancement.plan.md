# fx-work-mgmt-enhancement Planning Document

> **Summary**: Foundry-X 프로젝트 관리 체계 개선 — Blueprint/Roadmap 독립 + SPEC 경량화 + 기존 데이터 시각화 + TDD
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: Draft
> **Phase**: 36 (F512~F515, FX-REQ-535~538)
> **PRD**: `docs/specs/fx-work-mgmt-enhancement/prd-final.md`

---

## 1. Overview

### 1.1 Purpose

SPEC.md 1,377줄 과부하, F-item 3단계 상태 한계, 문서 비대화(400파일), Work Management API 테스트 부재를 해결한다. "Jira를 만들지 않는다" — 기존 Git/SPEC.md SSOT 철학을 유지하면서 문서 구조 정비 + 기존 데이터 시각화 + 자동화 연결로 개선한다.

### 1.2 Background

Phase 33(F509 Work Management Observability) + Phase 34(F510 멀티 에이전트 세션 표준화) + Phase 35(F511 품질 보강)을 거치면서 관찰(Observe) 체계는 갖춰졌으나, 큰 그림 파악과 장기 건강성 유지에 구조적 한계가 드러났다. 특히:
- SPEC.md가 만능 문서가 되면서 §6 Execution Plan만 841줄(61%) 차지
- docs/ 하위 활성 파일 ~400개 중 Phase 1~29 산출물이 아카이브 없이 누적
- F-item 상태가 ✅/🔧/📋 3단계뿐이라 중간 흐름 파악 불가
- work.service.ts 핵심 로직(snapshot/context/classify)에 단위 테스트 0개

### 1.3 Related Documents

- PRD: `docs/specs/fx-work-mgmt-enhancement/prd-final.md` (3-AI 검토 R2 76/100, Ambiguity 0.087)
- 원본 계획서: `docs/specs/work-management-enhancement-plan.md` (v2.1)
- F509 PRD: `docs/specs/fx-work-observability/prd-v1.md`
- F510 PRD: `docs/specs/fx-multi-agent-session/prd-final.md`

---

## 2. Scope

### 2.1 In Scope

**Phase A — 문서 체계 정비 + 아카이브 (meta-only, 코드 변경 0건)**
- [ ] A-0: 기존 16개 파서/스크립트 영향도 분석 + 테스트 보강 (regression catch coverage 80%+)
- [ ] A-1: BLUEPRINT.md v1.0 — 비전, 아키텍처 개요, Phase 전체 맵
- [ ] A-2: ROADMAP.md v1.0 — 현재 위치, 단기/중기/장기 계���
- [ ] A-3: SPEC.md 경량화 — §1·§4→Blueprint, §3 미래→Roadmap, §7~§9→adr/
- [ ] A-4: SPEC.md §6 아카이브 (841줄→링크 1줄)
- [ ] A-5: SPEC.md §2 아카이브 (최근 5 Sprint만 유지)
- [ ] A-6: docs/ 산출물 아카이브 (Phase 30 이전→docs/archive/)
- [ ] A-7: F-item 세부 상태 10단계 괄호 표기 적용
- [ ] A-8: Entry/Exit Criteria → .claude/rules/process-lifecycle.md

**Phase B — 기존 데이터 표면화, TDD (코드 변경)**
- [ ] B-0: work.service.test.ts + work.routes.test.ts 신규 ~15 cases (회귀 방지)
- [ ] B-1: GET /api/work/velocity (TDD Red→Green→Refactor)
- [ ] B-2: GET /api/work/phase-progress (TDD)
- [ ] B-3: GET /api/work/backlog-health (TDD)
- [ ] B-4: Pipeline Flow 웹 뷰 + E2E
- [ ] B-5: Velocity + Phase Progress 차트 + E2E

**Phase C — 자동화 연결**
- [ ] C-1: board-sync-spec 세부 상태 파싱 확장
- [ ] C-2: Roadmap 자동 갱신 스크립트
- [ ] C-3: Blueprint 버전 범프 자동화
- [ ] C-4: Phase 아카이브 자동화 (scripts/archive-phase.sh)
- [ ] C-5: CHANGELOG 자동 생성

### 2.2 Out of Scope

- Work Item CRUD / D1 테이블 (Jira 재발명)
- Sprint Board UI 드래그앤드롭 (쓰기 기능)
- CI/CD webhook 새 인프라
- SPEC.md를 DB로 대체
- 장기 백로그 AI 자동 판단 (수동 분기 그루밍)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | F-item | Priority | Status |
|----|-------------|--------|----------|--------|
| FR-01 | BLUEPRINT.md 신규 작성 (비전+아키텍처+Phase맵+의사결정) | F512 | P0 | Pending |
| FR-02 | ROADMAP.md 신규 작성 (현재위치+단기/중기/장기) | F512 | P0 | Pending |
| FR-03 | SPEC.md 경량화 1,377→350줄 (§1·§4·§6·§7~§9 이관/아카이브) | F512 | P0 | Pending |
| FR-04 | docs/ 아카이브 400→100파일 (Phase 30 이전 산출물) | F512 | P0 | Pending |
| FR-05 | F-item 세부 상태 10단계 괄호 표기 (기존 이모지 호환) | F512 | P0 | Pending |
| FR-06 | Entry/Exit Criteria 명문화 (.claude/rules/) | F512 | P0 | Pending |
| FR-07 | work.service.ts 핵심 로직 단위 테스트 ~15건 | F513 | P0 | Pending |
| FR-08 | GET /api/work/velocity API (velocity JSON 파싱) | F513 | P1 | Pending |
| FR-09 | GET /api/work/phase-progress API | F513 | P1 | Pending |
| FR-10 | GET /api/work/backlog-health API (📋 항목 age 경고) | F513 | P1 | Pending |
| FR-11 | Pipeline Flow 웹 뷰 (단계별 F-item 수 시각화) | F514 | P1 | Pending |
| FR-12 | Velocity + Phase Progress 차트 | F514 | P1 | Pending |
| FR-13 | board-sync-spec 세부 상태 파싱 확장 | F515 | P1 | Pending |
| FR-14 | Roadmap/Blueprint 자동 갱신 스크립트 | F515 | P1 | Pending |
| FR-15 | Phase 아카이브 자동화 스크립트 | F515 | P1 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| 문서 경량화 | SPEC.md ≤ 350줄, docs/ 활성 ≤ 100파일 | `wc -l`, `find \| wc -l` |
| 테스트 커버리지 | Work Management API 30건+, regression catch 80%+ | `vitest run` |
| 파서 호환성 | 기존 16개 스크립트 정상 동작 유지 | smoke test |
| 에이전트 효율 | SPEC.md 컨텍스트 토큰 30%+ 감소 | 토큰 카운트 비교 |
| 배포 안정성 | Release roll-back 0건 | 배포 후 2주 모니터링 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] BLUEPRINT.md + ROADMAP.md 작성 완료
- [ ] SPEC.md ≤ 350줄
- [ ] docs/ 활성 파일 ≤ 100개
- [ ] F-item 진행 중 항목에 세부 상태 표기
- [ ] Work Management API 테스트 30건+
- [ ] 웹 대시보드 뷰 4→7개+
- [ ] 좀비 백로그 0건 (F112/F117 승격 또는 폐기)
- [ ] 기존 파서/스크립트 16개 smoke test 전체 통과

### 4.2 Quality Criteria

- [ ] TDD Red→Green→Refactor 사이클 준수 (Phase B 전체)
- [ ] E2E mock-only CI safe (LLM 의존 제거)
- [ ] Hono `app.request()` + D1 mock (`better-sqlite3`) 패턴 준수
- [ ] Zod 스키마 필수 (ESLint `require-zod-schema`)
- [ ] Gap Analysis Match Rate ≥ 90%

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SPEC.md 파서/스크립트 호환성 파괴 (16개) | High | Medium | A-0 테스트 보강 선행. 변경 전 smoke test. Dual Operation 1주 |
| Cloudflare Workers 환경 제약 (shell 불가, 파일 접근 불가) | Medium | High | Phase B 전 PoC. GitHub Raw API + D1 캐시 아키텍처 |
| 문서 아카이브 링크 깨짐 | Medium | Medium | INDEX.md 리다이렉트 + 심볼릭 링크 또는 redirect 스크립트 |
| 1인 체계 병목 (6 Sprint, A+B+C 직렬) | Medium | Medium | Phase A는 meta-only 즉시 착수. C-4는 A 직후 병행 가능 |
| AI agent 의존 작업 신뢰도 | Low | Medium | 주요 자동화 manual fallback 준비. 테스트로 검증 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

기존 Foundry-X 모노리포(cli/api/web/shared) 구조 유지. 새 패키지 추가 없음.

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 데이터 소스 | SPEC.md (SSOT) + GitHub Raw + velocity JSON | "Git이 진실" 철학. D1은 캐시만 |
| API 설계 | 엔드포인트별 분리 (/velocity, /phase-progress, /backlog-health) | 기존 F509 패턴 유지. 통합 endpoint는 Phase C에서 검토 |
| Workers 파일 접근 | GitHub Raw API fetch | Workers에서 로컬 파일/shell 실행 불가 |
| phase-progress | GitHub Actions JSON 캐시 → API 조회 | Workers에서 sh 실행 불가. 오픈 이슈 #4 |
| 테스트 프레임워크 | Vitest + Hono app.request() + better-sqlite3 | 기존 프로젝트 표준 (testing.md) |
| 웹 차트 | 라이브러리 미확정 (Canvas/SVG 경량 라이브러리 또는 직접 구현) | Phase B-5에서 결정 |

### 6.3 변경 영향 범위

```
Phase A (meta-only):
  SPEC.md ←→ 16개 파서/스크립트 (board-sync-spec.sh 등)
  docs/ ←→ docs/INDEX.md 자동 생성 (gov-doc)
  docs/ ←→ 에이전트 컨텍스트 로딩 (CLAUDE.md 참조 경로)

Phase B (코드 변경):
  packages/api/src/services/work.service.ts  — 기존 + 신규 함수
  packages/api/src/routes/work.ts            — 기존 + 신규 엔드포인트
  packages/web/src/routes/work-management.tsx — 기존 + 신규 탭/뷰
  packages/api/src/__tests__/work.*.test.ts  — 신규 테스트
  packages/web/e2e/work-management.spec.ts   — E2E 확장

Phase C (스크립트):
  scripts/board/board-sync-spec.sh — 파싱 로직 수정
  scripts/roadmap-update.sh        — 신규
  scripts/blueprint-bump.sh        — 신규
  scripts/archive-phase.sh         — 신규
```

---

## 7. Implementation Order

### 7.1 Phase A — 즉시 착수 (meta-only, master 직접 commit)

```
A-0 (파서 테스트 보강, 선행 필수)
 ├── A-1 (BLUEPRINT.md) + A-2 (ROADMAP.md) — 신규 문서, 파서 무관
 ├── A-7 (F-item 세부 상태) — A-0 테스트 통과 후
 ├── A-3 (SPEC 경량화) — A-0 + A-1/A-2 의존
 ├── A-4 + A-5 (SPEC §2·§6 아카이브)
 ├── A-6 (docs/ 아카이브)
 └── A-8 (Entry/Exit Criteria)
```

### 7.2 Phase B — Sprint 264~265 (PR + auto-merge)

```
B-0 (기존 테스트 보강, 선행 필수) — Sprint 264
 ├── B-1 (velocity API, TDD)
 ├─�� B-2 (phase-progress API, TDD)
 ├── B-3 (backlog-health API, TDD)
 └── B-4 + B-5 (웹 뷰 + E2E) — Sprint 265
```

### 7.3 Phase C — Sprint 266 (PR + auto-merge)

```
C-4 (아카이브 자동화) — A 직후 착수 가능
C-1 (board-sync-spec 파서) — A-7 의존
C-2 + C-3 (Roadmap/Blueprint 자동화) — A-1/A-2 의존
C-5 (CHANGELOG 자동 생성) — 독립
```

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`/pdca design fx-work-mgmt-enhancement`)
2. [ ] Phase A-0 파서 테스트 보강 착수 (F512 즉시 시작 가능)
3. [ ] SPEC.md + CLAUDE.md 커밋+push (Phase 36 등록분)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-12 | PRD v2 기반 초안. Phase A/B/C 3단계, F512~F515, FX-REQ-535~538 | Sinclair + Claude |
