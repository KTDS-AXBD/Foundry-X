---
code: FX-SPEC-PROPOSAL
title: "RFP 기반 제안서 자동 생성 Agent PRD"
version: 0.1
status: Draft
category: SPEC
created: 2026-04-10
updated: 2026-04-10
author: AX BD팀
references:
  - "axbd-offering/prd-final.md"
  - "fx-offering-pipeline/prd-final.md"
  - "fx-bd-quality-system/prd-final.md"
  - "ax-bd-atoz/prd-final.md"
  - "si-partner-rr.md"
---

# RFP 기반 제안서 자동 생성 Agent PRD

**버전:** 0.1 (Draft)
**날짜:** 2026-04-10
**작성자:** AX BD팀
**상태:** 초안

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
고객사 RFP(제안요청서)를 입력하면, Foundry-X의 기존 Offering/발굴 산출물을 자동 매핑하여 제안서 초안을 생성하고, GAN 품질 평가를 거쳐 최종 제안서를 산출하는 AI Agent 파이프라인.

**배경:**
AX BD팀의 사업개발 라이프사이클(수집→발굴→형상화→검증→제품화→GTM→평가) 중 **GTM 단계의 제안서 작성**이 가장 큰 병목이다. 현재 RFP 수신 후 제안서 작성까지 평균 2~3주가 소요되며, 다음 문제가 반복된다:

- RFP 요구사항을 수동으로 분석하여 항목별로 분해하는 데 1~2일 소요
- 기존 발굴 산출물(DiscoveryPackage)과 Offering을 수동으로 연결
- 제안서 섹션별 작성이 담당자 역량에 의존 — 품질 편차 큼
- 최종 검토 과정에서 RFP 요구사항 누락 발견 → 재작업 반복

**목표:**
1. RFP 업로드 → 제안서 최종본까지의 전체 파이프라인을 AI Agent로 자동화
2. 제안서 작성 소요 시간을 **2~3주 → 2~3일**로 단축 (초안 생성 4시간 이내)
3. RFP 요구사항 커버리지 100% 보장 (항목 누락 자동 감지)
4. 기존 Foundry-X 인프라(O-G-D, Offering, Agent Orchestration) 최대 재활용

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

| 구간 | 현재 방식 | 소요 시간 | 문제 |
|------|----------|----------|------|
| RFP 수신·분석 | 수동 읽기 + 엑셀 분해 | 1~2일 | 항목 누락, 해석 편차 |
| 요구사항 매핑 | 담당자 기억 기반 매핑 | 0.5~1일 | 기존 산출물 활용률 낮음 |
| 제안서 초안 작성 | Word/PPT 수동 작성 | 5~10일 | 담당자별 품질 편차, 반복 서술 |
| 내부 검토·수정 | 3회 이상 피드백 루프 | 3~5일 | 검토 기준 불일치 |
| 최종 제출 | 수동 포맷팅 + 제출 | 1일 | RFP 형식 요구 미준수 발견 |

**핵심 병목:**
- Foundry-X에 축적된 발굴 산출물(DiscoveryPackage)과 Offering이 제안서 작성에 자동으로 활용되지 않음
- RFP 요구사항 → 제안서 섹션 간 **추적 매트릭스(Traceability Matrix)**가 없어 누락 감지 불가
- Offering 스킬(v2)이 보고용/제안용/검토용 톤 변환을 지원하지만 RFP 구조에 맞춘 재배열은 미지원

### 2.2 목표 상태 (To-Be)

```
RFP 업로드 (PDF/HWP/DOCX)
    │
    ▼
[1] RFP Parser Agent ─── 요구사항 항목 분해 + 평가 기준 추출
    │
    ▼
[2] Requirement Mapper Agent ─── 기존 Offering/발굴 산출물 자동 매핑
    │                              + Gap 분석 (신규 작성 필요 항목 식별)
    ▼
[3] Section Generator Agent ─── 섹션별 초안 생성
    │                            (매핑된 산출물 + 제안서 템플릿 기반)
    ▼
[4] GAN Quality Evaluator ─── O-G-D 루프 품질 평가
    │                          (RFP 커버리지 + 논리성 + 설득력)
    ▼
[5] Human Review + Finalize ─── 검토·수정·최종 제출본 생성
```

### 2.3 시급성

- SI 파트너 협업 본격화(si-partner-rr.md) — 공동 제안서 작성 빈도 증가 예상
- 2026 Q2~Q3 수주 활동 본격화 — 제안서 생산성이 수주 확률에 직결
- 기존 Offering/O-G-D 인프라가 Phase 18(fx-offering-pipeline)에서 확립 — 재활용 준비 완료

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD 매니저 | 제안서 최종 검토·승인 | RFP 요구사항 커버리지 대시보드, 제안 전략 가시성 |
| BD 애널리스트 | 제안서 초안 작성·수정 | RFP 분석 자동화, 기존 산출물 자동 연결, 섹션별 편집 |
| SI 파트너 담당자 | 공동 제안서 작성 참여 | 협업 편집, 역할별 섹션 분담, 버전 관리 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX사업개발 본부장 | 제안서 최종 승인 | 높음 |
| 고객사 | RFP 발행 + 제안서 수신·평가 | 높음 |
| SI 파트너 | 사업 제안 영역 공동 작성 | 중간 |

### 3.3 사용 환경

| 항목 | 값 |
|------|-----|
| 기기 | PC (WSL + Claude Code CLI) + Foundry-X Web |
| 네트워크 | 사내망 + 인터넷 |
| 입력 포맷 | PDF, HWP, DOCX (RFP 원문) |
| 출력 포맷 | HTML (프리뷰), PPTX (제출용), PDF (최종본) |

---

## 4. 사용자 시나리오

### 4.1 메인 시나리오: RFP → 제안서 전체 플로우

**전제:** BD 애널리스트가 고객사로부터 RFP(PDF)를 수신.

1. **RFP 업로드**
   - Foundry-X Web `/app/proposals/new`에서 RFP 파일 업로드
   - 또는 CLI: `/ax:proposal create --rfp ./customer-rfp.pdf`
   - 시스템이 RFP 포맷 자동 감지 (PDF/HWP/DOCX)

2. **RFP 분석 (자동)**
   - RFP Parser Agent가 문서를 파싱하여 구조화된 요구사항 목록 생성
   - 평가 기준표 자동 추출 (배점 항목, 가중치)
   - 제안서 목차 요구사항 추출 (지정 목차가 있는 경우)
   - 결과: `rfp_requirements` 테이블에 항목별 저장

3. **Offering 매핑 (자동 + 수동 보정)**
   - Requirement Mapper Agent가 각 RFP 항목을 기존 Offering/발굴 산출물에 매핑
   - 매핑 결과를 Traceability Matrix로 시각화
   - Gap 분석: 매핑 불가 항목 = 신규 작성 필요 → 사용자에게 알림
   - 사용자가 매핑 결과 검토·보정 (drag & drop)

4. **제안서 초안 생성 (자동)**
   - Section Generator Agent가 섹션별 초안 생성
   - 매핑된 Offering 콘텐츠를 제안서 톤으로 변환 (Offering 콘텐츠 어댑터 활용)
   - RFP 지정 목차가 있으면 해당 구조 준수, 없으면 표준 제안서 목차 적용
   - 각 섹션에 RFP 요구사항 항목 번호 자동 태깅

5. **GAN 품질 평가 (자동)**
   - O-G-D 루프 실행: Generator(초안) ↔ Discriminator(평가)
   - 평가 차원: RFP 커버리지율, 논리 일관성, 설득력, 차별화 포인트, 형식 준수
   - Pass/Fail + 항목별 개선 제안 → 자동 재생성 (최대 3회)
   - 결과: 품질 점수 + 상세 피드백 대시보드

6. **검토 및 최종 제출**
   - BD 매니저가 품질 평가 결과와 초안을 검토
   - 섹션별 편집 UI에서 수정 (기존 Offering 섹션 에디터 재활용)
   - SI 파트너 담당자에게 특정 섹션 할당 가능 (협업 모드)
   - 최종 승인 → PPTX/PDF 자동 변환 + 제출 패키지 생성

### 4.2 보조 시나리오

| 시나리오 | 설명 |
|---------|------|
| **RFP 비교 분석** | 과거 유사 RFP와 비교하여 win/loss 패턴 분석 |
| **부분 재생성** | 특정 섹션만 선택하여 재생성 (나머지 유지) |
| **제안서 버전 관리** | 검토 피드백별 버전 분기, diff 비교 |
| **제안 전략 수립** | RFP 분석 기반 강점/약점 매칭, 차별화 전략 제안 |

---

## 5. 핵심 기능

### 5.1 Must Have (P0)

| # | 기능 | 설명 |
|---|------|------|
| 1 | **RFP Parser** | PDF/HWP/DOCX 파싱, 요구사항 항목 분해, 평가 기준 추출, 목차 요구사항 추출 |
| 2 | **Requirement Mapper** | RFP 항목 ↔ 기존 Offering/DiscoveryPackage 자동 매핑, Traceability Matrix 생성, Gap 식별 |
| 3 | **Section Generator** | 매핑 기반 섹션별 초안 생성, 제안서 톤 변환, RFP 목차 구조 준수 |
| 4 | **GAN Quality Evaluator** | O-G-D 루프 기반 품질 평가 — RFP 커버리지, 논리성, 설득력, 형식 준수 |
| 5 | **Traceability Matrix UI** | RFP 항목 ↔ 제안서 섹션 추적 매트릭스 시각화, 커버리지율 대시보드 |
| 6 | **제안서 Export** | PPTX/PDF/HTML 포맷 변환 + 제출 패키지 생성 |

### 5.2 Should Have (P1)

| # | 기능 | 설명 |
|---|------|------|
| 7 | **RFP 비교 분석** | 과거 RFP 유사도 분석, win/loss 패턴 기반 전략 제안 |
| 8 | **협업 편집** | SI 파트너와 섹션별 분담 작성, 실시간 편집 상태 표시 |
| 9 | **제안 전략 Advisor** | RFP 분석 기반 강점/약점 분석, 차별화 포인트 자동 추천 |
| 10 | **버전 관리** | 검토 피드백별 버전 분기, 섹션별 diff 비교 |

### 5.3 Nice to Have (P2)

| # | 기능 | 설명 |
|---|------|------|
| 11 | **HWP 네이티브 Export** | 공공기관 제출용 HWP 형식 직접 출력 |
| 12 | **자동 가격 산출** | RFP 요구사항 기반 공수·비용 자동 추정 |
| 13 | **제안서 템플릿 마켓** | 산업별/고객 유형별 제안서 템플릿 관리 |

---

## 6. Agent 아키텍처

### 6.1 Agent 구성

기존 Foundry-X Agent 인프라(Phase 14 Agent Orchestration)를 활용하여 4개 전문 Agent + 1개 Orchestrator로 구성한다.

```
proposal-orchestrator (오케스트레이터)
│
├── rfp-parser-agent
│   ├── 입력: RFP 파일 (PDF/HWP/DOCX)
│   ├── 처리: 문서 파싱 → 구조화 → 항목 분해
│   └── 출력: RfpRequirement[]
│
├── requirement-mapper-agent
│   ├── 입력: RfpRequirement[] + Offering DB + DiscoveryPackage DB
│   ├── 처리: 의미 유사도 매핑 → Gap 분석
│   └── 출력: TraceabilityMatrix + GapReport
│
├── section-generator-agent
│   ├── 입력: TraceabilityMatrix + 매핑된 콘텐츠 + 제안서 템플릿
│   ├── 처리: 섹션별 초안 생성 → 톤 변환 → 목차 정렬
│   └── 출력: ProposalDraft (섹션별)
│
└── proposal-gan-evaluator
    ├── 입력: ProposalDraft + RfpRequirement[] + 평가 기준
    ├── 처리: O-G-D 루프 (Generator ↔ Discriminator)
    └── 출력: QualityReport + 개선된 ProposalDraft
```

### 6.2 기존 인프라 재활용

| 기존 컴포넌트 | 재활용 방식 |
|--------------|-----------|
| `ax-bd-offering-agent` (6 capability) | content_adapter 활용 — 보고용→제안용 톤 변환 |
| `ogd-orchestrator` + `ogd-generator` + `ogd-discriminator` | proposal-gan-evaluator의 기반 O-G-D 루프 |
| Offering Sections API (F371) | 제안서 섹션 CRUD 패턴 재활용 |
| Offering Export API (F372) | HTML/PDF 변환 엔진 재활용 |
| Offering Validate API (F373) | GAN 교차검증 호출 패턴 재활용 |
| 디자인 토큰 시스템 (F365) | 제안서 디자인 일관성 유지 |
| Skill Registry (F275/F366) | proposal-agent 스킬 등록 |

### 6.3 데이터 모델 (신규)

```sql
-- RFP 원문 + 메타데이터
CREATE TABLE rfp_documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_format TEXT NOT NULL, -- pdf, hwp, docx
    submission_deadline TEXT,
    parsed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- RFP에서 추출한 요구사항 항목
CREATE TABLE rfp_requirements (
    id TEXT PRIMARY KEY,
    rfp_id TEXT NOT NULL REFERENCES rfp_documents(id),
    section_number TEXT,       -- RFP 원문 항목 번호
    category TEXT,             -- 기술, 관리, 지원 등
    title TEXT NOT NULL,
    description TEXT,
    evaluation_weight REAL,    -- 배점 가중치
    is_mandatory INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- RFP 항목 ↔ 제안서 섹션 추적 매트릭스
CREATE TABLE proposal_traceability (
    id TEXT PRIMARY KEY,
    rfp_requirement_id TEXT NOT NULL REFERENCES rfp_requirements(id),
    proposal_section_id TEXT,  -- proposal_sections.id
    offering_id TEXT,          -- 매핑된 기존 Offering
    discovery_item_id TEXT,    -- 매핑된 발굴 아이템
    mapping_confidence REAL,   -- 매핑 신뢰도 (0~1)
    mapping_status TEXT DEFAULT 'auto', -- auto, confirmed, rejected, gap
    created_at TEXT DEFAULT (datetime('now'))
);

-- 제안서 본문
CREATE TABLE proposals (
    id TEXT PRIMARY KEY,
    rfp_id TEXT NOT NULL REFERENCES rfp_documents(id),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- draft, reviewing, approved, submitted
    version INTEGER DEFAULT 1,
    coverage_rate REAL,         -- RFP 커버리지율
    quality_score REAL,         -- GAN 품질 점수
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 제안서 섹션
CREATE TABLE proposal_sections (
    id TEXT PRIMARY KEY,
    proposal_id TEXT NOT NULL REFERENCES proposals(id),
    section_number TEXT,
    title TEXT NOT NULL,
    content TEXT,
    tone TEXT DEFAULT 'proposal', -- proposal, executive, technical
    assigned_to TEXT,             -- 협업 시 담당자
    status TEXT DEFAULT 'draft',  -- draft, reviewed, approved
    sort_order INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## 7. 기술 스택

### 7.1 기존 Foundry-X 스택 (변경 없음)

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Backend | Hono + Cloudflare Workers + D1 | 기존 API 패턴 준수 |
| Frontend | Vite 8 + React 18 + React Router 7 + Zustand | 기존 Web 패턴 준수 |
| CLI | Commander + Ink 5 | `/ax:proposal` 스킬 |
| Agent | Claude Code Agent + O-G-D Loop | 기존 오케스트레이션 활용 |
| 공유 타입 | `packages/shared` | 신규 타입 추가 |

### 7.2 신규 기술 요소

| 기술 | 용도 | 근거 |
|------|------|------|
| **PDF 파싱** | pdf-parse 또는 Cloudflare AI (Document) | RFP PDF 텍스트 추출 |
| **HWP 파싱** | hwp.js 또는 외부 변환 API | 공공기관 RFP 대응 (P1) |
| **DOCX 파싱** | mammoth.js | RFP DOCX 텍스트 + 구조 추출 |
| **벡터 유사도** | Cloudflare Vectorize 또는 로컬 임베딩 | Offering ↔ RFP 의미 매핑 |
| **PPTX 생성** | pptxgenjs | 제안서 PPTX Export |

### 7.3 API 엔드포인트 (예상)

```
POST   /api/rfp                        -- RFP 업로드 + 파싱 시작
GET    /api/rfp/:id                     -- RFP 상세 (요구사항 포함)
GET    /api/rfp/:id/requirements        -- RFP 요구사항 목록

POST   /api/proposals                   -- 제안서 생성 (RFP 기반)
GET    /api/proposals/:id               -- 제안서 상세
PUT    /api/proposals/:id               -- 제안서 수정
GET    /api/proposals/:id/sections      -- 섹션 목록
PUT    /api/proposals/:id/sections/:sid -- 섹션 수정

GET    /api/proposals/:id/traceability  -- 추적 매트릭스
POST   /api/proposals/:id/evaluate      -- GAN 품질 평가 실행
GET    /api/proposals/:id/quality       -- 품질 리포트
POST   /api/proposals/:id/export        -- PPTX/PDF/HTML Export
```

---

## 8. 성공 지표

### 8.1 정량 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 제안서 작성 소요 시간 | 2~3주 | 2~3일 | RFP 수신~제출 간 경과 시간 |
| 초안 생성 시간 | N/A (수동) | 4시간 이내 | RFP 업로드~초안 완료 시간 |
| RFP 요구사항 커버리지 | 수동 체크 | 100% (자동 추적) | Traceability Matrix 커버리지율 |
| 검토 피드백 루프 횟수 | 3회 이상 | 1회 이하 | GAN 사전 품질 보장으로 감소 |
| 기존 산출물 활용률 | < 20% (추정) | ≥ 70% | 매핑된 Offering/Discovery 비율 |

### 8.2 정성 지표

| 지표 | 측정 방법 |
|------|----------|
| 제안서 품질 일관성 | BD 매니저 만족도 조사 (5점 척도) |
| RFP 분석 정확도 | 파싱 결과 vs 수동 분석 일치율 |
| 협업 효율성 | SI 파트너 피드백 |
| 수주 기여도 | 제안서 Agent 활용 건 중 수주 성공률 |

---

## 9. 제약 사항 및 리스크

### 9.1 기술 제약

| 제약 | 영향 | 대응 |
|------|------|------|
| HWP 파싱 라이브러리 성숙도 낮음 | 공공기관 RFP 대응 지연 | P1으로 분류, 초기에는 PDF/DOCX 우선 지원 |
| D1 용량 제한 (500MB free tier) | 대용량 RFP 원문 저장 한계 | R2에 원문 저장, D1에는 메타+파싱 결과만 |
| Cloudflare Workers 실행 시간 제한 | 대형 RFP 파싱 timeout | 청크 분할 파싱 + 비동기 처리 |
| 벡터 유사도 정확도 | Offering 매핑 품질 | 임베딩 모델 PoC + 사람 보정 UI 제공 |

### 9.2 비즈니스 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| RFP 형식 다양성 (비정형) | 높음 | 파싱 실패율 | 폴백: 수동 항목 입력 UI 제공 |
| 기밀 정보 포함 RFP | 높음 | 보안 | 로컬 처리 옵션, 접근 권한 관리 |
| 기존 Offering 부족 (매핑 Gap 큼) | 중간 | 초안 품질 저하 | Gap 리포트 + 신규 작성 가이드 제공 |
| AI 생성 제안서 품질 신뢰도 | 중간 | 사용자 채택률 | GAN 품질 루프 + 필수 Human Review |

---

## 10. 구현 단계 (안)

### Phase 1: Foundation (Sprint N~N+1)

- RFP Parser Agent (PDF/DOCX)
- D1 마이그레이션 (rfp_documents, rfp_requirements)
- RFP 업로드 API + 기본 파싱

### Phase 2: Mapping & Generation (Sprint N+2~N+3)

- Requirement Mapper Agent + Traceability Matrix
- Section Generator Agent (표준 제안서 템플릿)
- proposals, proposal_sections D1 마이그레이션

### Phase 3: Quality & UI (Sprint N+4~N+5)

- GAN Quality Evaluator (기존 O-G-D 확장)
- Traceability Matrix UI
- 제안서 섹션 에디터 (Offering 에디터 재활용)

### Phase 4: Export & Polish (Sprint N+6~N+7)

- PPTX/PDF Export
- 협업 편집 (P1)
- RFP 비교 분석 (P1)

---

## 11. 의존성

| 의존 대상 | 이유 | 상태 |
|----------|------|------|
| Phase 18 Offering Pipeline (F363~F382) | Offering API/UI/Export 재활용 | 구현 중 |
| Phase 14 Agent Orchestration | Agent 실행 인프라 | 완료 |
| O-G-D Agent (ogd-*) | GAN 품질 루프 | 완료 |
| Offering 콘텐츠 어댑터 (F378) | 보고용→제안용 톤 변환 | Phase 18 포함 |
| R2 파일 저장소 | RFP 원문 파일 저장 | Worker 프록시 패턴 적용 |

---

## 12. 부록: RFP 요구사항 분류 체계 (안)

제안서 Agent가 RFP를 파싱할 때 사용하는 표준 분류:

| 카테고리 | 설명 | 예시 |
|---------|------|------|
| `technical` | 기술 요구사항 | 시스템 아키텍처, API, 성능 |
| `functional` | 기능 요구사항 | 화면 기능, 업무 프로세스 |
| `management` | 사업 관리 | 프로젝트 관리, 일정, 인력 |
| `security` | 보안 요구사항 | 인증, 암호화, 접근 통제 |
| `support` | 유지보수/지원 | SLA, 교육, 운영 지원 |
| `qualification` | 자격/실적 | 유사 프로젝트 경험, 인증 |
| `pricing` | 가격/비용 | 비용 산출, 라이선스 |
