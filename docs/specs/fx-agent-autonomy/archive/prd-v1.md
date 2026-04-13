# fx-agent-autonomy PRD

**버전:** v1
**날짜:** 2026-04-13
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Sprint autopilot이 생성한 Feature의 E2E 테스트를 자동 생성하고, Gap Analysis에 E2E 결과를 통합하여 "코드 구조 일치 + 실제 동작 검증"을 하나의 품질 점수로 보장하는 시스템.

**배경:**
Foundry-X는 Phase 39까지 39개 Phase, 523+ F-items를 AI 에이전트 기반 autopilot으로 개발해왔다. Gap Analysis Match Rate(Design↔Code 일치율)가 90%+ 기준으로 품질을 판단하지만, 이는 "코드 구조가 설계와 일치하는가"만 검증할 뿐 "실제로 브라우저에서 동작하는가"는 보장하지 않는다. 현재 E2E 273건은 수동으로 작성/유지되며, 새 Feature 추가 시 자동 확장되지 않아 커버리지 격차가 누적되고 있다.

**목표:**
Feature 개발 시 Design 문서에서 E2E 시나리오를 자동 추출하고, Gap Analysis에 E2E 결과를 포함하여 종합 품질 점수를 산출함으로써, autopilot의 품질 보장을 "구조 일치"에서 "동작 검증"까지 확장한다.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- Gap Analysis는 Design 문서의 파일 매핑 vs 실제 코드 존재 여부만 비교 (구조적 일치)
- E2E 테스트는 수동으로 작성하며, `/ax:e2e-audit`가 커버리지 갭을 감지하지만 자동 생성하지 않음
- Sprint autopilot 완료 후 E2E 추가는 별도 수동 작업으로, 종종 누락됨
- Gap 97% PASS → 프로덕션 배포 → E2E 미커버 영역에서 리그레션 발생 가능

### 2.2 목표 상태 (To-Be)
- Design 문서의 §5 파일 매핑 + §4 기능 명세에서 E2E 시나리오를 자동 추출
- Sprint autopilot의 Verify 단계에서 E2E 생성 + 실행이 자동 포함
- Gap Analysis 보고서에 E2E PASS/FAIL 결과가 반영되어 종합 Match Rate 산출
- 새 Feature = 자동으로 E2E 커버리지 확장

### 2.3 시급성
- Phase 39 완료로 10개 패키지, 11 routes, 30 services 규모 — 수동 E2E 관리의 한계점 도달
- MSA 분리(fx-gateway, fx-discovery)로 크로스 서비스 E2E 필요성 증가
- 누적 기능이 많아질수록 리그레션 리스크 가속

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| AI 에이전트 운영자 (개발자) | 1인 개발, WSL2 + Claude Code CLI + tmux | Sprint 완료 시 E2E까지 자동 완료, 수동 개입 최소화 |

### 3.2 사용 환경
- 기기: WSL2 Linux (Ubuntu 24.04)
- 네트워크: 인터넷
- 기술 수준: 시니어 개발자
- 도구: Claude Code, Playwright, Vitest, tmux, Sprint Worktree

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1 | E2E 시나리오 자동 추출 | Design 문서(§4 기능 명세 + §5 파일 매핑)에서 E2E 테스트 시나리오를 자동 생성. Playwright spec 파일로 출력 | P0 |
| M2 | Gap-E2E 통합 점수 | Gap Analysis에 E2E 결과(PASS/FAIL/SKIP 건수)를 포함하여 종합 Match Rate 산출. 기존 구조 일치율 + E2E 통과율의 가중 평균 | P0 |
| M3 | autopilot Verify 통합 | Sprint autopilot의 Verify 단계(`/ax:sprint-autopilot` Step 5~6)에 E2E 생성+실행을 자동 삽입 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| S1 | E2E 커버리지 리포트 | Feature별 E2E 커버리지를 route/API 매트릭스로 시각화. `/ax:e2e-audit coverage`와 통합 | P1 |
| S2 | 자동 아카이브 | Sprint 완료 시 docs/ 중간 산출물 자동 아카이브 (Phase 36-A 미완료 항목 연결) | P2 |

### 4.3 제외 범위 (Out of Scope)
- **Sprint 자율 선택**: autopilot이 다음 Sprint을 스스로 선택하는 기능 — 사람이 Sprint을 지정하는 현재 방식 유지
- **외부 CI 연동**: GitHub Actions에서의 E2E 실행 자동화 — 현재 로컬 실행 기반 유지
- **크로스 서비스 E2E**: MSA 간 통합 E2E — Phase 39 범위가 아직 Walking Skeleton 수준

### 4.4 외부 연동
| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Playwright | CLI 실행 (pnpm e2e) | 필수 |
| Gap Analysis (bkit:gap-detector) | 보고서 포맷 확장 | 필수 |
| Design 문서 (docs/02-design/) | §4+§5 파싱 | 필수 |
| Sprint autopilot (ax skill) | Step 삽입 | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| E2E 자동 생성율 | 0% (수동) | 80%+ (새 Feature당 자동 생성) | Sprint 완료 시 자동 생성 E2E / 전체 신규 E2E |
| Gap + E2E 종합 점수 | Gap만 (구조 일치) | Gap×0.6 + E2E×0.4 가중 평균 | Gap Analysis 보고서 |
| 수동 E2E 작성 빈도 | Sprint마다 수동 | Sprint 2회 중 1회 이하 | 수동 e2e commit 횟수 추적 |

### 5.2 MVP 최소 기준
- [ ] Design 문서에서 E2E 시나리오 3개 이상 자동 추출
- [ ] 추출된 시나리오로 Playwright spec 파일 생성 → 실행 → PASS
- [ ] Gap Analysis 보고서에 E2E 결과 행이 포함됨

### 5.3 실패/중단 조건
- Design 문서 포맷이 너무 다양해서 파싱 신뢰도 60% 미만인 경우
- 자동 생성된 E2E가 50% 이상 flaky한 경우

---

## 6. 제약 조건

### 6.1 일정
- 목표: 1~2 Sprint (Sprint 278~279)
- M1+M2를 Sprint 278에, M3를 Sprint 279에 배치 예상

### 6.2 기술 스택
- 프론트엔드 E2E: Playwright (기존)
- API 테스트: Vitest + Hono app.request() (기존)
- 인프라: 변경 없음 (로컬 실행 기반)
- 기존 시스템 의존: ax 스킬셋, bkit gap-detector, Design 문서 포맷

### 6.3 인력/예산
- 1인 개발 + AI 에이전트 autopilot
- 추가 비용 없음

### 6.4 컴플라이언스
- 해당 없음 (내부 도구)

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Design 문서 §4 기능 명세 포맷이 Phase마다 다름 — 파싱 전략 결정 필요 | Sinclair | Sprint 278 Plan |
| 2 | Gap-E2E 통합 점수의 가중치 비율(0.6:0.4) 적정성 검증 | Sinclair | Sprint 278 Design |
| 3 | 자동 생성 E2E의 assertion 수준 — smoke vs functional 기준 | Sinclair | Sprint 278 Design |
| 4 | MSA 분리 후 크로스 서비스 E2E 필요 시점 판단 | Sinclair | Phase 41+ |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-13 | 최초 작성 (인터뷰 기반) | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
