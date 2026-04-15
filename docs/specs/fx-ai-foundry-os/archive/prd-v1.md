# fx-ai-foundry-os PRD

**버전:** v1
**날짜:** 2026-04-15
**작성자:** AX BD팀 (Sinclair)
**상태:** 🔄 검토 중 (Round 1 예정)
**참조:** `docs/specs/AI_Foundry_OS_DeepDive_v0.3.html`, Decode-X 레포 (https://github.com/KTDS-AXBD/Decode-X)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
AX사업1/2팀 수행인력이 SI/ITO 고객사에 투입될 때 "가방에 넣어가는 3대 자산(Harness·AI Engine·Ontology) + Spec"을 현실에서 돌아가는 제품으로 만들고, '26-04-17 대표 보고에서 "퇴직연금 중도인출" Type 1 반제품을 시연한다.

**배경:**
DeepDive v0.3이 정의한 AI Foundry OS 비전을 지금까지는 "Foundry-X 자체 개발(Phase 1~44)"의 메타 적용으로만 입증해왔다. 외부 보고·수주를 위해서는 (1) Input Plane(Decode-X) 실제 파이프라인, (2) Control Plane 3대 자산의 구체적 툴킷, (3) 대표 보고용 "작동하는 데모" 3가지가 동시에 필요하다. 다행히 KTDS-AXBD가 **Decode-X 레포(Phase 2-E 완료, 847+ tests GREEN)**를 이미 운영 중이므로 이를 zero에서 만들 필요가 없다. fx-ai-foundry-os는 **Foundry-X ↔ Decode-X를 연결하는 Control/Presentation Plane**의 MVP다.

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

## 6. 제약 조건

### 6.1 일정

- **1차 MVP: 2026-04-17(금) 09:00 한국시각** (~42시간, 2026-04-15 15:00 기준)
- 2차 파일럿: '26 하반기 (SI/ITO 고객사 1건)

**42시간 마일스톤 (시간별):**
- M1 (H+0~H+8): Decode-X 레포 상세 분석 + fx-decode-bridge 설계 + SPEC.md F-item 등록 (F545~F549 예상)
- M2 (H+8~H+20): `/ai-foundry-os` 라우트 + 3-Plane 카드 UI + fx-decode-bridge 5 라우트 구현
- M3 (H+20~H+32): 퇴직연금 데모 페이지 + Type 1 반제품 생성 스크립트 + Harness UI
- M4 (H+32~H+40): KG XAI 뷰어 + 배포 + rehearsal (1차 전체 walkthrough)
- M5 (H+40~H+42): 최종 버그픽스 + 대표 보고 리허설

### 6.2 기술 스택

- **프론트엔드**: 기존 Foundry-X Web (Vite 8 + React 18 + React Router 7 + Zustand)
- **백엔드**: 기존 Foundry-X API (Hono + Cloudflare Workers + D1) — `packages/api/src/core/decode-bridge/` 신설
- **인프라**: Cloudflare Pages (fx.minu.best) + Workers (foundry-x-api) + Decode-X 기존 배포
- **기존 의존**: Decode-X Workers API 경유 (service binding 가능하면 사용, 아니면 fetch)
- **Ontology MCP**: P1 — stdio MCP 서버 스켈레톤만 (정식 노출은 2차)

### 6.3 인력/예산

- **인원**: Sinclair 1명 + AI Squad (Claude Sonnet 4.6 중심, Claude Squad 병렬 가능 시 활용)
- **예산**: 추가 예산 없음 (기존 Foundry-X Cloudflare + OpenRouter 시크릿 재사용)

### 6.4 컴플라이언스

- **kt ds 내부 IP/지식자산**: Spec 자산은 내부 귀속. prd-final.md는 KTDS-AXBD/Foundry-X 리포에 private 아님(public repo). DeepDive 문서는 이미 public 상태 유지
- **고객사 개인정보**: 퇴직연금 데모는 **가명·모크 데이터 전용** (Decode-X PRD 1.6 따라 org_id/document_id 모두 synthetic)
- **AI 생성 IP**: Claude/OpenRouter 생성물은 kt ds 귀속 (Anthropic/OpenRouter 약관 확인 완료 가정)

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Decode-X Worker의 퍼블릭 URL + X-Internal-Secret 값 확보 | Sinclair | H+2 |
| 2 | Service Binding 가능 여부 — Decode-X가 ktds-axbd 계정, Foundry-X도 동일 계정인지 확인 | Sinclair | H+2 |
| 3 | "퇴직연금 Type 1 반제품"의 구체 산출물 포맷 — code-only? code+test+spec zip? | Sinclair + 대표 보고 담당 | H+8 |
| 4 | Neo4j 접근 경로 — Decode-X API가 KG 조회 엔드포인트 제공하는지, 없으면 mock D3 데이터 필요 | Sinclair | H+4 |
| 5 | MCP 서버(P1) 드롭 기준 — H+32 시점에 P0 미완 시 자동 포기 | Sinclair | H+32 |
| 6 | 대표 보고 리허설 시점 + AX BD팀 리더 동반 여부 | 대표 보고 담당 | H+40 |
| 7 | Ontology MCP 서버 '27 계획을 MVP에서 당긴 것 — "선공개 vs '27 정식 노출" 충돌 검토 | Sinclair | H+8 |

---

## 8. 리스크 및 대응

| # | 리스크 | 확률 | 영향 | 대응 |
|---|--------|:---:|:---:|------|
| R1 | 42시간 데드라인 미달 (P0 5개 중 일부 구현 실패) | **높음** | 치명 | Plan B: DeepDive HTML + 스크린샷 정적 보고. M4(H+32) 시점에 Go/No-Go 판정 |
| R2 | Decode-X API spec 불명확 → 연동 실패 | 중 | 높음 | 오픈이슈 #1, #2 H+2까지 해소. 실패 시 mock 데이터로 시연 경로 유지 |
| R3 | 퇴직연금 Type 1 반제품 산출 실패 | 중 | 높음 | Decode-X 기존 분석 결과(있으면)를 그대로 "반제품 프리뷰"로 시각화, zip 생성은 스크립트 한 번 |
| R4 | Cloudflare Pages 배포 지연 (CI/CD 장애) | 낮음 | 높음 | 로컬 `pnpm dev` 데모 백업 경로 확보 |
| R5 | 대표가 "Foundry-X와 Decode-X가 왜 따로 있냐"고 질문 | 중 | 중 | 보고 시 "Foundry-X = 3-Plane 전체 오케스트레이터, Decode-X = Input Plane 전문 엔진. 둘을 엮는 게 AI Foundry OS" 메시지 준비 |
| R6 | Spec IP 귀속 문서 법무 미확인 | 낮음 | 중 | H+24까지 kt ds 법무팀에 확인 요청 (확인 안 되면 PRD 6.4 단서만 유지) |
| R7 | AI 생성 코드 품질이 시연에 부적합 | 중 | 중 | Type 1 반제품은 AI 자동생성이 아니라 **기존 퇴직연금 SI 코드에서 추출한 템플릿** 으로 1단계 단순화 |

---

## 9. 기술 아키텍처 스케치

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

## 10. SPEC/Sprint 등록 계획 (Phase 6 사전 안)

- **F545** (P0): `/ai-foundry-os` 3-Plane 랜딩 + 라우팅
- **F546** (P0): fx-decode-bridge 연동 레이어 (core/decode-bridge/)
- **F547** (P0): 퇴직연금 Type 1 시연 페이지 + 반제품 생성 스크립트
- **F548** (P0): Harness 5종 체크리스트 UI
- **F549** (P0): KG XAI 뷰어 (read-only)
- **F550** (P1, 2차 이월 후보): AI-Ready 6기준 실시간 검증 + Ontology MCP 서버 스켈레톤

**Sprint 배정 (초안):** 42시간이라 Sprint WT 병렬보다 master 직접 + 핫픽스 전략. F545~F549를 하나의 Sprint 298 내에서 직렬 처리 + PR 단위 분리.

---

## 11. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| v1 초안 | 2026-04-15 | 최초 작성 — DeepDive v0.3 + Phase 1 인터뷰 + Decode-X 레포 스캔 반영. 42시간 데드라인 반영한 범위 현실화 | - |

---

*이 문서는 ax:req-interview 스킬에 의해 자동 생성 및 관리됩니다.*
