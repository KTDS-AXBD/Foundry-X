---
name: ir-deck
description: |
  투자심의/경영진 보고용 AI 사업계획서 생성
  Use when: IR 덱, 투자 보고서, 경영진 보고, 사업계획서, IR deck, investor presentation, executive report
  Triggers: IR 덱, 투자 보고서, 경영진 보고, 사업계획서, IR deck, investor presentation, executive report
  Do NOT use for: 일반 PRD 작성 (pm-skills create-prd 사용)
user-invocable: true
category: business-automation
argument-hint: "[사업 아이템 설명]"
---


# 투자심의 / IR Deck 작성 (AI Business Plan)

사용자가 제시한 AI 사업 아이템에 대해 **경영진 보고 또는 투자심의용 사업계획서**를 작성하세요.

## 구성 (12 슬라이드 기준)

### Slide 1: Executive Summary
- 사업명, 한 줄 정의, 핵심 가치제안
- 목표 시장 규모, 예상 매출, 투자 요청액

### Slide 2: Problem — 시장의 Pain Point
- 현재 고객이 겪는 문제 (구체적 수치 포함)
- 기존 해결 방식의 한계
- 문제의 규모와 시급성

### Slide 3: Solution — AI 기반 해결책
- 제품/서비스 핵심 기능 3가지
- AI가 만드는 차별적 가치
- 기존 대비 개선 효과 (정량)

### Slide 4: Market Size — TAM/SAM/SOM
- 시장 규모 (Top-down + Bottom-up)
- 성장률 및 트렌드
- 진입 타이밍 근거

### Slide 5: Business Model — 수익 모델
- 가격 체계 (SaaS/API/라이선스 등)
- Unit Economics (LTV, CAC, Gross Margin)
- 수익 시나리오 3안 (낙관/기본/비관)

### Slide 6: Competitive Landscape — 경쟁 구도
- 경쟁사 매핑 (2x2 포지셔닝)
- KT DS 차별화 포인트
- 경쟁 해자 (Moat)

### Slide 7: Go-to-Market — 시장 진입 전략
- Beachhead 시장
- 채널 전략
- 초기 고객 확보 전략

### Slide 8: Technology — 기술 아키텍처
- AI 모델/기술 스택
- 데이터 파이프라인
- Build vs Buy 결정

### Slide 9: Roadmap — 실행 로드맵
- Phase 1 (PoC/Pilot): 0~6개월
- Phase 2 (MVP/초기 고객): 6~12개월
- Phase 3 (Scale-up): 12~24개월

### Slide 10: Financial Plan — 재무 계획
- 투자 요청액 및 사용처
- 매출/비용 전망 (3년)
- BEP 도달 시점

### Slide 11: Team & Organization
- 핵심 인력 구성
- 외부 파트너십
- 채용 계획

### Slide 12: Ask — 의사결정 요청
- 투자 승인 요청 사항
- 기대 효과
- Next Steps / 마일스톤

## 출력 형식
- 각 슬라이드별 **제목 + 핵심 메시지 + 상세 내용 + 시각화 제안**
- 전체를 관통하는 **스토리라인** (Pyramid Principle)
- 예상 질문 및 답변 (Q&A 준비)

$ARGUMENTS

## Gotchas

- **12슬라이드 구조는 경영진 보고용 — 실무 검토용은 별도 상세 문서 필요. Pyramid Principle 적용 시 결론(So What)을 먼저 배치**
- **KT DS 맥락 유지**: 모든 분석은 KT DS의 SI/SM 역량, KT 그룹 고객 기반을 고려해야 함. 일반적인 스타트업 관점과 다름
- **HITL 필수**: AI 분석 초안 제공 후 반드시 담당자 검증 요청. 결과를 그대로 수용하지 않음
- **산출물 언어**: 한국어 작성, 프레임워크 용어는 원어 병기
