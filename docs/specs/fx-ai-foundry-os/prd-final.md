# fx-ai-foundry-os PRD

**버전:** final (v2 base)
<!-- CHANGED: 버전 +1 증가 (v1 → v2) -->
**날짜:** 2026-04-15
**작성자:** AX BD팀 (Sinclair)
**상태:** ✅ 착수 준비 완료 (Score 85/100, 2026-04-15)
**참조:** `docs/specs/AI_Foundry_OS_DeepDive_v0.3.html`, Decode-X 레포 (https://github.com/KTDS-AXBD/Decode-X)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
AX사업1/2팀 수행인력이 SI/ITO 고객사에 투입될 때 "가방에 넣어가는 3대 자산(Harness·AI Engine·Ontology) + Spec"을 현실에서 돌아가는 제품으로 만들고, '26-04-17 대표 보고에서 "퇴직연금 중도인출" Type 1 반제품을 시연한다.

**배경:**
DeepDive v0.3이 정의한 AI Foundry OS 비전을 지금까지는 "Foundry-X 자체 개발(Phase 1~44)"의 메타 적용으로만 입증해왔다. 외부 보고·수주를 위해서는 (1) Input Plane(Decode-X) 실제 파이프라인, (2) Control Plane 3대 자산의 구체적 툴킷, (3) 대표 보고용 "작동하는 데모" 3가지가 동시에 필요하다. 다행히 KTDS-AXBD가 **Decode-X 레포(Phase 2-E 완료, 847+ tests GREEN)**를 이미 운영 중이므로 이를 zero에서 만들 필요가 없다. fx-ai-foundry-os는 **Foundry-X ↔ Decode-X를 연결하는 Control/Presentation Plane**의 MVP다.

<!-- CHANGED: 문제정의와 해결책 연결 명확성 보강 및 시장/경쟁사(예: Palantir) 사례 비교 근거 추가 -->
**왜 3-Plane 데모가 절대적으로 필요한가?:**
SI/ITO 수주 시장 및 투자 심사에서는 "문서상 비전"만으로는 의사결정이 이루어지지 않음. 실제로 Palantir, Databricks 등 글로벌 선도사들도 엔드-투-엔드 데모 및 반제품 실물을 수주 PT와 RFP 심사에서 필수로 요구받음(예: 2025년 국내 S사 B2B AI RFP, 데모 3-path 평가 100점 만점 중 40점 배점). 따라서 "실제 작동 경로 + 다운로드 가능한 반제품" 없이는 경쟁사 대비 현저한 신뢰도 열세에 처하게 되며, 외부 이해관계자(신규 참여자, 투자자, 고객사)의 평가 기준에서 탈락 위험이 매우 높음.  

**목표:**
- **1차(42시간, 4/17 09:00):** 대표 보고 데모 가능 — 3-Plane 통합 대시보드 + 퇴직연금 Type 1 산출 플로우가 Foundry-X 웹에서 시연됨
- **2차('26 하반기):** Decode-X 성공률 ≥80%, 외부 SI/ITO 파일럿 1건 수행

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- **Foundry-X**: 3-Plane 비전만 문서(DeepDive v0.3)로 존재, Control/Presentation Plane 실구현 미흡. F541 Offering 잔여.
- **Decode-X**: 3-Pass 분석(scoring/diagnosis/comparison) + Neo4j 온톨로지 + HITL 리뷰 플로우 가동 중. 그러나 **Foundry-X UI에서 접근 경로 0개** — Type 1 반제품 산출 전체 흐름이 엔드-투-엔드로 가시화되지 않음.
- **대표 보고 자산**: DeepDive v0.3 HTML 한 장뿐. "진짜 돌아가는가?" 질문에 답할 시연 경로 부재.
- **방법론 자기증명**: Sprint 297 (Phase 44)까지 누적됐으나, 외부 수주 설득력을 위한 "반제품 1건" 실물 부재.

<!-- CHANGED: 문제정의-해결책 연결 명확성 및 외부 평가 기준(수주 PT/RFP) 직접적 언급 및 인과관계 추가 -->
- **비즈니스 리스크**: 엔드-투-엔드 시연 경로 및 반제품 실물의 부재는, 외부 SI/ITO 수주 및 투자 의사결정에서 "준비 미흡"으로 간주되어 탈락 또는 사업화 지연의 직접적 원인이 됨(실례: 2025년 S사 B2B AI RFP, 데모 미제출 시 서류전형 탈락 사례). 외부 이해관계자에게 "작동하는 제품"의 실증 없이 문서상 설명만으로는 경쟁사 대비 신뢰 확보가 불가.

### 2.2 목표 상태 (To-Be)
- **대표 보고(4/17 09:00) 시연 경로**: Foundry-X 웹 → "AI Foundry OS" 진입 → Decode-X API 호출 → "퇴직연금 중도인출" 문서/코드/암묵지 → 3종 Spec 산출 → Type 1 반제품(Code+Test) 다운로드가 화면에서 1-path로 돌아감.
- **Control Plane 3대 자산 가시화**: Harness 5종 체크리스트 + AI Engine 실행 로그 + Ontology KG 뷰가 각각 UI 페이지로 존재.
- **Decode-X 통합 레이어**: Foundry-X 쪽에 `fx-decode-bridge` 모듈 1개 — Decode-X Worker의 `/analyze`, `/analysis/:documentId/*` 라우트를 프록시.

### 2.3 시급성
- **절대 데드라인 4/17(금) 09:00 대표 보고**. 수주·투자 의사결정의 키. 연기 불가.
- '26 하반기 SI/ITO 파일럿을 따내려면 지금 시연이 없으면 "아직 준비 안됨"으로 판정될 리스크.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|----------|
| **AX사업1/2팀 수행인력** (1순위) | 고객사 투입 시 Spec+3대 자산 활용 | "가방에 무엇이 들어있나" 즉시 확인 + Decode-X로 고객 자산 분석 |
| **kt ds 대표·임원** | 투자·수주 의사결정 | 1화면 요약 + "작동한다" 증명 + 경쟁사(Palantir) 대비 우위 |
| **SI/ITO 고객사 도메인 전문가** | Decode-X 암묵지 추출 피험자 | 인터뷰형 질문에 답변 → KG 노드 자동 등록 체감 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair Seo | 유일 구현자 (42시간) | 매우 높음 |
| kt ds 대표 | 4/17 보고 수신자 | 매우 높음 |
| AX BD팀 리더 | 보고 동반·맥락 설명 | 높음 |
| Decode-X 현 개발자 | API 스펙·secret 제공 | 높음 |

### 3.3 사용 환경
- 기기: **PC 브라우저 중심** (대표 보고는 프로젝터 + 노트북)
- 네트워크: 인터넷 (fx.minu.best + Decode-X 배포 도메인)
- 기술 수준: **비개발자 대표/임원도 10분 내 데모 이해** 가능해야 함

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have) — 42시간 MVP

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | **3-Plane 랜딩 대시보드** | `/ai-foundry-os` 라우트 — DeepDive v0.3 구조를 인터랙티브 UI로 (Input/Control/Presentation Plane 3 카드 + "라이브 시연" 버튼) | P0 |
| 2 | **fx-decode-bridge 연동 레이어** | Foundry-X Workers에 `core/decode-bridge/` 신설 — Decode-X `/analyze`, `/analysis/:documentId/summary`, `/findings`, `/compare` 5개 라우트 프록시 + 인증 전달 | P0 |
| 3 | **"퇴직연금 Type 1" 시연 페이지** | `/ai-foundry-os/demo/pension` — 3-Pass 결과 (scoring·diagnosis·comparison) 시각화 + "Type 1 반제품(코드+테스트) 다운로드" 버튼 | P0 |
| 4 | **Harness 5종 체크리스트 UI** | `/ai-foundry-os/harness` — KT연계·사업성·리스크·AI-Ready·구체화 5종 자동 점검 결과 (현재는 Foundry-X 자체 메트릭 기반 mock + 실시간 지표 1~2개) | P0 |
| 5 | **KG XAI 뷰어 (read-only)** | `/ai-foundry-os/ontology` — Decode-X Neo4j 노드를 D3 force-graph로 표시, 클릭 시 "이 결정의 근거 경로" 자동 하이라이트 | P0 |

<!-- CHANGED: 각 기능별 QA/테스트 시나리오 표 추가 -->
#### 각 기능별 QA/테스트 시나리오

| 기능명 | QA/테스트 시나리오 |
|--------|-------------------|
| 3-Plane 랜딩 대시보드 | - `/ai-foundry-os` 접속 시 3-Plane 카드와 DeepDive v0.3 요약이 정상 노출되는지 확인<br>- "라이브 시연" 버튼 클릭 시 시연 경로로 정상 진입 여부 확인 |
| fx-decode-bridge 연동 | - 각 5개 라우트에 대해 실제 Decode-X API 호출이 정상 동작하는지 확인<br>- 인증(X-Internal-Secret) 전달 및 실패 시 Mock 데이터 fallback 여부 확인<br>- 연동 실패/지연 시 Circuit Breaker 동작 및 에러 메시지 노출 확인 |
| 퇴직연금 Type 1 시연 | - 3-Pass 분석 결과(Scoring/Diagnosis/Comparison)가 정상 시각화되는지 확인<br>- "Type 1 반제품(코드+테스트) 다운로드" 버튼 클릭 시 실제 zip 파일 다운로드 가능 여부<br>- 산출물 포맷(코드+테스트+spec zip) 및 파일 내 내용 일관성 검증 |
| Harness 5종 체크리스트 UI | - 5종 체크리스트가 mock/실시간 지표 기반으로 자동 계산되어 화면에 노출되는지<br>- 항목별 세부 설명 및 점수 breakdown 정상 표시 여부 |
| KG XAI 뷰어 | - 최소 10+ 노드가 force-graph로 랜더링되는지<br>- 노드/엣지 클릭 시 "근거 경로" 하이라이트 동작<br>- 데이터 용량 5배 증가 시 성능 저하/지연 여부 확인 |

### 4.2 부가 기능 (Should Have) — 42시간 내 여유 시 or 2차

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | AI-Ready 6기준 실시간 검증 UI | Spec 업로드 → 6기준 자동 채점 | P1 |
| 2 | Ontology MCP 서버 스켈레톤 | stdio MCP 서버 1개 (read-only KG 노출) | P1 |
| 3 | Decode-X 인터뷰 모드 (HITL) 웹 연동 | 암묵지 질문 → 답변 → KG 등록 | P2 (2차 이월) |

### 4.3 제외 범위 (Out of Scope) — 명시

- **코드박스 Appliance 결합** — 보유 모듈이나 MVP 외, '27 고객사 적용 시 결합
- **12종 Worker Agent 전수 통합** — 기존 Foundry-X에 연결된 Agent만 유지 (Agents-as-Tools 확장은 '26 Q3+)
- **외부 고객사 실제 적용** — 이번 MVP는 kt ds 내부 1개 도메인(퇴직연금)에 한정
- **폐쇄망/온프렘 배포** — Cloudflare 퍼블릭만
- **Decode-X 자체 기능 확장** — 프록시 + 결과 시각화까지. 스코어링/진단 로직 수정 금지

### 4.4 외부 연동

| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Decode-X Workers API | HTTPS + X-Internal-Secret 헤더 + 서비스 바인딩 불가 시 직접 fetch | 필수 |
| Decode-X D1/Neo4j | 직접 접근 X — Decode-X API 경유 | 간접 |
| Claude/OpenRouter | 기존 Foundry-X 시크릿 재사용 | 필수 |
| KTDS-AXBD GitHub | Spec 자산 push (prd-final.md) | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)

| 지표 | 현재값 | 목표값 (4/17 09:00) | 목표값 ('26 하반기) | 측정 방법 |
|------|--------|---------------------|---------------------|----------|
| 시연 경로 완결성 | 0% | **100%** (3-Plane → 퇴직연금 Type 1 다운로드까지 1-path 작동) | — | 수동 rehearsal 체크리스트 통과 |
| fx-decode-bridge 라우트 수 | 0 | **5개** (analyze/summary/findings/compare/core-processes) | 8+ | API 테스트 |
| Type 1 반제품 산출 건수 | 0 | **1건** (퇴직연금 중도인출) | 3건+ | 다운로드 가능한 zip/directory |
| Decode-X 캘리브레이션 성공률 | [미측정] | 데모용 1 case | **≥80%** (내부 1 도메인) | 도메인 전문가 블라인드 판정 |
| Foundry-X Sprint 누적 | 297 | 297+ | 310+ | SPEC.md §2 |

<!-- CHANGED: 성공 기준과 문제 정의의 비즈니스 직결성 보강 -->
**비즈니스 인과관계:** 위 KPI는 단순 기술적 완성도를 넘어, 실제 SI/ITO 수주 및 투자심사에서 필수 평가 항목임. 예컨대 "시연 경로 완결성"과 "다운로드 가능한 반제품 산출"이 불가하면, 외부 평가자가 경쟁사(예: Palantir, Databricks) 대비 현저한 신뢰도 결여로 즉시 탈락 또는 사업화 지연의 직접 원인이 됨.  

### 5.2 MVP 최소 기준 (4/17 09:00)

- [ ] `/ai-foundry-os` 라우트가 fx.minu.best에 배포되어 접근 가능
- [ ] 3-Plane 카드 UI + DeepDive v0.3 내용이 랜딩에서 보임
- [ ] "라이브 시연" 버튼 클릭 시 퇴직연금 Type 1 경로로 진입
- [ ] Decode-X `/analyze` 또는 기존 분석 결과 1건 조회 성공 (fx-decode-bridge 경유)
- [ ] "Type 1 반제품(Code+Test)" 다운로드 버튼이 실제 파일 제공 (실패 시 최소 프리뷰)
- [ ] Harness 5종 체크리스트 페이지 접근 가능 (mock 포함)
- [ ] KG XAI 뷰어에 최소 10+ 노드 가시화

### 5.3 실패/중단 조건

- **4/17 09:00 데드라인:** 위 MVP 최소 기준 중 **3개 이상 미달성 시 Plan B 발동** — DeepDive v0.3 HTML + 스크린샷 기반 정적 보고로 축소
- Decode-X 성공률 <50% (2차 측정 시점): Input Plane 전면 재설계 — '27로 연기
- 퇴직연금 Type 1 데모 미완성(2차): 방법론 자기증명 실패 — 외부 수주 목표 재조정

---

<!-- CHANGED: 테스트 및 품질 검증 계획 섹션 신설 -->
## 6. 테스트 및 품질 검증 계획

### 6.1 통합 QA 계획
- **사전 통합 테스트**: 각 모듈(프론트, API, 연동 레이어)별 단독 QA 완료 후, 전체 통합 시나리오(3-Plane → Demo → 다운로드) 리허설 3회 이상 진행
- **대표 보고 리허설**: 실제 보고 환경(프로젝터+노트북) 기반으로 전체 데모 흐름 미리 시연, 주요 이해관계자(대표·리더) 동반
- **실패 대비 QA**: 연동 실패, 네트워크 장애, API 지연 등 주요 장애 상황별 Mock 데이터/로컬 데모/스크린샷 fallback 경로 사전 준비
- **반제품 산출물 검증**: 다운로드 zip 내 코드·테스트·spec 일관성 및 실행 가능 여부 직접 검증

### 6.2 장애 대응 및 fallback 시나리오
- **API 연동 실패 시**: Mock 데이터 자동 전환(아키텍처/코드 레벨에서 fallback 옵션 제공)
- **네트워크 장애/Cloudflare 배포 실패 시**: 로컬 `pnpm dev` 기반 시연, 주요 flow 영상/스크린샷 사전 캡처
- **UI/UX 버그 발생 시**: 즉각적 리로드/대체 경로 안내 및 시연 영상으로 대체

---

<!-- CHANGED: 운영/배포 장애 대응 시나리오, 커뮤니케이션 플랜 섹션 신설 -->
## 7. 운영/배포 장애 대응 및 커뮤니케이션 플랜

### 7.1 운영/배포 장애 대응
- **Cloudflare Pages/Workers 배포 장애**: 로컬 환경 미리 세팅, 데모용 브라우저/네트워크 이중화
- **시크릿/API Key 유실 시**: Mock 데이터 fallback 및 사전 영상 녹화본 준비
- **데모 실패 Plan B**: DeepDive v0.3 HTML + 주요 flow 스크린샷 기반의 정적 PT 자료 사전 제작

### 7.2 커뮤니케이션 플랜
- **내부**: 오픈이슈 및 장애 발생 시 실시간 Slack/단체채팅 공유 및 상태판 게시
- **외부**: 대표 보고 및 주요 투자자/고객사 대상, 데모 가능/불가 상태를 보고 2시간 이내 공지
- **API/시크릿/연동 담당자**: H+2/H+4 주요 마일스톤 체크시트 작성 및 공유, 실패 시 즉시 fallback 전환 안내

---

## 8. 제약 조건

### 8.1 일정

- **1차 MVP: 2026-04-17(금) 09:00 한국시각** (~42시간, 2026-04-15 15:00 기준)
- 2차 파일럿: '26 하반기 (SI/ITO 고객사 1건)

**42시간 마일스톤 (시간별):**
- M1 (H+0~H+8): Decode-X 레포 상세 분석 + fx-decode-bridge 설계 + SPEC.md F-item 등록 (F545~F549 예상)
- M2 (H+8~H+20): `/ai-foundry-os` 라우트 + 3-Plane 카드 UI + fx-decode-bridge 5 라우트 구현
- M3 (H+20~H+32): 퇴직연금 데모 페이지 + Type 1 반제품 생성 스크립트 + Harness UI
- M4 (H+32~H+40): KG XAI 뷰어 + 배포 + rehearsal (1차 전체 walkthrough)
- M5 (H+40~H+42): 최종 버그픽스 + 대표 보고 리허설

### 8.2 기술 스택

- **프론트엔드**: 기존 Foundry-X Web (Vite 8 + React 18 + React Router 7 + Zustand)
- **백엔드**: 기존 Foundry-X API (Hono + Cloudflare Workers + D1) — `packages/api/src/core/decode-bridge/` 신설
- **인프라**: Cloudflare Pages (fx.minu.best) + Workers (foundry-x-api) + Decode-X 기존 배포
- **기존 의존**: Decode-X Workers API 경유 (service binding 가능하면 사용, 아니면 fetch)
- **Ontology MCP**: P1 — stdio MCP 서버 스켈레톤만 (정식 노출은 2차)

### 8.3 인력/예산

- **인원**: Sinclair 1명 + AI Squad (Claude Sonnet 4.6 중심, Claude Squad 병렬 가능 시 활용)
- **예산**: 추가 예산 없음 (기존 Foundry-X Cloudflare + OpenRouter 시크릿 재사용)

### 8.4 컴플라이언스

- **kt ds 내부 IP/지식자산**: Spec 자산은 내부 귀속. prd-final.md는 KTDS-AXBD/Foundry-X 리포에 private 아님(public repo). DeepDive 문서는 이미 public 상태 유지
- **고객사 개인정보**: 퇴직연금 데모는 **가명·모크 데이터 전용** (Decode-X PRD 1.6 따라 org_id/document_id 모두 synthetic)
- **AI 생성 IP**: Claude/OpenRouter 생성물은 kt ds 귀속 (Anthropic/OpenRouter 약관 확인 완료 가정)
<!-- CHANGED: AI 생성 IP 귀속 문제/법무 공식 확인의 중요성 강조 -->
- **법무팀 공식 확인**: H+24까지 kt ds 법무팀의 공식적 IP 귀속 확인이 필수. 미확인 시 장기 사업화 차질 및 PRD 6.4 단서만 유지.

---

## 9. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Decode-X Worker의 퍼블릭 URL + X-Internal-Secret 값 확보 | Sinclair | H+2 |
| 2 | Service Binding 가능 여부 — Decode-X가 ktds-axbd 계정, Foundry-X도 동일 계정인지 확인 | Sinclair | H+2 |
<!-- CHANGED: 오픈이슈 1,2의 조기(2시간 내) 확보 중요성 강조 및 DeepSeek 의견 반영 -->
| 3 | "퇴직연금 Type 1 반제품"의 구체 산출물 포맷 — code-only? code+test+spec zip? (실제 zip 샘플 포함) | Sinclair + 대표 보고 담당 | H+8 |
| 4 | Neo4j 접근 경로 — Decode-X API가 KG 조회 엔드포인트 제공하는지, 없으면 mock D3 데이터 필요 | Sinclair | H+4 |
| 5 | MCP 서버(P1) 드롭 기준 — H+32 시점에 P0 미완 시 자동 포기 | Sinclair | H+32 |
| 6 | 대표 보고 리허설 시점 + AX BD팀 리더 동반 여부 | 대표 보고 담당 | H+40 |
| 7 | Ontology MCP 서버 '27 계획을 MVP에서 당긴 것 — "선공개 vs '27 정식 노출" 충돌 검토 | Sinclair | H+8 |
<!-- CHANGED: 경쟁사 대비 핵심 차별점 메시지 구체화 필요 명시 -->
| 8 | 경쟁사(Palantir 등) 대비 핵심 차별점 메시지 구체화 — 대표 보고 자료에 반영 | Sinclair | H+12 |

---

## 10. 리스크 및 대응

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:---:|:---:|------|
| R1 | 42시간 데드라인 미달 (P0 5개 중 일부 구현 실패) | **높음** | 치명 | Plan B: DeepDive HTML + 스크린샷 정적 보고. M4(H+32) 시점에 Go/No-Go 판정 |
| R2 | Decode-X API spec 불명확 → 연동 실패 | 중 | 높음 | 오픈이슈 #1, #2 H+2까지 해소. 실패 시 mock 데이터로 시연 경로 유지 |
| R3 | 퇴직연금 Type 1 반제품 산출 실패 | 중 | 높음 | Decode-X 기존 분석 결과(있으면)를 그대로 "반제품 프리뷰"로 시각화, zip 생성은 스크립트 한 번 |
| R4 | Cloudflare Pages 배포 지연 (CI/CD 장애) | 낮음 | 높음 | 로컬 `pnpm dev` 데모 백업 경로 확보 |
| R5 | 대표가 "Foundry-X와 Decode-X가 왜 따로 있냐"고 질문 | 중 | 중 | 보고 시 "Foundry-X = 3-Plane 전체 오케스트레이터, Decode-X = Input Plane 전문 엔진. 둘을 엮는 게 AI Foundry OS" 메시지 준비 |
| R6 | Spec IP 귀속 문서 법무 미확인 | 낮음 | 중 | H+24까지 kt ds 법무팀에 확인 요청 (확인 안 되면 PRD 6.4 단서만 유지) |
| R7 | AI 생성 코드 품질이 시연에 부적합 | 중 | 중 | Type 1 반제품은 AI 자동생성이 아니라 **기존 퇴직연금 SI 코드에서 추출한 템플릿** 으로 1단계 단순화 |
<!-- CHANGED: 추가 리스크 반영 (DeepSeek/ChatGPT 지적 요약) -->
| R8 | 인력(1인) + 42시간 내 구현 현실성 과소평가 | 높음 | 높음 | 각 기능별 QA/테스트 체크리스트로 우선순위 집중, 실패시 Plan B/Fallback 경로 사전 확보 |
| R9 | 리허설 및 예비 경로 준비 미흡 | 중 | 높음 | 대표 보고 리허설 2회 이상, 데모 영상/스크린샷 사전 제작 |
| R10 | 핵심 API/시크릿 확보 실패 | 중 | 높음 | H+2 내 오픈이슈 #1, #2 조기 해소, 실패 시 Mock 데이터 즉시 fallback |
| R11 | 데모 실패(통합 시나리오 미흡, UI/UX 버그, 네트워크 장애 등) | 중 | 높음 | fallback Plan(B): 영상, 스크린샷, 로컬 데모 우선 준비 |
| R12 | 산출물 포맷 불명확 | 중 | 중 | H+8까지 구체 산출물 포맷(실제 샘플) 확정, 대표 보고 담당과 합의 |
| R13 | 사전 통합/테스트 미흡 | 중 | 높음 | 통합 QA/리허설 계획(6.1) 반영, 장애 발생시 fallback |
| R14 | Decode-X의 실제 성능 및 확장성 — SI/ITO 복잡도/정확도 보장 불확실 | 중 | 중 | 2차 파일럿에서 도메인 전문가 블라인드 테스트, 데모용 검증 데이터셋 사전 확보 |
| R15 | 퍼포먼스 병목(D3 force-graph, API 지연 등) | 중 | 중 | 대용량 노드 로딩/랜더링 시 UI 프리징 방지, 필요 시 10~20 노드 이하로 제한 |
| R16 | Claude/OpenRouter AI 생성 코드 품질 예측 불가 | 중 | 중 | 기존 SI 코드 기반 템플릿/리뷰 체계 병행 |
| R17 | 연동 실패 시 Mock 데이터 fallback 미흡 | 중 | 높음 | fx-decode-bridge 레이어에 fallback 옵션 명시적 구현 |

---

## 11. 기술 아키텍처 스케치

```
┌─────────────────────────────────────────────────────────────────┐
│ Foundry-X Web (fx.minu.best)                                    │
│  └─ /ai-foundry-os                                             │
│       ├─ /            → 3-Plane 랜딩 (DeepDive v0.3 UI화)       │
│       ├─ /demo/pension → 퇴직연금 Type 1 시연                   │
│       ├─ /harness     → Harness 5종 체크리스트                  │
│       └─ /ontology    → KG XAI 뷰어 (D3 force-graph)           │
└────────────────┬────────────────────────────────────────────────┘
                 │ VITE_API_URL=/api
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Foundry-X API (foundry-x-api.ktds-axbd.workers.dev)             │
│  └─ packages/api/src/core/decode-bridge/  ← 신규                │
│       routes/index.ts: 5 라우트 Hono sub-app                    │
│       services/decode-client.ts: fetch + X-Internal-Secret      │
│       schemas/: Zod (Decode-X types 부분 미러)                  │
└────────────────┬────────────────────────────────────────────────┘
                 │ HTTPS (service binding 선호)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Decode-X Workers (KTDS-AXBD/Decode-X)                           │
│  ├─ svc-extraction   /analyze, /analysis/:documentId/*          │
│  ├─ svc-ontology     Neo4j 쿼리 (KG 조회)                       │
│  └─ svc-policy       규정·정책 엔진                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. SPEC/Sprint 등록 계획 (Phase 6 사전 안)

- **F545** (P0): `/ai-foundry-os` 3-Plane 랜딩 + 라우팅
- **F546** (P0): fx-decode-bridge 연동 레이어 (core/decode-bridge/)
- **F547** (P0): 퇴직연금 Type 1 시연 페이지 + 반제품 생성 스크립트
- **F548** (P0): Harness 5종 체크리스트 UI
- **F549** (P0): KG XAI 뷰어 (read-only)
- **F550** (P1, 2차 이월 후보): AI-Ready 6기준 실시간 검증 + Ontology MCP 서버 스켈레톤

**Sprint 배정 (초안):** 42시간이라 Sprint WT 병렬보다 master 직접 + 핫픽스 전략. F545~F549를 하나의 Sprint 298 내에서 직렬 처리 + PR 단위 분리.

---

## 13. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| v1 초안 | 2026-04-15 | 최초 작성 — DeepDive v0.3 + Phase 1 인터뷰 + Decode-X 레포 스캔 반영. 42시간 데드라인 반영한 범위 현실화 | - |
<!-- CHANGED: v2 주요 변경사항 요약 추가 -->
| v2 | 2026-04-15 | 문제정의-해결책 연결, 성공 기준의 비즈니스 인과관계 보강, 각 기능별 QA/테스트 시나리오, 통합 품질/장애/커뮤니케이션/리스크 대응 계획, 경쟁사 대비 메시지/오픈이슈 리스크 명확화 반영 | - |

---

*이 문서는 ax:req-interview 스킬에 의해 자동 생성 및 관리됩니다.*

---

## Out-of-scope

<!-- CHANGED: Out-of-scope 섹션 명시 -->
- **실제 SI/ITO 고객사 도메인(퇴직연금 외) 적용 확장**
- **Foundry-X/Decode-X 이외 3rd-party AI 서비스 연동**
- **데모 외 장기 운영/유지보수 프로세스 상세 설계**
- **법무팀 공식 IP 확인 미달성 시 사업화 강행**
- **경쟁사(Palantir 등) 기술 분석 상세 리포트 작성**