# PRD v1 — AX BD 사업개발 플랫폼

> **문서 코드**: FX-PLAN-AX-BD-001  
> **버전**: v1.3.0 — **최종 확정본**  
> **작성일**: 2026-03-25  
> **상태**: ✅ 다중 AI 2-Round 외부 검토 완료 — Sprint 착수 승인  
> **충분도**: 88/100 (Round 2 반영 후 재산정)  
> **대상 독자**: KT DS AX BD팀 내부 · AI 에이전트(CLAUDE.md 연계)  
> **변경 이력**: v1.0.0-draft → v1.1.0(R1) → v1.2.0(R2 내부) → v1.3.0(R2 외부 3-way 반영·최종확정)

---

## 0. 문서 사용 가이드 (AI 에이전트용)

이 PRD는 **Foundry-X 에이전트가 읽는 문서**다.
- 각 Feature는 `FX-REQ-AX-NNN` 코드로 참조한다.
- `AC:` 블록이 없는 Feature는 구현 착수 금지.
- `Phase:` 표시가 없는 Feature는 `Phase 1`로 간주하지 않는다.
- `Always / Ask / Never` 경계는 §6 `CONSTITUTION` 절을 따른다.

---

## 1. 목표 및 배경

### 1.1 목표

KT DS AX BD팀의 사업개발 라이프사이클(기회 탐색 → 아이디어 설계 → 검증 → 실행)을 AI 에이전트와 함께 수행할 수 있는 **조직 협업 플랫폼**을 Foundry-X 위에 구축한다.

### 1.2 배경 및 문제 정의

현재 AX BD 업무는 다음 3가지 병목에 시달리고 있다.

| 병목 | 현상 | 임팩트 |
|------|------|--------|
| **개인 의존성** | 시장 분석·BMC 작성이 특정 인력의 경험에 의존 | 지식 소실, 온보딩 지연 |
| **낮은 재사용성** | 사업 아이디어·보고서가 개별 파일로 분산, 버전 관리 없음 | 중복 작업, 품질 편차 |
| **느린 검증 속도** | 타당성 평가까지 평균 수 주 소요 | Go/Kill 판단 지연 |

### 1.3 핵심 철학 (Foundry-X 계승)

- **Git이 SSOT**: 모든 BD 산출물(아이디어, BMC, 보고서)은 Git에 버전 관리된다. DB는 조회·검색 최적화용 미러에 불과하다.
- **에이전트는 초안을 만들고, 사람이 확정한다**: AI 자동 생성 결과는 반드시 사람이 확인·커밋해야 반영된다.
- **Foundry-X 위에 올라가는 모듈**: 독립 서비스가 아닌 기존 Foundry-X 인프라(API 서버, 에이전트 오케스트레이터, D1 DB, CI/CD)를 재사용한다.

---

## 2. 사용자 역할

| 역할 | 설명 | Phase 1 주요 기능 |
|------|------|------------------|
| **BD 매니저** | 기회 발굴 및 프로젝트 우선순위 설정 | 아이디어 포트폴리오 조회, BMC 검토·승인 |
| **BD 애널리스트** | 시장 데이터 수집, 아이디어 제안, BMC 작성 | BMC 에디터, AI 초안 생성 요청, 보고서 작성 |
| **AI 에이전트** | 사람의 지시 하에 초안 생성·데이터 수집 자동화 | InsightAgent, BMCAgent (§4 참조) |

> **Phase 2 이후 추가 역할**: 데이터 과학자, 제품/서비스 개발팀, 거버넌스 관리자

### 2.1 RBAC 권한 매트릭스

| 리소스 | 동작 | BD 애널리스트 | BD 매니저 | AI 에이전트 |
|--------|------|:---:|:---:|:---:|
| 아이디어 | 등록·수정 | ✅ 본인 소유만 | ✅ 전체 | ❌ |
| 아이디어 | 조회 | ✅ 팀 전체 | ✅ 팀 전체 | ✅ (읽기) |
| 아이디어 | 삭제·보관 | ❌ (Ask 필요) | ✅ | ❌ |
| BMC | 생성·수정 | ✅ 본인 소유만 | ✅ 전체 | ❌ (초안 제안만) |
| BMC | 조회 | ✅ 팀 전체 | ✅ 팀 전체 | ✅ (읽기) |
| BMC | 승인 | ❌ | ✅ | ❌ |
| BMC | 전체 블록 덮어쓰기 | ❌ (Ask 필요) | ✅ | ❌ |
| 댓글 | 작성 | ✅ | ✅ | ❌ |
| Git 커밋 | 실행 | ✅ (수동만) | ✅ (수동만) | ❌ (Never) |
| 에이전트 호출 | 실행 | ✅ (Rate Limit 내) | ✅ | — |

> **원칙**: AI 에이전트는 읽기와 초안 생성만 허용. Git 커밋·삭제·승인은 사람 전용.

---

## 3. Phase 정의

### Phase 1 — Ideation MVP (Month 0~2)

**목표**: BD 애널리스트가 AI 에이전트의 도움을 받아 BMC 초안을 30분 이내에 생성하고 Git에 커밋할 수 있다.

**범위**: Ideation & Design 모듈 (BMC 에디터 + AI 에이전트 2종)

**포함 Feature**: FX-REQ-AX-001 ~ FX-REQ-AX-008

**Go 판정 기준** (Week 8 파일럿 종료 시 측정):
- BMC 생성 → 커밋까지 30분 이내 달성률 ≥ 80%
- BD팀 구성원 5명 이상 월 1회 이상 **자발적** 사용 (개발자 테스트 계정 제외, `author_id` 역할 필터링)
- 파일럿 종료 후 3분 서베이 NPS ≥ 6 (10점 만점, "이 도구 없이 업무하면 불편한가")

**Kill 판정 기준** (하나라도 해당하면 중단):
- K1 활성 사용자 < 3명
- 파일럿 NPS < 5
- OQ-3(BMC 보안등급) Day 1 미해소 + 마스킹 대안도 불가 → BMCAgent 비활성 상태로 8주 진행 시

### Phase 2 — Insight & Validation (Month 3~5)

**목표**: 시장 데이터 자동 수집 + 사업 타당성 보고서 AI 초안 생성

**포함 Feature**: FX-REQ-AX-009 ~ FX-REQ-AX-016 (별도 PRD)

### Phase 3 — Execution & Scale (Month 6+)

**목표**: Execution Design, Pilot & Scale 모듈 순차 개발 (별도 PRD)

---

## 4. 기능 요구사항 — Phase 1 상세

> 표기 규칙: `P0` = Sprint 시작 전 필수, `P1` = Sprint 내 완료, `P2` = Phase 1 내 완료

---

### 4.1 BMC 캔버스 에디터

#### FX-REQ-AX-001 · BMC 캔버스 CRUD `P0`

**설명**: 사용자가 온라인에서 비즈니스 모델 캔버스(9개 블록)를 생성·수정·저장할 수 있다.

**AC**:
```
Given 로그인한 BD 애널리스트가 "새 BMC" 버튼을 클릭했을 때
When 9개 블록(고객 세그먼트, 가치 제안, 채널, 고객 관계, 수익 구조, 핵심 자원, 핵심 활동, 핵심 파트너십, 비용 구조)이 빈 폼으로 표시되면
Then 각 블록에 텍스트를 입력·저장할 수 있고, 저장 시 `bmc/{id}/canvas.md` 형식으로 Git에 커밋 대기(Staging) 상태가 된다.

Given 저장된 BMC를 수정하고 "변경 사항 저장"을 클릭했을 때
When 변경 내용이 있으면
Then Git diff가 생성되고, 커밋 메시지 입력 후 수동 커밋이 가능하다.
(자동 커밋은 절대 금지 — CONSTITUTION §6.2 참조)

Given Git 저장 중 네트워크 오류 또는 권한 오류가 발생했을 때
Then "저장에 실패했습니다. 잠시 후 다시 시도하세요" 메시지가 표시되고 입력 내용은 브라우저 로컬에 유지된다.

Given 두 사용자가 동일한 BMC를 동시에 수정하고 커밋을 시도했을 때
Then 나중에 커밋하는 사용자에게 "다른 사용자가 이미 변경사항을 저장했습니다. 최신 버전을 불러온 후 다시 시도하세요" 충돌 안내가 표시된다.
```

**Match Rate 목표**: 95%

---

#### FX-REQ-AX-002 · BMC 버전 히스토리 조회 `P1`

**설명**: BMC의 변경 이력을 Git 커밋 단위로 조회하고 특정 버전으로 복원할 수 있다.

**AC**:
```
Given BMC 상세 페이지에서 "버전 히스토리" 탭을 열었을 때
When Git 커밋 이력이 있으면
Then 커밋 날짜·작성자·메시지 목록이 최신순으로 표시된다.

Given 특정 버전을 선택하고 "이 버전으로 복원"을 클릭했을 때
When 확인 다이얼로그에서 승인하면
Then 해당 버전 내용이 에디터에 불러와지고, 저장 시 새 커밋이 생성된다. (이전 버전이 덮어써지지 않음)

Given BMC 상세 페이지에서 "버전 히스토리" 탭을 열었을 때
When Git 커밋 이력이 없으면 (신규 생성 직후)
Then "아직 저장된 버전이 없습니다" 안내 메시지가 표시된다.
```

**Match Rate 목표**: 93%

---

#### FX-REQ-AX-003 · BMC 댓글 및 협업 `P1`

**설명**: 팀원이 BMC의 특정 블록에 댓글을 달고 멘션(@)으로 알림을 보낼 수 있다.

**AC**:
```
Given BD 매니저가 "가치 제안" 블록 옆 댓글 아이콘을 클릭했을 때
When 댓글을 입력하고 전송하면
Then 해당 블록에 댓글 수가 표시되고, 멘션된 사용자에게 인앱 알림이 전송된다.
(댓글 데이터는 D1 `ax_bmc_comments` 테이블에 저장. Git 커밋 대상 아님)

Given 댓글 전송 중 네트워크 오류가 발생했을 때
Then "댓글 저장에 실패했습니다" 메시지가 표시되고 입력 내용은 유지된다.
```

**Match Rate 목표**: 90%

---

### 4.2 AI 에이전트 — BMCAgent

#### FX-REQ-AX-004 · BMC 초안 자동 생성 `P0`

**설명**: 사용자가 사업 아이디어 한 줄 설명을 입력하면 BMCAgent가 9개 블록 초안을 생성한다.

**에이전트 스펙**:
- **이름**: `BMCAgent`
- **트리거**: `POST /ax-bd/bmc/generate`
- **입력**: `{ idea: string, context?: string }` (최대 500자)
- **출력**: 9개 블록 텍스트 (각 블록 최대 200자)
- **사용 모델**: `claude-sonnet-4-6` (Foundry-X 모델 라우터 경유)
- **Rate Limit**: 사용자당 분당 5회

**AC**:
```
Given BD 애널리스트가 아이디어 입력 필드에 "AI 기반 KT DS 내부 IT 자산 최적화 서비스"를 입력하고 "초안 생성" 버튼을 클릭했을 때
When BMCAgent가 응답을 반환하면 (목표 응답시간 < 15초)
Then 9개 블록 모두에 초안 텍스트가 채워진 미리보기가 표시된다.
  And "에디터에 적용" 버튼이 활성화된다.
  And 에디터에 적용하기 전까지 Git에 아무것도 저장되지 않는다.

Given BMCAgent 응답이 15초 초과 또는 오류인 경우
Then "잠시 후 다시 시도하세요" 메시지와 함께 에디터는 빈 상태로 유지된다.
```

**CONSTITUTION 경계**:
- Always: 생성 결과를 미리보기로 제공, 사용자가 "적용" 클릭 후에만 에디터에 반영
- Never: 사용자 확인 없이 Git 커밋, 자동 저장

**Match Rate 목표**: 92%

---

#### FX-REQ-AX-005 · BMC 블록 인사이트 추천 `P1`

**설명**: 특정 블록 편집 중 BMCAgent가 개선 제안 3개를 사이드패널에 표시한다.

**에이전트 스펙**: BMCAgent가 처리 (`POST /ax-bd/bmc/suggest-block`, 블록별 호출)

**AC**:
```
Given 사용자가 BMC의 "고객 세그먼트" 블록에서 마지막 키 입력 후 5초가 경과했을 때
  (기산점: 마지막 keyup 이벤트 발생 시점. 포커스 진입 시점이 아님)
When 현재 입력 텍스트가 20자 이상이면
Then 사이드패널에 "이런 관점도 고려해보세요" 제목과 함께 추천 3개가 표시된다.
  And 각 추천에는 "추가" 버튼이 있어 클릭 시 현재 블록에 텍스트가 이어붙는다.

Given 사용자가 블록 포커스를 벗어났을 때
Then 사이드패널 추천이 닫히고 5초 타이머가 초기화된다.
```

**Match Rate 목표**: 88%

---

### 4.3 AI 에이전트 — InsightAgent (시장 데이터 수집)

#### FX-REQ-AX-006 · 시장 키워드 요약 `P1`

**설명**: 사업 아이디어 키워드를 입력하면 InsightAgent가 웹 검색 기반 시장 동향 요약을 생성한다.

**에이전트 스펙**:
- **이름**: `InsightAgent`
- **트리거**: `POST /ax-bd/insight/summarize`
- **도구**: `web_search` (Foundry-X MCP 경유)
- **사용 모델**: `claude-sonnet-4-6` (Foundry-X 모델 라우터 경유)
- **Rate Limit**: 사용자당 분당 3회 (웹 검색 비용 고려)
- **처리 방식**: 비동기 Job — 요청 즉시 `job_id` 반환, 클라이언트가 SSE로 진행 상황 수신
- **출력**: 트렌드 요약 (500자 이내) + 출처 URL 목록 (3~5개)

**AC**:
```
Given 사용자가 "AI 자산 최적화"를 키워드로 입력하고 "시장 조사 요약" 버튼을 클릭했을 때
When InsightAgent가 응답을 반환하면 (목표 응답시간 < 30초)
Then 트렌드 요약 텍스트와 출처 URL 3개 이상이 표시된다.
  And "BMC에 붙여넣기" 버튼으로 원하는 블록에 내용을 추가할 수 있다.

Given 검색 결과가 없거나 오류인 경우
Then "현재 관련 데이터를 찾지 못했습니다" 메시지를 표시하고 빈 요약 대신 안내 문구를 보여준다.
```

**Match Rate 목표**: 90%

---

### 4.4 아이디어 관리

#### FX-REQ-AX-007 · 아이디어 등록 및 태그 `P0`

**설명**: BD 팀원이 사업 아이디어를 제목·설명·태그와 함께 등록하고 목록에서 조회할 수 있다.

**저장 전략 (Git + DB 하이브리드)**:
- **Git**: `ideas/{id}/idea.md` — 내용의 SSOT
- **D1 DB**: `ax_ideas` 테이블 — 목록 조회·필터·검색 최적화용 미러
- **동기화**: Git 커밋 후 webhook으로 D1 자동 업데이트

**AC**:
```
Given 사용자가 아이디어 제목("AI 기반 IT 자산 최적화"), 설명(200자 이내), 태그("AI", "인프라")를 입력하고 "저장"을 클릭했을 때
When 유효성 검사를 통과하면
Then `ideas/{id}/idea.md`가 Git에 커밋되고 D1에도 동기화되어 아이디어 목록에 즉시 표시된다.

Given 아이디어 목록 페이지에서 태그 "AI"로 필터링하면
Then 해당 태그를 가진 아이디어만 표시되고 최신순으로 정렬된다.

Given 사용자가 제목을 빈 칸으로 두거나 설명을 200자 초과 입력하고 "저장"을 클릭했을 때
Then "제목을 입력해주세요" 또는 "설명은 200자 이내로 입력해주세요" 인라인 오류 메시지가 표시되고 저장은 실행되지 않는다.
```

**Match Rate 목표**: 95%

---

#### FX-REQ-AX-008 · 아이디어-BMC 연결 `P1`

**설명**: 등록된 아이디어에서 바로 새 BMC를 생성하거나 기존 BMC를 연결할 수 있다.

**AC**:
```
Given 아이디어 상세 페이지에서 "BMC 생성" 버튼을 클릭했을 때
When BMC가 신규 생성되면
Then 아이디어 ID가 BMC의 메타데이터(`bmc/{id}/meta.json`)에 기록되고 역방향 링크도 아이디어 파일에 추가된다.

Given 아이디어 상세 페이지에서 "기존 BMC 연결"을 선택했을 때
When 기존 BMC 목록에서 하나를 선택하면
Then 양방향 링크가 Git 커밋으로 기록된다.

Given 아이디어 상세 페이지에서 "기존 BMC 연결"을 클릭했을 때
When 연결 가능한 BMC가 존재하지 않으면
Then "연결할 수 있는 BMC가 없습니다. 새 BMC를 먼저 생성해주세요" 안내 메시지가 표시된다.
```

**Match Rate 목표**: 92%

---

## 5. 비기능 요구사항

| 항목 | 요구사항 | 측정 방법 |
|------|----------|-----------|
| **응답 시간** | BMC 저장 API < 500ms, 에이전트 초안 생성 < 15초 | Foundry-X 모니터링 대시보드 |
| **가용성** | 업무 시간(09:00~18:00 KST) 99% 이상 | 헬스체크 엔드포인트 |
| **보안** | KT DS SSO 인증 연동, 역할 기반 접근 제어(RBAC) | 보안 에이전트 OWASP 스캔 |
| **한국어 지원** | 모든 UI·에이전트 응답 한국어 기본 | UI 리뷰 |
| **Git 무결성** | 자동 커밋 0건 (하네스 무결성 검사) | `verify-harness.sh` |
| **동기화 정합성** | Git↔D1 불일치 감지 시 사용자에게 "⚠️ 미동기화" 배너 표시, 관리자에게 알림 | D1 `sync_status` 컬럼 + 헬스체크 |
| **동기화 재시도** | webhook 실패 시 지수 백오프(1s→2s→4s) 3회 재시도 후 `sync_failures` 테이블 기록 | 로그 모니터링 |

---

## 6. CONSTITUTION — 에이전트 행동 경계

> Foundry-X `CONSTITUTION.md` 체계를 AX BD 모듈에 적용한다.

### Always (항상 해야 함)
- 에이전트 생성 결과는 미리보기로 제공하고, 사용자 확인 후 반영한다.
- 모든 BD 산출물 저장 시 Git 커밋 이력을 남긴다.
- 외부 데이터 출처 URL을 응답에 포함한다.

### Ask (사용자에게 먼저 확인)
- BMC 전체 블록 덮어쓰기 (기존 내용 소실 가능성)
- 아이디어 삭제 또는 보관
- 외부 API 호출 (웹 검색 등) 비용 발생 전

### Never (절대 금지)
- 사용자 확인 없이 Git 커밋
- KT DS 내부 데이터(CRM, ERP)를 외부 LLM에 직접 전송
- BMC 내용을 사용자 동의 없이 다른 사용자와 공유

### §6.2 자동 커밋 기술적 강제 메커니즘

선언적 금지만으로는 검증이 불가능하다. 다음 두 가지 기술적 장치를 통해 강제한다.

**장치 1 — API 레이어 인터셉터**
`POST /ax-bd/*/commit` 엔드포인트는 요청 헤더에 `X-Human-Approved: true`가 없으면 `403 Forbidden`을 반환한다. 에이전트는 이 헤더를 설정할 수 없다 (서버에서 에이전트 토큰 타입 확인).

**장치 2 — `verify-harness.sh` 검사 항목 추가**
```bash
# harness 무결성 검사에 다음 항목 포함
- ax-bd API 라우트에 X-Human-Approved 인터셉터 등록 여부
- agent_token으로 commit 엔드포인트 호출 시 403 반환 여부 (smoke test)
```

**검증 AC**:
```
Given AI 에이전트 토큰으로 POST /ax-bd/bmc/commit을 직접 호출했을 때
Then HTTP 403이 반환되고 커밋은 실행되지 않는다.
```

---

## 7. 성공 지표 (KPI)

| KPI | 목표 | 측정 주기 | 측정 방법 |
|-----|------|----------|----------|
| **K1** 활성 사용자 | BD팀 구성원 5명 이상 월 1회 이상 **기능 실제 사용** | 월 | `ax_ideas` 또는 `ax_bmcs` 생성/수정 이벤트 로그 — **`author_id`가 BD 역할 사용자인지 필터링 필수** (개발자 테스트 계정 제외) |
| **K2** BMC 생성 시간 | 아이디어 등록 → BMC 첫 커밋까지 **30분 이내 달성률 ≥ 80%** | Sprint | 아이디어 `created_at` ~ BMC `git_ref` 타임스탬프 차이 |
| **K2b** *(보완)* BMC iteration | BMC당 **평균 수정 횟수 ≥ 2회** (30분 내 단순 클릭이 아닌 실질 활용 검증) | Sprint | `ax_bmcs.updated_at` 갱신 횟수 / BMC 수 |
| **K3** 에이전트 활용률 | BMC 생성 중 AI 초안 기능 사용 비율 ≥ 50% | Sprint | `POST /ax-bd/bmc/generate` 호출 수 / 신규 BMC 수 |
| **K4** 자동 커밋 건수 | 0건 (위반 시 즉시 PagerDuty 알림) | 실시간 | `verify-harness.sh` + API 403 로그 |
| **K5** Match Rate | 각 Feature AC 기준 ≥ 90% (vitest 기준) | Sprint | AC 통과 수 / 전체 AC 수 × 100 |
| **K6** *(신규)* BMC 재방문율 | 생성된 BMC를 **3일 내 재수정한 비율 ≥ 60%** | Sprint | BMC `updated_at` - `created_at` ≤ 3일인 건 수 비율 |
| **K7** *(신규)* 아이디어→실행 전환율 | 등록된 아이디어 중 BMC까지 진행한 비율 ≥ 40% | 월 | `ax_ideas`에 연결된 `ax_bmcs` 존재 비율 |

---

## 8. 데이터 모델 (D1 테이블 초안)

```sql
-- 아이디어 미러 테이블
CREATE TABLE ax_ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT CHECK(length(description) <= 200),
  tags        TEXT,                         -- JSON array
  git_ref     TEXT NOT NULL,                -- Git commit SHA (SSOT 참조)
  author_id   TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  created_at  INTEGER NOT NULL,             -- Git 커밋 타임스탬프 (Unix ms)
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_ideas_author   ON ax_ideas(author_id);
CREATE INDEX idx_ax_ideas_tags     ON ax_ideas(tags);        -- fulltext 검색용
CREATE INDEX idx_ax_ideas_updated  ON ax_ideas(updated_at DESC);

-- BMC 메타 미러 테이블
CREATE TABLE ax_bmcs (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT REFERENCES ax_ideas(id),
  title       TEXT NOT NULL,
  git_ref     TEXT NOT NULL,
  author_id   TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
              CHECK(sync_status IN ('synced', 'pending', 'failed')),
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_ax_bmcs_idea_id   ON ax_bmcs(idea_id);
CREATE INDEX idx_ax_bmcs_author    ON ax_bmcs(author_id);

-- BMC 블록 캐시 (조회 최적화용)
-- block_type은 BMC 9개 블록으로 고정
CREATE TABLE ax_bmc_blocks (
  bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
  block_type  TEXT NOT NULL CHECK(block_type IN (
                'customer_segments', 'value_propositions', 'channels',
                'customer_relationships', 'revenue_streams',
                'key_resources', 'key_activities', 'key_partnerships',
                'cost_structure'
              )),
  content     TEXT,
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (bmc_id, block_type)
);

-- 댓글 테이블 (Git 커밋 대상 아님 — DB 전용)
CREATE TABLE ax_bmc_comments (
  id          TEXT PRIMARY KEY,
  bmc_id      TEXT NOT NULL REFERENCES ax_bmcs(id),
  block_type  TEXT,                         -- NULL이면 BMC 전체 댓글
  author_id   TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_comments_bmc_id ON ax_bmc_comments(bmc_id);

-- 동기화 실패 기록 테이블
CREATE TABLE sync_failures (
  id            TEXT PRIMARY KEY,
  resource_type TEXT NOT NULL,              -- 'idea' | 'bmc'
  resource_id   TEXT NOT NULL,
  git_ref       TEXT NOT NULL,
  payload       TEXT NOT NULL,              -- 재시도 시 사용할 원본 JSON (누락 시 재시도 불가)
  error_msg     TEXT,
  retry_count   INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER,                    -- 지수 백오프 다음 시도 시각 (Unix ms)
  created_at    INTEGER NOT NULL
);
```

> **원칙**: DB는 Git 커밋 이후 webhook으로 동기화되는 미러다. DB 직접 수정은 금지.  
> **webhook 실패 시**: `sync_status = 'failed'`로 업데이트 → UI에 "⚠️ 미동기화" 배너 표시 → 지수 백오프 재시도(1s→2s→4s, 최대 3회) → 실패 영속 시 `sync_failures` 기록 + 관리자 알림.  
> **타임스탬프**: `created_at`, `updated_at`은 서버 시간이 아닌 **Git 커밋 타임스탬프**와 동기화.

---

## 9. 리스크 및 대응

| 리스크 | 가능성 | 임팩트 | 대응 |
|--------|--------|--------|------|
| BMCAgent 응답 품질 저하 | 중 | 중 | 사용자 피드백 버튼 + 프롬프트 버저닝 |
| Git 저장소 용량 증가 | 낮 | 낮 | 텍스트 파일만 저장, 바이너리 제외 |
| KT DS SSO 연동 지연 | 중 | 높 | Phase 1 초기에는 Foundry-X 기존 JWT 인증(F40) 재사용 — 이메일 인증 별도 구현 금지 (이중화 방지) |
| 팀 도입 저항 | 중 | 중 | 온보딩 킥오프 + 첫 BMC 생성 페어 세션 |
| **Git 커밋 UX가 비개발자 장벽** | 높 | 치명 | **Week 1 Day 2에 BD 실무자 1명과 Paper Prototype 세션 필수** — "커밋 메시지 입력" 단계에서 이탈하면 자동 메시지 제안(1-click 커밋)으로 UX 재설계 |
| **BMC가 실제 핵심 산출물이 아닐 수 있음** | 중 | 높 | **Week 1 Day 1~3에 BD팀 5명 대상 3문항 서베이** — BMC 월 사용 빈도 < 1회이면 InsightAgent를 P0으로 승격하고 Feature 우선순위 재조정 |
| **댓글 의사결정 이력 소실** | 중 | 중 | 댓글은 D1 `ax_bmc_comments`에 영구 보존됨을 UI에 명시 ("이 댓글은 영구 기록됩니다"). 단, **Git에는 저장되지 않으므로** 중요한 의사결정은 BMC 블록 본문에 직접 반영 후 커밋할 것을 온보딩 가이드에 명시 |
| **Cloudflare Workers 지수 백오프 타임아웃** | 중 | 중 | Phase 1에서는 `waitUntil` + 3회 재시도로 구현. 재시도 실패 시 `sync_failures` 기록. Phase 2 전환 시 **Cloudflare Queues** 도입 검토 (GA-2) |

---

## 10. 개발 일정 (Phase 1)

> **팀 규모 가정**: 개발자 2명 (Frontend 1 + Backend 1) + BD 실무자 1명(요구사항 확인·파일럿 참여)
> Week 5~6의 4개 Feature는 Frontend/Backend 병렬 분담을 전제로 한 일정임.

| 기간 | 주요 내용 | 담당 |
|------|----------|------|
| Week 1~2 | FX-REQ-AX-001, 007 구현 (BMC CRUD + 아이디어 등록) | BE+FE 병렬 |
| Week 3~4 | FX-REQ-AX-004 구현 (BMCAgent 초안 생성) | BE 주도 |
| Week 5~6 | FX-REQ-AX-002(BE), 005·006(BE), 008(FE) 병렬 구현 | BE+FE 분담 |
| Week 7 | FX-REQ-AX-003 구현 + 통합 테스트 | 전체 |
| Week 8 | 5명 파일럿 온보딩 + Go/Kill 판정 | BD+개발 |

---

## 11. Open Questions

| 번호 | 질문 | 담당자 | 기한 | 블로킹 여부 |
|------|------|--------|------|------------|
| OQ-1 | KT DS SSO 연동 API 사용 가능 여부 | BD 매니저 | Sprint 1 전 | 🔴 **Blocking** — 미해결 시 이메일 인증으로 대체 후 착수 가능 |
| OQ-2 | 외부 뉴스/특허 API 계약 여부 (InsightAgent용) | BD 매니저 | Phase 2 전 | 🟢 Non-blocking (Phase 1 범위 밖) |
| OQ-3 | BMC 데이터 보안 등급 분류 (사내 기밀 여부) | 거버넌스 관리자 | **Day 1 오전** | 🔴 **Day 1 Blocking** — 미해소 시 `BMCAgent`·`InsightAgent`가 외부 LLM을 호출할 수 없어 P0 Feature(FX-REQ-AX-004)가 비활성화됨. "마스킹 후 전송 허용" 중간 합의라도 Day 1에 필요. 기존 `PromptGatewayService`(Foundry-X F149) 활용 가능 |
| OQ-4 | Foundry-X Git 저장소 분리 여부 (AX BD 전용 리포 vs 기존 리포 서브폴더) | 개발팀 | Sprint 1 전 | 🟡 Semi-blocking — webhook URL 설계에 영향, Sprint 1 Week 1 내 결정 필요. **권고: 모노리포 내 `packages/ax-bd-data/` 독립 패키지로 관리** — 같은 CI 파이프라인 유지하면서 나중에 분리 시 해당 패키지만 추출 가능 |

---

## Appendix A — 다중 AI 검토 체크리스트

> 이 문서를 다음 기준으로 검토한다.

- [x] 모든 Phase 1 Feature에 AC가 있는가?
- [x] FX-REQ-AX-NNN 번호가 중복 없이 부여되었는가?
- [x] CONSTITUTION Always/Ask/Never 경계가 구현 가능한 수준으로 명세되었는가?
- [x] Git SSOT 원칙이 데이터 모델에 반영되었는가?
- [x] KPI가 측정 가능한 수치와 측정 방법으로 정의되었는가?
- [x] Open Questions에 Blocking/Non-blocking 라벨이 명시되었는가?

---

## Appendix B — 검토 반영 이력

### Round 1 (v1.0 → v1.1)

| 수정 ID | 내용 | 출처 | 반영 섹션 |
|---------|------|------|----------|
| C1 | Git↔D1 webhook 실패 처리 (재시도·알림·sync_failures 테이블) | 내부·Gemini·Claude새창 | §5, §8 |
| C2 | InsightAgent 모델명·Rate Limit·비동기 처리 추가 | 내부·Claude새창 | §4.3 |
| C3 | RBAC 권한 매트릭스 추가 | 내부·Claude새창 | §2.1 |
| C4 | 에러 시나리오 AC 추가 (001·002·003·007) | 내부·Claude새창 | §4 |
| C5 | 자동 커밋 기술적 강제 메커니즘 명세 (§6.2) | Claude새창 | §6 |
| C6 | block_type CHECK 제약·열거형 명시 | Gemini·Claude새창 | §8 |
| C7 | FK 인덱스 추가 (idea_id·author_id) | Gemini | §8 |
| C8 | OQ Blocking 라벨·KPI 측정 방법·성과 KPI 추가 | 내부·Claude새창·GPT | §7, §11 |

### Round 2 내부 (v1.2)

| 수정 ID | 내용 | 반영 섹션 |
|---------|------|----------|
| R2-1 | FX-REQ-AX-005 타이머 기산점 명확화 + 에이전트 스펙 명시 | §4.2 |
| R2-2 | FX-REQ-AX-008 에러 AC 추가 | §4.4 |
| R2-3 | §10 일정에 팀 규모 가정 명시 | §10 |

### Round 2 외부 3-way (v1.3) — Gemini·GPT·Claude

| 수정 ID | 내용 | 출처 | 반영 섹션 |
|---------|------|------|----------|
| P1 | `sync_failures.payload` 컬럼 + `next_retry_at` 추가 | Gemini | §8 |
| P2 | OQ-3 → Day 1 Blocking 격상 + BMCAgent 비활성 임팩트 명시 | Claude | §11 |
| P3 | Go/Kill 기준에 Kill 조건 3개 + NPS 측정 추가 | Claude | §3 |
| P4 | K2b(iteration 횟수) 보완 KPI 추가 + K1 측정 방법 강화 | GPT·Claude | §7 |
| P5 | 댓글 보존 안내 ("D1 영구 보존, Git 제외") + 온보딩 가이드 방향 | GPT·Claude | §9 |
| P6 | OQ-4 하이브리드 전략 권고 (`packages/ax-bd-data/`) | Claude | §11 |
| P7 | Git 커밋 UX 장벽 리스크 + Paper Prototype 세션 액션 | Claude | §9 |
| P8 | BMC 실제 사용 빈도 검증 리스크 + Day 1 서베이 액션 | Claude | §9 |
| P9 | Cloudflare Queues Phase 2 권고 메모 + SSO Foundry-X JWT 재사용 권고 | Gemini·Claude | §9 |

---

## Appendix C — 미채택 지적 및 사유

| 지적 | 출처 | 미채택 사유 |
|------|------|------------|
| **G1: Phase 1 MVP가 "문서 도구" 수준** | GPT Round 1 | Phase 1은 의도적으로 좁게 설정. K2b(iteration)·K6·K7 추가로 "도구 사용"에 그치지 않는지 모니터링. |
| **G2: AI 초안 과대 기대** | GPT Round 1 | K3(에이전트 활용률) 측정 후 Phase 2 설계 시 반영. |
| **G4: 유사 BMC 추천** | GPT Round 1 | Phase 2 백로그(FX-REQ-AX-009 이후)로 이관. |
| **GB-4: AI 초안 generic** | GPT Round 2 | 온보딩 가이드에서 "워밍업 도구"로 기대치 안내. 프롬프트 품질은 Phase 1 파일럿 후 개선. |
| **GA-2: Cloudflare Queues 즉시 도입** | Gemini Round 2 | Phase 1은 `waitUntil` + 3회 재시도로 충분. Queues는 Phase 2 전환 시 검토. §9 메모 추가. |
| **GC-가정2: BMC가 핵심 산출물인가** | Claude Round 2 | Day 1 서베이(§9)로 검증. BMC 빈도 낮으면 InsightAgent P0 승격 결정 트리거 추가. |

---

*v1.3.0 최종 확정 — 다중 AI 2-Round 외부 검토 완료 (Claude×2·GPT×2·Gemini×2) — 충분도 88/100 — Sprint 1 Day 1 액션 아이템 포함*

---

## Appendix C — 미채택 지적 및 사유

| 지적 | 출처 | 미채택 사유 |
|------|------|------------|
| **G1: Phase 1 MVP가 "문서 도구" 수준** | GPT-4o | Phase 1은 의도적으로 좁게 설정. "아이디어→BMC→Git 이력"이라는 지식 자산화 루프 자체가 BD 조직에서 현재 전혀 없는 것. Phase 2(InsightAgent 풀 통합)에서 검증 시나리오 추가 예정. 단, K6·K7 성과 KPI를 추가해 "도구 사용"에 그치지 않는지 모니터링. |
| **G2: AI 초안 과대 기대** | GPT-4o | 유효한 우려. Phase 1 파일럿(5명) 결과로 실제 활용률(K3)을 측정 후 Phase 2 설계 시 반영. |
| **G4: 유사 BMC 추천** | GPT-4o | Phase 2 백로그(FX-REQ-AX-009 이후)로 이관. |

*v1.2.0 확정본 — 다중 AI 2-Round 검토 완료 (Claude·GPT·Gemini) — 충분도 86/100 — Sprint 착수 승인*
