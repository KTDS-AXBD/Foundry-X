# Round 1 외부 LLM 검토 패키지 (수동 폴백)

**날짜**: 2026-05-02
**대상 PRD**: `../../prd-v1.md`
**선택 모델**: ChatGPT (4o) + Gemini (2.5 Pro) + DeepSeek-R1
**옵션**: Six Hats 토론 (deep depth)

---

## 왜 수동 폴백인가

review-api.mjs는 사내에 존재하지만 (`/sessions/sharp-lucid-pascal/mnt/.remote-plugins/.../review-api.mjs`) Cowork sandbox에 API 키(.dev.vars / OPENROUTER_API_KEY 등)가 미설정이에요. 자동 호출 대신 사용자가 외부 LLM 사이트에 직접 붙여넣는 수동 검토로 진행합니다.

자동 호출을 원하시면 본 컴퓨터(macOS/Windows/WSL)에서 다음 명령으로 실행 가능해요:

```bash
mkdir -p ~/.claude/workspace/DS-Agentic-AI/기업\ 의사결정\ 업무\ Agentic\ AI\ 플랫폼/ai-foundry-os/review/round-1
node ~/.remote-plugins/plugin_01EAhfjv4KZuA428HQUxLqRU/skills/req-interview/scripts/review-api.mjs \
  ~/.claude/workspace/DS-Agentic-AI/기업\ 의사결정\ 업무\ Agentic\ AI\ 플랫폼/ai-foundry-os/prd-v1.md \
  ~/.claude/workspace/DS-Agentic-AI/기업\ 의사결정\ 업무\ Agentic\ AI\ 플랫폼/ai-foundry-os/review/round-1 \
  --env .dev.vars --round 1
```

`.dev.vars`에는 다음 키 중 하나 필요: `OPENROUTER_API_KEY` (단일) 또는 `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` + `GOOGLE_AI_API_KEY` + `DEEPSEEK_API_KEY` (각자).

---

## 수동 진행 절차

### 1. PRD 첨부

각 LLM 사이트(ChatGPT/Gemini/DeepSeek)에 **`../../prd-v1.md` 파일을 업로드**하거나 **본문을 붙여넣기**.

⚠️ **보안**: PRD는 기업비밀 II급. LLM 사이트에서 다음 옵트아웃 설정 먼저:
- ChatGPT: Settings → Data Controls → Improve the model **OFF**, Memory **OFF**
- Gemini (Google AI Studio): Activity **OFF**
- DeepSeek: API 호출 시 `model_training=false` 또는 사내 가이드 확인

### 2. 프롬프트 붙여넣기

각 LLM별 프롬프트 파일을 그대로 붙여넣기:
- `chatgpt-prompt.md` → ChatGPT
- `gemini-prompt.md` → Gemini
- `deepseek-prompt.md` → DeepSeek

### 3. 응답 받기

각 LLM의 응답을 `feedback-template.md` 형식으로 정리해 다음 파일에 저장:
- `chatgpt-feedback.md`
- `gemini-feedback.md`
- `deepseek-feedback.md`

### 4. Six Hats 토론 (deep depth)

`sixhats-prompt.md`를 단일 모델(권장: Gemini 2.5 Pro 또는 ChatGPT)에 붙여넣기. 20 turn × 6 hat 토론 자동 진행. 결과를 `sixhats-discussion.md`에 저장.

### 5. 통합·스코어카드

응답 모두 받으면 본 대화에 다시 와서 "검토의견 들어왔어"라고 알려주시거나 파일을 첨부해주세요. Claude가 다음을 진행:
- `feedback.md` 통합 작성
- `actionable-items.json` 자동 분류 (flaws/gaps/risks)
- `scorecard.md` + `scorecard.json` 산출 (Phase 4 충돌도 평가)
- Phase 4-B Ambiguity Score 산출
- Phase 4-C 통합 판정 (Ready / Conditional / Not Ready)

---

## 파일 인벤토리

| 파일 | 용도 |
|---|---|
| `README.md` | 본 가이드 |
| `chatgpt-prompt.md` | ChatGPT 4o용 검토 프롬프트 (논리·실행·누락·리스크·판단) |
| `gemini-prompt.md` | Gemini 2.5 Pro용 (시장·사실·사용자·시장 누락·판단) |
| `deepseek-prompt.md` | DeepSeek-R1용 (기술 실현·아키텍처·성능·운영·판단) |
| `sixhats-prompt.md` | Six Hats 단일 모델 토론 (20 turn × 6 hat) |
| `feedback-template.md` | 응답 받을 때 표준 포맷 |
| `chatgpt-feedback.md` | ⏳ ChatGPT 응답 (사용자가 채움) |
| `gemini-feedback.md` | ⏳ Gemini 응답 |
| `deepseek-feedback.md` | ⏳ DeepSeek 응답 |
| `sixhats-discussion.md` | ⏳ Six Hats 토론 결과 |
| `feedback.md` | ⏳ 통합 피드백 (자동 생성) |
| `actionable-items.json` | ⏳ flaws/gaps/risks 분류 (자동) |
| `scorecard.md` + `scorecard.json` | ⏳ 100점 스코어카드 (자동) |

---

## 13_cross_review_prompts와의 차이

본 round-1/은 **AI Foundry OS PRD v1** 검토용 (좁은 PRD 검토).
13_cross_review_prompts_for_build_plan_v1.md는 **마스터 빌드 플랜 + 4 dev plan** 통합 검토용 (넓은 빌드 플랜 검토).

두 검증은 보완적:
- 본 round-1/ → ai-foundry-os PRD가 착수 가능 수준인지 (스코어카드 80점)
- 13 cross-review → 마스터 빌드 플랜·dev plan 자체의 빈틈 (P0/P1/P2 분류)

13의 결과는 본 PRD v2 발전 시 반영됩니다.
