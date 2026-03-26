---
code: FX-GUID-001
title: "CC 스킬 관리 가이드 — 비개발자용"
version: 1.0
status: Active
category: GUID
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo
---

# CC 스킬 관리 가이드

> Claude Code(CC) 스킬은 **반복 작업을 자동화하는 레시피**예요.
> `/tdd` 라고 치면 TDD 사이클이 돌고, `/ax-bd-discovery` 라고 치면 사업 발굴 분석이 시작돼요.

---

## 1. 스킬이란?

| 비유 | 설명 |
|------|------|
| **요리 레시피** | "카레 만들기" 레시피처럼, 스킬은 특정 작업의 단계를 정의해요 |
| **엑셀 매크로** | 한 번 만들어두면 `/명령어` 한 줄로 복잡한 작업이 실행돼요 |
| **업무 SOP** | 팀의 업무 절차를 AI가 읽을 수 있는 형식으로 기록한 거예요 |

### 스킬의 구조

```
my-skill/
├── SKILL.md      ← 핵심 파일 (이것만 있으면 동작)
├── refs/         ← 참고 자료 (선택)
└── examples/     ← 사용 예시 (선택)
```

**SKILL.md**가 전부예요. 이 파일에 "언제 실행할지", "무엇을 할지"가 적혀 있어요.

---

## 2. 스킬 찾기

### 방법 A: 슬래시 명령으로 검색

```
/sf-search 사업분석
/sf-search TDD
/sf-search 배포
```

키워드로 관련 스킬을 찾아줘요. 한국어/영어 모두 가능.

### 방법 B: 전체 카탈로그 보기

```
/sf-catalog
```

82개 전체 스킬을 카테고리별로 정리한 문서가 생성돼요.

### 방법 C: Claude에게 물어보기

```
"사업 아이템 분석할 때 쓸 수 있는 스킬 뭐가 있어?"
```

Claude가 자동으로 관련 스킬을 찾아서 제안해요.

---

## 3. 스킬 사용하기

### 기본 사용

Claude Code 프롬프트에서 슬래시 + 스킬 이름:

```
/tdd                          ← TDD 사이클 시작
/ax-bd-discovery              ← 사업 발굴 분석
/ax-req-interview             ← 요구사항 인터뷰 → PRD
/pdca plan user-auth          ← PDCA 계획 문서 작성
```

### 스킬이 자동으로 실행되는 경우

특정 키워드를 말하면 Claude가 알아서 관련 스킬을 실행해요:

| 이렇게 말하면 | 이 스킬이 실행돼요 |
|-------------|-----------------|
| "사업 아이템 분석해줘" | ax-bd-discovery |
| "요구사항 정리하자" | ax-req-interview |
| "테스트 먼저 작성해" | tdd |
| "코드 검증해줘" | ax-code-verify |

---

## 4. 스킬 수정하기

### 방법 A: Claude에게 요청 (가장 쉬움)

```
"tdd 스킬에서 Refactor 단계에 '성능 체크' 항목도 추가해줘"
"ax-bd-discovery 스킬의 체크포인트 질문을 수정해줘"
```

Claude가 SKILL.md를 직접 수정해요. 수정 후 바로 반영돼요.

### 방법 B: 직접 편집

1. 스킬 파일 위치 확인:
   - 프로젝트 스킬: `.claude/skills/{스킬명}/SKILL.md`
   - 개인 스킬: `~/.claude/skills/{스킬명}/SKILL.md`

2. SKILL.md를 텍스트 에디터로 열어 수정

3. **수정 후 품질 확인**:
   ```
   /sf-lint
   ```

---

## 5. 새 스킬 만들기

### 방법 A: Claude에게 요청

```
"새 스킬 만들어줘: 회의록을 요약하고 액션 아이템을 추출하는 스킬"
```

Claude가 SKILL.md를 생성하고 적절한 위치에 저장해요.

### 방법 B: 템플릿에서 시작

최소 SKILL.md 템플릿:

```markdown
---
name: my-new-skill
description: |
  [이 스킬이 하는 일 1줄 설명]
  Use when: [언제 이 스킬을 써야 하는지]
  Triggers: [자동 실행 키워드들]
---

# [스킬 이름]

> [한 줄 요약]

## Steps

### Step 1: [첫 번째 단계]
[Claude가 수행할 내용]

### Step 2: [두 번째 단계]
[Claude가 수행할 내용]

## Gotchas
- [주의사항 1]
- [주의사항 2]
```

### 저장 위치

| 나만 쓸 스킬 | 팀이 쓸 스킬 |
|-------------|-------------|
| `~/.claude/skills/` | `.claude/skills/` (프로젝트 리포) |

---

## 6. 팀 공유 & 동기화

### 스킬 배포 (만든 사람)

```
/sf-deploy my-skill
```

팀 Git 리포에 스킬이 배포돼요.

### 스킬 받기 (팀원)

```
/ax-git-sync config pull
```

팀 리포에서 최신 스킬을 받아와요.

### 동기화 흐름

```
만든 사람                     팀 Git 리포                    팀원
  │                              │                            │
  ├── /sf-deploy ──────────────→ │                            │
  │                              │ ←── /ax-git-sync pull ─── │
  │                              │                            │
```

---

## 7. 품질 관리

### 스킬 품질 점검

```
/sf-lint              ← 전체 스킬 품질 점검
/sf-lint --fix        ← 자동 수정 가능한 항목 수정
```

### 점검 항목

| 규칙 | 설명 |
|------|------|
| has-description | description 필드가 있는지 |
| description-trigger | "Use when", "Triggers" 키워드가 있는지 |
| single-category | 카테고리에 분류되어 있는지 |
| has-gotchas | 주의사항 섹션이 있는지 |

### 사용량 분석

```
/sf-usage             ← 어떤 스킬이 많이/적게 쓰이는지
```

잘 안 쓰이는 스킬은 통합하거나 정리할 수 있어요.

---

## 8. 현재 우리 팀 스킬 목록 (주요)

### 사업개발 프로세스
| 스킬 | 용도 |
|------|------|
| `/ax-bd-discovery` | 2단계 발굴 분석 (5유형 분류 + 11단계) |
| `/ax-req-interview` | 요구사항 인터뷰 → PRD 자동 작성 |
| `ai-biz-*` (11종) | 개별 분석 프레임워크 (cost-model, feasibility 등) |

### 개발 워크플로우
| 스킬 | 용도 |
|------|------|
| `/tdd` | TDD 자동화 (Red→Green→Refactor) |
| `/ax-code-verify` | lint + typecheck + test 통합 실행 |
| `/ax-sprint` | Sprint worktree 관리 |
| `/pdca plan/design/...` | PDCA 문서 관리 |

### 관리 도구 (sf-*)
| 스킬 | 용도 |
|------|------|
| `/sf-search` | 스킬 검색 |
| `/sf-catalog` | 전체 카탈로그 생성 |
| `/sf-lint` | 품질 점검 |
| `/sf-deploy` | 팀 배포 |
| `/sf-scan` | 카탈로그 갱신 |

---

## FAQ

**Q: 스킬을 잘못 수정했어요. 되돌릴 수 있나요?**
A: Git으로 관리되기 때문에 `git checkout -- .claude/skills/my-skill/SKILL.md` 로 되돌릴 수 있어요.

**Q: 스킬이 너무 많아서 뭘 써야 할지 모르겠어요.**
A: Claude에게 "내가 지금 하려는 작업에 맞는 스킬 추천해줘"라고 물어보세요.

**Q: 다른 팀원이 만든 스킬이 내 환경에서 안 돼요.**
A: `/ax-git-sync config pull`로 최신 동기화 후, `/sf-lint`로 점검해보세요.

**Q: 스킬 vs 커맨드 vs 에이전트, 뭐가 달라요?**
| 구분 | 특징 | 예시 |
|------|------|------|
| **스킬** | 단계별 레시피, Claude가 따라함 | `/tdd`, `/ax-bd-discovery` |
| **커맨드** | 슬래시 명령, 즉시 실행 | `/ax-session-start` |
| **에이전트** | 자율 판단 + 실행, 백그라운드 가능 | gap-detector, code-analyzer |
