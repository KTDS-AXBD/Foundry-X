# Track B 개발 도구 도입 Planning Document

> **Summary**: Agent Evolution Track B — gstack 스킬 설치(F153) + claude-code-router 설정(F154) + OpenRouter API 키 발급(F155)을 통해 Foundry-X 개발 환경을 즉시 강화한다.
>
> **Project**: Foundry-X
> **Version**: cli 0.5.0 / api 0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-22
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Foundry-X 개발이 단일 모델(Claude)에 의존하고, 코드 리뷰/QA/설계 검토 등의 역할별 스킬이 부재하여 개발자가 모든 품질 활동을 수동으로 수행해야 한다. |
| **Solution** | gstack(18개 역할 기반 스킬) 설치 + claude-code-router(멀티모델 라우팅 프록시) 설정 + OpenRouter API 키 발급으로 개발 환경을 즉시 강화한다. |
| **Function/UX Effect** | `/review`, `/qa`, `/ship` 등 슬래시 커맨드로 CEO/디자이너/QA/릴리스 매니저 역할을 즉시 활용 가능. 태스크별 최적 모델 자동 선택으로 비용 대비 품질 향상. |
| **Core Value** | Track A(플랫폼 기능) 착수 전에도 개발 생산성을 즉시 향상시키는 "제로 대기 시간" 개선. 외부 조건(보안 승인, 인력)에 무관하게 착수 가능. |

---

## 1. Overview

### 1.1 Purpose

Agent Evolution PRD의 Track B(개발 도구 도입)를 실행하여, Foundry-X 개발 과정에서 멀티모델 라우팅과 역할 기반 AI 스킬을 즉시 활용할 수 있도록 한다. Track A(플랫폼 기능)가 보안 승인/인력 확보 등 외부 조건에 묶여 있는 동안에도, Track B는 **개발 환경만 강화**하는 구조라 즉시 착수 가능하다.

### 1.2 Background

- **gstack** (35.6K stars, MIT): Garry Tan이 만든 Claude Code 역할 기반 스킬 팩. 18개 전문가 역할(CEO, 디자이너, QA, 릴리스 매니저 등)을 슬래시 커맨드로 제공.
- **claude-code-router** (30.2K stars, MIT): Claude Code 요청을 태스크 유형별로 다른 모델/프로바이더에 라우팅하는 로컬 프록시. OpenRouter, DeepSeek, Gemini, Ollama 등 다중 프로바이더 지원.
- **OpenRouter**: 300+ 모델에 단일 API 키로 접근하는 게이트웨이. OpenAI 호환 포맷.
- **현재 상태**: Foundry-X는 Claude Haiku/Sonnet만 사용 중이며, 코드 리뷰/QA/설계 검토는 수동 또는 bkit 기본 스킬에 의존.

### 1.3 Related Documents

- PRD: `docs/specs/agent-evolution/prd-final.md` (Track B: §4.3 B1~B3)
- Six Hats 토론: `docs/specs/agent-evolution/debate/sixhats-discussion.md`
- SPEC.md: F153(gstack), F154(claude-code-router), F155(OpenRouter 키)

---

## 2. Scope

### 2.1 In Scope

- [x] **F155**: OpenRouter 계정 생성 + API 키 발급 (B3, P0)
- [ ] **F153**: gstack 스킬을 `~/.claude/skills/gstack`에 설치 + Foundry-X CLAUDE.md에 스킬 목록 등록 (B1, P0)
- [ ] **F154**: claude-code-router 설치 + config.json 설정 (B2, P1)
- [ ] gstack과 기존 bkit 스킬 간 충돌/중복 점검 및 공존 전략 수립
- [ ] OpenRouter를 claude-code-router의 프로바이더로 연동
- [ ] 기본 라우팅 룰 설정 (thinking=Sonnet, default=Haiku, complex=Opus/GPT 등)

### 2.2 Out of Scope

- Track A 플랫폼 기능 (OpenRouterRunner, ArchitectAgent 등) — 별도 Plan 필요
- gstack 커스터마이징 또는 Foundry-X 전용 스킬 개발
- 프로덕션 API 서버의 모델 라우팅 변경 (Track A 범위)
- 팀 전체 배포 (현재 1인 개발 환경 우선)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | OpenRouter 계정 생성 및 API 키 발급 | High | ✅ Done |
| FR-02 | gstack을 `~/.claude/skills/gstack`에 clone + setup 실행 | High | ✅ Done |
| FR-03 | CLAUDE.md에 gstack 스킬 섹션 추가 (25개 스킬 목록) | High | ✅ Done |
| FR-04 | claude-code-router를 `npm install -g`로 설치 | Medium | ✅ Done |
| FR-05 | `~/.claude-code-router/config.json` 작성 (OpenRouter + Anthropic 프로바이더) | Medium | ✅ Done |
| FR-06 | 라우팅 룰 설정: thinking → Sonnet, default → Sonnet, background → DeepSeek | Medium | ⚠️ Deviation |
| FR-07 | gstack ↔ bkit 스킬 충돌 점검 (중복 커맨드명 확인) | High | ✅ Done |
| FR-08 | 설치 후 `/review`, `/qa`, `/retro` 기본 동작 검증 | High | ⚠️ Partial |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 호환성 | 기존 bkit 스킬과 gstack 스킬이 충돌 없이 공존 | 스킬 목록에서 중복 커맨드명 0건 |
| 보안 | API 키가 코드에 하드코딩되지 않음 | `.dev.vars` + 환경변수 사용, `.gitignore` 확인 |
| 가역성 | 문제 시 gstack/router 제거로 원상 복구 가능 | `rm -rf ~/.claude/skills/gstack` + `npm uninstall -g` |
| 비용 | OpenRouter 월 예산 $20 이내 (개발/테스트 용도) | OpenRouter 대시보드 모니터링 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] OpenRouter API 키 발급 완료
- [ ] gstack 25개 스킬이 Claude Code에서 인식됨 (`/review` 등 실행 가능)
- [ ] claude-code-router가 로컬 프록시로 동작하고, 태스크별 모델 라우팅이 작동함
- [ ] gstack과 bkit 스킬이 충돌 없이 공존함
- [ ] CLAUDE.md에 gstack 스킬 섹션이 추가됨

### 4.2 Quality Criteria

- [ ] 기존 테스트 전체 통과 (API 583, CLI 112, Web 48)
- [ ] typecheck 에러 0건
- [ ] `.dev.vars`에 OPENROUTER_API_KEY 저장, `.gitignore` 확인

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| gstack 스킬과 bkit 스킬 커맨드명 충돌 (예: `/review`, `/code-review`) | Medium | High | 설치 전 커맨드명 목록 대조. 충돌 시 gstack 쪽 별칭 사용 또는 우선순위 설정 |
| claude-code-router 프록시가 Claude Code 업데이트와 비호환 | Medium | Medium | CC 업데이트 시 router도 함께 업데이트. 문제 시 프록시 우회(직접 연결)로 폴백 |
| OpenRouter 비용 초과 | Low | Low | 월 $20 예산 한도 설정. OpenRouter 대시보드에서 usage 모니터링 |
| gstack setup 스크립트가 기존 환경을 변경 | Medium | Low | setup 전 `~/.claude/` 백업. setup은 `.claude/skills/gstack` 내부에만 영향 |
| API 키 노출 | High | Low | `.dev.vars` + 환경변수만 사용. config.json에 `$ENV_VAR` 인터폴레이션 활용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | 단순 구조 | 해당 없음 | ☐ |
| **Dynamic** | Feature 기반, BaaS 연동 | Foundry-X 현재 수준 | ☑ |
| **Enterprise** | 엄격한 레이어 분리 | 향후 Phase 5+ | ☐ |

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| gstack 설치 위치 | user scope (`~/.claude/skills/`) vs project scope (`.claude/skills/`) | user scope | 개인 개발 환경 강화 목적. 팀 배포는 추후 별도 결정 |
| claude-code-router 설치 | global npm vs project devDep | global npm | 프로젝트 독립적 도구. 모든 프로젝트에서 사용 |
| 모델 라우팅 전략 | 룰 기반 (태스크 유형별) vs ML 기반 | 룰 기반 | 초기 단계에서 예측 가능성 우선. ML은 Track A 범위 |
| OpenRouter vs 개별 프로바이더 키 | OpenRouter 단일 키 vs 프로바이더별 키 | OpenRouter 단일 키 | 관리 단순화. 300+ 모델 즉시 접근. PRD 결정 사항 |
| bkit ↔ gstack 공존 | 병행 사용 vs gstack 우선 vs bkit 우선 | 병행 사용 + 우선순위 | PDCA는 bkit, 코드 품질/QA는 gstack. 중복 시 bkit 우선 |

### 6.3 설치 구조

```
~/.claude/
├── skills/
│   ├── gstack/                    # F153: gstack 스킬 팩 (git clone)
│   │   ├── review/                # /review — 코드 리뷰
│   │   ├── qa/                    # /qa — 브라우저 QA
│   │   ├── ship/                  # /ship — PR 생성+리뷰
│   │   ├── office-hours/          # /office-hours — 아이디어 검토
│   │   ├── retro/                 # /retro — 개발 통계
│   │   ├── codex/                 # /codex — 멀티에이전트 코딩
│   │   └── ... (25개 스킬)
│   ├── ax-req-interview/          # 기존 bkit 스킬 (유지)
│   └── npm-release/               # 기존 스킬 (유지)
├── claude-code-router/            # F154: 자동 생성 (npm -g)
│   └── config.json                # 라우팅 설정
└── CLAUDE.md                      # gstack 섹션 추가

~/.dev.vars (또는 환경변수)
├── OPENROUTER_API_KEY             # F155: OpenRouter API 키
├── ANTHROPIC_API_KEY              # 기존 유지 (Fallback)
└── ...
```

### 6.4 라우팅 룰 초안 (claude-code-router config.json)

```jsonc
{
  "Providers": [
    {
      "name": "openrouter",
      "api_base_url": "https://openrouter.ai/api/v1/chat/completions",
      "api_key": "$OPENROUTER_API_KEY",
      "models": [
        "anthropic/claude-sonnet-4",
        "google/gemini-2.5-pro-preview",
        "deepseek/deepseek-chat"
      ],
      "transformer": { "use": ["openrouter"] }
    },
    {
      "name": "anthropic",
      "api_base_url": "https://api.anthropic.com/v1/messages",
      "api_key": "$ANTHROPIC_API_KEY",
      "models": ["claude-haiku-4-5", "claude-sonnet-4"]
    }
  ],
  "Router": {
    "default": "claude-haiku-4-5",           // 일반 태스크
    "thinking": "anthropic/claude-sonnet-4",  // 추론 필요 태스크
    "background": "deepseek/deepseek-chat",   // 백그라운드/대량 처리
    "complex": "google/gemini-2.5-pro-preview" // 대용량 컨텍스트
  }
}
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration (flat config)
- [x] TypeScript configuration (`tsconfig.json`)
- [x] Prettier (implicit via ESLint)
- [ ] gstack 스킬 사용 가이드라인 (신규 작성 필요)

### 7.2 Conventions to Define/Verify

| Category | Current State | To Define | Priority |
|----------|---------------|-----------|:--------:|
| **스킬 우선순위** | bkit만 사용 | PDCA=bkit, 코드 품질=gstack, 중복 시 bkit 우선 | High |
| **모델 라우팅** | 없음 | 태스크 유형별 기본 모델 매핑 룰 | Medium |
| **API 키 관리** | `.dev.vars` + wrangler secrets | OpenRouter 키도 `.dev.vars`에 추가 | High |
| **비용 모니터링** | 없음 | 월 $20 한도, 주간 확인 | Medium |

### 7.3 Environment Variables Needed

| Variable | Purpose | Scope | To Be Created |
|----------|---------|-------|:-------------:|
| `OPENROUTER_API_KEY` | OpenRouter 게이트웨이 인증 | Dev/Local | ☑ (발급 완료 시) |
| `ANTHROPIC_API_KEY` | 기존 Anthropic 직접 호출 (Fallback) | Dev/Prod | ☑ (기존) |

---

## 8. Implementation Order

### Phase B-1: OpenRouter API 키 발급 (F155, 10분)

1. https://openrouter.ai 접속 → 계정 생성
2. API Keys 메뉴에서 키 발급
3. `.dev.vars`에 `OPENROUTER_API_KEY=sk-or-...` 추가
4. 환경변수로 export 확인

### Phase B-2: gstack 설치 (F153, 15분)

1. `git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack`
2. `cd ~/.claude/skills/gstack && ./setup`
3. bkit 스킬과 커맨드명 충돌 점검
4. CLAUDE.md에 gstack 스킬 섹션 추가
5. `/review`, `/qa`, `/retro` 기본 동작 검증

### Phase B-3: claude-code-router 설정 (F154, 20분)

1. `npm install -g @musistudio/claude-code-router`
2. `~/.claude-code-router/config.json` 작성 (§6.4 참조)
3. OpenRouter + Anthropic 프로바이더 설정
4. 라우팅 룰 적용 (default/thinking/background/complex)
5. 프록시 모드로 Claude Code 실행 후 모델 라우팅 동작 확인

### Phase B-4: 통합 검증 (15분)

1. gstack `/review` 실행 — 현재 브랜치 변경사항 리뷰
2. gstack `/retro` 실행 — 최근 7일 개발 통계
3. claude-code-router 로그에서 모델 라우팅 확인
4. 기존 bkit `/pdca status`, `/ax-code-verify` 정상 동작 확인

---

## 9. gstack ↔ bkit 스킬 공존 전략

### 9.1 역할 분담

| 영역 | bkit 스킬 | gstack 스킬 | 우선순위 |
|------|-----------|-------------|----------|
| PDCA 관리 | `/pdca plan/design/analyze/report` | — | bkit only |
| 코드 리뷰 | `/bkit:code-review` | `/review` | gstack (더 상세) |
| QA/테스트 | `/ax-code-verify` | `/qa`, `/qa-only` | 용도별 분리 |
| 배포 | `/ax-code-deploy` | `/ship`, `/land-and-deploy` | bkit (Cloudflare 특화) |
| 설계 검토 | — | `/plan-eng-review`, `/design-review` | gstack only |
| 아이디어 검토 | — | `/office-hours`, `/plan-ceo-review` | gstack only |
| 개발 통계 | — | `/retro` | gstack only |
| 세션 관리 | `/ax-session-start/end` | — | bkit only |
| 요구사항 | `/ax-req-manage/interview` | — | bkit only |

### 9.2 충돌 예상 커맨드

| 커맨드명 | bkit | gstack | 해결 방안 |
|----------|------|--------|-----------|
| `/review` | `bkit:code-review` (agent) | `gstack:review` | 네임스페이스로 자동 구분됨 |
| `/code-review` | `code-review:code-review` (plugin) | — | 충돌 없음 |
| `/investigate` | — | `gstack:investigate` | 충돌 없음 |

> Claude Code Skills 2.0에서 `plugin:skill` 네임스페이스가 적용되므로, 같은 이름이라도 `bkit:code-review` vs `gstack:review`로 구분 가능.

---

## 10. Next Steps

1. [ ] Design 문서 작성 (`track-b-dev-tools.design.md`) — 상세 config, 충돌 해소 매핑
2. [ ] F155 OpenRouter 키 발급 실행
3. [ ] F153 gstack 설치 실행
4. [ ] F154 claude-code-router 설치 + 설정
5. [ ] 통합 검증 후 SPEC.md 상태 갱신 (📋 → 🔧 → ✅)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-22 | Initial draft | Sinclair Seo |
