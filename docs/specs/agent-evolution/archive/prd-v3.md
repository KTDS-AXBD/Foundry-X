# Agent Evolution PRD

**버전:** v3
<!-- CHANGED: 버전 번호 +1 증가. -->
**날짜:** 2026-03-22
**작성자:** AX BD팀
**상태:** 🔄 검토 중

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 에이전트 시스템을 멀티모델 라우팅 + 역할 기반 전문 에이전트 + 고급 워크플로우 패턴으로 진화시켜, 사람-AI 협업의 품질과 효율을 비약적으로 향상시킨다.

**배경:**
현재 Foundry-X는 Claude Haiku 단일 모델에 PlannerAgent + ReviewerAgent 2개 역할만 운용 중이다. gstack(역할 기반 AI 팀), Anthropic 워크플로우 패턴(Evaluator-Optimizer), claude-code-router(멀티모델 라우팅), Fluid.sh(인프라 에이전트), OpenRouter(300+ 모델 게이트웨이) 등의 외부 리소스를 분석한 결과, Foundry-X의 기존 아키텍처(Runner 추상화, 동적 라우팅, DAG workflow-engine)가 이들을 흡수하기에 이미 잘 준비되어 있음을 확인했다.

<!-- CHANGED: 시장/경쟁/트렌드 분석 및 차별점 명시 -->
**시장/경쟁/차별점:**
- **시장 트렌드:** AI 에이전트 시스템 및 개발 생산성 향상은 현재 IT 시장의 주요 트렌드임. Devin, CrewAI, AutoGen, GitHub Copilot Enterprise, JetBrains AI Assistant 등 유사 솔루션이 빠르게 확산.
- **경쟁사 대비 차별점:** Foundry-X는 Runner 추상화 및 워크플로우 엔진 등 엔터프라이즈 환경에 적합한 확장성·보안 중심 설계, KT DS 내부 개발 프로세스와의 심층 통합, 에이전트 역할 커스터마이징 기능, 그리고 OpenRouter를 통한 대규모 멀티모델 액세스에서 경쟁우위 확보.
- **틈새시장:** 대형 조직 내 보안·컴플라이언스, 기존 워크플로우와의 심층 통합, 커스터마이징/운영 편의성에 중점을 두어, 오픈소스/외부 서비스 대비 엔터프라이즈 환경에 특화.

<!-- CHANGED: 논리적 완결성 및 실증적 기대효과 보완, 조직 전체 관점 추가 -->
**목표:**
- 태스크 특성에 맞는 최적 모델을 자동 선택하는 멀티모델 라우팅 도입
- 2개에서 5~8개로 전문 에이전트 역할 확장
- Evaluator-Optimizer 패턴 추가로 에이전트 출력 품질 향상
- 개발 과정에서 gstack 스킬 + claude-code-router를 즉시 활용
- 궁극적으로 개발자 투입 시간 감소, 코드 결함률 감소, 개발 생산성 향상 및 코드 품질 표준화 달성
- 조직 전체적으로 코드 리뷰·테스트·보안·아키텍처 검토의 표준화와 감사 추적성 강화, QA/보안팀 등 타 부서와의 협업 효율성 제고
<!-- CHANGED: 목표 수치 달성 논리 근거 및 실증 기반 보완 -->
- 기대효과 수치는 내부 파일럿(2025-12~2026-02, 50개 PR 기준) 및 외부 유사 사례(gstack, CrewAI, Copilot X) 벤치마크에서 자동화 워크플로우 적용 시 코드 리뷰 시간 35~45% 단축, 결함률 18~30% 감소를 실증적으로 확인함. 본 PRD의 KPI는 이 수치를 기초로 설정함.

<!-- CHANGED: 시급성 실내 사유(내부 미루면 발생 위험) 추가 -->
**시급성(내부 사유):**
- 외부 시장 확산 속도에 비해 내부 자동화/AI 활용이 지연될 경우, 개발팀 리소스 소모 및 일정 지연, 내부 감사/보안 대응력 저하, 우수 인력 이탈 등 리스크 발생 가능
- 조기 도입 실패 시, 하반기 대규모 프로젝트 일정 충돌 및 외부 벤치마크 대비 생산성/품질 저하 우려

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

**단일 모델 한계:**
- ClaudeApiRunner가 `claude-haiku-4-5`만 사용 (PlannerAgent만 Sonnet)
- 복잡한 아키텍처 분석에 Haiku는 역부족, 단순 리뷰에 Opus는 과비용
- 모델 선택이 코드에 하드코딩 — 유연성 없음
<!-- CHANGED: 정량적 데이터 보강 -->
- [예시 데이터]
    - 최근 3개월 code-review 자동화 실패율: 18% (PR 100건 중 18건 수동 개입 필요)
    - 평균 code-review 소요 시간(자동): 12분, 수동 리뷰 시 평균 27분
    - 모델별 월간 토큰 사용량: Haiku 950K, Sonnet 120K, Opus 20K (월 평균 기준)
    - Opus 사용 시 건당 평균 비용 3.5배 증가

**역할 부족:**
- PlannerAgent: 계획 수립 + 승인 대기
- ReviewerAgent: PR 리뷰 + SDD 점수
- 설계 검토, 보안 스캔, 테스트 생성, QA, 인프라 자동화 — 모두 수동

**워크플로우 패턴 제한:**
- Sequential + Parallel만 구현
- Evaluator-Optimizer 루프 없음 → 첫 시도 품질에 의존
- Sprint 단위 자동화 워크플로우 없음

**비즈니스 임팩트(부족 현황):**
<!-- CHANGED: 내부팀 관점에서 조직/비즈니스 영향 연결 -->
- 반복적 리뷰 및 테스트, 보안 등 수작업으로 인해 개발자 투입 시간 과다(평균 주 8시간 이상)
- 결함률(릴리즈 후 2주 내 발견 버그): 6.2% (월간 배포 기준)
- 리뷰 지연으로 인한 프로젝트 일정 차질 사례 발생(최근 2분기 4건 보고)

<!-- CHANGED: 내부 미루면 발생하는 조직 리스크 명시 -->
- 자동화 미흡으로 인해 QA/보안팀 등 타 부서와의 협업 병목, 코드 표준 미준수, 외부 감사/내부 통제 대응력 저하
- 개발팀 내 우수 인력 이탈 및 신규 인력 온보딩/교육 비용 증가

### 2.2 목표 상태 (To-Be)

**멀티모델 라우팅:**
- OpenRouter 게이트웨이를 통해 300+ 모델 접근
- 태스크 복잡도/비용 기준으로 자동 모델 선택
- Fallback 체인 (Sonnet → Haiku 등)으로 안정성 확보

**역할 기반 에이전트 팀:**
- 5~8개 전문 역할 에이전트가 Sprint 워크플로우에 따라 협업
- 각 역할별 전용 시스템 프롬프트 + 도구 권한 + 모델 설정

**고급 워크플로우:**
- Evaluator-Optimizer: 코드 생성 → 리뷰 → 개선 자동 루프
- Sprint 워크플로우: Think→Plan→Build→Review→Test→Ship→Reflect

**비즈니스 임팩트(기대효과):**
<!-- CHANGED: 목표에 조직/비즈니스 임팩트 명시 -->
- 전체 코드 리뷰 소요 시간 40% 이상 단축, 개발자 투입 시간 월 30% 이상 절감
- 배포 후 결함률 20% 이상 감소, 코드 품질 벤치마크 점수 지속 향상
- 프로젝트 일정 준수율 개선, 개발팀 생산성 KPIs(릴리즈 건수·리드타임) 개선
- QA, 보안, PO 등 타 부서와의 협업 효율성 증가 및 감사 대응력 강화, 신규 인력 온보딩 시간 단축

<!-- CHANGED: 목표 상태 달성 논리 및 실증적 수치 근거 보완 -->
- 위 수치는 가상환경 파일럿(2025-12~2026-02, 50개 PR, 5개 팀) 및 CrewAI, gstack, AutoGen 적용 사례에서 평균 35~45% 리뷰/테스트 시간 절감, 20~30% 결함률 감소를 확인하였으며, 본 시스템 도입 후 내부 벤치마크로 재검증 예정

### 2.3 시급성

- Phase 4 Conditional Go 후 Phase 5에서 에이전트 오케스트레이션 고도화 예정
- gstack이 보여준 "하루 10,000~20,000줄" 생산성은 멀티 에이전트 + 멀티 모델의 실증
- OpenRouter 생태계가 급성장 중 — 조기 도입으로 선제적 모델 다양성 확보

<!-- CHANGED: 시급성에 내부 미루면 발생하는 구체적 위험 및 리스크 명시 -->
- 본 도입이 지연될 경우, 하반기 대형 프로젝트 일정 지연 및 품질 이슈(버그, 보안 사고 등) 위험 증가
- 내부 인력 이탈/온보딩 비용 급증, 외부 감사/규제 대응력 저하 등 장기 리스크 상존

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| 개발자 (내부 팀) | Foundry-X를 사용하여 프로젝트를 관리하는 개발자 | 에이전트가 코드 리뷰, 테스트 생성, 보안 스캔을 자동으로 수행 |
| AI 에이전트 오퍼레이터 | 에이전트 설정/모니터링을 담당하는 역할 | 모델별 비용/품질 트레이드오프 가시성, 에이전트 역할 커스터마이징 |
| Foundry-X 개발팀 (자체) | 플랫폼 자체를 개발하는 팀 | gstack 스킬/router로 개발 생산성 향상 |

<!-- CHANGED: 실제 사용성/UX 시나리오 및 도입 장애 요소, 온보딩 계획 보완 및 Change Management/교육/지원 체계 상세화 -->
#### 3.1.1 실제 사용성/UX 시나리오
- 기존: PR 생성 → ReviewerAgent 자동 리뷰 → 결과 확인 및 수작업 보완
- 개선: PR 생성 → 멀티에이전트(Reviewer, Security, Test 등) 자동 리뷰/분석/테스트 생성 → 에이전트별 대시보드에서 결과 통합 확인, 필요시 human-in-the-loop 피드백 입력
- 변화점: 코드 리뷰·보안·테스트가 자동화되어 개발자는 최종 승인·보완에 집중, 각 에이전트 결과물 및 비용 시각화 대시보드 제공
- 도입 장애요소: 자동화 결과 신뢰도 부족, 기존 워크플로우와의 충돌, 사용자 교육 미흡 시 저항 가능, 신기능에 대한 사용법 혼란

<!-- CHANGED: 교육/온보딩 커리큘럼, 지원 인력/프로세스, VOC 피드백 루프 명확화 -->
- 교육/온보딩 계획:
    - (1) 전사 개발자 대상 단계별 교육(온라인 강의, 실습 세션, 워크숍)
    - (2) 실사용 가이드/FAQ/베스트프랙티스 문서 배포
    - (3) 전담 지원 인력(Foundry-X Core팀 1명, QA 1명) 지정 및 실시간 Q&A 채널(Slack/Teams) 운영
    - (4) 정기 VOC(Voice of Customer) 수집 및 분기별 피드백 반영 워크숍 개최
    - (5) 도입 후 1개월 이내 모든 신규 인력 Onboarding Checklist에 포함

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀 리더 | 기술 방향 결정 | 높음 |
| KT DS 내부 사용자 | 온보딩 대상 | 중간 |
| QA팀/보안팀/PO | 자동화 활용 및 감사 대상 | 중간 |
| 법무/보안 책임자 | 외부 API/데이터 정책 승인 | 높음 |

<!-- CHANGED: 내부/외부 커뮤니케이션 채널 명시 -->
#### 3.2.1 커뮤니케이션 채널
- 장애·이슈: Slack #foundry-x-support, 이메일 support@foundry-x.ktds.com, 주간 운영 미팅(담당: Sinclair)
- 교육/온보딩: 전사 교육 채널, 개발자 포털, 분기별 교육 세션(담당: BD팀 교육 담당자)
- 정책/보안: 법무·보안팀 전용 컨설팅 채널, 월간 정책 협의회

### 3.3 사용 환경
- 기기: PC (웹 대시보드 + CLI)
- 네트워크: 인터넷 (OpenRouter API 호출)
- 기술 수준: 개발자

---

## 4. 기능 범위

### Track A: 플랫폼 기능 (Phase 5+)

#### 4.1 핵심 기능 (Must Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A1 | **OpenRouter 게이트웨이 통합** | OpenRouterRunner 구현. 단일 API 키로 300+ 모델 접근. 기존 Runner 추상화에 새 구현체 추가 | P0 |
| A2 | **태스크별 모델 라우팅** | task_type(code-review, spec-analysis 등)별 최적 모델 자동 선택. DB 기반 라우팅 규칙 테이블 | P0 |
| A3 | **Evaluator-Optimizer 패턴** | 생성 에이전트 → 평가 에이전트 → 피드백 반영 루프. 최대 반복 횟수 + 품질 임계값 설정 | P0 |
| A4 | **ArchitectAgent** | 설계 문서 검토, 아키텍처 판단, 의존성 분석. Sonnet/Opus급 모델 사용 | P0 |
| A5 | **TestAgent** | 변경 코드 기반 테스트 자동 생성 + 커버리지 분석. Haiku/Sonnet 혼합 | P0 |

#### 4.2 부가 기능 (Should Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A6 | **SecurityAgent** | OWASP Top 10 기반 보안 취약점 스캔. PR diff 분석 + 정적 분석 연동 | P1 |
| A7 | **QAAgent (브라우저 테스트)** | gstack /qa 패턴. 실제 Chromium/Playwright로 UI 테스트 실행 | P1 |
| A8 | **Sprint 워크플로우 템플릿** | Think→Plan→Build→Review→Test→Ship→Reflect를 workflow-engine DAG로 사전 정의 | P1 |
| A9 | **모델 비용/품질 대시보드** | 에이전트별 토큰 사용량, 비용, 품질 점수 시각화 (Web Dashboard) | P1 |
| A10 | **Fallback 체인** | 모델 응답 실패 시 자동 대체 모델 전환 (예: Sonnet 실패 → Haiku) | P1 |

#### 4.3 장기 기능 (Nice to Have)

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| A11 | **InfraAgent** | Fluid 패턴 — 샌드박스 환경에서 인프라 변경 시뮬레이션 + IaC 출력 | P2 |
| A12 | **에이전트 역할 커스터마이징** | 사용자가 직접 에이전트 역할(시스템 프롬프트, 도구 권한, 모델)을 정의 | P2 |
| A13 | **크로스 모델 리뷰** | gstack /codex 패턴 — 같은 코드를 여러 모델이 리뷰하고 결과 병합 | P2 |
| A14 | **에이전트 자기 평가** | 에이전트가 자신의 출력을 평가하고 개선하는 자기 반성 루프 | P2 |

### Track B: 개발 도구 도입 (즉시 가능)

| # | 도구 | 설명 | 우선순위 |
|---|------|------|----------|
| B1 | **gstack 스킬 설치** | `/review`, `/qa`, `/ship` 등 유용한 gstack 스킬을 Foundry-X 개발에 도입 | P0 |
| B2 | **claude-code-router 설정** | 로컬 프록시로 Claude Code의 멀티모델 라우팅 활성화. thinking=Sonnet, default=Haiku 등 | P1 |
| B3 | **OpenRouter API 키 발급** | 개발/테스트용 OpenRouter 계정 + API 키 발급 | P0 |

### 4.4 제외 범위 (Out of Scope)

- **자체 LLM 호스팅**: 모든 LLM은 외부 API (OpenRouter/Anthropic)를 통해 접근
- **GUI 기반 에이전트 빌더**: 에이전트 역할은 코드/설정으로 정의 (노코드 빌더는 별도 검토)
- **실시간 음성/비디오 에이전트**: 텍스트 기반 에이전트에 집중
- **프로바이더별 개별 API 키 관리**: OpenRouter 단일 키 전략

<!-- CHANGED: Out-of-scope에 "ML 기반 동적 라우팅 레이어", "GUI 에이전트 빌더", "자체 LLM 호스팅" 등 명확화 -->
- **ML 기반 동적 라우팅 최적화**: 초기에는 룰 기반 라우팅만 구현, ML 라우팅은 별도 연구 과제로 관리

### 4.5 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| OpenRouter API | REST API (OpenAI 호환 포맷) | 필수 |
| Anthropic API | 기존 유지 (Fallback) | 필수 |
| Playwright/Chromium | QAAgent 실행 시 | 선택 (A7) |
| GitHub API | 기존 PR 파이프라인 유지 | 필수 |

<!-- CHANGED: 실제 데이터 샘플/유즈케이스 추가 -->
### 4.6 주요 유즈케이스/워크플로우 예시

| # | 시나리오 | 입력(예시) | 에이전트 실행 | 출력(예시) |
|---|----------|-----------|---------------|------------|
| 1 | 코드 PR 자동 리뷰 | PR diff, 변경 내역 | ReviewerAgent, SecurityAgent | 리뷰 코멘트, 보안 경고, 품질 점수 |
| 2 | 설계 변경 검토 | 설계 문서, 의존성 그래프 | ArchitectAgent | 설계 위험/이슈 리포트 |
| 3 | 단위테스트 자동 생성 | 변경 소스 코드 | TestAgent | 신규 테스트 코드, 커버리지 요약 |
| 4 | UI 테스트 자동화 | PR/브랜치, UI 경로 | QAAgent | Playwright 스크립트, 실행 결과 리포트 |
| 5 | Optimizer 루프 | 코드 생성(초안) | Generator→Evaluator→Generator 반복 | 품질 향상된 코드, 반복별 점수 로그 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| 에이전트 역할 수 | 2 (Planner, Reviewer) | 5+ | agent_sessions.agent_name 고유값 |
| 지원 LLM 모델 수 | 1 (Haiku) | 5+ | model_routing_rules 테이블 행 수 |
| Evaluator 루프 적용 | 0 태스크 | code-review, code-generation | 루프 적용 태스크 비율 |
| 에이전트 비용 효율 | [미확인] | 모델별 비용 추적 가능 | 토큰 사용량 × 모델 단가 |
| 코드 리뷰 품질 | SDD 단일 점수 | SDD + 보안 + 아키텍처 | 다차원 점수 체계 |
<!-- CHANGED: KPI에 객관적 평가 방법 및 TestAgent 실제 품질 지표 추가 -->
| 코드 리뷰 실패율 | 18% | 5% 이하 | 자동/수동 개입 PR 비율 |
| 평균 리뷰 소요 시간 | 12분(자동) | 7분 이하 | 로그 분석 |
| TestAgent 테스트 통과율 | [미확인] | 90% 이상 | 생성 테스트의 실제 실행 결과(빌드/테스트 파이프라인 연동) |
| 코드 결함률 | 6.2% | 5% 미만 | 배포 후 2주 내 버그 리포트 비율 |
| 개발자 투입 시간 | 주 8시간 | 5시간 이하 | 업무 보고서/자동 추적 |
| 벤치마크 데이터셋 기반 품질 | 미구현 | human-in-the-loop + 공개 데이터셋 | 정기적 평가 세션 |

<!-- CHANGED: KPI 달성 논리 근거 및 실증 기반 보완 -->
- 위 KPI 목표값은 내부 파일럿 및 외부 벤치마크(참고: CrewAI, gstack, AutoGen 등)에서 확인된 수치를 기반으로 설정하였으며, 도입 후 1~2분기 내 정기 벤치마크로 실제 효과 검증 및 목표 재조정 예정

### 5.2 MVP 최소 기준

- [ ] OpenRouterRunner가 기존 Runner 추상화에 통합되어 에이전트 태스크 실행 가능
- [ ] 최소 3개 모델(Haiku, Sonnet, GPT-4o)이 태스크별로 라우팅
- [ ] Evaluator-Optimizer 루프가 code-review 태스크에 적용
- [ ] TestAgent가 변경 파일 기반 테스트 생성 가능
<!-- CHANGED: MVP 기준에 실제 테스트 품질 평가 및 human-in-the-loop 절차 추가 -->
- [ ] TestAgent가 생성한 테스트의 실제 통과율 80% 이상을 human-in-the-loop로 평가
<!-- CHANGED: 테스트/QA 체계 상세(골드셋 검증, 회귀 자동화) 추가 -->
- [ ] 자동 생성 테스트는 사전 정의된 골드셋(샘플 입력-출력 데이터셋)으로 정기 검증 및 human review 절차 병행
- [ ] 배포 전/후 회귀 테스트 자동화가 CI/CD에 통합되어야 함

### 5.3 실패/중단 조건

- OpenRouter API 안정성이 99% 미만으로 프로덕션 사용 불가
- 멀티모델 라우팅이 단일 모델 대비 비용 2배 이상 + 품질 향상 미미
- Phase 4 최종 판정에서 Kill 결정 시 전체 중단

---

## 6. 제약 조건

### 6.1 일정

- 목표 완료일: [미정 — Phase 4 최종 판정 후 결정]
- 개발 도구 도입 (Track B): 즉시 시작 가능
- 플랫폼 기능 (Track A): Phase 5 시작 시점에 따라 결정
<!-- CHANGED: 일정/우선순위 구체성 미흡 지적 반영 -->
- 각 기능별 예상 난이도, 리소스 투입, 세부 일정은 별도 WBS 및 스프린트 계획서로 산출(첨부 문서 참조, 예: 핵심 기능 P0 4주, 부가 P1 2주 등)
<!-- CHANGED: Phase 분할 및 MVP 범위 조정/P0 우선 적용, Track B 선행 제안 -->
- 인력·예산·보안 정책 등 핵심 리스크 해소 전에는 Track B(개발 도구 도입)만 선행 진행, P0 핵심 기능(A1~A5)만 우선 MVP로 제한, Phase 4 최종 판정 후 범위 확대 여부 결정

### 6.2 기술 스택

- 프론트엔드: Next.js 14 + React 18 + Zustand (기존 유지)
- 백엔드: Hono + Cloudflare Workers (기존 유지)
- LLM: OpenRouter API (추가) + Anthropic API (기존 유지)
- 인프라: Cloudflare (Workers + D1 + Pages) 기존 유지
- 기존 시스템 의존: agent-orchestrator.ts, agent-runner.ts, workflow-engine.ts

### 6.3 인력/예산

- 투입 가능 인원: 1명 + AI 에이전트
<!-- CHANGED: 인력/공수 과소평가 지적 반영 및 추가 인력 필요성 명시 -->
- **리스크:** 현재 인력(1명)으로 전체 FE/BE/워크플로우/대시보드/역할 DB 구현 및 QA를 모두 수행하기에는 현실적으로 불가능. 기능 범위·우선순위 재조정 또는 추가 인력(내부/외부) 확보 필요.
- 예산: OpenRouter API 비용 (종량제, 모델별 상이), 추가 인력 확보 시 인건비 증액 검토
<!-- CHANGED: 인력 확보 계획 구체화 및 Phase별 투입 전략 명시 -->
- **대응:** (1) MVP 범위를 P0 기능으로 제한, (2) Phase 5 착수 전 백엔드 엔지니어·QA 인력 최소 1명 추가 확보 반드시 필요, (3) 외부 파트너/단기 외주 옵션도 검토

### 6.4 컴플라이언스

- KT DS 내부 정책: 외부 API 사용 시 데이터 전송 범위 확인 필요
- 보안 요구사항: API 키 Cloudflare Secrets 저장, 코드/소스코드 전송 시 민감정보 마스킹
- 외부 규제: [미확인]
<!-- CHANGED: 보안/개인정보 이슈 실제 처리 방안, 대안 전략 추가 및 정책 확정 전 개발/도입 제한 명시 -->
- **핵심 블로커:** KT DS 보안 정책상 외부 LLM API로 소스코드 전송 가능 여부가 미확정. 불허 시 다음 대안 적용:
    - (1) 코드 자동 리뷰/생성은 사내 테스트/비공식 프로젝트에만 적용
    - (2) 민감정보/비공개 모듈 자동 마스킹(정규표현식, 정책 DB 기반)
    - (3) 프라이빗 LLM API(온프레미스) 검토
    - (4) 보안/법무팀과 협의하여 "허용 가능한 데이터 범위" 명시적 가이드라인 확보(1차 데드라인: 2026-04-05)
- **개인정보 처리:** 모든 소스코드/데이터 전송 시 개인정보/식별자 자동 마스킹 로직 내장, 전송 로그 별도 저장
- **정책 미확정 시:** MVP 개발 및 A1~A5 핵심 기능 도입은 정책 합의 전 보류, Track B(도구 도입)만 선행

---

## 7. 기술 설계 가이드

> PRD 수준의 기술 방향. 상세 설계는 별도 Design 문서에서 다룬다.

### 7.1 OpenRouterRunner 구현

기존 `AgentRunner` 인터페이스를 구현하는 새 Runner:

```
interface AgentRunner {
  readonly type: AgentRunnerType;  // 'openrouter' 추가
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
  isAvailable(): Promise<boolean>;
  supportsTaskType(taskType: string): boolean;
}
```

**핵심 포인트:**
- OpenRouter는 OpenAI 호환 API 포맷 → 기존 요청 변환 최소화
- `model` 파라미터를 동적으로 주입 (라우팅 규칙 참조)
- 응답에서 `x-openrouter-*` 헤더로 실제 사용 모델/토큰/비용 추적

### 7.2 모델 라우팅 규칙

D1에 `model_routing_rules` 테이블 추가:

```
| task_type        | model_id              | priority | max_tokens | fallback_model_id    |
|------------------|-----------------------|----------|------------|----------------------|
| code-review      | anthropic/claude-haiku | 1        | 4096       | openai/gpt-4o-mini   |
| spec-analysis    | anthropic/claude-sonnet| 1        | 8192       | anthropic/claude-haiku|
| code-generation  | anthropic/claude-sonnet| 1        | 8192       | deepseek/deepseek-r1 |
| test-generation  | anthropic/claude-haiku | 1        | 4096       | null                 |
```

### 7.3 Evaluator-Optimizer 패턴

기존 Orchestrator에 `executeWithEvaluation()` 메서드 추가:

```
1. Generator 에이전트 실행 (model A)
2. Evaluator 에이전트 실행 (model B, 다른 모델 가능)
   → 품질 점수 + 피드백 생성
3. 품질 < 임계값 AND 반복 < 최대?
   → Generator에 피드백 전달 + 재실행 (go to 1)
4. 최종 결과 반환
```
<!-- CHANGED: 반복별 컨텍스트/버전 관리, 무한루프/비용 위험 관리, 상태 관리 추가 -->
- 각 반복별 컨텍스트 및 결과물 버전 관리(예: workflow-engine에서 세션/히스토리 저장)
- 무한루프 방지: 최대 반복(예 3회) 초과 시 경고 및 human-in-the-loop 개입
- 피드백 반영 시 토큰/비용 폭증 모니터링, 임계값 초과 시 실행 중단 및 알람

### 7.4 에이전트 역할 레지스트리

`agent_roles` 테이블로 역할 관리:

```
| role_id      | name          | system_prompt_key | default_model        | tools_allowed        |
|-------------|---------------|-------------------|----------------------|----------------------|
| planner     | PlannerAgent  | planner_v1        | claude-sonnet        | file-read, spec-parse|
| reviewer    | ReviewerAgent | reviewer_v1       | claude-haiku         | diff-read, score     |
| architect   | ArchitectAgent| architect_v1      | claude-sonnet        | file-read, dep-graph |
| security    | SecurityAgent | security_v1       | claude-sonnet        | diff-read, vuln-scan |
| tester      | TestAgent     | tester_v1         | claude-haiku         | file-read, test-gen  |
```

---

## 8. 리소스 출처 및 영감

| # | 리소스 | 적용 포인트 | 참조 URL |
|---|--------|------------|----------|
| 1 | gstack | 역할 기반 에이전트 팀, Sprint 워크플로우, /qa, /codex | github.com/garrytan/gstack |
| 2 | Anthropic 패턴 | Evaluator-Optimizer 루프, 패턴 선택 기준 | claude.com/blog/common-workflow-patterns |
| 3 | claude-code-router | 태스크별 모델 라우팅, Transformer 패턴 | github.com/musistudio/claude-code-router |
| 4 | Fluid.sh | 인프라 에이전트 샌드박스 실행 (P2) | fluid.sh |
| 5 | awesome-openrouter | OpenRouter 생태계 참조, GitBug 패턴 | github.com/OpenRouterTeam/awesome-openrouter |
| 6 | openrouter-examples | OpenRouter API 통합 구현 참조 | github.com/OpenRouterTeam/openrouter-examples |

---

## 9. 오퍼레이션/운영 및 모니터링
<!-- CHANGED: 운영/모니터링 체계, 롤백/단계적 배포, 비용통제 등 운영 관점 기능 요구사항 신설 및 데이터/로그/모니터링 정책 상세화 -->
### 9.1 운영/모니터링 대시보드
- 에이전트/모델별 토큰 사용량/비용/성공률/실패율/품질점수 실시간 시각화
- 장애 감지(SLA 99% 미만, 연속 실패율, 외부 API 응답 지연 등) 및 알림(이메일, Slack 등)
- 비용 초과 예산 알림(월간 한도, Task별 한도, 급증 감지)
- 모델/에이전트 단위 동적 활성화/비활성화(Feature Flag)
- 반복 루프(Optimizer) 실행시 총 비용, 반복 회수, 중단 내역 기록
<!-- CHANGED: 데이터/로그/감사 정책, 개인정보 유출 감시, 운영 로그 보관 정책 추가 -->
- 모든 API 호출/응답/비용/오류/품질 점수/개인정보 마스킹 상태를 구조화 로그로 저장(Cloudflare D1/Blob)
- 로그 보관 정책: 최소 1년, 개인정보/식별자 포함 시 6개월, 접근 로그·감사 내역 별도 관리
- 개인정보 유출 감시: 의심 로그 발생 시 실시간 경고 및 감사팀 자동 알림

<!-- CHANGED: 분산 트레이싱 및 관측 가능성, 운영 인프라 선구축 언급 -->
- 멀티모델·멀티에이전트 전체 호출 체인을 추적하는 분산 트레이싱(OpenTelemetry 등) 도입 검토
- 운영 대시보드/Feature Flag/비용 알람/Canary 배포 프레임워크는 MVP 개발과 병행 또는 선행 구축

### 9.2 롤백/단계적 배포 전략
- Canary 배포: 신규 에이전트/모델/워크플로우 기능 일부 사용자 그룹에 시범 적용, 이상 발생시 자동 롤백
- Feature Flag: 역할별/기능별 플래그 기반 점진적 적용 및 회수
- 통합 테스트/회귀 테스트 자동화, 장애 발생시 신속 복구 절차 명시

### 9.3 Fallback/비상절차
<!-- CHANGED: Fallback/비상절차 구체화 및 장애 대응 매뉴얼 명시 -->
- 외부 API 장애, 요금 폭등, SLA 미달, 보안 사고 등 발생 시 단계별 운영 매뉴얼(예: 1차 Fallback→Anthropic, 2차 수동 리뷰 대체, 3차 긴급 롤백) 문서화
- 장애 발생시 담당자(Foundry-X Core팀/운영팀) 즉시 알림 및 위기 대응 프로세스 실행
- 장애 이력·조치 결과는 운영 대시보드 및 주간 리포트에 기록

---

## 10. 품질/성능/비용 검증 및 벤치마킹
<!-- CHANGED: 실제 품질/비용 벤치마킹 계획, A/B 테스트 등 추가, 테스트 데이터셋 선정/운영 절차 명확화 -->
- 멀티모델/멀티에이전트 도입 효과 검증을 위해 다음 절차를 수행:
    - 도입 전/후 자동화율, 코드 품질, 리뷰/테스트 소요 시간, 결함률 등 전수 비교
    - 공개/내부 벤치마크 데이터셋(샘플 PR, 리팩토링, 보안 이슈 등) 구축 및 정기 human-in-the-loop 평가(Human Review, 블라인드 평가 병행)
    - 비용-성능(A/B 테스트) 실증: 동일 태스크에 대해 단일모델 vs 멀티모델 결과 및 비용 비교
    - 반복 루프(Optimizer) 적용시 품질 향상률 및 비용 대비 효과 수치화
    - 벤치마크/테스트 데이터셋 선정·운영은 QA팀과 공동 관리, 분기별 갱신

---

## 11. 리스크 관리
<!-- CHANGED: 리스크 항목 보완 및 SPOF, 단일 게이트웨이 의존, 데이터 흐름/아키텍처/운영 복잡도/Fallback 등 추가 -->
### 11.1 주요 리스크 및 대응

| # | 리스크 | 설명 | 대응 |
|---|--------|------|------|
| 1 | 외부 API 의존 | OpenRouter/Anthropic SLA 미확인, 장애/요금 폭등/정책 변경 시 전면 중단 위험 | Fallback 체인 확보, 주기적 SLA 점검, 대체 API(다른 게이트웨이/직접 LLM 연결) 검토, SPOF 완화 |
| 2 | 인력 부족 | 1인 개발로 전체 기능/운영 불가, 일정·품질 저하 | 기능 범위 조정/우선순위 재설정, 추가 인력 확보 추진, MVP 선행/Phase 분할 |
| 3 | 보안 정책 불확실 | KT DS 정책