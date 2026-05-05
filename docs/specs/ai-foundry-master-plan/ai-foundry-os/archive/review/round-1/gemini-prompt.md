# Gemini (2.5 Pro) 검토 프롬프트

> **사용법**: Google AI Studio 또는 Gemini 사이트에 `../../prd-v1.md` 파일을 첨부 후 아래 프롬프트 붙여넣기.
> 옵션: Activity **OFF** 사전 설정.

---

```
당신은 IT 시장 트렌드와 유사 서비스 분석을 전문으로 하는 애널리스트입니다.
첨부된 PRD (AI Foundry OS — KT DS 사내 통합 Agentic AI 플랫폼) 를 검토하고 시장/트렌드/사례 관점에서 평가해주세요.

PRD 컨텍스트:
- KT DS-AXBD가 자체 5개 repo (Foundry-X·Decode-X·Discovery-X·AXIS-DS·ax-plugin)을 본부 4개에 동시 적용.
- 외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 입증이 핵심 동기.
- 시그니처: 4대 진단 (Missing/Duplicate/Overspec/Inconsistency) + Cross-Org 4그룹 분류 (common_standard / org_specific / tacit_knowledge / core_differentiator).
- "1명 + AI 에이전트 100% 구축"이 GTM 차별화 메시지.
- 한국 B2B 엔터프라이즈 시장 대상.

다음 항목별로 검토 의견을 주세요. 검색 가능한 최신 정보와 사례를 적극 참조해주세요:

1. **시장 적합성**: 한국 B2B AI 플랫폼 시장에서 본 솔루션의 포지셔닝이 어떤가요?
   - 유사 서비스 (예: Palantir Foundry, Databricks, 국내 AI 플랫폼) 대비 차별점이 명확한가요?
   - "기업 의사결정 자산화"라는 카테고리 자체의 시장 검증 사례가 있나요?

2. **사실 확인**: PRD에 포함된 가정이나 수치 중 외부 검증이 필요한 것들은?
   - 예: "자산 재사용률 30%" 가설의 업계 벤치마크
   - "1명 + AI 100% 구축"의 유사 사례 존재 여부

3. **사용자 관점**: KT DS 본부 4개의 BD·SME가 실제로 본 솔루션을 받아들일 가능성은?
   - 한국 대기업 본부 단위 도입 장벽 (정치·문화·인센티브)
   - 본부 간 자산 공유 거부(R-X1) 가능성을 한국 사례에서 검증

4. **누락된 시장 관점**: 시장·경쟁·트렌드 측면에서 PRD가 고려하지 않은 것은?
   - 예: 산업 컨소시엄(금융권 신용평가 표준 등) 사례, 정부 규제 변화, 경쟁사 동향

5. **착수 판단**: Ready / Not Ready / Conditional 중 하나로 판단하고 이유를 설명해주세요.

답변 형식 (JSON-friendly):

```json
{
  "model": "Gemini 2.5 Pro",
  "reviewed_at": "<ISO 8601>",
  "verdict": "Ready | Not Ready | Conditional",
  "verdict_reason": "<2~3 문장>",
  "market_fit": {
    "positioning_clarity": "<평가>",
    "competitor_comparison": [ { "competitor": "<이름>", "diff_point": "<차이>" } ],
    "category_validation": "<카테고리 검증 사례>"
  },
  "facts_to_verify": [
    { "claim": "<PRD의 가정>", "verification_source_needed": "<무엇으로 확인할지>" }
  ],
  "user_acceptance_risks": [ "<도입 장벽>" ],
  "missing_market_views": [ "<시장 관점 누락>" ],
  "verifiable_facts_used": [ "<답변에 사용한 외부 사실 + 출처>" ],
  "global_observations": "<2~3 문장>"
}
```

검색 결과의 출처(URL 또는 사례명)를 항상 명시해주세요. 한국어 반존대(해요체) 환영.
```
