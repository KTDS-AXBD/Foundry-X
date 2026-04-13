# fx-agent-autonomy 인터뷰 로그

**날짜**: 2026-04-13
**인터뷰어**: Claude (req-interview skill)
**인터뷰이**: Sinclair Seo

---

## Part 1: 왜

**Q**: 에이전트 자율 운영을 강화하려는 근본 이유가 뭘까요?
**A**: 품질 보장 부족. 새 Feature 추가 시 E2E 커버리지가 자동으로 확장되지 않아, Gap Analysis PASS와 실제 품질 사이에 괴리가 있음.

**Q**: 구체적인 사례는?
**A**: E2E 커버리지 부족. 현재 E2E 273건이지만 새 Feature 추가 시 커버리지가 자동 확장되지 않음.

---

## Part 2: 누구를 위해

**Q**: 이 기능을 주로 사용하거나 영향을 받는 사람은?
**A**: 나(개발자) 본인. 1인 개발 환경에서 AI 에이전트 운영자로서 autopilot의 품질 보장을 높이고 싶음.

---

## Part 3: 무엇을

**Q**: 핵심 기능과 범위는?
**A**: Must Have — E2E 자동 생성 + Gap-E2E 통합. Out-of-scope — Sprint 자율 선택.

**Q**: 제외 범위는?
**A**: Sprint 자율 선택(autopilot이 다음 Sprint을 스스로 결정)은 제외.

---

## Part 4: 성공 기준

**Q**: 어떻게 성공을 판단?
**A**: (1) E2E 커버리지 자동 성장 (2) Gap + E2E 통합 점수 산출 (3) 수동 개입 감소.

---

## Part 5: 제약

**Q**: 기술/시간/인력 제약은?
**A**: 기존 스택 유지 (Playwright + Vitest + ax 스킬셋 프레임워크).
