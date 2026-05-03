# Six Hats 토론 프롬프트 (deep depth)

> **사용법**: 단일 모델(권장: Gemini 2.5 Pro 또는 Claude Opus 또는 ChatGPT-4o)에 `../../prd-v1.md` 파일을 첨부 후 아래 프롬프트 붙여넣기.
> 응답이 매우 길어질 수 있어요 (20 turn × 200~400자 = 4,000~8,000자). 한 응답으로 받기 어려우면 5 turn씩 끊어서 진행.

---

```
You are facilitating a Six Thinking Hats discussion (Edward de Bono framework) on the
attached PRD (AI Foundry OS — KT DS 사내 통합 Agentic AI 플랫폼).

PRD CONTEXT:
- KT DS-AXBD가 5개 사내 repo를 본부 4개(AX·공공·금융·기업)에 동시 적용.
- 외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 명시가 핵심 동기.
- 7월 deadline. 인력: Sinclair 1명 + AI 에이전트 100%.
- 시그니처: 4대 진단 + Cross-Org 4그룹 (core_differentiator default-deny 강제).

DISCUSSION RULES:
- 20 turns total = 6 hats × ~3.3 rotations.
- Each turn: 200~400 characters (Korean) or 50~100 words (English).
- Last turn (Turn 20) = Blue Hat 최종 종합.
- Each turn references the previous discussion context (not standalone).
- Korean honorific 반존대(해요체) for output.

THE SIX HATS:

| Hat | Role | Focus |
|---|---|---|
| ⚪ White | Facts & Data | PRD 수치, 근거, 객관적 정보 |
| 🔴 Red | Emotion & Intuition | 첫인상, 팀 사기, 사용자 감정, 직관 |
| ⚫ Black | Critical & Risk | 약점, 실패 경로, 비현실적 가정 |
| 🟡 Yellow | Optimism & Value | 잠재 이점, 성공 시나리오 |
| 🟢 Green | Creative & Alternative | 새로운 접근, 혁신적 해결책 |
| 🔵 Blue | Synthesis & Process | 논점 정리, 합의점, 최종 판단 |

TURN ORDER (rotate):
Turn 1 ⚪ White (open with key facts)
Turn 2 🔴 Red (gut reaction)
Turn 3 ⚫ Black (biggest risk)
Turn 4 🟡 Yellow (biggest opportunity)
Turn 5 🟢 Green (creative alternative)
Turn 6 🔵 Blue (mid-discussion synthesis)
Turn 7~12: rotate again (White/Red/Black/Yellow/Green/Blue)
Turn 13~18: rotate again
Turn 19: 🟢 Green (final creative push)
Turn 20: 🔵 Blue (FINAL SYNTHESIS — verdict: Ready/Conditional/Not Ready + key handoff items)

OUTPUT FORMAT:

```
## Turn 1 ⚪ White Hat
<200~400자 핵심 의견>

## Turn 2 🔴 Red Hat
<반응>

...

## Turn 20 🔵 Blue Hat (최종 종합)
<전체 토론 요약>
**최종 판단**: Ready | Conditional | Not Ready
**근거**: <2~3 문장>
**핵심 핸드오프 항목** (Conditional/Not Ready인 경우):
1. <핸드오프 1>
2. <핸드오프 2>
3. <핸드오프 3>

## 통계
- White: N turns / Red: N / Black: N / Yellow: N / Green: N / Blue: N
- 가장 자주 언급된 우려: <키워드>
- 가장 자주 언급된 기회: <키워드>
```

Begin Turn 1 now.
```
