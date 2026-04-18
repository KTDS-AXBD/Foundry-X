# ax-bd/shape — 형상화 (3단계)

AX BD 프로세스 6단계 중 3단계: 발굴 산출물 → 사업기획서 형상화.
발굴 단계(2-0~2-8)의 DiscoveryPackage를 입력으로 받아, 표준 포맷(HTML/PPTX)의 사업기획서를 생성한다.

## Agent

- **ax-bd-offering-agent** — shaping-orchestrator 확장, 형상화 전체 라이프사이클 관리
  - 6 capability: format_selection, content_adapter, structure_crud, design_management, validate_orchestration, version_guide
  - 기존 O-G-D 품질 루프 + Six Hats + Expert 5인 자동 호출
  - 구현: Sprint 166 F368

## Skills

| # | Skill | Input | Output | Format | Status |
|---|-------|-------|--------|--------|--------|
| 3-1 | [offering-html](offering-html/SKILL.md) | DiscoveryPackage + OfferingConfig | OfferingHTML | HTML | Active |
| 3-2 | [offering-pptx](offering-pptx/SKILL.md) | DiscoveryPackage + OfferingConfig | OfferingPPTX | PPTX | Active |
| 3-P | [prototype-builder](prototype-builder/SKILL.md) | OfferingArtifact + PrototypeConfig | Prototype | React/HTML | Stub |

## OfferingConfig Schema

| 필드 | 타입 | 설명 |
|------|------|------|
| purpose | `"report"` \| `"proposal"` \| `"review"` | 콘텐츠 어댑터 톤 결정 |
| format | `"html"` \| `"pptx"` | 출력 포맷 |
| sections | `SectionToggle[]` | 18섹션 필수/선택 토글 |
| designTokenOverrides | `Partial<DesignTokens>` | 고객별 브랜드 커스텀 (선택) |

## DiscoveryPackage Schema

발굴 단계(2-0~2-8)의 산출물 종합:

| 단계 | 필드 | 사업기획서 매핑 |
|------|------|----------------|
| 2-0 | item_overview | Hero, Exec Summary, §02-3 |
| 2-1 | reference_analysis | §02-6 글로벌·국내 동향 |
| 2-2 | market_validation | §04-2 시장 분석 |
| 2-3 | competition_analysis | §04-2 경쟁, §05 GTM |
| 2-4 | item_derivation | §02-1~02-2 Why |
| 2-5 | core_selection | §01 추진배경 |
| 2-6 | customer_profile | §02-3, §03-2 시나리오 |
| 2-7 | business_model | §04-3 매출 계획 |
| 2-8 | packaging | 전체 기초 자료 |

## 톤 변환 (Content Adapter)

동일 DiscoveryPackage에서 목적별 톤 자동 결정:

| purpose | 톤 | 강조 섹션 |
|---------|-----|----------|
| report | executive — 경영 언어 | Exec Summary + 교차검증 |
| proposal | technical — 기술 상세 | 솔루션 + PoC 시나리오 |
| review | critical — 리스크 중심 | No-Go 기준 + 리스크 |
