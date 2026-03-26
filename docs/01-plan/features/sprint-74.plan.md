---
code: FX-PLAN-074
title: "Sprint 74 — F219 TDD 자동화 CC Skill"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-26
updated: 2026-03-26
author: Claude (Autopilot)
references:
  - "[[FX-SPEC-PRD-TA-V1]] Test Agent PRD §4.3"
  - "[[FX-REQ-211]] TDD 자동화 CC Skill"
---

# Sprint 74 Plan — F219 TDD 자동화 CC Skill

## 1. 목표

Red→Green→Refactor TDD 사이클을 자동화하는 CC Skill을 구현한다.
`/tdd {파일경로}` 명령으로 호출하여 Sprint 작업 중 테스트 품질을 구조적으로 강화한다.

## 2. 범위

### In-Scope (F219)

| 항목 | 설명 |
|------|------|
| **CC Skill 구현** | `.claude/skills/tdd/` — SKILL.md + refs/ + examples/ |
| **Red 단계** | 요구사항 분석 → 실패하는 테스트 작성 → `pnpm test` 실패 확인 |
| **Green 단계** | 테스트 통과하는 최소 구현 → `pnpm test` 성공 확인 |
| **Refactor 단계** | 코드 품질 개선 → 테스트 재실행 → 여전히 통과 |
| **Sprint 통합** | `/tdd {파일}` 명령, Sprint worktree에서 사용 가능 |
| **PostToolUse Hook** | `.ts` 파일 Write 시 대응 `.test.ts` 존재 여부 경고 (차단 아닌 경고) |

### Out-of-Scope

- Agent SDK 연동 (F218 PoC 미완료 → Strategy C/D 선택은 향후)
- CI/CD 파이프라인 통합
- E2E 테스트 자동화

## 3. 기술 접근

### 3.1 파일 구조

```
.claude/skills/tdd/
├── SKILL.md              # 스킬 메타데이터 + TDD 오케스트레이터 프롬프트
├── refs/
│   ├── red-phase.md      # RED: 테스트 먼저 작성 규칙
│   ├── green-phase.md    # GREEN: 최소 구현 규칙
│   └── refactor-phase.md # REFACTOR: 품질 개선 규칙
└── examples/
    └── service-tdd.md    # 서비스 파일 TDD 예시 (API service 패턴)
```

### 3.2 SKILL.md 핵심 흐름

1. `/tdd {파일경로}` 명령 진입
2. 파일 분석 → 공개 함수/메서드/export 목록 추출
3. RED: 각 함수에 대해 실패하는 테스트 작성 → `pnpm test` 실패 확인
4. GREEN: 최소 구현 작성 → `pnpm test` 성공 확인
5. REFACTOR: DRY, 타입 안전성 개선 → 테스트 재실행

### 3.3 PostToolUse Hook

- `.ts`/`.tsx` 파일 Write/Edit 시 대응 `.test.ts` 존재 여부 확인
- 없으면 **경고 메시지** 출력 (exit 0, 차단하지 않음)
- 기존 `post-edit-format.sh`, `post-edit-typecheck.sh`와 공존

### 3.4 서브커맨드

| 커맨드 | 동작 |
|--------|------|
| `/tdd {파일경로}` | 해당 파일에 대한 전체 TDD 사이클 실행 |
| `/tdd red {파일경로}` | RED 단계만 실행 (테스트 작성) |
| `/tdd green {파일경로}` | GREEN 단계만 실행 (구현) |
| `/tdd refactor {파일경로}` | REFACTOR 단계만 실행 |
| `/tdd check {파일경로}` | 테스트 커버리지 확인만 |

## 4. 의존성

| 항목 | 상태 | 영향 |
|------|------|------|
| vitest 3.x | ✅ 이미 사용 중 | 테스트 러너 |
| 기존 PostToolUse hooks | ✅ 존재 | 새 hook 추가 (기존과 공존) |
| F218 Agent SDK PoC | 📋 미완료 | F219는 CC Skill 단독 구현 — PoC 결과 무관하게 진행 가능 |

## 5. 산출물

| # | 파일 | 설명 |
|---|------|------|
| 1 | `.claude/skills/tdd/SKILL.md` | TDD 스킬 메타데이터 + 오케스트레이터 |
| 2 | `.claude/skills/tdd/refs/red-phase.md` | RED 단계 상세 규칙 |
| 3 | `.claude/skills/tdd/refs/green-phase.md` | GREEN 단계 상세 규칙 |
| 4 | `.claude/skills/tdd/refs/refactor-phase.md` | REFACTOR 단계 상세 규칙 |
| 5 | `.claude/skills/tdd/examples/service-tdd.md` | API 서비스 TDD 예시 |
| 6 | `.claude/hooks/post-edit-test-warn.sh` | PostToolUse hook: 테스트 파일 존재 경고 |
| 7 | `.claude/settings.json` 수정 | 새 hook 등록 |

## 6. 검증 기준

- [ ] `/tdd` 스킬이 CC에서 인식되는지 확인 (SKILL.md frontmatter 유효)
- [ ] RED→GREEN→REFACTOR 각 단계 프롬프트가 명확한지 확인
- [ ] PostToolUse hook이 `.test.ts` 미존재 시 경고 출력하는지 확인
- [ ] 기존 hooks (format, typecheck)와 충돌 없는지 확인
- [ ] 예시 문서가 Foundry-X 프로젝트 패턴(vitest, Hono, service 구조)에 맞는지 확인
