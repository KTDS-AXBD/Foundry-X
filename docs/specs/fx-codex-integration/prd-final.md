# fx-codex-integration PRD

**버전:** final (draft v1)
**날짜:** 2026-04-16
**작성자:** Sinclair (AX BD팀)
**상태:** 📋(plan) — Sprint 배정 대기
**FX-REQ:** FX-REQ-587~590 (F550=587 / F551=588 / F552=589 / F553=590)  
**F-item 제안:** F550~F553 (4건 묶음, Option B 압축 배치 — Sprint 300/301/305)  
**Phase 라벨:** Phase 46 `Dual-AI Verification` (신규)

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Claude Code 단독 체제를 **Claude Code(Drafter) + Codex(Reviewer)** 듀얼 AI로 전환하여, Foundry-X Sprint 파이프라인의 "지시 무시·큰 기능 누락·과잉 수정" 회귀를 구조적으로 차단한다.

**배경:**
- 14년 경력 Principal 엔지니어의 실측 비교(8만 줄 Python/TS 프로젝트, 100h vs 20h)에 따르면:
  - Claude Code(Opus 4.6): 빠르고 인터랙티브하나 CLAUDE.md 지침 무시·테스트 임의 수정·함수 무분별 추가 경향
  - Codex(GPT-5.4): 3~4배 느리지만 지시 100% 준수·자발적 리팩토링·품질 높음
  - 권장 워크플로우: **Claude 초안 → Codex 리뷰**, "두 모델이 같은 방식으로 환각할 확률 극히 낮음" 활용
- Foundry-X 자체 회고에서도 동일 패턴 재발: Sprint 296 F539c `2 PR 분할 미이행`, Sprint 297 F540 `autopilot lint pre-check 누락 → deploy 실패` 등, "Claude가 큰 지시에서 일부를 빠뜨리는" 이슈가 누적됨
- 사업개발팀 1인 개발자 체제에서 휴먼 리뷰 대체가 병목 → AI 듀얼 리뷰가 비용/효과 최적

**목표:**
Sprint autopilot Verify 단계에 Codex 리뷰를 필수 관문으로 삽입하고, 안전한 툴체인(공식 Codex CLI 우선, free-code 격리 환경 한정)과 지표(리뷰 hit rate, 회귀 감소율)를 확보한다.

**Source:**
- `https://news.hada.io/topic?id=28538` — 14년 경력 엔지니어 100h vs 20h 비교
- `https://goddaehee.tistory.com/580` — free-code 설치·사용법 튜토리얼
- `https://github.com/paoloanzn/free-code` — 멀티 프로바이더 지원 Claude Code fork
- Foundry-X 내부: Phase 42 `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md`, S295~S297 회고

**시장 적합성:**
듀얼 AI 리뷰(Drafter+Reviewer)는 2026년 상반기 실무 개발 커뮤니티에서 사실상 표준화된 패턴. Foundry-X의 "Spec↔Code↔Test 삼각 동기화"와 결이 맞으며, MetaAgent(F530) 진단 체계와 자연스럽게 결합 가능.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)

**Claude 단독 체제의 구조적 한계 (Sprint 회고 근거):**

| 회차 | F-item | 증상 | 근본원인 후보 |
|------|--------|------|--------------|
| S295 | F539b | CLI URL 전환 누락 — PRD `Web + CLI` 중 Web만 구현 | "큰 지시 일부 누락" |
| S296 | F539c | 2 PR 분할 미이행 + Smoke P2 미실측 + Retrospective 누락 | 다건 지시 drop |
| S297 | F540 | autopilot `pnpm lint` 누락 → deploy 3 job skip | Pre-check 생략 |
| S290 | F542 | F536 auto-trigger 저장 경로 분기 미발견 → F544 후속 Sprint | 리팩토링 기회 미포착 |
| S268 | — | cs `--autoyes` 폭주로 `git add -A` 사고 | 지시 우선순위 무시 |

- **공통 패턴**: Claude가 "구현은 통과시키지만 PRD의 부차 항목·Phase Exit 체크리스트·스타일 룰을 흘림"
- `/ax:code-verify`, Gap Analysis, pdca-iterator가 존재하나 **모두 Claude 단일 모델 자기 검증** → 같은 편향이 겹쳐 놓침
- 결과: Hotfix PR(F537, F539a~c 4회 분할, F544 등)이 Sprint 당 1~2회 필연 발생

### 2.2 목표 상태 (To-Be)

**듀얼 AI 파이프라인:**

```
Sprint autopilot
  ├─ Phase 1~4: Plan/Design/Red/Green (Claude Code 주도, 변경 없음)
  ├─ Phase 5 Verify (NEW):
  │   ├─ 5a. Claude code-verify (기존) — 자기 검증
  │   ├─ 5b. Codex cross-review (신규) — 다른 모델 눈으로 재검증
  │   │        └─ PRD 대조, PR 본문 섹션 누락, Phase Exit 체크리스트, 과잉 수정 탐지
  │   └─ 5c. Divergence 판정 — 두 리뷰 간 차이 > 임계치 시 Human in the loop
  └─ Phase 6: PR+merge (변경 없음)
```

- Codex는 **쓰기 권한 없음**(read-only 리뷰어) — 지시 우선도/경계 보장
- 4주 관측 후 회귀 PR(hotfix/revert) 빈도 **-50%** 목표

### 2.3 시급성

- **P0**: Phase 44(MSA 분리)에서 F539b/c/F540 모두 Exit drift 3건 이상 발생. F541(fx-offering) Sprint 299에서도 같은 패턴 재발 가능성 100%.
- **P1**: Phase 46 예상 F-item(AI Foundry OS 후속, MetaAgent 실전화)은 PRD 범위가 커서 단일 모델 구현의 누락 리스크 높음.

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자

| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| Sinclair | 1인 개발자/PM | 회귀 감소, 수동 검토 부담 경감 |
| Claude Code | Drafter 에이전트 | Codex 피드백을 구조화된 형식으로 받기 |
| Codex (reviewer) | GPT-5.4 리뷰 에이전트 | PRD/PR/diff 컨텍스트 주입 필요 |

### 3.2 이해관계자

| 구분 | 역할 | 영향도 |
|------|------|--------|
| Sinclair | 도입 결정자 + 비용 부담자 | 높음 |
| 회사(kt ds) | 보안/라이선스 정책 | 중간 (free-code 정식 채택 불가 논리) |

### 3.3 사용 환경

- WSL2 Ubuntu 24.04, Windows Terminal, tmux 3.5a
- 기존 Claude Code 설치 경로 유지
- Codex: OpenAI 공식 CLI + API 키(정식 결제 경로)
- 네트워크: api.openai.com 아웃바운드

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

**M1. Codex CLI 설치 및 계정 설정 표준화**
- 공식 Codex CLI(`@openai/codex` 또는 후속 공식 패키지) 설치 스크립트: `scripts/setup/install-codex.sh`
- 환경변수 분리: `OPENAI_API_KEY`, `OPENAI_ORG_ID` → `wrangler secret`이 아닌 로컬 `~/.config/codex/config.toml`
- Claude Code 설치와 격리 (`$CLAUDE_CONFIG_DIR` vs `$CODEX_CONFIG_DIR`)

**M2. Codex 리뷰어 프로파일 정의**
- `~/.claude-squad/profiles/codex-reviewer.md` (또는 cs 독립 프로파일)
- 역할 지시: "read-only reviewer, no file edits, no git ops, produce structured review JSON"
- 입력: PRD path + PR diff + CLAUDE.md + 변경 파일 내용
- 출력 스키마 (JSON):
  ```json
  {
    "verdict": "PASS" | "BLOCK" | "WARN",
    "prd_coverage": [{"clause": "§4.1 M3", "status": "missing" | "partial" | "done"}],
    "phase_exit_checklist": [{"item": "pnpm lint", "status": "skip" | "pass" | "fail"}],
    "code_issues": [{"file": "path", "line": 10, "severity": "high", "msg": "..."}],
    "over_engineering": [{"file": "...", "msg": "unrequested refactor"}]
  }
  ```

**M3. `/ax:sprint` autopilot Phase 5b 삽입**
- `scripts/autopilot/codex-review.sh`: PRD+diff+PR본문을 수집해 Codex CLI 호출
- 결과를 `.claude/reviews/sprint-{N}/codex-review.json` 저장
- Gap Analysis(기존 `/ax:code-verify`) 결과와 머지하여 "Composite Verify Report" 생성
- BLOCK 판정 시 autopilot 중단 → Sinclair에게 alert

**M4. Divergence 지표 + 대시보드**
- Work Management 대시보드(`/work-management`)에 "Dual AI Review" 섹션 추가
- Sprint별 `claude_verdict` vs `codex_verdict` 일치율, BLOCK 사유 top 5
- D1 테이블 `dual_ai_reviews` (sprint_id, claude_json, codex_json, divergence_score, decision, created_at)
- 4주 관측 데이터로 모델 전환/비중 조정 판단

### 4.2 있으면 좋은 기능 (Should/Could)

**S1. free-code 격리 샌드박스 (S)**
- 공식 Codex CLI 장애/비용 제약 시 백업 경로
- Windows/macOS 개인 PC에만 허용, kt ds 사내 네트워크 금지
- 보안 주의: telemetry/security-prompt 스트립 + 실험 플래그 54개 활성화 → **프로덕션 레포 직접 접근 금지**
- 전용 VM 또는 WSL 인스턴스로 격리, Foundry-X 소스는 read-only mount

**S2. 3-모델 triangulation (C)**
- 특정 P0 F-item에 한해 Claude+Codex+Gemini/기타 3모델 다수결
- 비용 증가 크므로 Phase 46+ 관측 후 결정

**S3. Codex-only 리팩토링 전용 Sprint (C)**
- Phase 43 회고처럼 "리팩토링만 하는 Sprint"를 Codex 주도로 실험

### 4.3 제외 범위 (Out of Scope)

- Codex를 Drafter로 승격하는 시나리오 — Claude의 인터랙티브 속도 강점 유지
- Codex가 직접 commit/push — 쓰기 권한 위임 금지 (리뷰어 경계 훼손)
- free-code를 프로덕션 표준 툴체인으로 채택 — 라이선스/보안 위험
- Cowork/Claude Code 웹 환경 내 Codex 통합 — Cowork는 Anthropic 전용

---

## 5. 요구사항 상세

### 5.1 기능 요구사항 (FR)

| ID | 요구사항 | 우선순위 | F-item 매핑 |
|----|---------|---------|-------------|
| FR-01 | Codex CLI 설치 자동화 스크립트 + 버전 pin | P0 | F550 (FX-REQ-587) |
| FR-02 | Codex 리뷰어 프로파일 YAML + 프롬프트 템플릿 | P0 | F550 (FX-REQ-587) |
| FR-03 | autopilot Phase 5b 훅 삽입 (`codex-review.sh`) | P0 | F551 (FX-REQ-588) |
| FR-04 | Composite Verify Report 생성기 (Claude+Codex merge) | P0 | F551 (FX-REQ-588) |
| FR-05 | BLOCK 판정 시 autopilot 중단 + tmux alert | P0 | F551 (FX-REQ-588) |
| FR-06 | D1 `dual_ai_reviews` 테이블 + API | P1 | F552 (FX-REQ-589) |
| FR-07 | `/work-management` Dual AI Review 위젯 | P1 | F552 (FX-REQ-589) |
| FR-08 | 4주 관측 리포트 (`docs/04-report/phase-46-codex-retro.md`) | P1 | F553 (FX-REQ-590) |
| FR-09 | free-code 격리 샌드박스 가이드 문서 (S) | P2 | F553 (FX-REQ-590) |

### 5.2 비기능 요구사항 (NFR)

- **비용 상한**: OpenAI API 월 **$50** 초과 시 알림. Sprint 당 평균 리뷰 비용 < $1 목표.
- **지연**: Codex 리뷰 1회 p95 < 180s. 초과 시 Composite Verify 타임아웃 → Claude 단독 결과로 진행(degraded mode).
- **보안**: API 키는 `.env` 금지. `wrangler secret` 또는 `~/.config/codex/` 600 권한.
- **라이선스**: free-code는 "Anthropic property" 명시됨 — 내부 실험용으로만, 외부 공유·상용 금지 문서화.
- **정합성**: Codex 리뷰 실패(네트워크/쿼터) 시에도 autopilot은 진행 — 단 "reviewer unavailable" 플래그 기록.

### 5.3 제약사항

- OpenAI 결제 계정 필요 — Sinclair 개인 계정으로 시작, 향후 법인 이관 검토
- Codex API 응답 스키마 변경 시 프로파일 수동 업데이트 필요
- 1인 개발자 체제 — Codex 판정에 대한 인간 오버라이드는 Sinclair 단독

---

## 6. F-item 분해 (Sprint 배정 제안)

**Option B 압축 배치 (Sinclair 선택, 2026-04-16):** F550+F551 동일 Sprint로 통합 → 3 Sprint 구성.

| F-item | FX-REQ | 제목 | Sprint | 규모 | 의존 |
|--------|--------|------|--------|------|------|
| **F550** | 587 | Codex CLI 설치 + 리뷰어 프로파일 확립 | 300 | S | 없음 |
| **F551** | 588 | autopilot Phase 5b 훅 + Composite Verify | 300 | M | F550 |
| **F552** | 589 | Dual AI Review D1 + 대시보드 위젯 | 301 | M | F551 |
| **F553** | 590 | 4주 관측 + 회귀율 리포트 + 튜닝 | 305 (4주 후) | S | F552 + 관측 데이터 |

- **Sprint 299는 F541(fx-offering) 기 예정** — 충돌 없음
- **Phase 46** `Dual-AI Verification`로 신규 등록 — SPEC.md `## §1 프로젝트 개요` 상단 Phase 리스트 추가 필요
- **FX-REQ-586 충돌 회피**: 기존 B3(Dashboard 파이프라인 원 안 숫자) 점유 → 본 PRD는 587~590 사용

---

## 7. 성공 지표 (KPI)

| KPI | 측정 | 목표 (4주 후) |
|-----|------|--------------|
| K1. Hotfix/Revert PR 감소율 | Phase 44(기준 6건) 대비 Phase 46 | -50% 이상 |
| K2. Codex BLOCK hit rate | 실제로 PRD 누락·Exit drift를 선제 포착한 건수 / 전체 BLOCK | ≥ 60% |
| K3. False-positive rate | Sinclair가 override한 BLOCK / 전체 BLOCK | ≤ 25% |
| K4. Phase Exit drift 자동감지 | autopilot Phase 5b에서 Exit 누락 사전 경고 건수 | Sprint 당 ≥ 1건 선제 |
| K5. 월 Codex API 비용 | 결제 내역 | ≤ $50 |
| K6. autopilot 지연 증가 | Phase 5b 추가로 인한 총 소요 | +10분 이내 |

---

## 8. 리스크 및 완화

| 리스크 | 심각도 | 완화 |
|--------|-------|------|
| R1. Codex 응답 장황 → 실제 신호 파묻힘 | 중 | JSON 구조화 출력 강제, 자유서술 섹션 < 200자 제한 |
| R2. Claude vs Codex 끊임없는 반박 루프 | 중 | Codex는 read-only, 응답 1회만. Claude는 Codex 피드백 반영 Reply 금지 — Sinclair가 중재 |
| R3. OpenAI API 쿼터 소진/장애 | 중 | degraded mode(Claude 단독) fallback 설계. free-code 백업 경로 문서화 |
| R4. free-code 저장소 blocked 상태 | 낮음 | 공식 Codex CLI 우선, free-code는 S1 Should 수준 유지 |
| R5. 이중 비용 (Anthropic + OpenAI) | 중 | K5 월 상한 $50로 cap, Phase 46 말 ROI 재평가 |
| R6. Codex가 Foundry-X 도메인 지식 부족(한국어 PRD, AX BD 용어) | 높음 | 리뷰어 프로파일에 핵심 용어집 + 최근 PRD 3건 요약 주입 |
| R7. 보안 — free-code의 security-prompt 스트립 | 높음 | S1에만 적용, 프로덕션 레포 직접 접근 금지. VM 격리 필수 |

---

## 9. 의사결정 오픈 이슈

- **O1.** 공식 Codex CLI 최신 버전 확인(2026-04 기준 `@openai/codex` 명칭 유효성) — 착수 전 검증 필요
- **O2.** 법인 OpenAI 계정 사용 가능 여부 — kt ds IT 정책 확인
- **O3.** Codex 리뷰 결과를 PR 본문에 자동 주입할지(투명성) 또는 내부만 기록할지
- **O4.** MetaAgent(F530)와의 역할 중복 — MetaAgent는 "실행 후 진단", Codex 리뷰어는 "PR 전 사전 검증". 분리 유지 제안

---

## 10. 참고 자료

- **외부**
  - news.hada.io/topic?id=28538 — Claude Code 100h vs Codex 20h
  - reddit r/ClaudeCode 1sk7e2k (본문 fetch 실패, hada 요약으로 갈음)
  - goddaehee.tistory.com/580 — free-code 설치/사용
  - github.com/paoloanzn/free-code — 저장소(현재 blocked 상태)
- **내부**
  - `docs/specs/Multi-Agent-Coding-Tools-Analysis-v2.md`
  - `docs/specs/fx-multi-agent-session/prd-final.md` (Claude Squad 도입 PRD — 본 PRD와 보완 관계)
  - Phase 44 회고: F539b/c/F540 Exit drift 사례
  - `.claude/rules/tdd-workflow.md`, `.claude/rules/process-lifecycle.md`

---

## 11. 다음 단계

1. Sinclair 리뷰 + O1~O3 결정 — 2026-04-17
2. `SPEC.md §5`에 F550~F553 + FX-REQ-586~589 등록 (master 직접 commit)
3. Sprint 300 WT 생성 — F550 착수 (예상 2026-04-20 주)
4. Phase 46 `Dual-AI Verification` 라벨 신설
