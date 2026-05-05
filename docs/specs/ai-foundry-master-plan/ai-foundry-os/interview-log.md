# AI Foundry OS — 요구사항 인터뷰 로그

**프로젝트 코드네임**: `ai-foundry-os`
**인터뷰 일자**: 2026-05-02
**인터뷰어**: Claude (ax-plugin /req-interview 스킬)
**응답자**: Sinclair Seo (PM 겸 프로그래머, KTDS-AXBD)
**진입점**: cross_review_followup
**깊이**: deep (Part 1~5 + Six Hats + 외부 LLM 자동 검토)
**입력 첨부**: 08_build_plan_v1.md (마스터 빌드 플랜) + 02_ai_foundry_phase1_v0.3.md (정의서 v0.3)

---

## 인터뷰 진행 (한 번에 한 질문, 모두 AskUserQuestion 형식)

### Q0. 코드네임 선택

**제시 옵션**: ktds-aif-internal / foundry-self / ax-ops / kdas

**응답**: `ai-foundry-os` (Other 직접 입력)

**해석**: 사용자는 별도의 internal/dogfooding 프로젝트로 분리하지 않고 AI Foundry OS 자체를 본 PRD의 대상으로 잡음. 07 사내 운영 아키텍처 문서명과 일치. 외부용 02 + 사내용 07 두 그림을 통합한 PRD를 만든다는 명시적 의도.

---

### Q1 (Part 1 핵심). AI Foundry OS를 지금 만드는 핵심 동기

**제시 옵션**:
- A. 02 정의서 §1.1 4가지 문제 재확인 (머릿속·추적 안됨·반복·평가 안됨)
- B. KT DS 내부 만의 상위 구조적 공백
- C. 외부 검증에서 노출된 G3·G5 통과 위험 + BM 가설 불명확
- D. 외부(타 고객) 적용 전 레퍼런스 구축 + 사내 KPI 명시

**응답**: D

**해석**: 본 PRD의 핵심 동기는 **레퍼런스 구축 + 사내 KPI 입증**. 외부 고객 제안의 결정적 근거이며 G5 임원 보고 메시지의 강력한 백본. R-13(외부 도메인 지연) 회피 효과도 부수적.

---

### Q2 (Part 1 후속). 외부(타 고객) 적용 시점 1순위

**제시 옵션**:
- A. 8월 G5 직후 (9월 GTM 1차)
- B. 2026 Q4
- C. 2027 상반기
- D. 미정

**응답**: **7월** (Other)

**해석**: 마스터 플랜 v1보다 1개월 공격적인 deadline. Phase 2 α4 완료 직후(7월 W27 직전) 외부 제안 드라이런 시작. 사용자의 "실제 개발기간 짧음" 신념과 일치. 본 PRD의 일정 가설 핵심 변수.

---

### Q3 (Part 2 핵심). 주 사용자

**제시 옵션**:
- A. KT DS AX컨설팅팀 5명 (서민원·김기욱·남윤서·이응주 + Sinclair)
- B. KTDS-AXBD 전체 (AX + 사업본부)
- C. KT DS 전사
- D. 임원 전용 KPI 대시보드

**응답**: B

**해석**: AX컨설팅팀 한정이 아니라 사업본부(공공·금융·기업) 포함. 4 본부 자체가 가상 다조직 케이스가 됨 → Cross-Org PoC가 sole sandbox에서 진짜 sandbox로 진화.

---

### Q4 (Part 2 후속). 본부별 사용 양상

**제시 옵션**:
- A. Cross-Org 4그룹 분류로 본부별 자동 분리
- B. AX는 도구 제공자, 사업본부 3개는 도메인별 인스턴스
- C. 4본부 평등, 본부 차이 X
- D. AX 우선, 다른 본부는 Phase 4

**응답**: B

**해석**: **AX = Platform Owner / 공공·금융·기업 = Domain Tenant** 구조. 3개 도메인 인스턴스 = 3개 가상 도메인. Multi-Tenant 구조가 Phase 1부터 필수 (마스터 플랜 v1의 Phase 4 → Phase 2~3 앞당김).

---

### Q5 (Part 2 후속). 마찰 포인트

**제시 옵션**:
- A. 사업본부의 AX 통제 거부 (거버넌스 마찰)
- B. core_differentiator 분류로 본부 간 자산 공유 거부 (R-14 사내판)
- C. 임원 결재 라인 충돌
- D. 본부별 KPI 정의 불일치

**응답**: B

**해석**: 02 §11.1 R-14가 사내에서 동일하게 발생. Cross-Org default-deny가 사내 룰북에도 등재돼야 함. 신규 리스크 R-X1로 등록.

---

### Q6 (Part 3 핵심). AI Foundry OS의 핵심 기능 한 줄 접근

**제시 옵션**:
- A. 공공·금융·기업 3본부의 의사결정 자산화 + Cross-Org 4그룹 + 사내 KPI (Cross-Org 중심)
- B. AX 사업개발 워크플로우 표준화 + 본부 3개 적용 (워크플로우 중심)
- C. 4대 진단으로 사내 정책팩 정합성 + AXIS-DS HITL Console (정합성 중심)
- D. 5-Layer 통합 운영 + 본부 4개 동시 도메인 + KPI 대시보드 (통합 중심)

**응답**: D

**해석**: 가장 공격적인 통합 중심. 7월 deadline에 5-Layer + Multi-Tenant + KPI 대시보드 모두. 사용자 자신감과 일치하지만 범위 폭주 위험 있음 → out-of-scope 명시 중요해짐.

---

### Q7 (Part 3 후속). Out-of-scope

**제시 옵션**:
- A. 08 §7.5.2 그대로 (마켓플레이스·결제·다국어·모바일·실시간 스트림 등)
- B. A + 4 본부 외 다른 본부 Phase 4
- C. A + 본부 간 강제 표준화 (default-deny 정책 포기 X)
- D. A+B+C 모두

**응답**: A

**해석**: 마스터 플랜 v1 §7.5.2 그대로 답습. 외부 마켓플레이스·결제·다국어·모바일·실시간 스트림·외부 ID 풀·산업별 표준 인증 모두 Phase 4 이후.

---

### Q8 (Part 4 핵심). KPI 우선축

**제시 옵션**:
- A. 대시보드 메시지 우선 ("4 본부 동시 운영 / N개 critical inconsistency / X% 자산 재사용 / Y시간 단축")
- B. 자산 재사용·생산성 우선
- C. 정합성 우선 (4대 진단)
- D. 운영 효율 우선 (HITL·API·비용)

**응답**: A

**해석**: 임원·외부 한 화면 메시지 우선. AXIS-DS v1.3 임원 보고 위젯을 v1.2로 앞당김. 본부 4개 동시 운영 metric collector가 Phase 2부터 가동.

---

### Q9 (Part 4 후속). MVP 기준 (7월 deadline 마지막 선)

**제시 옵션**:
- A. Full — 4 본부 + 모든 KPI
- B. Partial — 3 본부 + 핵심 KPI 3개
- C. Minimum viable — AX + 1 도메인 + KPI 1~2개
- D. Mock-heavy fallback — AX + 가상 본부 4개

**응답**: B

**해석**: AX + 도메인 본부 2개 (공공·금융 또는 공공·기업) + KPI 3개 (critical inconsistency 발견 N건 + 자산 재사용률 ≥ X% + 진단 시간 단축 X%). 4번째 본부는 Phase 4 fallback.

---

### Q10 (Part 5 핵심). 인력 구조

**제시 옵션**:
- A. 마스터 플랜 7.3 FTE 그대로
- B. 마스터 + 본부별 SME 2~3명
- C. 마스터 + 보안팀 + SME
- D. 일체 추가 X — Sinclair + AI 에이전트로 100%

**응답**: D

**해석**: 본 PRD의 핵심 차별화 포인트. AI Foundry OS dogfooding 완전판. 외부 GTM 메시지 "1명 + AI 에이전트로 만든 플랫폼". 마스터 플랜 v1의 7.3 FTE × 18주 가설은 본 PRD에서 폐기. 인력 가설 H5도 무효화.

---

### Q11 (Part 5 후속). 데이터 권한·보안

**제시 옵션**:
- A. KT DS SSO + 02 §3.6.0 RBAC 5역할 + 본부별 PostgreSQL schema 격리
- B. A + 본부별 KMS 마스터키 분리
- C. Sinclair 개인 권한만 + 타 본부 NDA 별도
- D. audit log만 강화, 다른 권한 X

**응답**: A

**해석**: 12 dev plan §5.1 multi-tenant 패턴과 정합. core_differentiator default-deny가 schema 분리로 자연스럽게 강제됨. AX는 schema 간 read-only view 가능 (플랫폼 운영용). KMS 본부별 분리는 Phase 4로 미룸.

---

### Q12 (마무리). 다음 단계

**제시 옵션**:
- A. PRD v1 + Six Hats + 외부 LLM 검토 모두 자동 진행
- B. PRD v1만 먼저, Six Hats·외부 검토는 확인 후
- C. Part 1~5 답변 일부 수정
- D. PRD v1 + 02 정의서 v0.4 동시 작성

**응답**: A

**해석**: 계획대로 자동 진행. PRD v1 작성 → Six Hats 토론 → 외부 LLM 3 모델 검토 → scorecard 자동 산출까지.

---

## 인터뷰 요약 키 결정 사항

| 결정 | 값 | 마스터 플랜 v1 영향 |
|---|---|---|
| 코드네임 | `ai-foundry-os` | 외부+사내 통합 PRD |
| 시급성 | 7월 deadline | Phase 2 + Phase 3 진입 정비 1개월 압축 |
| 사용자 구조 | AX(Platform) + 공공·금융·기업(Tenants) | Multi-Tenant Phase 4 → Phase 2~3 앞당김 |
| 마찰 R-X1 | 본부 간 core_diff 공유 거부 | Cross-Org default-deny 사내 적용 |
| 핵심 기능 | 5-Layer 통합 + 본부 4개 + KPI 대시보드 | 범위 폭주 위험 — out-of-scope 강제 |
| MVP | 3 본부 + KPI 3개 | 4번째 본부는 Phase 4 fallback |
| 인력 | Sinclair + AI 100% | 7.3 FTE × 18주 가설 폐기 |
| 보안 | SSO + RBAC + 본부별 schema 격리 | 12 dev plan multi-tenant 패턴 정합 |

---

## 신규 리스크

- **R-X1**: 본부 간 core_differentiator 공유 거부 (R-14 사내판) — High/Med
- **R-X2**: Sinclair + AI 100% 모델의 bus factor 1 — High/High
- **R-X3**: 7월 deadline + Multi-Tenant 앞당김의 동시 압박 → Phase 2 fallback (08 §7.6.1) 발동 가능성 ↑

---

*이 인터뷰 로그는 ax-plugin /req-interview 스킬로 진행됨. 모든 질문은 AskUserQuestion 형식 (사용자 메모리 feedback_interview_questions.md 준수).*
