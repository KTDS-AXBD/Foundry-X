# AX BD팀 2단계 발굴 — 단계별 스킬 정의서

> **목적**: 팀원 공유용. 각 단계에서 사용하는 스킬의 공식 명칭, 설명, 설치 경로를 정리합니다.
> **버전**: v8.0 (2026-03-25, 5-type 확장 + 9요소 갭 보강)

---

## 스킬 출처 및 설치 방법

| 출처 | 설명 | Cowork 설치 방법 |
|------|------|-----------------|
| **phuryn/pm-skills** | Pawel Huryn(The Product Compass) 제작. MIT 라이선스. 65개 스킬, 8개 플러그인 | Customize → Browse plugins → **+** → `phuryn/pm-skills` |
| **ai-biz** (플러그인) | AI 사업개발 특화 스킬 11종. AX BD팀 제작 | Customize → Plugins → **+** → Upload → `ai-biz-plugin.zip` |
| **Anthropic 빌트인** | 웹 검색, 파일 처리 등 기본 도구 | 별도 설치 불필요. Claude에 기본 탑재 |
| **AI·경영전략 프레임워크** | a16z, McKinsey, Gartner, NIST, Porter 등 공신력 있는 방법론 | 프롬프트 기반 적용. `AX_BD_SKILL_CLAUDE.md`를 프로젝트에 첨부 |

> **중요**: ai-biz 스킬은 Cowork 플러그인 형태로 배포됩니다. 팀 공유 폴더의 `ai-biz-plugin.zip`을 다운로드한 후 Cowork에서 업로드하세요.

---

## Cowork 설치 가이드 (팀원용)

### Step 1. pm-skills 설치 (1회)

1. Claude Desktop Cowork 열기
2. 좌측 하단 **Customize** 클릭
3. **Browse plugins** → **Personal** → **+**
4. **"Add marketplace from GitHub"** 선택
5. `phuryn/pm-skills` 입력 → 확인
6. 8개 플러그인(pm-product-strategy, pm-product-discovery, pm-market-research, pm-go-to-market, pm-execution, pm-marketing-growth, pm-data-analytics, pm-toolkit)이 자동 설치됨

### Step 2. ai-biz 플러그인 설치 (1회)

1. 팀 공유 폴더에서 `ai-biz-plugin.zip` 다운로드
2. Cowork에서 **Customize** → **Plugins** → **+** → **Upload**
3. `ai-biz-plugin.zip` 선택 → 업로드
4. 11개 스킬이 `/ai-biz:스킬명` 형태로 사용 가능

### Step 3. 시스템 프롬프트 설정

1. Cowork 프로젝트 생성 또는 기존 프로젝트 열기
2. **프로젝트 설정** → **System Prompt** (또는 Custom Instructions)
3. `AX_BD_COWORK_SETUP.md` 내용을 붙여넣기
4. `AX_BD_SKILL_CLAUDE.md`를 프로젝트 파일로 첨부

### Step 4. 설치 확인

Cowork 대화창에서 아래 명령 테스트:
```
/pm-product-strategy:swot-analysis [테스트 주제]
/ai-biz:moat-analysis [테스트 주제]
```

---

## 단계별 스킬 정의

> 아래 표의 "공식 호출명"이 실제 Claude에서 사용하는 정확한 슬래시 커맨드입니다.

---

### 2-0. 사업 아이템 분류 (Item Classification Agent)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | Anthropic | (대화 기반) | 자연어 대화 3턴으로 아이템 유형(I/M/P/T/S) 분류 + 유형별 초기 분석 | 별도 설치 불필요 |

---

### 2-1. 레퍼런스 분석 (Benchmark Deconstruction)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-market-research:competitor-analysis` | 직접·간접 경쟁사 식별, 강점·약점·차별화 분석 | `pm-market-research` 플러그인 |
| 2 | pm-skills | `/pm-market-research:market-segments` | 시장 세그먼트 식별 및 세그먼트별 특성 분석 | `pm-market-research` 플러그인 |
| 3 | ai-biz | `/ai-biz:ecosystem-map` | AI 생태계 맵핑 — 밸류체인, 경쟁구도, 보완재 분석 | `ai-biz` 플러그인 |
| 4 | Anthropic | `web_search` | 실시간 웹 검색으로 최신 시장 정보 수집 | 빌트인 |
| 5 | Anthropic | `web_fetch` | 특정 URL의 콘텐츠를 직접 읽어 분석 | 빌트인 |
| 6 | 경영전략 | (프롬프트 기반) | **Value Chain Analysis (Porter)** — 1차 활동과 지원 활동으로 분해해 경쟁우위 식별 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: Competitive Analysis, 3-Layer Deconstruction (BM·기술·UX), JTBD Framework, AI Ecosystem Mapping, Value Chain Analysis, AI 기회 매핑 (자동화/개인화/예측/최적화/생성)

---

### 2-2. 수요 시장 검증 (Market Signal Validation)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-market-research:market-sizing` | TAM/SAM/SOM을 Top-down + Bottom-up으로 산출 | `pm-market-research` 플러그인 |
| 2 | pm-skills | `/pm-market-research:market-segments` | 고객 세그먼트 3~5개 식별 및 제품 적합도 분석 | `pm-market-research` 플러그인 |
| 3 | pm-skills | `/pm-product-discovery:identify-assumptions-new` | 신규 제품의 핵심 가정 식별 (8개 리스크 카테고리) | `pm-product-discovery` 플러그인 |
| 4 | AI 프레임워크 | (프롬프트 기반) | **Task-Based TAM** — AI 특화 시장규모 산출 (태스크 수 x 태스크당 비용 x AI 대체율) | SKILL_CLAUDE.md 참조 |
| 5 | Anthropic | `web_search` | 시장 데이터, 리포트, 통계 실시간 검색 | 빌트인 |

**적용 방법론**: TAM/SAM/SOM, Market Sizing, Assumption Mapping, Task-Based TAM, "Why Now" Timing Analysis

---

### 2-3. 경쟁·자사 분석 (Competitive Landscape)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-product-strategy:swot-analysis` | SWOT 분석 — 강점, 약점, 기회, 위협 + 실행 권고 | `pm-product-strategy` 플러그인 |
| 2 | pm-skills | `/pm-product-strategy:porters-five-forces` | Porter's 5 Forces — 산업 경쟁 구조 분석 | `pm-product-strategy` 플러그인 |
| 3 | pm-skills | `/pm-product-strategy:pestle-analysis` | PESTLE — 정치·경제·사회·기술·법률·환경 거시 분석 | `pm-product-strategy` 플러그인 |
| 4 | pm-skills | `/pm-go-to-market:competitive-battlecard` | 경쟁사별 세일즈 배틀카드 — 포지셔닝, 기능 비교, 반박 전략 | `pm-go-to-market` 플러그인 |
| 5 | ai-biz | `/ai-biz:moat-analysis` | AI 경쟁 해자 분석 — 데이터/기술/네트워크 효과 평가 | `ai-biz` 플러그인 |
| 6 | ai-biz | `/ai-biz:partner-scorecard` | 기술 파트너 평가 및 제휴 전략 수립 | `ai-biz` 플러그인 |
| 7 | ai-biz | `/ai-biz:ecosystem-map` | AI 생태계 맵핑 — 밸류체인, 경쟁구도 | `ai-biz` 플러그인 |
| 8 | Anthropic | `web_search` | 경쟁사 최신 동향 검색 | 빌트인 |
| 9 | 경영전략 | (프롬프트 기반) | **Value Chain Analysis (Porter)** — 경쟁사·자사의 가치 활동 비교 분석 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: SWOT, Porter's 5 Forces, PESTLE, Blue Ocean (ERRC), Crossing the Chasm, Value Chain Analysis, Competitive Battlecard, Moat Analysis, AI Partner Scorecard, Disruption Risk Analysis, Imitation Difficulty Score

---

### 2-4. 사업 아이템 도출 (Opportunity Ideation)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-product-discovery:opportunity-solution-tree` | OST — 목표→기회→솔루션→실험 트리 구조화 | `pm-product-discovery` 플러그인 |
| 2 | pm-skills | `/pm-product-strategy:business-model` | Business Model Canvas 9개 블록 생성 | `pm-product-strategy` 플러그인 |
| 3 | pm-skills | `/pm-product-strategy:ansoff-matrix` | Ansoff Matrix — 시장침투/개발/제품개발/다각화 전략 | `pm-product-strategy` 플러그인 |
| 4 | pm-skills | `/pm-product-discovery:brainstorm-experiments-new` | 신규 제품 린 실험(프리토타입) 설계 | `pm-product-discovery` 플러그인 |
| 5 | ai-biz | `/ai-biz:feasibility-study` | AI 사업 타당성 분석 — 기술/시장/재무/조직 4축 평가 | `ai-biz` 플러그인 |
| 6 | ai-biz | `/ai-biz:build-vs-buy` | Build vs Buy vs Partner 의사결정 매트릭스 | `ai-biz` 플러그인 |
| 7 | ai-biz | `/ai-biz:data-strategy` | 데이터 확보/품질/파이프라인 전략 수립 | `ai-biz` 플러그인 |
| 8 | AI 프레임워크 | (프롬프트 기반) | **a16z AI Value Chain** — AI 밸류체인 3레이어 포지셔닝 | SKILL_CLAUDE.md 참조 |
| 9 | 경영전략 | (프롬프트 기반) | **Three Horizons of Growth (McKinsey)** — H1/H2/H3 시간축 성장전략 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: Opportunity Solution Tree, BMC 초안, HMW, Ansoff Matrix, Three Horizons of Growth, AI Feasibility, Build vs Buy vs Partner, a16z AI Value Chain, 엘리베이터 피치 30초

---

### 2-5. 핵심 아이템 선정 (Opportunity Scoring)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-execution:prioritization-frameworks` | 9개 우선순위 프레임워크 가이드 (RICE, ICE, Kano, MoSCoW 등) | `pm-execution` 플러그인 |
| 2 | pm-skills | `/pm-product-discovery:prioritize-assumptions` | Impact x Risk 매트릭스로 가정 우선순위화 + 실험 설계 | `pm-product-discovery` 플러그인 |
| 3 | pm-skills | `/pm-product-discovery:prioritize-features` | 기능 후보 우선순위화 (영향도, 노력, 리스크, 전략 정렬) | `pm-product-discovery` 플러그인 |
| 4 | ai-biz | `/ai-biz:regulation-check` | AI 규제/컴플라이언스 체크 — AI기본법, GDPR, 산업별 규제 | `ai-biz` 플러그인 |
| 5 | ai-biz | `/ai-biz:moat-analysis` | AI 경쟁 해자 분석 — 해자 강도 평가 및 강화 전략 | `ai-biz` 플러그인 |
| 6 | AI 프레임워크 | (프롬프트 기반) | **NIST AI RMF** — AI 리스크 관리 프레임워크 (Govern/Map/Measure/Manage) | SKILL_CLAUDE.md 참조 |
| 7 | 경영전략 | (프롬프트 기반) | **BCG Growth-Share Matrix** — Star/Cash Cow/?/Dog 자원배분 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: Opportunity Scoring Matrix, ICE/RICE, McKinsey 9-Box, BCG Growth-Share Matrix, Prioritize Assumptions, AI Regulation Check, NIST AI RMF, Tech Fit Scoring, 가정별 검증 실험 설계 연결, 5영역 가정 발굴 체크리스트

---

### 2-6. 타겟 고객 정의 (Customer Persona & Journey)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-market-research:user-personas` | JTBD 기반 사용자 페르소나 3개 생성 | `pm-market-research` 플러그인 |
| 2 | pm-skills | `/pm-market-research:customer-journey-map` | 단계별 터치포인트, 감정, Pain Point, 기회 맵핑 | `pm-market-research` 플러그인 |
| 3 | pm-skills | `/pm-product-strategy:value-proposition` | JTBD 6파트 가치제안 설계 (Who/Why/What/How) | `pm-product-strategy` 플러그인 |
| 4 | pm-skills | `/pm-go-to-market:ideal-customer-profile` | B2B ICP — 인구통계, 행동, JTBD, 니즈 기반 이상 고객 정의 | `pm-go-to-market` 플러그인 |
| 5 | pm-skills | `/pm-product-discovery:interview-script` | JTBD 탐색 질문 포함 고객 인터뷰 스크립트 생성 | `pm-product-discovery` 플러그인 |
| 6 | AI 프레임워크 | (프롬프트 기반) | **Gartner AI Maturity Model** — 고객의 AI 성숙도 5단계 세그멘테이션 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: User Persona, Customer Journey Map, JTBD, Value Proposition Canvas, ICP, Interview Script, Gartner AI Maturity, WTP(지불의향) 검증, 인터뷰 최소 기준 5명+

---

### 2-7. 비즈니스 모델 정의 (Business Model Hypothesis)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-product-strategy:business-model` | Business Model Canvas 9개 블록 완성 | `pm-product-strategy` 플러그인 |
| 2 | pm-skills | `/pm-product-strategy:lean-canvas` | Lean Canvas — Problem, Solution, Key Metrics, Unfair Advantage | `pm-product-strategy` 플러그인 |
| 3 | pm-skills | `/pm-product-strategy:monetization-strategy` | 수익화 전략 3~5개 브레인스토밍 + 검증 실험 설계 | `pm-product-strategy` 플러그인 |
| 4 | pm-skills | `/pm-product-strategy:pricing-strategy` | 가격 모델 분석, 경쟁 가격 비교, WTP 추정, 가격 실험 | `pm-product-strategy` 플러그인 |
| 5 | pm-skills | `/pm-product-strategy:startup-canvas` | Product Strategy(9섹션) + Business Model(비용+수익) 통합 캔버스 | `pm-product-strategy` 플러그인 |
| 6 | pm-skills | `/pm-go-to-market:growth-loops` | 성장 플라이휠 5유형 설계 (Viral, Usage, Collaboration 등) | `pm-go-to-market` 플러그인 |
| 7 | ai-biz | `/ai-biz:cost-model` | AI 원가 구조 분석 — 데이터·학습·추론·인프라 비용 산출 | `ai-biz` 플러그인 |
| 8 | AI 프레임워크 | (프롬프트 기반) | **a16z AI Margin Analysis** — AI 서비스 마진 구조 분석 (SaaS 대비) | SKILL_CLAUDE.md 참조 |
| 9 | AI 프레임워크 | (프롬프트 기반) | **Data Flywheel** — 데이터 선순환 구조 설계 및 해자 평가 | SKILL_CLAUDE.md 참조 |
| 10 | AI 프레임워크 | (프롬프트 기반) | **MIT Sloan AI Business Models** — AI 시대 4대 BM 유형 | SKILL_CLAUDE.md 참조 |

> **변경**: `ai-biz-ai-pricing` 제거 → `/pm-product-strategy:pricing-strategy`가 AI 특화 프라이싱 참조 자료까지 포함하여 충분히 커버

**적용 방법론**: BMC 완성, Lean Canvas, Unit Economics, 수익 시나리오 3안, Pricing Strategy, Startup Canvas, Growth Loops, MIT Sloan AI BM 4유형, AI Cost Structure, Data Flywheel, BM 변화 시뮬레이션 (S형)

---

### 2-8. 발굴 결과 패키징 (Discovery Output Report)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-go-to-market:gtm-strategy` | GTM 전략 — 채널, 메시징, 성공 지표, 런칭 타임라인 | `pm-go-to-market` 플러그인 |
| 2 | pm-skills | `/pm-go-to-market:beachhead-segment` | Beachhead 시장 선정 — Burning Pain, WTP, 접근성 평가 | `pm-go-to-market` 플러그인 |
| 3 | pm-skills | `/pm-go-to-market:gtm-motions` | GTM 모션 7유형 분석 (Inbound, Outbound, Paid, Community 등) | `pm-go-to-market` 플러그인 |
| 4 | pm-skills | `/pm-product-discovery:metrics-dashboard` | KPI 대시보드 설계 — North Star, Input, Health 메트릭 | `pm-product-discovery` 플러그인 |
| 5 | pm-skills | `/pm-execution:create-prd` | PRD — 8개 섹션 제품 요구사항 문서 생성 | `pm-execution` 플러그인 |
| 6 | pm-skills | `/pm-marketing-growth:north-star-metric` | North Star Metric 정의 | `pm-marketing-growth` 플러그인 |
| 7 | ai-biz | `/ai-biz:ir-deck` | 투자심의/경영진 보고용 AI 사업계획서 생성 | `ai-biz` 플러그인 |
| 8 | ai-biz | `/ai-biz:pilot-design` | PoC/파일럿 설계 및 성공 기준 정의 | `ai-biz` 플러그인 |
| 9 | ai-biz | `/ai-biz:regulation-check` | AI 규제/컴플라이언스 체크리스트 | `ai-biz` 플러그인 |
| 10 | 경영전략 | (프롬프트 기반) | **Balanced Scorecard** — 재무/고객/내부프로세스/학습성장 4관점 KPI 체계 | SKILL_CLAUDE.md 참조 |
| 11 | AI 프레임워크 | (프롬프트 기반) | **PwC AI Studio & ROI Framework** — AI 중앙 스튜디오 모델 + ROI 지속 측정 체계 | SKILL_CLAUDE.md 참조 |
| 12 | AI 프레임워크 | (프롬프트 기반) | **Agentic AI Process Redesign (Bain/Deloitte)** — 단순 자동화 아닌 E2E 프로세스 재설계 | SKILL_CLAUDE.md 참조 |

**적용 방법론**: GTM Strategy, Beachhead Market, GTM Motions, Metrics Dashboard, PRD, Balanced Scorecard, PwC AI Studio & ROI, Agentic AI Process Redesign, Executive Summary, Pyramid Principle, IR Deck, PoC/Pilot Design, Validation Experiment Plan, Discovery Summary 5문장, Discovery 완료 게이트

---

### 2-9. AI 멀티 페르소나 사전 평가 (AI Agent Pre-Screening)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | AX 자체제작 | `02_AI_사전평가.html` | 8개 KT DS 내부 페르소나 AI 자동 평가 에이전트 | 별도 HTML 파일 실행 |
| 2 | pm-skills | `/pm-product-discovery:prioritize-assumptions` | 핵심 가정 우선순위화 및 실험 설계 | `pm-product-discovery` 플러그인 |
| 3 | pm-skills | `/pm-execution:pre-mortem` | Pre-mortem — Tigers/Paper Tigers/Elephants 리스크 분류 | `pm-execution` 플러그인 |
| 4 | AI 프레임워크 | (프롬프트 기반) | **AI Ethics Impact Assessment** — AI 윤리 영향 평가 (Alan Turing Institute) | SKILL_CLAUDE.md 참조 |

**적용 방법론**: Multi-Persona Simulation, Weighted Scoring, Context Prompting, Pre-Mortem, AI Ethics Impact Assessment

---

### 2-10. AX BD팀 공유 및 검토 (Team Review & Handoff)

| # | 스킬 구분 | 공식 호출명 | 스킬 설명 | 설치 경로 |
|---|----------|-----------|----------|----------|
| 1 | pm-skills | `/pm-product-strategy:product-strategy` | 9섹션 Product Strategy Canvas — 비전~방어력 | `pm-product-strategy` 플러그인 |
| 2 | pm-skills | `/pm-go-to-market:gtm-strategy` | GTM 전략 최종 검토 | `pm-go-to-market` 플러그인 |
| 3 | pm-skills | `/pm-execution:stakeholder-map` | Power x Interest 이해관계자 맵 + 커뮤니케이션 계획 | `pm-execution` 플러그인 |
| 4 | pm-skills | `/pm-product-strategy:product-vision` | 팀 동기부여를 위한 제품 비전 수립 | `pm-product-strategy` 플러그인 |
| 5 | pm-skills | `/pm-execution:create-prd` | PRD 8섹션 — 프로토타입 범위 정의 | `pm-execution` 플러그인 |
| 6 | ai-biz | `/ai-biz:scale-playbook` | 파일럿→상용화 전환 플레이북 | `ai-biz` 플러그인 |
| 7 | 경영전략 | (프롬프트 기반) | **McKinsey 7-S Model** — 7요소 조직 정합성 점검 | SKILL_CLAUDE.md 참조 |
| 8 | AI 프레임워크 | (프롬프트 기반) | **WEF AI Workforce 5축 변혁** — 비전/역량/기술/프로세스/문화 변혁 | SKILL_CLAUDE.md 참조 |

> **변경**: `ai-biz-prototype-spec` 제거 → `/pm-execution:create-prd`(PRD 8섹션)가 프로토타입 사양 범위 정의까지 커버

**적용 방법론**: Executive Summary (1-Pager), Open Questions 구조화, Go/Hold/Drop 판정, McKinsey 7-S, WEF AI Workforce 5축, Stakeholder Map, Product Vision, PRD, Scale Playbook

---

## 변경 이력 (v6.1 → v7.0)

### 스킬 변경

| 변경 | 내용 | 사유 |
|------|------|------|
| **제거** | `ai-biz-ai-pricing` (2-7) | `/pm-product-strategy:pricing-strategy`가 AI 프라이싱 참조 포함하여 대체 |
| **제거** | `ai-biz-prototype-spec` (2-10) | `/pm-execution:create-prd`가 프로토타입 범위 정의까지 커버 |
| **변경** | ai-biz 호출명 형식 | `/ai-biz-xxx` → `/ai-biz:xxx` (Cowork 플러그인 네임스페이스 적용) |
| **추가** | 2-0 유형 3→5 확장 + 9요소 갭 보강 | A/B/C → I/M/P/T/S 5-type 분류, 7개 신규 요소 + 4개 갭 보강 (v8.0) |
| **추가** | Discovery Canvas 산출물 5종 | 엘리베이터 피치(2-4), 5영역 가정 체크리스트(2-5), 인터뷰 최소 기준(2-6), Discovery Summary 5문장(2-8), 완료 게이트(2-8) (v8.1) |
| **추가** | 사업성 판단 체크포인트 | 2-1~2-7 매 단계 사업성 질문 + 2-5 Commit Gate 심화 + 누적 신호등 (v8.2) |

### 배포 방식 변경

| 항목 | v6.1 (이전) | v7.0 (현재) |
|------|------------|------------|
| ai-biz 설치 | "기본 등록" (불명확) | Cowork 플러그인 업로드 (`ai-biz-plugin.zip`) |
| pm-skills 설치 | Claude Code CLI 명령 | Cowork UI 마켓플레이스 추가 |
| 프레임워크 적용 | SKILL_CLAUDE.md 참조 | 동일 (프로젝트 파일 첨부) |

---

## 전체 스킬 통계

| 구분 | v6.1 | v7.0 | 변화 |
|------|------|------|------|
| pm-skills | 33개 | 34개 | +1 (create-prd를 2-10에 추가) |
| ai-biz 플러그인 | 13개 | 11개 | -2 (pricing, prototype-spec 제거) |
| Anthropic 빌트인 | 7개 | 7개 | 동일 |
| AI 전문 프레임워크 | 7개 | 7개 | 동일 |
| 경영전략 프레임워크 | 9개 | 9개 | 동일 |
| **합계** | **69개** | **68개** | **-1** |

---

*AX BD팀 · 2단계 발굴 프로세스 v8.2 · 2026-03-25 (사업성 판단 체크포인트 + 누적 신호등 추가)*
