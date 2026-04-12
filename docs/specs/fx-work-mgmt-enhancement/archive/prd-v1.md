# Foundry-X Work Management Enhancement PRD

**버전:** v1  
**날짜:** 2026-04-12  
**작성자:** AX BD팀  
**상태:** 검토 중  
**원본 계획서:** `docs/specs/work-management-enhancement-plan.md` (v2.1)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**  
Foundry-X 프로젝트 관리 체계를 문서 구조 정비 + 기존 데이터 시각화 + 자동화 연결로 개선하여, 1인 AI-native 개발 환경에서 "큰 그림 파악 → 실시간 진행 추적 → 장기 건강성 유지"를 한 곳에서 가능하게 한다.

**배경:**  
Foundry-X는 33개 Phase, 509개 F-item, 16개 자동화 스크립트를 운영하는 성숙한 프로젝트이다. 그러나 SPEC.md가 1,377줄짜리 만능 문서가 되면서 큰 그림 파악이 어렵고, F-item 상태가 3단계(완료/진행/대기)로 거칠며, 관찰은 있으나 관리 행위는 Git 수동 편집에 의존하고, 완료된 Phase 산출물이 아카이브 없이 누적되어 탐색 비용이 증가하고 있다.

**목표:**  
- Blueprint/Roadmap 독립 문서로 큰 그림을 상시 현행화
- SPEC.md를 1,377줄에서 350줄 이하로 경량화
- F-item 세부 상태 도입으로 실시간 흐름 파악
- 기존 데이터(velocity, phase-progress, backlog)를 웹에서 시각화
- 완료 Phase 산출물 아카이브로 docs/ 활성 파일 400개 → 100개 이하

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

- **SPEC.md 과부하**: 1,377줄, §6 Execution Plan만 841줄(61%). 프로젝트 개요·마일스톤·KPI·기능 등록·상태 추적이 한 파일에 혼재
- **F-item 상태 3단계만 존재**: ✅/🔧/📋 — "설계 중", "PR 대기", "블록됨" 등 중간 상태 없음. `shared/task-state.ts`에 10-상태 머신이 있지만 SPEC.md/웹 UI와 미연결
- **관찰만 가능, 관리 불가**: F509 Walking Skeleton으로 스냅샷/분류/컨텍스트 조회는 가능하나, 웹에서 작업 생성/상태 전이/Sprint 배정 행위 불가
- **문서 비대화**: docs/ 하위 활성 파일 ~400개, Phase 1~29 산출물이 아카이브 없이 잔존. 에이전트 컨텍스트 로딩 시 불필요한 토큰 소비
- **Work Management API 테스트 부족**: work-sessions.test.ts 7건 + E2E 6건이 존재하나, work.service.ts(snapshot/context/classify) 핵심 로직에 단위 테스트 0개. 회귀 리스크

### 2.2 목표 상태 (To-Be)

- Blueprint 1문서로 "이 프로젝트가 무엇이고 어디로 가는가" 즉시 파악
- Roadmap 1문서로 "현재 위치 + 단기/중기/장기 계획" 시간축 파악
- SPEC.md는 §2 상태 + §5 F-items만 담는 린(lean) 문서 (~350줄)
- F-item에 10단계 세부 상태(idea/groomed/plan/design/impl/review/test/blocked/deployed/dropped) 표기
- 웹 대시보드에 Pipeline Flow, Velocity Chart, Phase Progress, Backlog Health, Recent Decisions 뷰 추가
- Work Management API에 단위 테스트 30건 이상 (현재 sessions 7건, snapshot/context/classify 0건)
- Phase 완료 시 자동 아카이브로 docs/ 활성 파일 100개 이하 유지

### 2.3 시급성

- 에이전트 컨텍스트 효율: SPEC.md 1,377줄 + docs/ 400파일이 매 세션 토큰 비용과 탐색 시간에 직접 영향
- Phase 34 완료(S263) 후 다음 대규모 작업 전 문서 체계 정비가 기술 부채 해소의 적기
- F509 테스트 부재 상태에서 API 확장 시 회귀 리스크 누적

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| 개발자 (Self) | 1인 AI-native 개발자, Opus/Sonnet 에이전트 병렬 활용 | 현재 상태 한눈에 파악, 다음 작업 즉시 결정, SPEC 편집 최소화 |
| Claude 에이전트 | Sprint autopilot, task worker 등 AI 에이전트 | 최소 토큰으로 프로젝트 컨텍스트 파악, 정확한 상태 정보 접근 |
| 미래 팀원 | 합류 가능한 개발자/PM | Blueprint 1문서로 프로젝트 전체상 파악, 온보딩 시간 최소화 |
| 보고 수신자 | 경영진/이해관계자 | 진행 현황 대시보드로 비동기 확인 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair Seo | 개발자 겸 PM (1인) | 높음 |
| AX BD팀 리더 | 프로젝트 방향 승인 | 중간 |

### 3.3 사용 환경
- 기기: PC (WSL2 터미널 + 웹 브라우저)
- 네트워크: 인터넷 (Cloudflare Workers/Pages)
- 기술 수준: 개발자 + AI 에이전트

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | Phase | 우선순위 |
|---|------|------|-------|----------|
| M1 | Blueprint 문서 | docs/BLUEPRINT.md — 비전, 아키텍처 개요, Phase 전체 맵, 핵심 의사결정 요약. Phase 완료 시 버전 범프 | A | P0 |
| M2 | Roadmap 문서 | docs/ROADMAP.md — 현재 위치, 단기/중기/장기 계획, 의존관계. Sprint 완료 시 갱신 | A | P0 |
| M3 | SPEC.md 경량화 | §1·§4 → Blueprint, §3(미래) → Roadmap, §6 아카이브, §7~§9 → adr/. 목표 350줄 이하 | A | P0 |
| M4 | 문서 아카이브 | SPEC.md §2·§6 아카이브 + docs/ Phase 30 이전 산출물 → docs/archive/. 활성 파일 100개 이하 | A | P0 |
| M5 | F-item 세부 상태 | 기존 ✅/🔧/📋 유지 + 괄호 세부 상태(idea/groomed/plan/design/impl/review/test/blocked/deployed/dropped) | A | P0 |
| M6 | 프로세스 Entry/Exit Criteria | Idea→Planning→Design→Impl→Verify→Done 단계별 진입/퇴장 조건 명문화 → .claude/rules/ | A | P0 |
| M7 | F509 핵심 로직 테스트 보강 (B-0) | work.service.test.ts(snapshot/context/classify) + work.routes.test.ts 신규 ~15 test cases. sessions 7건은 F511에서 추가됨 | B | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | Phase | 우선순위 |
|---|------|------|-------|----------|
| S1 | Velocity API + 뷰 (B-1) | GET /api/work/velocity — docs/metrics/velocity/*.json 파싱. TDD Red→Green | B | P1 |
| S2 | Phase Progress API + 뷰 (B-2) | GET /api/work/phase-progress — phase-progress.sh 결과 노출. TDD | B | P1 |
| S3 | Backlog Health API + 뷰 (B-3) | GET /api/work/backlog-health — 📋 항목 age 경고. TDD | B | P1 |
| S4 | Pipeline Flow 뷰 (B-4) | 웹에서 Idea→Plan→Design→Impl→Verify→Done 단계별 F-item 수 시각화 + E2E | B | P1 |
| S5 | Velocity + Phase Progress 차트 (B-5) | 웹 차트 컴포넌트 + E2E 테스트 | B | P1 |
| S6 | board-sync-spec 세부 상태 파싱 (C-1) | 기존 스크립트가 괄호 세부 상태를 인식하도록 확장 | C | P1 |
| S7 | Roadmap 자동 갱신 (C-2) | Sprint 완료 시 ROADMAP.md 현재 위치 자동 갱신 스크립트 | C | P1 |
| S8 | Blueprint 버전 범프 (C-3) | Phase 완료 시 BLUEPRINT.md 버전 자동 범프 | C | P1 |
| S9 | 아카이브 자동화 (C-4) | scripts/archive-phase.sh — Phase 완료 시 자동 아카이브 | C | P1 |
| S10 | CHANGELOG 자동 생성 (C-5) | git log + F-item 매핑으로 CHANGELOG.md 자동 생성 | C | P2 |

### 4.3 제외 범위 (Out of Scope)

- **Work Item CRUD / D1 테이블**: Jira 재발명은 하지 않음. "Git이 진실" 철학 유지
- **Sprint Board UI (칸반 드래그앤드롭)**: 이미 F509 Kanban 뷰가 읽기 전용으로 존재. 쓰기 기능은 Git 경유
- **CI/CD webhook 자동 연동**: 기존 deploy.yml이 충분. 새 인프라 추가 없음
- **SPEC.md를 DB로 대체**: SPEC.md는 SSOT로 유지. D1은 캐시/조회 최적화 용도로만
- **장기 백로그 자동 판단**: AI가 F-item 폐기를 자동 결정하지 않음. 분기 1회 수동 그루밍

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| GitHub API | REST (commits, PRs) — 기존 F509 연동 유지 | 필수 |
| SPEC.md (GitHub Raw) | HTTP fetch — 기존 F509 연동 유지 | 필수 |
| docs/metrics/velocity/*.json | 파일 읽기 (Workers fetch 또는 GitHub Raw) | 필수 (S1) |
| scripts/epic/phase-progress.sh | 스크립트 실행 결과 파싱 | 필수 (S2) |
| docs/adr/ | 파일 목록 읽기 (S5 Recent Decisions) | 선택 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| SPEC.md 줄 수 | 1,377줄 | 350줄 이하 | `wc -l SPEC.md` |
| docs/ 활성 파일 수 | ~400개 | 100개 이하 | `find docs -not -path "*/archive/*" -name "*.md" \| wc -l` |
| Work Management API 테스트 수 | 7 (sessions) + 0 (core) | 30건 이상 | `vitest run --reporter=verbose \| grep "✓"` |
| 웹 대시보드 뷰 수 | 4 (Kanban/Context/Classify/Sessions) | 7 이상 | /work-management 탭 수 |
| F-item 세부 상태 적용률 | 0% | 진행 중 항목 100% | 🔧/📋 중 괄호 상태 비율 |
| Blueprint/Roadmap 현행화율 | N/A (미존재) | Phase 완료 1주 내 갱신 | 최신 Phase 반영 여부 |
| 좀비 백로그 (3 Phase+ 미착수) | 2건 (F112, F117) | 0건 | SPEC.md 📋 항목 중 3 Phase 이상 미착수 |

### 5.2 MVP 최소 기준

- [ ] BLUEPRINT.md v1.0 + ROADMAP.md v1.0 작성 완료
- [ ] SPEC.md 350줄 이하로 경량화
- [ ] docs/ 활성 파일 100개 이하 (아카이브 완료)
- [ ] F-item 진행 중 항목에 세부 상태 괄호 표기 적용

### 5.3 실패/중단 조건

- SPEC.md 경량화 시 기존 파서(board-sync-spec.sh 등) 16개 스크립트 중 3개 이상 파손 → 경량화 범위 축소
- 아카이브 이동 후 에이전트가 기존 경로 참조 실패 빈발 → INDEX.md redirect 보완 또는 롤백
- Phase B API 추가 시 기존 E2E 5건 중 2건 이상 회귀 → B-0 테스트 보강 선행 범위 확대

---

## 6. 제약 조건

### 6.1 일정

- **Phase A** (문서 정비 + 아카이브): 즉시 착수, 5세션 예상, 코드 변경 0건
- **Phase B** (데이터 표면화, TDD): 2~3 Sprint (Phase A 이후)
- **Phase C** (자동화 연결): 1 Sprint (Phase B 이후, C-4는 A 직후 가능)
- 목표 완료: Phase A는 즉시, 전체 ~6 Sprint 이내

### 6.2 기술 스택

- 프론트엔드: Vite 8 + React 18 + React Router 7 + Zustand (기존 web 패키지)
- 백엔드: Hono + Cloudflare Workers + D1 (기존 api 패키지)
- 인프라: Cloudflare Workers/Pages, GitHub Actions CI/CD (기존)
- 기존 의존: SPEC.md 파싱, GitHub API, velocity JSON, phase-progress.sh

### 6.3 인력/예산

- 투입: 1인 개발자 + AI 에이전트 (Opus Master + Sonnet Worker)
- 예산: Cloudflare 무료 플랜 내 (Workers/Pages/D1), AI API 비용은 기존 구독 범위

### 6.4 컴플라이언스

- KT DS 내부 정책: 해당 없음 (내부 도구)
- 보안: 기존 JWT + RBAC 유지, 새 API 엔드포인트에도 인증 미들웨어 적용
- 외부 규제: 해당 없음

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | SPEC.md §1/§4를 Blueprint로 이관 시 기존 `/ax:daily-check` 파서 영향 범위 확인 필요 | Sinclair | Phase A 착수 전 |
| 2 | docs/ 아카이브 시 기존 docs/INDEX.md 자동 생성 스크립트(gov-doc)의 경로 참조 호환성 | Sinclair | Phase A |
| 3 | velocity JSON 파일이 Workers에서 접근 가능한지 확인 (현재 로컬 스크립트 생성) | Sinclair | Phase B |
| 4 | phase-progress.sh 결과를 API로 노출하는 방식: Workers에서 직접 실행 불가 → JSON 캐시 또는 GitHub Raw | Sinclair | Phase B |
| 5 | F-item 세부 상태 괄호 표기가 기존 board-sync-spec.sh 정규식에 영향 주는지 테스트 | Sinclair | Phase A |
| 6 | 장기 백로그 F112/F117 폐기 vs 승격 판단 | Sinclair | Phase A (그루밍) |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 계획서 v2.1 기반 PRD 변환. Phase A(문서)/B(API+TDD)/C(자동화) 3단계 구조 | - |

---

## 부록: Phase 실행 계획 요약

### Phase A: 문서 체계 정비 + 아카이브 (즉시, 코드 변경 없음, 5세션)

| 항목 | 작업 | 산출물 |
|------|------|--------|
| A-1 | BLUEPRINT.md v1.0 초안 | docs/BLUEPRINT.md |
| A-2 | ROADMAP.md v1.0 초안 | docs/ROADMAP.md |
| A-3 | SPEC.md 경량화 (§1·§4→Blueprint, §3 미래→Roadmap, §7~§9→adr/) | SPEC.md |
| A-4 | SPEC.md §6 아카이브 (841줄→링크 1줄) | docs/archive/ |
| A-5 | SPEC.md §2 아카이브 (최근 5 Sprint만 유지) | docs/archive/ |
| A-6 | docs/ 산출물 아카이브 (Phase 30 이전) | docs/archive/ |
| A-7 | F-item 세부 상태 괄호 표기 적용 | SPEC.md §5 |
| A-8 | Entry/Exit Criteria 규칙 추가 | .claude/rules/process-lifecycle.md |

### Phase B: 기존 데이터 표면화 — TDD (2~3 Sprint)

| 항목 | 작업 | TDD |
|------|------|-----|
| B-0 | 기존 F509 테스트 보강 (~15 cases) | 회귀 방지 |
| B-1 | GET /api/work/velocity | Red→Green→Refactor |
| B-2 | GET /api/work/phase-progress | Red→Green→Refactor |
| B-3 | GET /api/work/backlog-health | Red→Green→Refactor |
| B-4 | Pipeline Flow 웹 뷰 + E2E | E2E Red→Green |
| B-5 | Velocity + Phase Progress 차트 + E2E | E2E Red→Green |

### Phase C: 자동화 연결 (1 Sprint)

| 항목 | 작업 | 산출물 |
|------|------|--------|
| C-1 | board-sync-spec 세부 상태 파싱 | scripts/board/ |
| C-2 | Roadmap 자동 갱신 스크립트 | scripts/roadmap-update.sh |
| C-3 | Blueprint 버전 범프 자동화 | scripts/blueprint-bump.sh |
| C-4 | Phase 아카이브 자동화 | scripts/archive-phase.sh |
| C-5 | CHANGELOG 자동 생성 | scripts/changelog-gen.sh |

### 의존관계

```
Phase A (문서, 즉시)
  ├──→ Phase B (API+TDD, A 이후)
  │       B-0 → B-1~B-3 → B-4~B-5
  │       └──→ Phase C (자동화, B 이후)
  └──→ C-4 (아카이브 자동화, A 직후 가능)
```

---

*이 문서는 `docs/specs/work-management-enhancement-plan.md` v2.1을 PRD 형식으로 변환한 것입니다.*
*requirements-interview 스킬에 의해 관리됩니다.*
