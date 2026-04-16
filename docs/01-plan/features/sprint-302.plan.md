---
id: FX-PLAN-SPRINT-302
title: Sprint 302 Plan — Phase 46 hotfix (F554 Dual-AI Smoke Reality)
sprint: 302
phase: 46
features: [F554]
req: [FX-REQ-591]
prd: docs/specs/fx-codex-integration/prd-final.md
created: 2026-04-16
predecessor: Sprint 300 (PR #606, F550/F551 partial merge)
---

# Sprint 302 Plan — Phase 46 hotfix

Sprint 300의 **Smoke Reality 실패**에 대한 hotfix. F550/F551 스크립트 자산은 존재하나 (a) Codex CLI 실설치 미검증 (b) autopilot Phase 5b 훅 미배선 → Dead Code 상태. 본 Sprint의 merge PR이 **실제로 Codex 리뷰를 받아** degraded=false JSON을 생성해야 완료로 인정.

## 1. 왜 hotfix가 필요한가 (S300 실측)

| 항목 | 설계(F550/F551) | 실측(2026-04-16) |
|------|----------------|------------------|
| `scripts/setup/install-codex.sh` | 존재 + 실행 가능 | 존재하나 `npm install -g` 에서 EACCES (sudo 미처리) |
| `codex` CLI | 설치됨 | Master에서 수동 v0.120.0 설치 완료, 그러나 스크립트 경로로는 실패 |
| `scripts/autopilot/codex-review.sh` | Phase 5b에서 호출 | 존재하나 **호출 지점 없음** — autopilot skill 본문에 `codex-review` 문자열 0건 |
| Sprint 300 자체 dogfood | `.claude/reviews/sprint-300/codex-review.json` 생성 | **파일 부재** |

**Process Lifecycle rule 위반**: Design Stage Exit D1(주입 사이트 전수 검증) — autopilot skill이 "신규 훅 주입 지점"인데 Design 문서 §5 파일 매핑에 누락됨. Phase 43 F534(DiagnosticCollector 주입 누락)와 동형.

## 2. F-item

| F-item | 제목 | REQ | 규모 | 예상 |
|--------|------|-----|------|------|
| F554 | Codex 실설치 + Phase 5b 훅 배선 + dogfood | FX-REQ-591 | M | 3~5h |

## 3. 산출물

### 3.1 `scripts/setup/install-codex.sh` 재작성
- npm prefix를 user-level로 설정: `npm config set prefix "$HOME/.npm-global"`
- PATH 주입 가이드 (`~/.bashrc` append 확인 + skip if already)
- sudo 없이 `npm install -g @openai/codex@0.120.0` 성공
- 기존 전역 설치 감지 시 버전 비교만 수행
- OpenRouter `base_url` 오버라이드 검증 서브루틴: `codex config show` 또는 `~/.config/codex/config.toml`에 `base_url = "https://openrouter.ai/api/v1"` 설정 후 `codex --version` 응답 검증

### 3.2 `sprint-autopilot` skill Phase 5b 배선
- **파일**: `~/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md`
- **위치**: Verify 단계(gap analysis) 직후, Report 단계 직전
- **내용**:
  ```
  ### Phase 5b: Codex Cross-Review (Dual-AI Verification)
  1. `bash scripts/autopilot/codex-review.sh --sprint $N --pr $PR_NUM`
  2. 결과 파싱: `.claude/reviews/sprint-$N/codex-review.json`
  3. verdict == BLOCK → autopilot 중단 + signal STATUS=BLOCKED
  4. verdict == WARN → 경고 로그 + 진행
  5. verdict == PASS → Report 단계로
  6. degraded=true → 로그 기록 + PASS-degraded로 처리(4주 관측용)
  ```
- **cache sync**: `~/.claude/plugins/cache/ax-marketplace/ax/*/skills/sprint-autopilot/SKILL.md`도 동일 업데이트

### 3.3 Composite Verify Report 포맷
- `.claude/reviews/sprint-$N/composite-verify.md`
- 섹션: Claude Gap Analysis(기존) + Codex Review JSON 요약 + divergence 지점

### 3.4 자체 dogfood 증거
- Sprint 302 PR #xxx에 `.claude/reviews/sprint-302/codex-review.json` 커밋 포함
- `degraded: false`, `verdict: PASS`(또는 WARN/BLOCK 후 해결) 확증
- PR 본문에 Codex review 요약 섹션 자동 삽입 (옵션, F551 O3 결정 참조)

### 3.5 회고 문서
- `docs/retrospective/phase-46-dogfood-failure.md`
- 내용: "왜 Sprint 300이 Match 98%로 merge됐는가" 근본 원인 분석 + Design Stage Exit 재발 방지 체크리스트 추가 제안

## 4. TDD Red

### 4.1 `scripts/setup/install-codex.test.sh` 확장
```bash
# Red: sudo 없이 user prefix에 설치되는지 확증
test "npm config get prefix returns user-level path" {
  bash scripts/setup/install-codex.sh --dry-run
  [[ "$(npm config get prefix)" == "$HOME/.npm-global" ]]
}
```

### 4.2 `scripts/autopilot/codex-review.test.sh` 확장
```bash
# Red: SKILL.md에 Phase 5b 섹션이 실제로 존재하는지 정합성 테스트
test "sprint-autopilot skill references codex-review.sh" {
  grep -q "codex-review.sh" ~/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md
  grep -q "Phase 5b" ~/.claude/plugins/marketplaces/ax-marketplace/skills/sprint-autopilot/SKILL.md
}
```

### 4.3 Meta-dogfood 검증
- Sprint 302 autopilot 실행 종료 시점에 `.claude/reviews/sprint-302/codex-review.json` 존재 확인 → 부재 시 BLOCK
- autopilot 자체에 post-Phase-5b assertion 추가

## 5. Design Stage Exit 체크리스트 (Phase 43 교훈 준수)

| # | 항목 | 검증 |
|---|------|------|
| D1 | 주입 사이트 전수 스캔 | `grep -rn "codex-review" ~/.claude/plugins/marketplaces/ax-marketplace/skills/` = 최소 1건 (sprint-autopilot) |
| D2 | 식별자 계약 | `sprint-$N` 포맷 생산자(codex-review.sh) = 소비자(autopilot) 동일 regex `^sprint-\d+$` |
| D3 | breaking change | SKILL.md 변경은 plugin cache 양쪽 동기화 필요 (development-workflow.md "ax plugin 스킬 내용 수정 동기화 3단계") |
| D4 | TDD Red 커밋 | 4.1/4.2 테스트 FAIL 로그 커밋 |

## 6. Phase Exit 체크리스트 (Smoke Reality P2)

| # | 항목 | 판정 |
|---|------|------|
| P1 | Sprint 302 autopilot 1회 실행 | signal STATUS=MERGED + PR URL 기록 |
| P2 | **실측 codex-review.json 1건 이상** (degraded=false) | 파일 존재 + `jq '.degraded'` == `false` |
| P3 | verdict 값 PASS/WARN/BLOCK 중 하나 | JSON schema 유효 |
| P4 | 회고 작성 | `docs/retrospective/phase-46-dogfood-failure.md` 생성 |

## 7. 리스크

- **R1**: OpenRouter가 Codex CLI의 `responses` API endpoint를 지원하지 않을 수 있음 → OpenAI 직접 키 발급 폴백 (Open Issue)
- **R2**: plugin cache 수정은 다른 pane에도 즉시 영향 → 다른 Sprint 동시 실행 시 주의
- **R3**: 자체 dogfood가 재귀 실패(Phase 5b가 자기 자신을 호출하다가 stall) → timeout 30s + retry 1회

## 8. 완료 조건

- F554 상태 `✅(deployed)`
- F550/F551 상태 `✅(partial)` → `✅` (F554가 결함 전량 해소)
- `docs/retrospective/phase-46-dogfood-failure.md` commit
- Sprint 302 PR merge 후 Phase 46 `Dual-AI Verification` Smoke Reality 재판정: PASS
