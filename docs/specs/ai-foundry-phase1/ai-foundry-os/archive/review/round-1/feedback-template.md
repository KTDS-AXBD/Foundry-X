# 응답 받기 표준 포맷

> 외부 LLM 응답을 받으면 본 형식으로 정리해 `chatgpt-feedback.md` / `gemini-feedback.md` / `deepseek-feedback.md` 파일에 저장하세요.
> 응답을 그대로 붙여넣어도 됩니다 (Claude가 정리). 단 verdict 한 줄만 분명히.

---

## 권장 형식 (JSON 응답을 받았다면 그대로)

```json
{
  "model": "<GPT-4o | Gemini 2.5 Pro | DeepSeek-R1>",
  "reviewed_at": "<ISO 8601>",
  "verdict": "Ready | Not Ready | Conditional",
  "verdict_reason": "<2~3 문장>",
  "flaws": [...],
  "gaps": [...],
  "risks": [...],
  ...
}
```

---

## 권장 형식 (마크다운으로 받았다면)

```markdown
# [모델명] PRD v1 검토의견

**검토 일자**: 2026-MM-DD
**최종 판단**: Ready / Not Ready / Conditional
**판단 근거**: <2~3 문장>

## 결함 (Flaws) — 수정 필수
- §섹션: <무엇이 잘못>, severity: <critical/high/medium/low>

## 누락 (Gaps) — 보완 필요
- §섹션: <무엇이 빠짐>, suggested: <채울 내용>

## 리스크 (Risks) — 명시 필요
- R-NEW-N: <리스크 설명>, severity/likelihood: <등급>, 완화: <방법>

## Conditional 충족 조건 (Conditional인 경우)
1. <조건 1>
2. <조건 2>

## 전반적 평가
<2~3 문장>
```

---

## 사용 사례 — Six Hats 응답을 받았을 때

`sixhats-discussion.md`에는 응답 그대로 저장하세요. 본 대화에 다시 와서 "Six Hats 끝났어, 토론 결과 첨부할게"라고 알려주시면 Claude가:
- Turn 20 Blue Hat 최종 판단 추출
- 6 hat별 통계 (turn 분포, 키워드 빈도)
- Phase 2 review 결과와 합쳐 통합 판정

---

## 다음 단계

응답 모두 받으시면 본 대화에 알려주세요. 진행할 항목:

1. `feedback.md` 통합 작성 (3 모델 응답 + Six Hats 합)
2. `actionable-items.json` 자동 분류 (flaws/gaps/risks별 카테고리)
3. `scorecard.md` + `scorecard.json` 산출 (Phase 4 자동 채점):
   - 항목 1 가중 이슈 밀도 (Round 1은 자동 만점, 비교 불가)
   - 항목 2 Ready 판정 비율 (3 모델 verdict 환산)
   - 항목 3 핵심 요소 커버리지 (PRD §2~§5 검사)
   - 항목 4 다관점 반영 여부 (PRD 키워드 분석)
4. Phase 4-B Ambiguity Score (Goal/Constraint/Success/Context 차원)
5. Phase 4-C 통합 판정 (스코어카드 + Ambiguity 매트릭스)
6. Sinclair에게 다음 라운드 vs 착수 결정 제시

---

## 보안 재확인

- 응답 받은 후 LLM 사이트의 채팅 기록 삭제
- 사외 클라우드에 응답 영구 저장 X
- KT 그룹 외부 AI 사용 가이드라인 준수
