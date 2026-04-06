---
name: offering-pptx
domain: ax-bd
stage: shape
version: "0.1"
description: "AX BD팀 사업기획서(PPTX) 생성 스킬 — Sprint 166 F367에서 본구현"
input_schema: DiscoveryPackage + OfferingConfig
output_schema: OfferingPPTX
upstream: [ax-bd/discover/packaging]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
status: stub
evolution:
  track: DERIVED
  registry_id: null
---

# Offering PPTX (Stub)

Sprint 166 F367에서 본구현 예정.

## When

대외 제안용 사업기획서가 PPTX 포맷으로 필요할 때.

## How

1. DiscoveryPackage 로드
2. OfferingConfig.format = "pptx" 확인
3. 표준 슬라이드 목차에 따라 PPTX 생성
4. Cowork pptx 스킬 연동 (공유·편집)

## Output Format

`AX Discovery_사업기획서_{고객명}_v{버전}_{YYMMDD}.pptx`

## Dependencies

- pptxgenjs 또는 python-pptx (Sprint 172 F380에서 엔진 선택)
- Cowork pptx 연동 (Sprint 166 F367 설계)
