---
code: FX-DSGN-S220
title: "Sprint 220 Design — PRD 자동 생성 파이프라인"
version: 1.0
status: Draft
category: DSGN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-PLAN-S220]]"
---

# Sprint 220: PRD 자동 생성 파이프라인 설계

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F454 (1차 PRD 자동 생성), F455 (2차 PRD 보강 — HITL 인터뷰) |
| Sprint | 220 |
| 핵심 전략 | 기존 `PrdGeneratorService` 확장 + 사업기획서 HTML 파싱 레이어 추가 + 인터뷰 세션 관리 |
| 참조 코드 | `api/src/core/offering/services/prd-generator.ts`, `api/src/core/discovery/routes/biz-items.ts` |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Discovery 기반 PRD 생성(F185)만 존재, 사업기획서 기반 PRD 경로가 없음 |
| Solution | HTML 파서 + LLM 변환기 + 인터뷰 세션 관리로 2단계 PRD 파이프라인 구축 |
| Function UX Effect | 사업기획서가 연결된 아이템에서 원클릭 PRD 생성 + 인터뷰 기반 보강 |
| Core Value | 사업기획서 → PRD 자동 변환으로 형상화 파이프라인 진입 자동화 |

---

## 1. 데이터 흐름도

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│ business_plan_   │     │ bp-html-     │     │ bp-prd-          │
│ drafts (HTML)    │────▶│ parser.ts    │────▶│ generator.ts     │
│                  │     │ (구조화 추출)│     │ (템플릿+LLM)     │
└─────────────────┘     └──────────────┘     └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ biz_generated_   │
                                              │ prds (version=1) │
                                              │ source_type=     │
                                              │ 'business_plan'  │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ prd-interview-   │
                                              │ service.ts       │
                                              │ (질문생성+반영)  │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────┐
                                              │ biz_generated_   │
                                              │ prds (version=2) │
                                              │ source_type=     │
                                              │ 'interview'      │
                                              └──────────────────┘
```

---

## 2. DB 스키마 변경

### 2.1 마이그레이션: `biz_generated_prds` 컬럼 추가

```sql
-- NNNN_prd_source_type.sql
ALTER TABLE biz_generated_prds ADD COLUMN source_type TEXT NOT NULL DEFAULT 'discovery';
ALTER TABLE biz_generated_prds ADD COLUMN bp_draft_id TEXT REFERENCES business_plan_drafts(id);
```

- `source_type`: `'discovery'` (기존 F185) | `'business_plan'` (F454) | `'interview'` (F455)
- `bp_draft_id`: 사업기획서 기반 생성 시 원본 참조 (nullable)

### 2.2 마이그레이션: `prd_interviews` + `prd_interview_qas` 테이블

```sql
-- NNNN_prd_interviews.sql
CREATE TABLE IF NOT EXISTS prd_interviews (
  id            TEXT PRIMARY KEY,
  biz_item_id   TEXT NOT NULL REFERENCES biz_items(id),
  prd_id        TEXT NOT NULL REFERENCES biz_generated_prds(id),
  status        TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | completed | cancelled
  question_count INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at  INTEGER
);

CREATE TABLE IF NOT EXISTS prd_interview_qas (
  id            TEXT PRIMARY KEY,
  interview_id  TEXT NOT NULL REFERENCES prd_interviews(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL,
  question      TEXT NOT NULL,
  question_context TEXT,           -- 질문이 PRD의 어느 섹션과 관련되는지
  answer        TEXT,              -- 사용자 응답 (null = 미답변)
  answered_at   INTEGER,
  UNIQUE(interview_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_prd_interviews_biz_item ON prd_interviews(biz_item_id);
CREATE INDEX IF NOT EXISTS idx_prd_interview_qas_interview ON prd_interview_qas(interview_id);
```

---

## 3. API 엔드포인트 상세

### 3.1 F454: POST `/biz-items/:id/generate-prd-from-bp`

1차 PRD 자동 생성 — 사업기획서 HTML 파싱 후 PRD 변환.

**Request:**

```typescript
// GeneratePrdFromBpSchema (Zod)
{
  bpDraftId?: string;       // 특정 사업기획서 버전 지정 (생략 시 최신)
  skipLlmRefine?: boolean;  // LLM 보강 건너뛰기 (테스트용)
}
```

**Response (201):**

```typescript
{
  id: string;
  bizItemId: string;
  version: number;           // 자동 증가 (기존 max + 1)
  content: string;           // 마크다운 PRD
  sourceType: "business_plan";
  bpDraftId: string;
  generatedAt: string;
}
```

**에러 케이스:**

| 상태 | 코드 | 조건 |
|------|------|------|
| 404 | `BIZ_ITEM_NOT_FOUND` | 아이템 미존재 |
| 404 | `BUSINESS_PLAN_NOT_FOUND` | 사업기획서 미연결 |
| 422 | `BP_PARSE_FAILED` | HTML 파싱 실패 (구조 추출 불가) |
| 500 | `PRD_GENERATION_FAILED` | LLM 호출 실패 (폴백 적용 후에도 실패) |

**처리 흐름:**

```
1. biz_items에서 아이템 조회 (org_id 검증)
2. business_plan_drafts에서 사업기획서 조회 (최신 또는 지정 ID)
3. BpHtmlParser.parse(html) → 구조화된 섹션 객체
4. BpPrdGenerator.generate(parsedSections, bizItem) → PRD 마크다운
5. (선택) LLM으로 PRD 보강
6. biz_generated_prds에 INSERT (source_type='business_plan', bp_draft_id)
7. 응답 반환
```

### 3.2 F455: POST `/biz-items/:id/prd-interview/start`

1차 PRD 기반 인터뷰 시작 — 질문 자동 생성.

**Request:**

```typescript
// StartInterviewSchema (Zod)
{
  prdId?: string;   // 특정 PRD 버전 지정 (생략 시 최신)
}
```

**Response (201):**

```typescript
{
  interviewId: string;
  bizItemId: string;
  prdId: string;
  status: "in_progress";
  questions: Array<{
    seq: number;
    question: string;
    questionContext: string;   // "시장 분석", "기술 요건" 등
  }>;
  questionCount: number;
}
```

**에러 케이스:**

| 상태 | 코드 | 조건 |
|------|------|------|
| 404 | `BIZ_ITEM_NOT_FOUND` | 아이템 미존재 |
| 404 | `PRD_NOT_FOUND` | 1차 PRD 미존재 (F454 선행 필요) |
| 409 | `INTERVIEW_ALREADY_IN_PROGRESS` | 진행 중인 인터뷰 존재 |

**질문 생성 전략:**

```
1. 1차 PRD 마크다운 파싱 → 섹션별 내용 깊이 분석
2. 내용이 빈약한 섹션 식별 (100자 미만 또는 "미정"/"TBD" 포함)
3. 도메인 템플릿 기반 질문 생성 (5~8개):
   - 시장 규모/경쟁 현황
   - 기술 구현 난이도/기간
   - 타깃 고객 페르소나
   - 수익 모델
   - 리스크/제약 사항
4. LLM으로 PRD 컨텍스트 반영한 구체적 질문으로 변환
5. prd_interviews + prd_interview_qas에 INSERT
```

### 3.3 F455: POST `/biz-items/:id/prd-interview/answer`

인터뷰 응답 제출.

**Request:**

```typescript
// AnswerInterviewSchema (Zod)
{
  interviewId: string;
  seq: number;
  answer: string;
}
```

**Response (200):**

```typescript
{
  interviewId: string;
  seq: number;
  answeredCount: number;
  remainingCount: number;
  isComplete: boolean;       // 모든 질문 응답 완료 여부
  updatedPrd?: {             // isComplete=true일 때만
    id: string;
    version: number;         // version=2
    content: string;
  };
}
```

**2차 PRD 생성 로직 (마지막 응답 시):**

```
1. 모든 질문-응답 쌍 수집
2. 1차 PRD + 인터뷰 Q&A를 LLM에 전달
3. 프롬프트: "1차 PRD를 인터뷰 응답으로 보강하되, 기존 내용을 삭제하지 않고 추가/수정만"
4. biz_generated_prds에 INSERT (source_type='interview', version=2)
5. prd_interviews.status = 'completed'
```

### 3.4 F455: GET `/biz-items/:id/prd-interview/status`

현재 인터뷰 세션 상태 조회.

**Response (200):**

```typescript
{
  interview: {
    id: string;
    status: "in_progress" | "completed" | "cancelled";
    questionCount: number;
    answeredCount: number;
    questions: Array<{
      seq: number;
      question: string;
      questionContext: string;
      answer: string | null;
      answeredAt: string | null;
    }>;
  } | null;     // 인터뷰 없으면 null
}
```

---

## 4. 서비스 상세 설계

### 4.1 BpHtmlParser (신규)

```typescript
// api/src/core/offering/services/bp-html-parser.ts

export interface ParsedBpSection {
  sectionName: string;    // "목적", "타깃 고객", "시장 분석" 등
  content: string;        // 해당 섹션 텍스트
  confidence: number;     // 파싱 신뢰도 (0~1)
}

export interface ParsedBusinessPlan {
  title: string;
  sections: ParsedBpSection[];
  rawText: string;        // 폴백용 전체 텍스트
}

export class BpHtmlParser {
  /**
   * 사업기획서 HTML을 구조화된 섹션으로 파싱.
   * 전략: <h1>~<h3> 헤더 기반 섹션 분리 → 키워드 매칭으로 섹션명 정규화
   */
  parse(html: string): ParsedBusinessPlan;
}
```

**섹션 매핑 규칙:**

| HTML 키워드 | 정규화 섹션명 | PRD 매핑 |
|-------------|--------------|----------|
| 목적, 배경, 개요 | purpose | 1. 프로젝트 개요 |
| 고객, 타깃, 대상 | target | 2. 타깃 고객 |
| 시장, 규모, TAM | market | 3. 시장 분석 |
| 기술, 아키텍처, 스택 | technology | 4. 기술 요건 |
| 범위, 기능, 요구사항 | scope | 5. 기능 범위 |
| 일정, 로드맵, 마일스톤 | timeline | 6. 일정 |
| 리스크, 위험, 제약 | risk | 7. 리스크 |

**폴백 전략:**
- 헤더 기반 파싱 실패 시 → 줄바꿈 기반 단락 분리
- 단락 분리도 실패 시 → `rawText` 전체를 LLM에 전달하여 구조화 요청

### 4.2 BpPrdGenerator (신규)

```typescript
// api/src/core/offering/services/bp-prd-generator.ts

export class BpPrdGenerator {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
  ) {}

  /**
   * 파싱된 사업기획서 → PRD 마크다운 생성
   * 1. 템플릿 기반 초안 생성 (파싱 결과 매핑)
   * 2. LLM 보강 (skipLlmRefine=false일 때)
   * 3. DB 저장 (biz_generated_prds)
   */
  async generate(input: {
    bizItemId: string;
    bizItem: { title: string; description: string | null };
    parsedBp: ParsedBusinessPlan;
    bpDraftId: string;
    skipLlmRefine?: boolean;
  }): Promise<GeneratedPrd>;
}
```

**PRD 템플릿 (마크다운):**

```markdown
# PRD: {아이템 제목}

## 1. 프로젝트 개요
{purpose 섹션 내용 또는 "사업기획서에서 추출된 정보 없음 — 인터뷰에서 보강 필요"}

## 2. 타깃 고객
{target 섹션}

## 3. 시장 분석
{market 섹션}

## 4. 기술 요건
{technology 섹션}

## 5. 기능 범위
{scope 섹션}

## 6. 일정 및 마일스톤
{timeline 섹션}

## 7. 리스크 및 제약
{risk 섹션}

## 8. 성공 지표
{LLM이 전체 맥락에서 도출}
```

### 4.3 PrdInterviewService (신규)

```typescript
// api/src/core/offering/services/prd-interview-service.ts

export class PrdInterviewService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
  ) {}

  /**
   * 1차 PRD를 분석하여 보강이 필요한 영역 질문 생성
   */
  async startInterview(bizItemId: string, prdId: string): Promise<InterviewSession>;

  /**
   * 개별 응답 저장 + 마지막 응답 시 2차 PRD 생성
   */
  async submitAnswer(interviewId: string, seq: number, answer: string): Promise<AnswerResult>;

  /**
   * 현재 인터뷰 상태 조회
   */
  async getStatus(bizItemId: string): Promise<InterviewSession | null>;
}
```

**질문 생성 LLM 프롬프트:**

```
당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래 1차 PRD를 검토하고, 사업 실행에 필요하지만 누락되거나 빈약한 정보를 파악하세요.
각 빈약 영역에 대해 구체적인 질문을 5~8개 생성하세요.

질문 형식:
- 사용자가 쉽게 답변할 수 있는 구체적 질문
- 각 질문에 관련 PRD 섹션 명시
- 예/아니오 질문 지양, 서술형 유도

--- 1차 PRD ---
{prd_content}
```

**2차 PRD 보강 LLM 프롬프트:**

```
당신은 사업개발 PRD 전문 편집자입니다.
1차 PRD와 사용자 인터뷰 응답을 기반으로 PRD를 보강하세요.

규칙:
- 기존 1차 PRD 내용을 삭제하지 않음
- 인터뷰 응답을 적절한 섹션에 반영
- 새로운 인사이트를 관련 섹션에 추가
- 보강된 부분에 [보강] 마커 추가

--- 1차 PRD ---
{prd_content}

--- 인터뷰 Q&A ---
{qa_pairs}
```

---

## 5. UI 컴포넌트 설계

### 5.1 PrdFromBpPanel (F454)

**위치:** `discovery-detail.tsx` 형상화 탭 내부

```
┌─────────────────────────────────────────┐
│  PRD 생성                               │
│                                         │
│  📄 연결된 사업기획서: v3 (2026-04-06)  │
│                                         │
│  [사업기획서 기반 PRD 생성하기]          │
│                                         │
│  ─── 생성 중 ───                        │
│  ⏳ HTML 파싱 중...                     │
│  ✅ 7개 섹션 추출 완료                  │
│  ⏳ LLM 보강 중...                      │
│                                         │
│  ─── 생성 완료 ───                      │
│  ✅ 1차 PRD v1 생성 완료                │
│  [PRD 열람] [PRD 보강 인터뷰 시작 →]    │
└─────────────────────────────────────────┘
```

**상태 흐름:**
1. `idle` — 사업기획서 연결 확인 + "생성하기" 버튼 활성
2. `generating` — 프로그레스 스텝 표시 (파싱 → LLM → 저장)
3. `done` — 결과 + "열람" + "인터뷰 시작" 버튼
4. `error` — 에러 메시지 + 재시도 버튼

### 5.2 PrdInterviewPanel (F455)

**위치:** `discovery-detail.tsx` 형상화 탭 내부 (PrdFromBpPanel 하단)

```
┌─────────────────────────────────────────┐
│  PRD 보강 인터뷰  (3/6 완료)            │
│                                         │
│  Q3. 타깃 고객의 주요 페인포인트는      │
│      무엇인가요? (구체적 사례 포함)     │
│      📎 관련 섹션: 타깃 고객            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 사용자 응답 입력...             │    │
│  │                                 │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  [이전 질문] [건너뛰기] [답변 제출 →]   │
│                                         │
│  ─── 이전 응답 ───                      │
│  Q1. ✅ 프로젝트 목적... → "..."        │
│  Q2. ✅ 시장 규모... → "..."            │
└─────────────────────────────────────────┘
```

**상태 흐름:**
1. `not_started` — "PRD 보강 인터뷰 시작" 버튼
2. `in_progress` — 현재 질문 표시 + 응답 입력 + 진행률
3. `completing` — 마지막 응답 제출 → 2차 PRD 생성 중
4. `completed` — "2차 PRD 생성 완료" + 열람 링크

---

## 6. 기존 코드 재활용

| 기존 모듈 | 재활용 방식 |
|-----------|-------------|
| `PrdGeneratorService` (prd-generator.ts) | `getLatest()`, `getByVersion()` 그대로 사용. DB 테이블 동일 (`biz_generated_prds`) |
| `createAgentRunner` (agent-runner.ts) | LLM 호출에 동일 러너 사용 |
| `GeneratePrdSchema` (prd.ts) | 기존 스키마 참조 + `GeneratePrdFromBpSchema` 신규 |
| `ShapingArtifacts` (api-client.ts) | `prd.versionNum` 이미 지원 — 추가 수정 불필요 |
| `renderPrdMarkdown` (prd-template.ts) | 섹션 매핑 로직 참조 (동일 템플릿 구조) |

---

## 7. 검증 기준

### 7.1 F454 검증 (1차 PRD 자동 생성)

| # | 검증 항목 | 방법 | 판정 |
|---|----------|------|------|
| V1 | HTML 파싱 — 7개 표준 섹션 중 5개 이상 추출 | unit test (bp-html-parser.test.ts) | PASS/FAIL |
| V2 | 폴백 — 구조화 실패 시 rawText 기반 LLM 생성 | unit test (빈 HTML 입력) | PASS/FAIL |
| V3 | PRD 저장 — `source_type='business_plan'`, `bp_draft_id` 참조 | unit test (DB assertion) | PASS/FAIL |
| V4 | API 응답 — 201 + PRD 마크다운 반환 | integration test | PASS/FAIL |
| V5 | 에러 — 사업기획서 미연결 시 404 | integration test | PASS/FAIL |
| V6 | UI — "사업기획서 기반 PRD 생성" 버튼 동작 | 수동 검증 | PASS/FAIL |

### 7.2 F455 검증 (2차 PRD 보강)

| # | 검증 항목 | 방법 | 판정 |
|---|----------|------|------|
| V7 | 인터뷰 시작 — 5~8개 질문 생성 | unit test (prd-interview-service.test.ts) | PASS/FAIL |
| V8 | 응답 저장 — `prd_interview_qas` 테이블 INSERT | unit test | PASS/FAIL |
| V9 | 2차 PRD 생성 — 마지막 응답 시 version=2 자동 생성 | integration test | PASS/FAIL |
| V10 | PRD 미존재 시 인터뷰 시작 불가 — 404 | integration test | PASS/FAIL |
| V11 | 중복 인터뷰 방지 — 진행 중 인터뷰 존재 시 409 | integration test | PASS/FAIL |
| V12 | UI — 질문→응답→다음 질문 루프 | 수동 검증 | PASS/FAIL |
| V13 | 2차 PRD에 [보강] 마커 포함 | unit test (content assertion) | PASS/FAIL |

### 7.3 전체 합격 기준

- **Must Have**: V1~V5 (F454 core), V7~V9 (F455 core) — 전체 PASS
- **Should Have**: V6, V10~V13 — 80% 이상 PASS
- **Match Rate**: >= 90% (Must Have 전체 PASS + Should Have 80%)
