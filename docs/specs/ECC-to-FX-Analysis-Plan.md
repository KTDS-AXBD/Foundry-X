# ECC → Foundry-X 반영 분석 및 계획

> 작성일: 2026-04-05 | 작성: Claude Opus 4.6
> 대상: Foundry-X 프로젝트 (.claude/ 하네스 고도화)

---

## 1. Everything Claude Code (ECC) 핵심 분석

### 1.1 프로젝트 규모

| 항목 | 수치 |
|------|------|
| GitHub Stars | 138K+ |
| Agents | 38개 (특화 서브에이전트) |
| Skills | 156개 (워크플로우 + 도메인) |
| Commands | 72개 (레거시 slash 진입점) |
| Hooks | 25+ (자동화 트리거) |
| Rules | 34+ (공통 + 12개 언어) |
| 지원 언어 | 7개 (TS, Python, Go, Java, Kotlin, Perl, C++) |

### 1.2 핵심 아키텍처

```
everything-claude-code/
├── agents/          # 38개 서브에이전트 (YAML front-matter + Markdown)
├── skills/          # 156개 워크플로우 (섹션: When/How/Examples)
├── commands/        # 72개 슬래시 명령 (→ skills로 마이그레이션 중)
├── hooks/           # hooks.json (PreToolUse/PostToolUse/Stop/SessionStart/SessionEnd)
├── rules/           # 공통 5종 + 언어별 12세트
│   ├── coding-style.md
│   ├── git-workflow.md
│   ├── testing.md
│   ├── performance.md
│   └── security.md
├── mcp-configs/     # MCP 서버 연동 설정
├── contexts/        # 동적 시스템 프롬프트 주입
├── scripts/         # 크로스플랫폼 Node.js 유틸리티
└── CLAUDE.md        # 프로젝트 하네스 루트 설정
```

### 1.3 ECC 핵심 개념 6가지

**① Agent 계층 분리**
- 탐색/검색: Haiku (빠르고 저렴)
- 일반 코딩: Sonnet (비용 대비 성능)
- 아키텍처/보안: Opus (깊은 추론)
- 각 에이전트는 tools, model, description을 YAML로 선언

**② Hooks 자동화 체계**
- PreToolUse: `git --no-verify` 차단, 설정 파일 보호
- PostToolUse: 자동 포맷, 타입체크
- SessionStart: 이전 컨텍스트 로딩
- Stop: 세션 학습 패턴 추출
- 프로파일 제어: `ECC_HOOK_PROFILE=minimal|standard|strict`

**③ Continuous Learning (Instinct 시스템)**
- 세션 중 패턴을 자동 캡처 → 신뢰도 점수(0.3~0.9) 부여
- `/evolve` 명령으로 instinct → skill 진화
- `/instinct-export`, `/instinct-import`로 이식

**④ Rules 시스템**
- `~/.claude/rules/`에 항상 적용되는 규칙 배치
- 공통(coding-style, testing, security, git-workflow, performance) + 언어별 세트
- 프로젝트별 override 가능

**⑤ MCP 컨텍스트 최적화**
- 200K 컨텍스트 중 MCP 도구가 많으면 실질 70K만 남음
- 동시 활성화 10개 미만, 활성 도구 80개 미만 권장
- MCP 대신 CLI 래핑으로 토큰 절감

**⑥ 멀티에이전트 오케스트레이션**
- `/multi-plan`: 작업 분해
- `/multi-execute`: 병렬 실행
- Git worktree 기반 격리
- 동시 작업 3~4개 적정

---

## 2. goddaehee 블로그 분석 요약

블로그는 ECC를 한국어로 상세 해설하며, 다음 실전 인사이트를 추가로 제공:

**① 에이전트 하네스 정의**: "AI 에이전트의 입력(프롬프트, 규칙), 출력(훅, 검증), 도구 접근을 체계적으로 관리하는 외부 프레임워크"

**② search-first 패턴**: 코딩 전 5단계 리서치 워크플로우를 스킬로 정의 — Foundry-X의 SDD Triangle과 유사한 철학

**③ 보안 경고**: CVE-2025-59536 (startup trust dialog), CVE-2026-21852 (ANTHROPIC_BASE_URL 악용) — AgentShield 102개 룰로 방어

**④ 설치 전략**: "미세 조정 관점으로 접근하라" — 전체 설치(Full) 대신 주 사용 언어의 에이전트와 스킬부터 선택적으로 시작

**⑤ Two-Instance Kickoff**: 새 프로젝트 시 인스턴스 1(구조/설정) + 인스턴스 2(리서치/아키텍처)로 병렬 부트스트랩

---

## 3. Foundry-X 현재 구현 현황

### 3.1 프로젝트 규모

| 항목 | 수치 |
|------|------|
| Phase | 9 진행 중 (Sprint 98 완료) |
| API endpoints | ~420 |
| Services | 169 |
| API tests | 2,250 |
| CLI tests | 149 |
| Web tests | 265 |
| E2E specs | 35 (~146 tests) |
| D1 migrations | 0001~0078 |

### 3.2 .claude/ 구현 상태 (Gap 분석)

| 항목 | CLAUDE.md 계획 | 실제 구현 | Gap |
|------|---------------|----------|-----|
| **CLAUDE.md** | ✅ 상세 215줄 | ✅ 존재 | 없음 |
| **hooks/PreToolUse** | 보호 파일 차단 | ⚠️ 계획만 | 구현 필요 |
| **hooks/PostToolUse** | 3종 (format, typecheck, test-warn) | ⚠️ 계획만 | 구현 필요 |
| **agents/deploy-verifier** | Workers/Pages 배포 검증 | ❌ 미구현 | 구현 필요 |
| **agents/spec-checker** | Spec-Code 동기화 확인 | ❌ 미구현 | 구현 필요 |
| **agents/build-validator** | Build/lint/typecheck 검증 | ❌ 미구현 | 구현 필요 |
| **skills/ax-bd-discovery** | 2단계 발굴 오케스트레이터 v8.2 | ⚠️ 부분 | 고도화 필요 |
| **skills/ai-biz** | 11종 서브스킬 | ⚠️ 부분 | 고도화 필요 |
| **skills/tdd** | Red→Green→Refactor | ⚠️ 부분 | 고도화 필요 |
| **skills/npm-release** | npm 배포 자동화 | ⚠️ 부분 | 고도화 필요 |
| **rules/** | 미계획 | ❌ 없음 | **신규 도입** |
| **contexts/** | 미계획 | ❌ 없음 | **신규 도입** |
| **settings.json** | 미계획 | ❌ 없음 | 구현 필요 |
| **MCP 설정** | Phase 11 계획 | ❌ 없음 | 장기 |

### 3.3 Foundry-X 고유 강점 (ECC에 없는 것)

- **SDD Triangle**: Spec ↔ Code ↔ Test 동기화 — Plumb 엔진 기반
- **GAN Agent Architecture**: O-G-D (Orchestrator-Generator-Discriminator) 패턴
- **AX BD 6단계 프로세스**: 수집→발굴→형상화→검증→제품화→GTM
- **Sprint Worktree 워크플로우**: `sprint N` 명령으로 격리된 작업 공간
- **ESLint 커스텀 룰 3종**: no-direct-db-in-route, require-zod-schema, no-orphan-plumb-import

---

## 4. ECC → Foundry-X 반영 계획

### 4.1 반영 원칙

1. **선택적 도입**: Foundry-X에 실제 필요한 것만 (ECC 전체 복사 금지)
2. **기존 강점 보존**: SDD Triangle, GAN Architecture, BD 프로세스는 유지
3. **점진적 적용**: Phase 10에 걸쳐 Sprint 단위로 반영
4. **토큰 효율 우선**: MCP 과잉 방지, 컨텍스트 예산 관리

### 4.2 Sprint별 반영 로드맵

#### Sprint 99: Foundation — Hooks + Rules (우선순위 1)

**목표**: 자동화 기반 구축

**hooks.json 구현:**
```json
{
  "hooks": [
    {
      "type": "PreToolUse",
      "matcher": "Edit|Write",
      "description": "보호 파일 차단 (wrangler.toml, .env, secrets)",
      "command": "scripts/hooks/pre-edit-guard.sh"
    },
    {
      "type": "PreToolUse",
      "matcher": "Bash",
      "description": "git --no-verify 및 git add . 차단",
      "command": "scripts/hooks/pre-bash-guard.sh"
    },
    {
      "type": "PostToolUse",
      "matcher": "Edit|Write",
      "description": "TS/TSX 편집 후 eslint --fix + typecheck",
      "command": "scripts/hooks/post-edit-format.sh"
    },
    {
      "type": "PostToolUse",
      "matcher": "Edit|Write",
      "description": "테스트 파일 수정 경고",
      "command": "scripts/hooks/post-edit-test-warn.sh"
    }
  ]
}
```

**rules/ 신규 도입 (5종):**
- `rules/coding-style.md` — Foundry-X TS/React 코딩 규약 (Hono 라우트, Zustand 스토어, Ink UI)
- `rules/git-workflow.md` — Squash merge, Linear history, Sprint Worktree 규칙
- `rules/testing.md` — Vitest 패턴, ink-testing-library, D1 mock 전략
- `rules/security.md` — JWT, CORS, Cloudflare Workers 보안 규칙
- `rules/sdd-triangle.md` — Spec ↔ Code ↔ Test 동기화 규칙 (Foundry-X 고유)

#### Sprint 100: Agents — 3종 커스텀 에이전트 (우선순위 2)

**목표**: 기존 계획된 에이전트 실제 구현

**agents/deploy-verifier.md:**
```yaml
---
name: deploy-verifier
description: Workers/Pages 배포 전 검증 에이전트
tools: ["Bash", "Read", "Grep"]
model: sonnet
---
```
- D1 마이그레이션 --remote 적용 확인
- wrangler.toml 설정 검증
- CORS, API URL 경로 검증
- 빌드 에러 사전 탐지

**agents/spec-checker.md:**
```yaml
---
name: spec-checker
description: Spec-Code-Test 동기화 검증 에이전트
tools: ["Read", "Grep", "Glob"]
model: sonnet
---
```
- SPEC.md ↔ 실제 코드 간 일치성 검증
- 누락된 테스트 탐지
- API endpoint 수/서비스 수 교차 검증

**agents/build-validator.md:**
```yaml
---
name: build-validator
description: 모노리포 빌드/린트/타입체크 사전 검증
tools: ["Bash", "Read"]
model: haiku
---
```
- `turbo build && turbo lint && turbo typecheck` 실행
- 에러 자동 분류 및 수정 제안
- ESLint 커스텀 룰 3종 위반 탐지

#### Sprint 101: Skills 고도화 (우선순위 3)

**목표**: 기존 스킬 ECC 패턴으로 표준화 + 신규 스킬

**기존 스킬 표준화** (ECC의 When/How/Examples 섹션 구조 적용):
- `skills/ax-bd-discovery/SKILL.md` — v8.2 → v9.0 업그레이드
- `skills/ai-biz/SKILL.md` — 11종 서브스킬 인덱스
- `skills/tdd/SKILL.md` — Vitest + ink-testing-library 통합
- `skills/npm-release/SKILL.md` — wrangler deploy 포함

**신규 스킬 도입** (ECC에서 차용):
- `skills/search-first/SKILL.md` — 코딩 전 5단계 리서치 (ECC 핵심 패턴)
- `skills/verification-loop/SKILL.md` — 체크포인트 vs 연속 검증 (SDD Triangle 연동)
- `skills/sprint-workflow/SKILL.md` — Worktree 생성→작업→merge 자동화

#### Sprint 102: Contexts + 고급 패턴 (우선순위 4)

**목표**: 동적 프롬프트 주입 + 학습 체계

**contexts/ 도입:**
- `contexts/dev.md` — 개발 모드 (코딩 중심, 빠른 반복)
- `contexts/review.md` — 리뷰 모드 (보안/품질 중심, 꼼꼼한 검증)
- `contexts/deploy.md` — 배포 모드 (Workers/Pages 특화, 안전 우선)
- `contexts/bd.md` — BD 모드 (사업개발 용어, AX 프로세스 중심)

**Instinct-like 학습 체계:**
- `/learn` 스킬: 세션에서 반복 패턴 추출
- `~/.claude/instincts/` 디렉토리에 패턴 저장
- 신뢰도 기반 자동 적용 (0.7 이상만)

### 4.3 반영하지 않을 것 (의도적 제외)

| ECC 항목 | 제외 이유 |
|----------|----------|
| 언어별 에이전트 12종 (Go, Java, Kotlin...) | Foundry-X는 TS + Python만 사용 |
| PM2 멀티프로세스 관리 | Cloudflare Workers 서버리스 아키텍처와 맞지 않음 |
| AgentShield 전체 | 102개 룰은 과잉 — security.md 규칙으로 충분 |
| Continuous Learning 전체 | Instinct 개념만 차용, `/evolve` 파이프라인은 복잡도 대비 ROI 낮음 |
| MCP-configs 전체 | Phase 11에서 별도 설계 (현재는 토큰 효율 우선) |
| commands/ 72종 | ECC 자체도 skills로 마이그레이션 중 — commands 레이어 불필요 |

### 4.4 예상 효과

| 지표 | 현재 | 목표 |
|------|------|------|
| `--no-verify` 우회 비율 | 측정 안 됨 | < 10% (PreToolUse hook) |
| 타입 에러 감지 시점 | 수동 실행 | 편집 즉시 (PostToolUse) |
| 배포 실패율 | 간헐적 | 0% (deploy-verifier) |
| Spec-Code 불일치 | 수동 확인 | 자동 탐지 (spec-checker) |
| 새 팀원 온보딩 시간 | 1~2일 | 반나절 (rules + contexts) |

---

## 5. 즉시 실행 가능한 Quick Wins

ECC에서 바로 가져올 수 있는 3가지:

### Quick Win 1: PreToolUse — git 안전장치

```bash
# .claude/hooks/pre-bash-guard.sh
#!/bin/bash
# git --no-verify 차단
if echo "$TOOL_INPUT" | grep -q "\-\-no-verify"; then
  echo "❌ --no-verify is blocked by project policy"
  exit 1
fi
# git add . 차단
if echo "$TOOL_INPUT" | grep -q "git add \."; then
  echo "❌ 'git add .' is blocked — use specific file paths"
  exit 1
fi
```

### Quick Win 2: PostToolUse — 자동 포맷+타입체크

```bash
# .claude/hooks/post-edit-format.sh
#!/bin/bash
FILE="$TOOL_INPUT_FILE"
if [[ "$FILE" == *.ts || "$FILE" == *.tsx ]]; then
  npx eslint --fix "$FILE" 2>/dev/null
  npx tsc --noEmit --pretty 2>&1 | head -20
fi
```

### Quick Win 3: Rules — coding-style.md

```markdown
# Foundry-X Coding Style

## TypeScript
- Hono 라우트: Zod 스키마 필수 (require-zod-schema 린트 룰)
- DB 접근: 서비스 레이어 경유 (no-direct-db-in-route)
- Plumb import: 패키지 내부만 (no-orphan-plumb-import)

## React (Ink CLI + Web Dashboard)
- 상태관리: Zustand (전역), useState (로컬)
- 테스트: ink-testing-library의 render() → lastFrame()
- 라우팅: React Router 7 (web), Commander + Ink (CLI)

## Git
- 절대 git add . 금지
- Squash merge + Linear history
- Sprint Worktree로 격리 작업
```

---

## 6. 참고 자료

- [ECC GitHub Repository](https://github.com/affaan-m/everything-claude-code)
- [ECC CLAUDE.md](https://github.com/affaan-m/everything-claude-code/blob/main/CLAUDE.md)
- [goddaehee 블로그 분석](https://goddaehee.tistory.com/575)
- [ECC DeepWiki — Installation & Setup](https://deepwiki.com/affaan-m/everything-claude-code/4-installation-and-setup)
- [ECC Releases](https://github.com/affaan-m/everything-claude-code/releases)
