# ChatGPT (GPT-4o) 검토 프롬프트

> **사용법**: ChatGPT 사이트에 `../../prd-v1.md` 파일을 첨부 후 아래 프롬프트를 그대로 붙여넣기.
> 옵션: Data Controls → Improve the model **OFF**, Memory **OFF** 사전 설정.

---

```
당신은 IT 서비스 기획과 프로젝트 관리 경험이 풍부한 시니어 PM입니다.
첨부된 PRD (AI Foundry OS — KT DS 사내 통합 Agentic AI 플랫폼) 를 검토하고 실무적 관점에서 평가해주세요.

PRD 컨텍스트:
- KT DS-AXBD가 운영 중인 5개 사내 repo (Foundry-X·Decode-X·Discovery-X·AXIS-DS·ax-plugin)를 본부 4개(AX·공공·금융·기업)에 동시 적용하는 사내 dogfooding 프로젝트입니다.
- 핵심 동기는 "외부 고객 적용 전 자체 레퍼런스 + 사내 KPI 명시" 입니다.
- 7월 deadline (마스터 플랜 v1보다 1개월 공격적).
- 인력 모델: Sinclair (PM 겸 프로그래머) 1명 + AI 에이전트 100% (마스터 플랜 7.3 FTE × 18주 가설 폐기).
- Multi-Tenant 본부별 PostgreSQL schema 격리.
- 시그니처: 4대 진단 + Cross-Org 4그룹 분류 (core_differentiator default-deny 강제).

다음 항목별로 검토 의견을 주세요:

1. **논리적 완결성**: 문제(§2)-해결책(§4)-성공기준(§5) 의 논리 흐름이 일관된가요?
   - 결함이 있다면 §번호와 함께 구체적으로

2. **실행 가능성**: 7월 deadline + Sinclair + AI 100% 인력 모델이 현실적인가요?
   - 과소평가된 부분이 있다면? (특히 Multi-Tenant 앞당김)

3. **누락된 핵심 요소**: 사내 dogfooding 프로젝트에서 반드시 있어야 하는데 빠진 것은?
   - 예: 본부장 결재 라인, KPI 베이스라인 측정, 외부 GTM 자료 마스킹 가이드, 등

4. **리스크**: 가장 크게 우려되는 실패 요인은?
   - R-X1 ~ R-X5 외에 추가 리스크가 있다면?

5. **착수 판단**: Ready / Not Ready / Conditional 중 하나로 판단하고 이유를 설명해주세요.
   - Conditional이라면 어떤 조건이 충족되어야 하는지 명시

답변 형식 (JSON-friendly):

```json
{
  "model": "GPT-4o",
  "reviewed_at": "<ISO 8601 datetime>",
  "verdict": "Ready | Not Ready | Conditional",
  "verdict_reason": "<2~3 문장>",
  "flaws": [
    { "section": "§N", "issue": "<무엇이 잘못>", "severity": "critical | high | medium | low" }
  ],
  "gaps": [
    { "section": "§N", "missing": "<무엇이 빠짐>", "suggested_addition": "<채울 내용>" }
  ],
  "risks": [
    { "id": "R-NEW-N", "description": "<리스크>", "severity_likelihood": "High/Med 등", "mitigation": "<완화책>" }
  ],
  "conditional_requirements": [ "<Conditional이면 충족 조건>" ],
  "global_observations": "<2~3 문장 전반적 평가>"
}
```

답변은 항목별로 구체적·실용적으로. 칭찬보다 개선 포인트에 집중. 한국어 반존대(해요체) 환영.
```
