## 2-1. 레퍼런스 분석 (Benchmark Deconstruction)

### 사용 가능한 스킬
- `/ai-biz:ecosystem-map` — AI 생태계 맵핑 (밸류체인, 경쟁구도, 보완재)
- 웹 검색 — 실시간 시장 정보 수집

### 방법론
Competitive Analysis, 3-Layer Deconstruction (BM·기술·UX), JTBD Framework, AI Ecosystem Mapping

### 프레임워크: Value Chain Analysis (Porter)

1차 활동(Primary): 내부물류 → 운영 → 외부물류 → 마케팅·영업 → 서비스
지원 활동(Support): 인프라, HRM, 기술개발, 조달

**적용**: 레퍼런스 서비스의 가치사슬을 분해해 핵심 가치 창출 지점을 식별하고, KT DS가 대체·보강할 수 있는 활동 영역을 도출합니다.

### 프레임워크: AI 기회 매핑

AI 적용 5대 기회 영역으로 레퍼런스를 분석합니다:
1. **자동화** — 반복 업무 대체
2. **개인화** — 사용자별 맞춤 경험
3. **예측** — 데이터 기반 미래 예측
4. **최적화** — 자원/프로세스 효율화
5. **생성** — 콘텐츠/코드/디자인 자동 생성

### 💡 사업성 체크포인트
> **"여기까지 봤을 때, 우리가 뭔가 다르게 할 수 있는 부분이 보이나요?"**
> → **Go** / **Pivot** / **Drop**

---

## 2-2. 수요 시장 검증 (Market Signal Validation)

### 사용 가능한 스킬
- 웹 검색 — 시장 데이터, 리포트, 통계 검색

### 방법론
TAM/SAM/SOM (Top-down + Bottom-up), Market Sizing, Assumption Mapping

### 프레임워크: Task-Based TAM (a16z/Sequoia)

AI 시장 규모는 기존 소프트웨어 지출 기반 TAM 외에 반드시 아래 방식을 병행합니다:

```
TAM = (자동화/증강 대상 태스크 수) × (태스크당 현재 비용) × (AI 대체율)

산출 단계:
1. 대상 도메인의 핵심 업무 태스크 목록화
2. 각 태스크의 연간 수행 횟수 × 단위 비용(인건비/시간) 산출
3. AI로 대체·증강 가능한 비율 추정 (보수/기본/낙관 3개 시나리오)
4. 기존 Top-down TAM과 교차 검증
```

### 프레임워크: "Why Now" Timing Analysis

시장 기회의 타이밍을 4축으로 구조화합니다:
- **시장 성장률**: TAM CAGR, 최근 2-3년 투자 트렌드
- **기술 성숙도**: 핵심 기술의 Gartner Hype Cycle 위치
- **규제 변화**: AI기본법, 산업별 규제 완화/강화 동향
- **경쟁 윈도우**: 경쟁사 진입 현황, 시장 선점 가능 기간

산출물: "Why Now" 1-pager (시장·기술·규제·경쟁 4축 타이밍 논거)

### 💡 사업성 체크포인트
> **"시장 규모나 타이밍을 보니, 우리 팀이 이걸 지금 추진할 만한 이유가 있나요?"**
> → **Go** / **시장 재정의** / **Drop**

---

## 2-3. 경쟁·자사 분석 (Competitive Landscape)

### 사용 가능한 스킬
- `/ai-biz:moat-analysis` — AI 경쟁 해자 분석
- `/ai-biz:partner-scorecard` — 기술 파트너 평가
- `/ai-biz:ecosystem-map` — AI 생태계 맵핑
- 웹 검색 — 경쟁사 최신 동향

### 방법론
SWOT, Porter's 5 Forces, PESTLE, Blue Ocean (ERRC), Crossing the Chasm, Competitive Battlecard, Value Chain Analysis

### 추가 분석 관점
- **Disruption Risk Analysis** (T형·S형 핵심): 신규 경쟁자 잠식 위험 평가 — AI 네이티브 스타트업, 빅테크의 진입 가능성과 기존 시장 잠식 시나리오
- **Imitation Difficulty Score**: 지속가능 우위 2개 이상 도출 + 모방 난이도 3단계(Low/Medium/High) 평가 — 데이터 해자, 기술 복잡도, 네트워크 효과, 규제 장벽 기준

### 💡 사업성 체크포인트
> **"경쟁 상황을 보니, 우리만의 자리가 있을까요?"**
> → **Go** / **포지셔닝 재검토** / **Drop**

---

## 2-4. 사업 아이템 도출 (Opportunity Ideation)

### 사용 가능한 스킬
- `/ai-biz:feasibility-study` — AI 사업 타당성 4축 평가
- `/ai-biz:build-vs-buy` — Build vs Buy vs Partner 매트릭스
- `/ai-biz:data-strategy` — 데이터 확보/품질/파이프라인 전략

### 방법론
Opportunity Solution Tree, BMC 초안, HMW, Ansoff Matrix

### 프레임워크: a16z AI Value Chain (3-Layer)

```
Layer 1 — Infrastructure/Compute: GPU/TPU, 클라우드, 데이터 인프라
Layer 2 — Models/Platforms: Foundation Models, MLOps, 개발 플랫폼
Layer 3 — Applications: 최종 사용자 향 AI 서비스·제품

핵심 인사이트:
- AI 앱 기업의 총이익률은 ~50-60% (전통 SaaS ~70-80%보다 구조적으로 낮음)
- KT DS 포지셔닝: Layer 2-3 경계에서 SI 역량을 해자로 활용
```

### 프레임워크: Three Horizons of Growth (McKinsey)

```
H1 — 핵심 사업 최적화 (0-12개월): 기존 SI/SM 사업 즉시 강화
H2 — 성장 사업 확장 (12-36개월): PoC 후 독립 사업으로 확장
H3 — 미래 사업 탐색 (36개월+): 파괴적 잠재력의 탐색적 시도

적용: 도출된 아이템을 H1/H2/H3에 배치, 포트폴리오 균형 점검
```

### 산출물: 엘리베이터 피치 30초
> "[고객]은 [문제]로 인해 [영향]. [솔루션명]은 [핵심 메커니즘]으로 이를 해결하며, [차별점]이 경쟁우위."

### 💡 사업성 체크포인트
> **"이 아이템을 30초로 설명한다면, 듣는 사람이 고개를 끄덕일까요?"**
> → **Go** / **아이템 재도출** / **Drop**

---

## 2-5. 핵심 아이템 선정 (Opportunity Scoring)

### 사용 가능한 스킬
- `/ai-biz:regulation-check` — AI 규제/컴플라이언스 체크
- `/ai-biz:moat-analysis` — AI 해자 강도 평가

### 방법론
Opportunity Scoring Matrix, ICE/RICE, McKinsey 9-Box, Prioritize Assumptions

### 프레임워크: BCG Growth-Share Matrix

```
           높은 시장 점유율    낮은 시장 점유율
높은 성장   ★ Star            ? Question Mark
           (투자 확대)        (선별 투자 or 퇴출)
낮은 성장   $ Cash Cow        ✕ Dog
           (수확·현금 창출)    (철수 검토)

적용: 아이템 후보를 4개 사분면에 배치, Star + Question Mark에 집중 투자 판단
```

### 프레임워크: NIST AI Risk Management Framework

4대 기능으로 AI 리스크를 체계적으로 평가합니다:
1. **GOVERN** (거버넌스) — AI 리스크 관리 정책·절차
2. **MAP** (매핑) — AI 시스템의 맥락과 리스크 식별·분류
3. **MEASURE** (측정) — 정량적/정성적 리스크 측정 (정확도, 편향성, 보안)
4. **MANAGE** (관리) — 리스크 대응 방안 수립 및 모니터링

### 추가 스코어링
- **Tech Fit Scoring** (T형 핵심): kt ds 보유 기술 역량 × 시장 요구 × 기술 성숙도
- **고도화/신규화/전환 3분기 판정** (S형): 기존 서비스를 AI로 ① 고도화 ② 신규화 ③ 전환
- **5영역 가정 발굴 체크리스트**: 가치/고객/기술/시장/수익 각 영역에서 핵심 가정 최소 1개 도출 확인

### 💡 사업성 체크포인트 — Commit Gate (심화 논의)

2-6~2-7에 상당한 시간이 투입되므로, 아래 4개 질문을 순차적으로 논의합니다:

1. **"이 아이템에 앞으로 4주를 투자한다면, 그 시간이 아깝지 않을까요?"**
2. **"우리 조직이 이걸 해야 하는 이유가 명확한가요? 규모가 아니더라도요."**
3. **"지금까지 Pivot한 부분이 있었다면, 그 방향 전환에 확신이 있나요?"**
4. **"이 아이템이 안 되면, 우리가 잃는 것과 얻는 것은 뭔가요?"**

→ **Commit** (확신 있게 진행) / **대안 탐색** (병렬 아이템 검토) / **Drop**

---

## 2-6. 타겟 고객 정의 (Customer Persona & Journey)

### 방법론
User Persona, Customer Journey Map, JTBD, Value Proposition Canvas, ICP, Interview Script

### 프레임워크: Gartner AI Maturity Model

B2B/B2G 타겟 고객을 AI 성숙도 기준으로 세그먼트합니다:

```
Level 1 — Awareness: AI에 관심, 구체적 계획 없음 → 교육·컨설팅 접근
Level 2 — Active: PoC/파일럿 진행 중 → PoC 파트너십 제안
Level 3 — Operational: 일부 AI 프로덕션 배포 → 확장 솔루션 제안
Level 4 — Systemic: 여러 부서에 AI 적용 → 플랫폼·통합 솔루션
Level 5 — Transformational: AI가 BM 자체를 변환 → 전략적 파트너십
```

### 추가 검증
- **WTP(지불의향) 검증** (P형·M형 핵심): Van Westendorp PSM 또는 Gabor-Granger 기법 적용
- **인터뷰 최소 기준**: 고객 인터뷰 최소 5명 이상 수행 필수 (유형·규모에 따라 차등)

### 💡 사업성 체크포인트
> **"이 고객이 진짜 존재하고, 진짜 이 문제를 겪고 있다는 확신이 있나요?"**
> → **Go** / **고객 재정의** / **Drop**

---

## 2-7. 비즈니스 모델 정의 (Business Model Hypothesis)

### 사용 가능한 스킬
- `/ai-biz:cost-model` — AI 원가 구조 분석 (데이터·학습·추론·인프라)

### 방법론
BMC 완성, Lean Canvas, Unit Economics, 수익 시나리오 3안, Pricing Strategy, Growth Loops

### 프레임워크: Data Flywheel (Andrew Ng)

```
선순환: More Users → More Data → Better Model → Better Product → More Users

평가 항목:
1. 플라이휠이 실재하는가 (사용자 데이터가 모델 개선에 기여하는 구조?)
2. 회전 속도 (데이터→모델 개선 지연 시간)
3. 방어 가능성 (데이터 독점성, 시간 축적)
4. 정체 리스크 (성능 향상 둔화 시점 대비)
```

### 프레임워크: AI Margin Analysis (a16z)

```
전통 SaaS 총이익률: 70-80% vs AI 서비스: 50-60%

마진 압박 요인: 추론 비용, HITL 비용, 데이터 파이프라인, 모델 재학습
마진 개선 레버: 모델 경량화, 자동화율 향상, 플랫폼화, 프리미엄 가격

산출: 3개 시나리오별 Unit Economics (LTV, CAC, Gross Margin, BEP)
```

### 프레임워크: MIT Sloan AI Business Models (4유형)

```
1. Existing+ (기존 강화형): 기존 사업에 AI 추가 → KT DS 적합도 ★★★★★
2. Customer Proxy (고객 대리인형): AI가 고객 대신 의사결정 → ★★★★☆
3. Modular Creator (모듈 조합형): AI 모듈 마켓플레이스 → ★★★☆☆
4. Orchestrator (생태계 조율형): AI 서비스 통합 플랫폼 → ★★★☆☆
```

### 추가 분석
- **BM 변화 시뮬레이션** (S형 핵심): 기존 BM 대비 AI 적용 후 수익 구조 변화를 3개 시나리오로 비교

### 💡 사업성 체크포인트
> **"이 비즈니스 모델로 돈을 벌 수 있다고 믿나요? 아니면 희망사항인가요?"**
> → **Go** / **BM 재설계** / **Drop**

---

## 2-8. 발굴 결과 패키징 (Discovery Output Report)

### 사용 가능한 스킬
- `/ai-biz:ir-deck` — 투자심의/경영진 보고서
- `/ai-biz:pilot-design` — PoC/파일럿 설계
- `/ai-biz:regulation-check` — AI 규제 체크

### 방법론
GTM Strategy, Beachhead Market, GTM Motions, Metrics Dashboard, PRD, North Star Metric, Executive Summary, Pyramid Principle

### 프레임워크: Balanced Scorecard (Kaplan/Norton)

4관점 KPI 체계로 구조화합니다:
1. **재무**: 예상 매출, 마진, BEP, ROI
2. **고객**: 타겟 고객 수, 전환율, NPS, CAC, LTV
3. **내부 프로세스**: 개발 리드타임, AI 모델 정확도, 가용성
4. **학습·성장**: 팀 역량, AI 인력 확보, 파트너 생태계 성숙도

### 프레임워크: PwC AI Studio & ROI

```
핵심 원칙:
1. 선택과 집중 — 고부가가치 워크플로에 AI 집중 투입
2. 중앙 AI 스튜디오 — 분산 실험이 아닌 AI CoE 구축
3. ROI 지속 측정 — 파일럿 단계부터 ROI 대시보드 설계

ROI 측정: 직접 비용 절감, 매출 증대, 품질 개선, 속도 개선
```

### 프레임워크: Agentic AI Process Redesign (Bain/Deloitte)

> "단순 AI 자동화는 10-20% 개선에 그치지만, E2E 프로세스 재설계는 10x 가치를 창출한다"
>
> 재설계 원칙: ① 프로세스를 AI 네이티브로 재설계 ② 사람은 "감독자/의사결정자"로 전환 ③ AI 에이전트 간 협업 워크플로 설계

### 산출물 — Discovery Summary 5문장
1. **문제 정의**: 누구의 어떤 문제?
2. **솔루션**: 어떻게 해결?
3. **시장 규모**: TAM/SAM/SOM
4. **Why Us**: KT DS가 왜 이걸 해야 하는가?
5. **비즈니스 모델**: 어떻게 돈을 버는가?

### 산출물 — Discovery 완료 게이트 체크리스트
- [ ] 고객 문제 정의 완료 (2-2)
- [ ] 타겟 고객 특정 완료 (2-6)
- [ ] 시장 규모 산출 완료 (2-2)
- [ ] 경쟁 환경 파악 완료 (2-3)
- [ ] 사업 아이템 도출 완료 (2-4)
- [ ] BM 가설 수립 완료 (2-7)
- [ ] 검증 실험 설계 완료 (2-5/2-8)
- [ ] 발굴 결과 패키징 완료 (2-8)
- [ ] AX BD 전략 적합성 확인 (2-0)

### 산출물 — 누적 사업성 신호등
```
사업성 판단 이력: 🟢Go _회 · 🟡Pivot _회 · 🔴Drop _회
Pivot 이력: [단계]에서 [사유] → [전환 방향]
Commit Gate(2-5): [Commit/대안 탐색/Drop] — [핵심 논의 요약]
```

### 산출물 — Validation Experiment Plan
2-1~2-7에서 도출된 핵심 가정 중 미검증 항목에 대해 3개 이상의 검증 실험을 통합 설계합니다.
각 실험별: 방법, 대상, 기간, 성공/실패 기준(Go/No-Go), 필요 자원

---

## 2-9. AI 멀티 페르소나 사전 평가 (AI Agent Pre-Screening)

8개 KT DS 내부 페르소나를 AI로 구현해 발굴 결과를 자동 평가합니다.

### 방법론
Multi-Persona Simulation, Weighted Scoring, Context Prompting, Pre-Mortem

### 프레임워크: AI Ethics Impact Assessment (Alan Turing Institute/IEEE)

평가 항목:
1. **영향 대상**: 직접 사용자, 간접 영향 대상, 취약 계층
2. **데이터 편향**: 학습 데이터 대표성, 역사적 편향
3. **실패 모드**: 오분류/오판단 시 결과 심각도
4. **설명 가능성**: 의사결정 근거의 이해관계자 설명 가능성
5. **구제 수단**: AI 판단 이의제기 메커니즘
6. **지속적 모니터링**: 배포 후 성능·공정성 모니터링 계획

---

## 2-10. AX BD팀 공유 및 검토 (Team Review & Handoff)

팀 전체가 함께 확인하고 **Go / Hold / Drop** 의사결정. 3단계 형상화로 Handoff.

### 사용 가능한 스킬
- `/ai-biz:scale-playbook` — 파일럿→상용화 전환 플레이북

### 방법론
Executive Summary (1-Pager), Stakeholder Map, Product Vision, PRD, Open Questions 구조화

### 프레임워크: McKinsey 7-S Model

조직 정합성 7요소 점검:
- **Hard**: Strategy(전략), Structure(구조), Systems(시스템)
- **Soft**: Shared Values(공유가치), Skills(역량), Style(스타일), Staff(인력)

Gap이 있는 요소에 대해 3단계 형상화에서 해결 방안을 포함합니다.

### 프레임워크: WEF AI Workforce 5축 변혁

5개 변혁 축: 비전, 역량, 기술, 프로세스, 문화

> BCG 핵심 인사이트: "AI 가치의 70%는 기술이 아닌 인력 변화에서 온다"

---

