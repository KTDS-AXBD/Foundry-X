---
name: prototype-builder
domain: ax-bd
stage: shape
version: "0.1"
description: "Offering → Prototype 자동 빌드 — Phase 16 F351~F356 연동"
input_schema: OfferingArtifact + PrototypeConfig
output_schema: Prototype
upstream: [ax-bd/shape/offering-html]
downstream: [ax-bd/validate/gan-cross-review]
agent: ax-bd-offering-agent
status: stub
evolution:
  track: DERIVED
  registry_id: null
---

# Prototype Builder (Stub)

Phase 16(F351~F356)에서 구현된 Prototype Auto-Gen과 연동.
Sprint 173 F382에서 Offering → Prototype 자동 호출 파이프라인 구현 예정.

## When

사업기획서의 시나리오/데이터를 기반으로 프로토타입이 필요할 때.

## How

1. Offering 섹션(§03-2 시나리오)에서 프로토타입 스펙 추출
2. Phase 16 Builder Server 호출
3. React/HTML 프로토타입 생성
4. Offering 대시보드에 프로토타입 링크 연결

## References

- Phase 16 PRD: `docs/specs/prototype-auto-gen/prd-final.md`
- Builder Server: Railway 배포 완료 (세션 #213)
