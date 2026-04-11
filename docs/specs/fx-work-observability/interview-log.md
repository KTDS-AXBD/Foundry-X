# 인터뷰 로그: fx-work-observability

**날짜**: 2026-04-12
**진행**: AX BD팀 (Claude Code Opus 4.6 ↔ 사용자)
**skill**: `/ax:req-interview` (dogfood)
**세션**: S260 (resume 상태)

---

## 배경

S258~S260에 걸쳐 task orchestrator 자체 개선 C-track 30+건(C18~C31)이 진행되던 도중, 사용자가 다음과 같은 근본 질문을 던졌다:

> "내가 이 작업을 하고 있는 의도는 요구사항을 구분하고 작업 흐름을 정리해서 전체적인 작업을 모니터링하고 계획하기 위한거야. 의도한대로 구현된다면 GitHub Project 나 다른 페이지에 Backlog와 요구사항, Task, Sprint, Epic(Phase) 등을 볼 수 가 있어야 하는데 지금 확인할 수 있는 곳이 없어."

이어서:

> "방금 전달한 텍스트는 task 스킬을 통해서 분류가 되는거야? 아니면 자체적으로 작업하는거야?"

→ Claude 정직한 답: 자체 판단 + 수동 처리. task 스킬은 한 번도 호출하지 않았다. 이 인식이 `/ax:req-interview` skill을 실제로 호출하는 dogfood 실험으로 이어졌다.

---

## Phase 1: 인터뷰 Q&A

### 0. 프로젝트 이름 확인

**Q**: 이 프로젝트를 부를 이름을 정해주세요.
**A**: **`fx-work-observability`** (Recommended 옵션 선택)

---

### Part 1. 왜 (목적/문제)

**Q (핵심)**: 제가 대화 맥락에서 정리한 Part 1 초안이 맞나요? 보강할 점이 있다면?

초안 요약:
- 핵심 문제: 요구사항/Task/Sprint/Epic을 한눈에 볼 곳 없음 + 자연어 auto-classify 파이프라인 부재
- As-Is: SPEC.md 2000+줄 / Phase 32 backend 구축됐으나 view 없음 / GitHub Projects scope 부족 / ax skill on-demand CLI / Web UI에 task view 없음
- To-Be: 단일 뷰(4-채널) + 자연어→REQ 자동 분류 파이프라인
- 시급성: [미확인]

**A**: 대체로 맞음 근데 보강 필요 (시급성 / 측정가능 지표 / 동기).

---

**Q (후속 1/3 — 동기 & 영향)**: 이 "볼 수 있는 곳이 없다" 문제가 지금까지 어떻게 부딪혔나요?

**A** (복수 선택, **4개 전부**):
1. 이번 S258~S260 dogfood chain 도중의 구체적 실패/지연 사례
2. 혼자 개발 모드에서 작업 위치를 자주 잊어버리는 만성 불편
3. 팀/외부 공유 관점 — "보여줄 것이 없다"
4. 미래 확장성 — 팀 균형에 대비한 선행 투자

---

**Q (후속 2/3 — 측정 가능 baseline 지표)**: 관찰성 복원 전/후 비교의 baseline이 될 지표를 골라주세요.

**A** (복수 선택, **4개 전부**):
1. 세션당 SPEC.md 수동 grep/scroll 횟수
2. 세션 resume 후 맥락 복원 소요 시간 (분)
3. C-track task당 수동 개입 횟수 (Enter blast, 수동 commit 등)
4. Board UI 부재로 "모르는 채" 진행한 결정 건수

---

**Q (후속 3/3 — 시급성/타이밍)**: 이 작업의 시급성과 타이밍은?

**A**: **Hotfix — 지금 당장, 다음 dogfood chain 전에 반드시**. 수 시간 내 MVP, 나중에 정공 버전으로.

---

### Part 2. 누구를 위해 (사용자/이해관계자)

**Q (핵심)**: `fx-work-observability`를 실제로 사용하거나 영향받는 주체는?

**A** (복수 선택, **4개 전부**):
1. 나 혼자 (현 단계 primary) — 해월사 현재의 Master 운영자
2. Claude AI 자체 — AI가 이 view를 읽어 의사결정
3. 미래 팀원 (개발자/PM) — 다중 협업 확장 시
4. 보고 대상 — 임원/고객/투자자

→ **4-동심원 사용자 모델** 확정.

---

**Q (후속 1/2 — 접근 채널)**: MVP(Hotfix)가 우선 커버할 채널?

**A** (복수 선택, **4개 전부**):
1. Web UI — `fx.minu.best/work-management`
2. JSON API endpoint — Claude AI가 Bash로 Read 또는 curl
3. CLI 쿼리 — `fx backlog` / `bash scripts/board/*`
4. Terminal live feed — `/tmp/task-signals/*.log` tail + Monitor

→ **4-채널 MVP target** 확정. 우선순위는 Part 3(범위)에서 결정.

---

**Part 2 이해관계자 맵 & Claude AI 특수요구**: 혼자 개발 모드로 저항자 없음, Claude AI 특수요구(JSON 구조화 / 2000 토큰 이내)는 Part 3/5 제약에서 자연 반영. **Part 2 clean close**.

---

### Part 3. 무엇을 (범위/기능)

**Q (핵심)**: MVP(Hotfix)에 반드시 포함되어야 할 Must Have 기능은?

**A** (복수 선택, **4개 전부**):
- **M1**: Backlog 강고 집계 (Requirements + Tasks + Sprint + Phase)
- **M2**: 시각화 — Kanban 또는 요약 테이블
- **M3**: Context 복원 (Resume after session end)
- **M4**: 자연어 분류 파이프라인 ("Something like this" → REQ-NNN 자동등록)

---

**Q (후속 1/2 — Scope 재조정)**: "Hotfix 시급성 + 4개 Must Have" 모순 해결?

**A**: **Walking Skeleton** — 4개 기능 전부를 "최소 동작 수준"으로 Hotfix. 각자 demo 가능한 선에서 최소 구현, 나중에 정공.

---

**Q (후속 2/2 — Out of Scope)**: Walking Skeleton MVP에서 명시적으로 제외할 항목?

**A** (2개 선택, 4개 중):
- ❌ 편집/CRUD UI — read-only view만, 상태 변경은 CLI/Edit
- ❌ RBAC / multi-tenant / 보안 — 혼자 개발 가정

**포함 유지** (제외하지 않음):
- Real-time push (Monitor #1 재사용으로 이미 구현에 가까움)
- LLM 기반 분류 (Claude inline call로 재사용 가능)

---

### Part 4. 어떻게 판단 (성공 기준)

**Q (핵심)**: Walking Skeleton 성공 판정 체크리스트?

**A** (2개 선택):
1. Walking Skeleton 4개 기능(M1~M4)이 "실제 동작 확인 가능"
2. 주관적 기준 — 사용자가 "아, 이제 보인다"를 경험

**제외**: Part 1 baseline 수치 개선(측정 기간 필요), End-to-end self-referential dogfood(부가적 이벤트).

---

### Part 5. 제약과 리소스 (현실 조건)

**Q (핵심 — 시간 예산)**: Hotfix Walking Skeleton에 투입 가능한 시간?

**A**: **4~8시간 (끝까지 Hotfix)** — Walking Skeleton 고품질 버전. 단순 stub이 아니라 기본 스타일 + 에러 처리 포함.

---

**Q (후속 1/2 — 기술 stack)**: 허용된 기술 스택 범위와 의존성?

**A** (복수 선택, **4개 전부**):
1. 기존 `packages/{api,web,cli,shared}` 내부만 (Recommended stance)
2. Claude API inline 호출 허용 (M4 내무복 분류)
3. D1 새 테이블 있게 — work-observability 메타데이터 저장용
4. 새 package 생성 (`packages/work-observability/`)

→ 설계 자유도 높게, 기존 packages 우선하되 필요 시 확장 허용.

---

**Q (후속 2/2 — 실패/중단 조건)**: Hotfix 시도 중 어떤 상황에서 중단/pivot?

**A** (2개 선택):
1. M4 LLM 분류 Claude API 에러/비용 → **regex fallback**으로 축소
2. `packages/web` 빌드/테스트 반복 실패 → **API+D1만 완성**, Web UI는 다음 세션

**Fallback 우선 철학**: 전체 중단보다는 단계별 대체 경로.

---

## Phase 1 종료

사용자 확인: **"맞음 — PRD v1 생성 + Phase 2 API 검토 (ChatGPT/Gemini/DeepSeek)"**.

→ `prd-v1.md` 생성 완료. 다음 단계: Phase 2 API 자동 검토 (`review-api.mjs` OpenRouter 경유 3 모델 동시).

---

## 관찰 (Claude 메타 기록)

이 인터뷰는 **self-referential dogfood**다:
1. 사용자가 "이 대화 자체가 REQ로 분류되는지" 물음
2. Claude가 "수동 처리 중"이라 정직하게 답변
3. `/ax:req-interview` skill을 **실제로 invoke** — 처음 사용
4. 이 대화 내용이 `fx-work-observability/` 프로젝트의 첫 요구사항으로 등록됨
5. 즉 "자동 분류 파이프라인의 부재"를 해결하는 프로젝트가, 그 부재를 경험한 직접 사례(이 대화)로부터 탄생

이 흐름은 **M4 Must Have의 정당성**을 live demo로 증명한다 — 사용자가 말했고, Claude가 해석했고, skill이 문서화했다. 하지만 **자동화된 경로는 아니다** — 수동 호출을 거쳤고, 답변 분류/PRD 작성은 여전히 Claude 판단 기반이다. 정공 버전(Should Have M4.a)이 이 수동 단계를 제거한다.

---

*이 로그는 `/ax:req-interview` 스킬 Phase 1 인터뷰 원문 기록이다.*
