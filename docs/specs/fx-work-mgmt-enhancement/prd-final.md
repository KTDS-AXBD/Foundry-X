# Foundry-X Work Management Enhancement PRD

**버전:** final  

**날짜:** 2026-04-12  
**작성자:** AX BD팀  
**상태:** ✅ 착수 준비 완료  
**원본 계획서:** `docs/specs/work-management-enhancement-plan.md` (v2.1)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**  
Foundry-X 프로젝트 관리 체계를 문서 구조 정비 + 기존 데이터 시각화 + 자동화 연결로 개선하여, 1인 AI-native 개발 환경에서 "큰 그림 파악 → 실시간 진행 추적 → 장기 건강성 유지"를 한 곳에서 가능하게 한다.

**배경:**  
Foundry-X는 33개 Phase, 509개 F-item, 16개 자동화 스크립트를 운영하는 성숙한 프로젝트이다. 그러나 SPEC.md가 1,377줄짜리 만능 문서가 되면서 큰 그림 파악이 어렵고, F-item 상태가 3단계(완료/진행/대기)로 거칠며, 관찰은 있으나 관리 행위는 Git 수동 편집에 의존하고, 완료된 Phase 산출물이 아카이브 없이 누적되어 탐색 비용이 증가하고 있다.

<!-- CHANGED: 문제-해결-측정의 세부 연결성 및 실질 효과 설명 강화 -->
**문제-해결-측정 연결:**  
문서 구조 분리와 F-item 세부 상태 도입은 정보 탐색 및 업무 결정 시간을 단축하고, 실시간 진행 흐름과 병목(Blocker) 발생을 대시보드로 가시화함으로써 생산성 향상, 의사결정 신속화, 회귀 리스크 예방에 기여한다. KPI로는 SPEC 경량화/적용률 외에 평균 cycle time, blocker 발생률, release roll-back 빈도, regression catch coverage 등 실제 품질·생산성 효과를 추가로 계측한다.

<!-- CHANGED: 사용자 페르소나의 행동 변화에 대한 가설 및 질적 효과 명시 -->
**행동 변화 가설:**  
문서 구조 분리와 경량화는 1인+AI 체계에서 온보딩 속도 단축, 일간 업무(작업 전환/진행 추적) 효율화, AI 프롬프트 컨텍스트 정확도 상승 등 작업 흐름에 질적 변화를 유발한다. 예를 들어 신규 합류자/에이전트는 Blueprint 한 문서로 전체 맥락을 즉시 파악하며, AI task worker는 토큰 효율이 개선되어 prompt 정확도가 향상된다.

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

<!-- CHANGED: 문제-해결-측정의 세부 연결성 및 행동 변화/품질 효과 Recap 표기 -->
- Blueprint 1문서로 "이 프로젝트가 무엇이고 어디로 가는가" 즉시 파악 → 신규 사용자/에이전트 온보딩 소요 감소(예상: 2시간→30분)
- Roadmap 1문서로 "현재 위치 + 단기/중기/장기 계획" 시간축 파악 → 작업 전환·우선순위 결정 시간 감소
- SPEC.md는 §2 상태 + §5 F-items만 담는 린(lean) 문서 (~350줄) → 토큰/탐색 비용 감소, 프롬프트 정확도 개선
- F-item에 10단계 세부 상태(idea/groomed/plan/design/impl/review/test/blocked/deployed/dropped) 표기 → Blocker 평균 지속 시간, 단계별 평균 cycle time 추적 가능
- 웹 대시보드에 Pipeline Flow, Velocity Chart, Phase Progress, Backlog Health, Recent Decisions 뷰 추가 → 실시간 병목·진행률 가시화
- Work Management API에 단위 테스트 30건 이상 (현재 sessions 7건, snapshot/context/classify 0건) → Regression catch coverage 80% 이상 목표, bug rate 감소
- Phase 완료 시 자동 아카이브로 docs/ 활성 파일 100개 이하 유지 → 에이전트 컨텍스트 관리 비용 최소화

### 2.3 시급성

- 에이전트 컨텍스트 효율: SPEC.md 1,377줄 + docs/ 400파일이 매 세션 토큰 비용과 탐색 시간에 직접 영향
- Phase 34 완료(S263) 후 다음 대규모 작업 전 문서 체계 정비가 기술 부채 해소의 적기
- F509 테스트 부재 상태에서 API 확장 시 회귀 리스크 누적

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| 개발자 (Self) | 1인 AI-native 개발자, Opus/Sonnet 에이전트 병렬 활용 | 현재 상태 한눈에 파악, 다음 작업 즉시 결정, SPEC 편집 최소화, 장애 발생 즉시 감지/복구 |
| Claude 에이전트 | Sprint autopilot, task worker 등 AI 에이전트 | 최소 토큰으로 프로젝트 컨텍스트 파악, 정확한 상태 정보 접근, 상태 변화/구조 변경에 대한 backward compatibility 보장 |
| 미래 팀원 | 합류 가능한 개발자/PM | Blueprint 1문서로 프로젝트 전체상 파악, 온보딩 시간 최소화, 문서/자동화 구조 변경 시 migration guide 제공 |
| 보고 수신자 | 경영진/이해관계자 | 진행 현황 대시보드로 비동기 확인, 구조 변경 소식/에러/운영 이슈에 대한 자동 알림 수신 |

<!-- CHANGED: 사용자 행동 변화에 대한 가설 및 시나리오 명시 -->
#### 예상 행동 변화(가설)
- 신규 합류자는 Blueprint 한 문서로 온보딩 시간을 대폭 단축(2시간→30분)
- AI agent는 SPEC.md 경량화로 컨텍스트 토큰 소비 30% 이상 감소
- F-item 세부 상태로 Blocker, Review, Test 등 병목을 실시간 탐지
- 구조 변경 시 migration guide/notice에 따라 기존 스크립트/에이전트 혼란 최소화

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

| M7 | F509 핵심 로직 테스트 보강 (B-0) | work.service.test.ts(snapshot/context/classify) + work.routes.test.ts 신규 ~15 test cases. sessions 7건은 F511에서 추가됨. Regression catch coverage 80% 이상, 주요 유즈케이스 시나리오 기반 Smoke/Sanity 테스트 포함 | A | P0 |

<!-- CHANGED: Change Management/Communication Plan, 데이터 마이그레이션/검증, Monitoring/Alerting 추가 (별도 섹션에 상세) -->

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

| 평균 F-item cycle time | N/A | 20% 단축 | 상태 진입/이탈 로그 기반 산출 |
| Blocker 발생률/평균 지속시간 | N/A | 도입 후 월별 추이 감시, 목표: Blocker 발생시 평균 48h 이내 해소 | 세부 상태 변화 로그 |
| Regression catch coverage | N/A | 80% 이상 | 커버리지 리포트, 주요 유즈케이스 smoke/sanity test |
| Release roll-back 빈도 | N/A | 0건 | 배포 후 2주 이내 롤백 발생 건수 |
| Bug rate (production) | N/A | 기존 대비 30% 감소 | 배포 후 issue/bug report 건수 |

### 5.2 MVP 최소 기준

- [ ] BLUEPRINT.md v1.0 + ROADMAP.md v1.0 작성 완료
- [ ] SPEC.md 350줄 이하로 경량화
- [ ] docs/ 활성 파일 100개 이하 (아카이브 완료)
- [ ] F-item 진행 중 항목에 세부 상태 괄호 표기 적용

- [ ] Regression catch coverage 80% 이상, 모든 주요 유즈케이스 시나리오 smoke/sanity test 통과
- [ ] 에이전트/웹/스크립트 자동화 smoke test 통과 (구조 변경 후 파서/스크립트/AI agent 동작 정상 확인)
- [ ] 주요 자동화(아카이브, 상태 표기, 문서 갱신 등) 실패 시 알림 및 롤백 기능 정상 동작 검증

### 5.3 실패/중단 조건

- SPEC.md 경량화 시 기존 파서(board-sync-spec.sh 등) 16개 스크립트 중 3개 이상 파손 → 경량화 범위 축소
- 아카이브 이동 후 에이전트가 기존 경로 참조 실패 빈발 → INDEX.md redirect 보완 또는 롤백
- Phase B API 추가 시 기존 E2E 5건 중 2건 이상 회귀 → B-0 테스트 보강 선행 범위 확대
- <!-- CHANGED: 운영 장애/롤백 조건 명확화 및 모니터링/알림 Failure 추가 -->
- 문서 구조/상태 변경 후 1주 내 주요 파서/에이전트/자동화 기능 장애 발생 및 24h 내 복구 실패 → 즉시 롤백
- 자동화/스크립트 장애 발생 시 알림 미발생 또는 로그 미기록 → 운영 모니터링/알림 체계 전면 재점검

---

## 6. 제약 조건

### 6.1 일정

- **Phase A** (문서 정비 + 아카이브): 즉시 착수, 5세션 예상, 코드 변경 0건  

  - A-0(파서/자동화 테스트 보강, regression catch coverage 80% 이상) 선행 완료 후 A-1~A-8 단계적 진행
  - 구조 변경 PoC/검증/롤백 플랜 문서화 및 사전 시연 필수
- **Phase B** (데이터 표면화, TDD): 2~3 Sprint (Phase A 이후)
  - 시작 전 Cloudflare Workers 환경 제약 PoC, 기술 검증, 자동화 리다이렉트 스크립트 선행 구현
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

- 과업 집중으로 인한 일정 지연/품질 저하/Burnout 리스크 지속 모니터링
- AI agent 의존 작업(테스트/문서/자동화 등)의 신뢰도, 복구/대체 플랜 마련

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

| 7 | 구조 변경 후 파서/스크립트/에이전트 동작 무중단 보장 위한 smoke/sanity test 및 영향도 분석 체크리스트 작성 | Sinclair | Phase A-0 |
| 8 | 문서/아카이브 경로 변경 시 데이터 마이그레이션 및 링크/참조 무결성 검증(Validation Checklist) | Sinclair | Phase A |
| 9 | 자동화/스크립트 장애 발생 감지, 알림 전송, 로그 기록 체계 설계 및 검증 | Sinclair | Phase A-B |
| 10 | 구조 변경/상태 세분화/아카이브 등 도입 시 Migration Guide, 사용자/에이전트/자동화 대상 Communication Plan 작성 | Sinclair | Phase A |
| 11 | 롤백 플랜(문서/파서/자동화/상태 등) 구체화 및 실제 시나리오별 복구 시연 | Sinclair | Phase A |
| 12 | Release Readiness(테스트 커버리지, smoke/sanity, 자동화 정상동작) 최종 체크리스트 운영 | Sinclair | Phase B 완료 직전 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 계획서 v2.1 기반 PRD 변환. Phase A(문서)/B(API+TDD)/C(자동화) 3단계 구조 | - |
| R1 | 2026-04-12 | 3-AI 검토 (ChatGPT:Conditional, Gemini:Ready, DeepSeek:Conditional). 77/100 | 77 |
| R1→v2 | 2026-04-12 | 문제-해결-측정 연결, 행동 변화 가설, 품질 KPI, Change Management, Migration, Monitoring, Quality Gate 추가 (16건 반영) | - |
| R2 | 2026-04-12 | 3-AI 검토 (전원 Conditional). Ambiguity 0.087. 조건은 모두 "A-0 선행" 실행 순서 조정 | 76 |
| Final | 2026-04-12 | v2 확정. Conditional 조건(A-0 테스트 선행, 롤백 플랜)은 Phase A에 반영 완료 | 착수 확정 |
---

<!-- CHANGED: Change Management/Communication Plan, 데이터 마이그레이션/검증, Monitoring/Alerting, Quality Gate/Release Readiness Criteria, 영향도 분석/롤백 플랜 등 신규 섹션 추가 -->

## 9. Change Management & Communication Plan

### 9.1 Migration Guide & Backward Compatibility

- 구조 변경(문서/상태/아카이브) 시점에 맞춰 AI agent, 자동화 스크립트, 미래 팀원이 기존/신규 구조를 모두 인식할 수 있는 Migration Guide 제공
- 주요 변경점, deprecated 경로, 신규 상태 표기법, 영향받는 자동화/스크립트 목록, 예시/FAQ 포함
- 변경 이력 및 Notice를 README/Docs/Slack 등 채널로 배포

### 9.2 Communication Plan

- 구조/상태 변경, 자동화 신규 배포, 장애 발생 시 즉시 알림(이메일/Slack/Docs notice 등)
- 미래 합류자·AI agent 대상 버전 범프/구조 변경 이력 자동 요약 및 공지
- 주요 자동화(아카이브, 상태 표기, 문서 갱신 등) 실패 시 알림 및 롤백 안내

### 9.3 Rollback Plan

- 문서 구조/파서/스크립트/상태 변경 시, 1주간 Dual Operation(변경 전/후 동시 지원) 후 완전 전환
- 장애 발생 시 24h 내 즉시 롤백(이전 문서/스크립트 복구, 파서 revert, 자동화 disable 등)
- 롤백 시 Checklist(참조 무결성, 에이전트/스크립트 정상 동작, 데이터 무손실) 기반 검증

---

## 10. 데이터 마이그레이션/검증

- 아카이브/경로 변경/상태 표기 개선 등 구조 전환 시, 데이터 이전·링크·참조 무결성(Validation Checklist) 작성·점검
- 1) 사전 Dry Run으로 자동화/스크립트/에이전트 동작 정상 확인  
2) 이전 후 주요 문서/자동화/에이전트 대상 smoke/sanity test  
3) 미이관/참조 오류 발생 시 즉시 복구 플랜 실행

---

## 11. Monitoring/Alerting/Operation

- API/자동화/스크립트/문서 갱신 자동화에 대해  
1) 장애 감지(health check/smoke test),  
2) log 기록(에러/변경/실패 시점),  
3) 알림(이메일/Slack/Docs notice) 체계 구축
- 장애 발생 시  
1) 24h 내 복구 목표,  
2) 장애 이력 기록·분석,  
3) 반복 장애 시 근본 원인/프로세스 개선

---

## 12. Quality Gate/Release Readiness Criteria

- 배포 전 전체 테스트 커버리지 80% 이상, regression catch coverage 80% 이상
- 모든 주요 유즈케이스 smoke/sanity test(에이전트/웹/스크립트/자동화 포함) 통과
- 자동화/스크립트/문서 갱신·아카이브 등 구조 변경 후 1주간 모니터링(장애 0건 목표)
- Release readiness checklist 운영(커버리지, smoke, migration, 알림 등)

---

## 13. 영향도 분석 및 AI/자동화 연동

- 파서/스크립트/AI agent가 새 문서 구조/상태 표기를 정상 인식할 수 있도록  
1) 영향도 분석 체크리스트,  
2) 구조 변경 전후 smoke/sanity test,  
3) 자동화 대상 backward compatibility layer(필요시) 제공
- 신규 구조 도입 후 1주간 장애/이상징후 실시간 모니터링, 문제 발견 시 즉시 롤백

---

## 14. 주요 리스크 및 대응 방안

| 리스크 | 내용 | 대응 방안 |
|--------|------|-----------|
| 문제-해결-측정 연결 미흡 | F-item 세부 상태, 구조 변경이 실제 생산성/품질에 미치는 영향 불명확 | 실질 KPI(평균 cycle time, blocker 발생률 등) 도입 및 월간 리뷰 |
| 사용자 행동 변화 불확실 | 구조 분리/경량화가 실제 작업 흐름 개선에 미치는 질적 효과 미확인 | 온보딩/작업전환/AI 컨텍스트 변화 계측, 체험 Feedback 수집 |
| 테스트 보강 미흡 | 구조변경 병행 시 회귀 리스크, bug/rollback 증가 | A-0 선행, 커버리지 80% 달성 후 진행, Smoke/Sanity Test 필수 |
| 문서 파편화/파서 장애 | 경량화/아카이브/상태 세분화가 기존 자동화/에이전트/스크립트와 미호환 | Dual Operation, 영향 분석, 롤백 플랜, INDEX.md redirect 등 |
| 데이터 마이그레이션 오류 | 경로/상태/문서 변경 시 데이터/링크 손실 | Dry Run, Validation Checklist, 즉시 복구 프로세스 |
| Monitoring/Alerting 부재 | 자동화 실패, 장애 발생 시 인지/복구 지연 | Health check, log, 알림 시스템 선제 구축 |
| 1인 체계 병목 | 일정 지연/품질 저하/Burnout 리스크 | 일정 관리, AI agent 신뢰도 검증, 업무 분산 방안 검토 |
| AI agent 의존도 | 자동화/테스트 등 AI 신뢰도 미확보 | 주요 자동화/테스트 인간 manual fallback/rollback 플랜 |
| 운영장애 대응력 약화 | 장애 발생시 즉각적 원인 파악/복구 미흡 | 장애 이력 관리, 복구 메뉴얼, 24h내 롤백 기준 |
| 기술적 실현 가능성 | Cloudflare Workers 환경 제약 등 | B-0/A-0 PoC 선행, 리다이렉트 스크립트, 아키텍처 검증 |
| 시장/트렌드 Out-of-scope | 본 PRD는 내부 도구 최적화에 집중, 외부 PM SaaS 확장 등은 별도 검토 | Out-of-scope로 명시 |

---

## 15. Out-of-scope

- Work Item CRUD, D1 테이블 기반 Jira 대체 등 외부 SaaS 수준의 PM 기능
- Sprint Board UI 드래그앤드롭, 외부 CI/CD, SPEC.md DB화 등
- AI-Native PM 솔루션으로서의 시장 확장성/표준화, IT 시장 트렌드 반영  

- 내부 도구 최적화 외부 SaaS화 등은 본 PRD 범위 외

---

## 부록: Phase 실행 계획 요약

### Phase A: 문서 체계 정비 + 아카이브 (즉시, 코드 변경 없음, 5세션)

| 항목 | 작업 | 산출물 |
|------|------|--------|
| A-0 | 파서/자동화 테스트/PoC/롤백 플랜 | regression catch coverage 80% 이상, 영향도 분석, 복구 시연 |
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
| B-0 | 기존 F509 테스트 보강 (~15 cases) | Regression catch coverage 80% 이상, Smoke/Sanity 포함 |
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

---