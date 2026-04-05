# Discovery UI/UX 고도화 v2 PRD

**버전:** v1
**날짜:** 2026-04-05
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**원본:** `docs/specs/ax-descovery-plan/discovery-ui-plan.html` (v2.0 Final)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
AX BD팀의 2단계 발굴 프로세스(v8.2)에서 미구현된 핵심 화면 5종(멀티 페르소나 평가, 9탭 리포트, 강도 라우팅, 팀 검토, Export)을 Foundry-X 웹 앱에 구현하여 발굴→형상화 End-to-End를 완결한다.

**배경:**
- Phase 9(F258~F270)에서 Discovery Wizard 뼈대(2-0~2-10 멀티스텝, HITL, Help Agent, 스킬 실행)가 구축됨
- 하지만 **결과물 시각화**(02_HTML: AI 멀티 페르소나 평가)와 **최종 리포트**(03_HTML: 9탭 발굴 완료 보고서)가 전혀 없는 상태
- 팀원들이 발굴 단계 완료 후 결과를 공유하고 Go/Hold/Drop 의사결정을 내릴 화면이 없어 수작업 PPT로 대체 중

**목표:**
- 발굴 2단계의 모든 산출물이 Foundry-X 안에서 생성·시각화·공유·의사결정까지 완결
- 3단계 형상화로의 자동 핸드오프 지원

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- Wizard 2-0~2-10 스텝 구조와 스킬 실행 엔진은 동작하지만, 각 스텝의 **결과물 시각화**가 없음
- 2-9(멀티 페르소나 평가) 전용 UI가 전혀 없음 — 02_HTML 참조 문서만 존재
- 발굴 완료 후 9탭 리포트를 자동 생성하는 기능이 없음 — 03_HTML은 수동 HTML
- 유형별(I/M/P/T/S) 강도 라우팅이 Wizard에 시각적으로 표시되지 않음
- 팀 검토(Go/Hold/Drop) 의사결정 기록 메커니즘 없음
- 리포트 공유/Export 기능 없음

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

### 6.2 기술 스택
- 프론트엔드: Vite 8 + React 18 + React Router 7 + Zustand + AXIS DS (기존)
- 백엔드: Hono + Cloudflare Workers + D1 (기존)
- 차트: **Recharts** (Radar + Bar) — 신규 의존성
- AI: Claude API via Workers (기존 OpenRouter SSE 인프라 활용)
- 디자인: AXIS DS 토큰 기반 + `--discovery-*` 시맨틱 토큰 확장

### 6.3 인력/예산
- 투입 인원: 1명 (Sinclair, AI 에이전트 활용 개발)
- Claude API 비용: 평가 1회 ≈ $0.5 (8 페르소나 순차 호출)

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

---

## 10. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | recharts 설치 여부 확인 (`pnpm list recharts`) | Sinclair | Sprint 155 시작 전 |
| 2 | 스킬 output_json 스키마 정규화 필요 여부 판단 | Sinclair | Sprint 154 중 |
| 3 | Claude API 프롬프트 최적화 (비용 절감) | Sinclair | Sprint 155 중 |
| 4 | 형상화 연결 인터페이스 정의 (Go 판정 → 3단계) | Sinclair | Sprint 157 |

---

## 11. Dry-Run 검증 결과 (2026-04-05)

| 검증 영역 | 결과 | 위험도 |
|-----------|------|--------|
| DB 스키마 정합성 | ✅ PASS | 🟢 Low — 기존 ax_* 26테이블과 충돌 없음 |
| 컴포넌트/라우트 정합성 | ✅ PASS | 🟢 Low — F263~F270 기존 컴포넌트 확인 완료 |
| AXIS DS 의존성 | ✅ PASS | 🟡 Medium — recharts 설치 필요 |
| API 엔드포인트 충돌 | ✅ PASS | 🟢 Low — 신규 경로 충돌 없음 |

---

## 12. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| v1 (초안) | 2026-04-05 | discovery-ui-plan.html → PRD 변환. 시점 보정(Sprint 99→154, Phase 10→15) | - |

---

*이 문서는 requirements-interview 스킬에 의해 기존 기획 문서(discovery-ui-plan.html v2.0)로부터 자동 변환되었습니다.*
*원본: `docs/specs/ax-descovery-plan/discovery-ui-plan.html`*
