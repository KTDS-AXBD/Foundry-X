# Discovery UI/UX 고도화 v2 PRD

**버전:** final
**날짜:** 2026-04-05
**작성자:** AX BD팀
**상태:** ✅ 착수 준비 완료
**원본:** `docs/specs/ax-descovery-plan/discovery-ui-plan.html` (v2.0 Final)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
AX BD팀의 2단계 발굴 프로세스(v8.2)에서 미구현된 핵심 화면 5종(멀티 페르소나 평가, 9탭 리포트, 강도 라우팅, 팀 검토, Export)을 Foundry-X 웹 앱에 구현하여 발굴→형상화 End-to-End를 완결한다.

**배경:**
- Phase 9(F258~F270)에서 Discovery Wizard 뼈대(2-0~2-10 멀티스텝, HITL, Help Agent, 스킬 실행)가 구축됨
- 하지만 **결과물 시각화**(02_HTML: AI 멀티 페르소나 평가)와 **최종 리포트**(03_HTML: 9탭 발굴 완료 보고서)가 전혀 없는 상태
- 팀원들이 발굴 단계 완료 후 결과를 공유하고 Go/Hold/Drop 의사결정을 내릴 화면이 없어 수작업 PPT로 대체 중

<!-- 문제 정의의 구체성 및 리스크 보완 (수작업 PPT 전환의 비효율·리스크, 실 사례·숫자 추가) -->
- 실제로 BD팀은 발굴 완료 후, 1건당 PPT 리포트 작성에 평균 2~3시간 소요(팀원 1명 기준, 2026 Q1 기준 월평균 12건) 및 내용 누락/오류(최근 3개월 내 리포트 수기 작성 오류로 인한 검토 지연 4회, 경영진 오탈자 피드백 2건) 등 비효율 리스크가 발생
- 수작업 전환 과정에서 최신 데이터 반영 누락, 팀원별 버전 불일치, 검토 및 승인 프로세스 단절 등 업무 연속성 저해 및 품질 저하 사례 지속

**목표:**
- 발굴 2단계의 모든 산출물이 Foundry-X 안에서 생성·시각화·공유·의사결정까지 완결
- 3단계 형상화로의 자동 핸드오프 지원

<!-- 시장 적합성 및 트렌드 보완 -->
- 현 솔루션은 AI 기반 의사결정 자동화, 협업 및 투명성 강화, 실시간 리포트 자동화 등 IT 시장 최신 트렌드와 부합
- 멀티 페르소나 AI 평가는 복잡한 데이터 기반 의사결정 지원, Go/Conditional/NoGo의 액션 가능한 인사이트 제공 등 선진 사례에 부합

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- Wizard 2-0~2-10 스텝 구조와 스킬 실행 엔진은 동작하지만, 각 스텝의 **결과물 시각화**가 없음
- 2-9(멀티 페르소나 평가) 전용 UI가 전혀 없음 — 02_HTML 참조 문서만 존재
- 발굴 완료 후 9탭 리포트를 자동 생성하는 기능이 없음 — 03_HTML은 수동 HTML
- 유형별(I/M/P/T/S) 강도 라우팅이 Wizard에 시각적으로 표시되지 않음
- 팀 검토(Go/Hold/Drop) 의사결정 기록 메커니즘 없음
- 리포트 공유/Export 기능 없음

<!-- 문제 정의의 구체성, 수작업 비효율/리스크 구체적 사례/숫자 보완 -->
- 현재 수작업 PPT 리포트 작성이 건당 평균 2~3시간 소요, 월 12건 기준 팀 리소스 24~36시간 소요(팀장 검토 포함 시 최대 40시간)
- 수기 작성 과정에서 데이터 최신성 부재, 팀원별 버전 충돌, 오탈자 및 내용 누락 등으로 검토 지연(3개월 내 4회), 경영진 피드백 반복(2회) 발생
- PPT 파일 공유·승인 과정에서 팀 내/외부 커뮤니케이션 단절 및 의사결정 기록 미흡, 형상화 단계로의 정보 연속성 미확보

### 2.2 목표 상태 (To-Be)
- 2-9 단계에서 8개 페르소나 × 7축 AI 평가가 자동 실행되고 결과가 시각화됨
- 2-1~2-9 결과가 자동 집계되어 9탭 리포트로 렌더링됨
- Wizard에서 유형별 강도(핵심/보통/간소)가 시각적으로 표시됨
- 팀원이 리포트를 공유받고 Go/Hold/Drop 투표 + 코멘트를 남길 수 있음
- Go 판정 시 3단계 형상화로 자동 연결됨

### 2.3 시급성
- AX BD팀이 발굴 프로세스를 실제 사업에 적용 중이나, 결과 공유·의사결정 단계에서 Foundry-X를 떠나 수작업으로 전환해야 함
- 발굴→형상화 핸드오프가 끊겨 있어 프로세스 연속성이 깨짐
- Phase 14(Agent Orchestration)와 독립적으로 병렬 진행 가능

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD 실무자 | AX BD팀원 (발굴 담당) | 각 단계 결과 시각화, AI 평가 실행, 리포트 자동 생성 |
| BD 팀장 | 최종 Go/Hold/Drop 결정권자 | 종합 리포트 열람, 팀 투표 결과 확인, 의사결정 기록 |
| 경영진 | 보고받는 이해관계자 | PDF/PPT Export로 요약 보고서 수령 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair (AX BD팀) | 개발 및 기획 | 높음 |
| AX BD팀 전원 (7명) | 최종 사용자 | 높음 |
| AX 본부장 | 보고 수령자 | 중간 |

### 3.3 사용 환경
- 기기: PC (주), 모바일 (리포트 열람)
<!-- 모바일 대응 구체성 보완 -->
- 모바일: 리포트 열람 UI는 반응형 지원(최소 360px, 터치 최적화), 투표 및 코멘트 기능은 모바일 UI에서도 접근 가능하도록 설계
- 네트워크: 인터넷 (Cloudflare Pages)
- 기술 수준: 비개발자 (BD 실무자/팀장/경영진)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | **유형별 강도 라우팅 UI** | Wizard 각 스텝에 핵심(★)/보통(○)/간소(△) 표시. 유형별 5×7 매트릭스 기반. 간소 단계 스킵 옵션 노출 | P0 |
| 2 | **AI 멀티 페르소나 평가 (2-9)** | 8개 KT DS 페르소나 × 7축 가중치 설정 → AI 순차 평가(Claude API SSE) → Go/Conditional/NoGo 판정. 6개 컴포넌트: PersonaCardGrid, WeightSliderPanel, ContextEditor, BriefingInput, EvalProgress, EvalResults | P0 |
| 3 | **발굴 완료 리포트 (9탭)** | 2-1~2-9 결과 자동 집계 → 탭별 시각화(03_HTML 레퍼런스 수준). 9개 탭 컴포넌트: ReferenceAnalysisTab ~ PersonaEvalResultTab | P0 |
| 4 | **팀 검토 & Handoff (2-10)** | Executive Summary 자동 생성 + Open Questions + 팀원 Go/Hold/Drop 투표 + 최종 결정 기록 + 형상화 진입 체크리스트 | P0 |

### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 5 | **리포트 공유 링크** | 읽기전용 토큰 기반 URL 생성 → 로그인 불필요 | P1 |
| 6 | **PDF Export** | 리포트 전체를 PDF로 자동 생성 (차트 포함, html2canvas 클라이언트 사이드) | P1 |
| 7 | **데모 모드** | API 키 없이 하드코딩 결과로 전체 플로우 체험 (02_HTML EVAL[] 데이터 이식) | P1 |

### 4.3 제외 범위 (Out of Scope)
- **PPT Export**: 경영진 보고용 슬라이드 자동 생성은 후속 Phase로 연기
- **Agent 오케스트레이션 파이프라인**: 2-0 완료 → 자동 2-1 스킬 추천은 Phase 14 Agent Orchestration Infrastructure 완료 후 연계
- **E2E 자동화 테스트**: 리포트 렌더링 E2E는 구현 후 별도 Sprint에서 추가
- **리포트 템플릿 커스터마이징**: 팀별 리포트 포맷 변경은 제외

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Claude API (Anthropic) | SSE 기반 멀티 페르소나 평가 | 필수 (데모 모드 fallback 있음) |
| Recharts | Radar/Bar 차트 라이브러리 | 필수 (pnpm add recharts) |
| 기존 ax_discovery_* 테이블 | D1 SQL | 필수 (데이터 소스) |
| AXIS DS 컴포넌트 | @axis-ds/* 패키지 | 필수 (기존 설치 활용) |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 발굴 완료 후 리포트 생성 비율 | 0% (수작업) | 80%+ | ax_discovery_reports 레코드 수 / 발굴 완료 아이템 수 |
| 멀티 페르소나 평가 사용 비율 | 0% | 60%+ | ax_persona_evals 레코드 수 / 2-8 도달 아이템 수 |
| Go/Hold/Drop 의사결정 기록률 | 0% | 90%+ | ax_team_reviews 레코드 수 / 리포트 생성 수 |
| 발굴→형상화 핸드오프 완료율 | 0% | 50%+ | Go 판정 후 형상화 진입 수 |

<!-- KPI-핵심기능 맵핑 추가 -->
#### KPI-핵심기능 Mapping

| KPI | 관련 기능 |
|-----|----------|
| 발굴 완료 후 리포트 생성 비율 | 9탭 리포트 자동 집계/렌더링, PDF Export |
| 멀티 페르소나 평가 사용 비율 | AI 멀티 페르소나 평가(2-9), WeightSliderPanel, EvalResults |
| Go/Hold/Drop 의사결정 기록률 | 팀 검토 & Handoff, 팀원 투표/코멘트, Decision Record |
| 발굴→형상화 핸드오프 완료율 | Handoff Checklist, Go 판정 후 자동 연결 |

<!-- KPI와 기능의 연계성을 명확히 하여, 개발 우선순위 및 PO/경영진 설득 근거 강화 -->

### 5.2 MVP 최소 기준
- [ ] 멀티 페르소나 평가(2-9) 화면에서 8명 평가 실행 + 결과 시각화 동작
- [ ] 9탭 리포트 중 최소 4탭(2-1, 2-2, 2-3, 2-4) 렌더링 동작
- [ ] 팀원 투표(Go/Hold/Drop) 기록 + 조회 동작

### 5.3 실패/중단 조건
- Claude API 비용이 평가 1회당 $1 초과 시 비용 최적화 우선 (현재 추정: ~$0.5/회)
- 스킬 실행 결과(output_json)가 비정형이라 리포트 렌더링 불가 시 → 스키마 정규화 Sprint 선행

---

## 6. 제약 조건

### 6.1 일정

**마일스톤 구성 (4 Sprint):**

| Sprint | F-items | 핵심 산출물 | 의존성 |
|--------|---------|------------|--------|
| Sprint 154 | F342~F343 | DB 스키마 4테이블(0096~0099) + API 3 서비스 + 강도 라우팅 UI | 없음 (독립 착수 가능) |
| Sprint 155 | F344~F345 | AI 멀티 페르소나 평가 전용 화면 (6 컴포넌트) + Claude SSE API | recharts 설치 필요 |
| Sprint 156 | F346~F347 | 9탭 리포트 프레임 + 선 구현 4탭(2-1~2-4) + 공통 컴포넌트 4종 | F342(DB) 선행 |
| Sprint 157 | F348~F350 | 나머지 5탭 + 팀 검토 + 공유 링크 + PDF Export | F344, F346 선행 |

<!-- Sprint 154 내 output_json 정규화 POC 성공이 핵심 선행조건임을 명시 -->
- Sprint 154 내 output_json 정규화 POC(Proof of Concept) 성공 시에만 전체 리포트 자동 렌더링 진입 가능. 실패 시 전체 일정 재조정 필요.

### 6.2 기술 스택
- 프론트엔드: Vite 8 + React 18 + React Router 7 + Zustand + AXIS DS (기존)
- 백엔드: Hono + Cloudflare Workers + D1 (기존)
- 차트: **Recharts** (Radar + Bar) — 신규 의존성
- AI: Claude API via Workers (기존 OpenRouter SSE 인프라 활용)
- 디자인: AXIS DS 토큰 기반 + `--discovery-*` 시맨틱 토큰 확장

### 6.3 인력/예산
- 투입 인원: 1명 (Sinclair, AI 에이전트 활용 개발)
<!-- 1인 개발 현실성 및 리스크/서포트 필요성 명시 -->
- 1인 개발 체계로 인한 병목, QA 및 리뷰 리소스 부족 리스크 상존. Sprint별 데일리·위클리 리뷰 타임, 최소 1명 QA 서포트 필요성 검토 바람.
- Claude API 비용: 평가 1회 ≈ $0.5 (8 페르소나 순차 호출)
<!-- Claude API 비용/속도 Dry-run 결과 확보 필요 명시 -->
- Claude API 비용 및 평균 응답 속도 Dry-run 결과 Sprint 154 내 확보 필수(실제 1회당 $0.5 이하, 평균 2분 미만 검증 필요)

### 6.4 컴플라이언스
- KT DS 내부 AXIS DS 디자인 시스템 준수
- 보안: 기존 JWT + RBAC 인증 체계 활용

---

## 7. DB 스키마 확장

### 7.1 신규 테이블 (D1 Migration 0096~0099)

| 테이블 | 용도 | 핵심 컬럼 |
|--------|------|-----------|
| `ax_persona_configs` | 페르소나 가중치/맥락 | persona_id, item_id, weights(JSON: 7축), context_json |
| `ax_persona_evals` | 페르소나별 평가 결과 | persona_id, item_id, scores(JSON: 7축), verdict, summary, concern, condition |
| `ax_discovery_reports` | 통합 리포트 | item_id, report_json(9탭 데이터), overall_verdict, team_decision, created_at |
| `ax_team_reviews` | 팀 검토 기록 | item_id, reviewer_id, decision(Go/Hold/Drop), comment, created_at |

### 7.2 기존 테이블 활용
- `ax_discovery_items` — type(I/M/P/T/S), status, viability_score ✅ 존재
- `ax_discovery_stages` — stage_num, status, intensity(핵심/보통/간소) ✅ 존재
- `ax_discovery_outputs` — stage_num, skill_id, output_json, version ✅ 존재

<!-- 데이터 정규화 부재 및 output_json 스키마 강제의 선행 필요성, 정합성 리스크 강조 -->
- output_json(스킬 결과) 구조가 비정형일 경우, Zod 스키마 등으로 강제 변환 및 DB 마이그레이션 선행 필요. Sprint 154 내 POC 통과 못할 시 전체 일정 지연/축소 가능.

---

## 8. UI/UX 상세 설계

### 8.1 화면 1: 유형별 강도 라우팅 (Wizard 확장)
- WizardStepDetail 컴포넌트에 intensity indicator 추가
- ★핵심: 추가 프롬프트 + 깊은 분석 유도 UI
- △간소: 스킵 가능 옵션 노출
- 5유형 × 7단계 매트릭스 시각화

### 8.2 화면 2: AI 멀티 페르소나 평가 (2-9)
- **PersonaCardGrid**: 8개 카드 그리드 (2×4), 각각 이름/역할/관점/가중치 표시
- **WeightSliderPanel**: 탭 전환 + 7축 레인지 슬라이더 + 합계 100% 자동보정
- **ContextEditor**: 좌측 페르소나 리스트 + 우측 폼 (상황, 우선순위, 스타일, Red Line)
- **BriefingInput**: 2-1~2-8 결과 자동 요약 + 수동 편집 가능
- **EvalProgress**: 8단계 순차 프로그레스 (SSE 스트리밍)
- **EvalResults**: 종합 점수 카드 → Go/Conditional/NoGo 판정 배너 → 레이더차트 → 페르소나별 요약 → 전체 요약

### 8.3 화면 3: 발굴 완료 리포트 (9탭)
| 탭 | 컴포넌트 | 시각화 요소 | 난이도 |
|-----|---------|------------|--------|
| 2-1 | ReferenceAnalysisTab | 3-Layer 테이블 + JTBD 비교카드 + 경쟁 비교표 | 중 |
| 2-2 | MarketValidationTab | TAM/SAM/SOM 도넛차트 + Pain Point 맵 + ROI | 상 |
| 2-3 | CompetitiveLandscapeTab | SWOT 4분면 + Porter Radar + 포지셔닝맵 | 상 |
| 2-4 | OpportunityIdeationTab | HMW 카드 + BMC 그리드(9블록) + Phase 타임라인 | 상 |
| 2-5 | OpportunityScoringTab | ICE 매트릭스 + Go/No-Go 게이트 체크리스트 | 중 |
| 2-6 | CustomerPersonaTab | Persona 카드 + Customer Journey 플로우 | 중 |
| 2-7 | BusinessModelTab | BMC 완성 그리드 + Unit Economics + 수익 시나리오 | 상 |
| 2-8 | PackagingTab | GTM 전략 + Beachhead + Executive Summary | 중 |
| 2-9 | PersonaEvalResultTab | 점수 카드 + 판정 + Radar + 페르소나별 상세 | 상 |

<!-- 성능/확장성 보완: Lazy Loading, 동시성/데이터 경합 처리, PDF 품질 등 -->
- 각 탭/차트는 Lazy Loading(최초 렌더링 시 1~2탭만, 이후 on-demand 로딩)
- 팀 검토 탭은 optimistic locking(낙관적 락) 적용, 동시 투표시 데이터 경합 방지

### 8.4 화면 4: 팀 검토 & Handoff (2-10)
- Executive Summary: 1-Pager 자동 생성 (2-1~2-9 핵심)
- Open Questions: AI 페르소나 우려사항 + 팀 토론 안건
- Team Vote: 각 팀원 Go/Hold/Drop 투표 + 코멘트
- Decision Record: 최종 결정 + 사유 + 타임스탬프
- Handoff Checklist: 3단계 형상화 진입 조건

### 8.5 디자인 시스템
- AXIS DS 기존 토큰 활용: bg-background, bg-card, text-foreground 등
- 발굴 단계별 시맨틱 토큰 확장:
  - 2-1~2-2: `--discovery-mint` (#00b493)
  - 2-3~2-4: `--discovery-blue` (#3182f6)
  - 2-5~2-7: `--discovery-amber` (#f59e0b)
  - 2-8: `--discovery-red` (#f04452)
  - 2-9: `--discovery-purple` (#8b5cf6)
- 신규 커스텀 컴포넌트: InsightBox, MetricCard, HITL Badge, StepHeader, NextStepBox, PersonaCard

---

## 9. 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| Claude API 비용 | 8 페르소나 × 1회 ≈ $0.5 | 데모 모드 기본, API 키 입력 시에만 실제 호출 |
| 리포트 데이터 정규화 | 스킬 output_json이 비정형 → 렌더링 어려움 | 각 스킬 실행 시 output_json Zod 스키마 강제 |
| 차트 Export | Recharts SSR 어려움 | PDF는 html2canvas 클라이언트 사이드 |
| 기존 Wizard 호환성 | F263~F270 코드 충돌 가능 | 확장(extend) 방식 — props 추가, 새 컴포넌트 병치 |
| recharts 의존성 | Radar/Bar 차트 필수 | Sprint 155 시작 전 `pnpm add recharts` 사전 설치 |
| Phase 14와의 타이밍 | Agent Orchestration이 발굴 파이프라인에도 필요 | Phase 15는 독립 진행, 추후 Phase 14 결과물과 연계 |

<!-- 검토 의견 리스크 추가 (Claude 비용, 1인 개발, 데이터 정규화, PDF Export, 동시성 등) -->
| Claude API 비용/성능(High) | 실제 API 평가 1회당 $0.5~$1 초과 시 예산 초과 및 일정 차질 | Sprint 154 내 Dry-run(20회 이상)으로 평균 비용/속도 검증, 비용 초과 시 페르소나 수/평가 방식 축소 대안 |
| 1인 개발 일정/스코프 현실성(High) | 1인 개발+QA로 4 Sprint 내 전 범위 구현 병목 | 주 1회 이상 PO/QA 리뷰, 최소 QA 지원자(0.5명) 투입 검토, 데모 모드/화면별 incremental release 적용 |
| output_json 스키마 정규화 실패(Potential Blocker) | 기존 데이터 변환 실패 시 9탭 리포트 전체 불가 | Sprint 154 내 Zod 스키마/POC 성공 시 진입, 실패 시 전체 일정 재조정, 핵심 데이터 우선 템플릿 도입 |
| PDF Export 품질(Medium) | html2canvas로 Recharts SVG 차트 해상도 저하/폰트 깨짐 | MVP는 클라이언트 PDF, 추후 서버사이드/벡터 PDF 대체 옵션 검토 |
| 동시성/데이터 경합 | 팀 동시 투표시 DB 경합, 데이터 덮어쓰기 위험 | optimistic locking 적용, conflict 발생 시 사용자 안내/재시도 프로세스 구현 |
| 성능(초기 로딩 지연) | 9탭 리포트 전체 데이터 즉시 로딩 시 렉/딜레이 | Lazy Loading, chunked fetch, 모바일 네트워크 고려한 최소 데이터 우선 전송 |
| AI API 응답 속도 | 8인 페르소나 평가 전체 3~10분 소요(예상), 사용성 저하 | 평가 단계별 결과 실시간 표시, 최대 타임아웃 명시(5분), 부분 결과 저장, 사용자 안내 강화 |
| 데이터 정합성(High) | 비정형 데이터로 렌더 실패 시 주요 화면 disable | 데이터 스키마 강제, 필수 필드 누락시 에러 핸들링/리커버리 플로우 도입 |

---

## 10. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | recharts 설치 여부 확인 (`pnpm list recharts`) | Sinclair | Sprint 155 시작 전 |
| 2 | 스킬 output_json 스키마 정규화 필요 여부 판단 | Sinclair | Sprint 154 중 |
| 3 | Claude API 프롬프트 최적화 (비용 절감) | Sinclair | Sprint 155 중 |
| 4 | 형상화 연결 인터페이스 정의 (Go 판정 → 3단계) | Sinclair | Sprint 157 |

<!-- Claude API 비용/성능 Dry-run, QA/릴리즈/운영 가이드 등 추가 오픈 이슈 명시 -->
| 5 | Claude API 평가 20회 이상 Dry-run(비용/속도/실패 케이스) 결과 확보 | Sinclair | Sprint 154 중 |
| 6 | QA/테스트 플랜 및 최소 QA 서포트 인력 배정 | Sinclair | Sprint 154 전 |
| 7 | 운영/릴리즈 가이드 초안(롤백, 핫픽스, 피드백 루프 포함) | Sinclair | Sprint 156 전 |

---

## 11. Dry-Run 검증 결과 (2026-04-05)

| 검증 영역 | 결과 | 위험도 |
|-----------|------|--------|
| DB 스키마 정합성 | ✅ PASS | 🟢 Low — 기존 ax_* 26테이블과 충돌 없음 |
| 컴포넌트/라우트 정합성 | ✅ PASS | 🟢 Low — F263~F270 기존 컴포넌트 확인 완료 |
| AXIS DS 의존성 | ✅ PASS | 🟡 Medium — recharts 설치 필요 |
| API 엔드포인트 충돌 | ✅ PASS | 🟢 Low — 신규 경로 충돌 없음 |
<!-- Claude API 비용/속도 Dry-run, output_json 정규화 POC, QA Dry-run 등 추가 필요 -->
| Claude API 비용/속도 Dry-run | 🔄 Pending | 🔴 Critical — Sprint 154 내 20회 이상 Dry-run 필요 |
| output_json 정규화 POC | 🔄 Pending | 🔴 High — Sprint 154 내 강제 스키마 적용/마이그레이션 성공 필요 |
| QA/테스트 Dry-run | 🔄 Pending | 🟡 Medium — QA 시나리오/테스트케이스 확보 필요 |

---

## 12. QA/테스트 및 운영 계획
<!-- QA/테스트 계획 및 Change Management/릴리즈/운영 가이드 보완 -->

### 12.1 QA/테스트 계획
- Sprint별 QA 지원자(최소 0.5명) 배정, 주 1회 이상 데모/리뷰
- 주요 화면별(멀티 페르소나 평가, 9탭 리포트, 팀 검토) QA 시나리오/테스트케이스 문서화
- output_json 스키마 변환/마이그레이션 테스트, 에지 케이스(데이터 누락, 동시 투표 등) 시나리오 포함
- PDF Export, 모바일 열람, 차트 렌더 품질 등 주요 부가 기능별 QA 별도 수행
- MVP 기준 충족 여부 Sprint 156~157에서 최종 검증

### 12.2 Change Management/릴리즈 플랜
- Sprint 156~157 내 incremental release(화면별 점진 릴리즈, 데모 모드 우선 적용)
- QA/PO 승인 시 production 배포, 운영 중 모니터링 및 피드백 수렴
- 장애/이슈 발생 시 롤백 플랜(기존 Wizard UI fallback), 주요 Hotfix/패치 프로세스 문서화
- 신규 기능 도입 후 2주 내 사용자 피드백 수집 및 반영

### 12.3 운영/모니터링
- 리포트 생성/의사결정 이벤트 로그, API/AI 평가 응답 시간, 에러/실패율 모니터링
- 모바일 접속율, PDF Export 성공/실패 등 주요 KPI 실시간 대시보드 운영
- 주요 장애(예: AI API 지연/실패, 데이터 경합 등) 발생 시 실시간 알림 및 대응 프로세스 적용

---

## 13. 성능/확장성/보안 검토
<!-- 성능/확장성/보안 검토 섹션 신설 -->

### 13.1 성능
- 9탭 리포트 Lazy Loading, chunked fetch로 초기 렌더링 지연 최소화
- AI 평가(SSE)는 단계별/부분 결과 우선 표시, 최대 타임아웃 5분 내외 안내
- 데이터 건수 증가(월 100건 이상) 시 DB 인덱스/캐시 구조 검토

### 13.2 확장성
- 신규 페르소나, 평가축, Wizard 단계 추가시 DB/컴포넌트 구조 확장성 확보(스키마/컴포넌트 분리)
- 데모 모드/실환경 분리, 신규 외부 API(예: LLM 대체) 유연 연동 고려

### 13.3 보안
- JWT + RBAC 인증 체계 활용, 공유 링크(읽기전용)는 토큰 만료/폐기 관리
- AI 평가 프롬프트내 개인정보/민감 정보 포함 방지, 로그/이벤트 마스킹
- DB 변경 이력 감사(audit trail) 필수 적용

---

## 14. Out-of-scope
<!-- Out-of-scope 명시(범위 밖 추가 요청 없음) -->
- 본 PRD 내에서 지적된 범위 외 추가 Out-of-scope 요청 없음. 향후 확장(예: PPT Export, 리포트 템플릿 커스터마이징 등)은 별도 Phase에서 검토.

---

## 15. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| v1 (초안) | 2026-04-05 | discovery-ui-plan.html → PRD 변환. 시점 보정(Sprint 99→154, Phase 10→15) | - |
| v2 (AI 리뷰 반영) | 2026-04-05 | 문제 정의 구체화, KPI-기능 연계, Sprint 154 output_json 정규화, QA/릴리즈/운영, 성능/보안, Dry-run 등 보완 | Conditional |

---

*이 문서는 requirements-interview 스킬에 의해 기존 기획 문서(discovery-ui-plan.html v2.0)로부터 자동 변환되었습니다.*
*원본: `docs/specs/ax-descovery-plan/discovery-ui-plan.html`*