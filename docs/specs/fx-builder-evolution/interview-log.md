# fx-builder-evolution 인터뷰 로그

**일시:** 2026-04-06
**인터뷰이:** Sinclair Seo (AX BD팀)
**인터뷰어:** Claude (req-interview 스킬)

---

## Part 1: 왜 (목적/문제)

**Q: 어떤 문제가 있어서 이걸 만들려고 하시나요?**

현재 Prototype Builder로 자동 빌드된 5종 프로토타입이 있다:
- https://proto-ax-bd-ideation-mvp-platform.pages.dev
- https://proto-discovery-ux.pages.dev
- https://proto-self-evolving-harness-v2.pages.dev
- https://proto-prototype-auto-gen-system.pages.dev
- https://proto-bd-pipeline-end-to-end.pages.dev

하지만 고객 관점에서 이런 프로토타입을 보여줄 수 없는 수준이다.

**Q: 구체적인 문제는?**
복합적 — 디자인(레이아웃 깨짐, 스타일 불일치)과 기능(동작 불완전) 모두 문제가 있다.

**Q: 활용 맥락은?**
복합 — 내부 팀 검토 + 고객 데모 모두에서 품질이 필요하다.

---

## Part 2: 누구를 위해

**Q: 주 사용자와 의사결정권자는?**
3계층 구조:
1. **BD팀** (7명) — Prototype 생성자
2. **고객사 담당자** — Prototype 확인/피드백
3. **경영진** — 최종 승인

---

## Part 3: 무엇을 (범위)

**Q: Must vs Should 구분은?**
전체 포괄 (Must Have):
1. **품질 계량화 스코어링** — 수준을 측정하고 계량화하는 기준
2. **자동 품질 향상 파이프라인** — 계량화된 지표 기준으로 자동 향상
3. **구독 계정 활용 비용 절감** — Claude Max 구독의 CLI를 Builder에 활용

**Q: 구독 방안의 구체적 내용은?**
Claude Max ($100/월) 구독 중 — 이 구독에 포함된 Claude Code CLI를 Builder Server에서도 활용하여 Anthropic API 비용(pay-per-token)을 절감하고 싶다.

---

## Part 4: 성공 기준

**Q: 성공 측정 기준은?**
계량화된 품질 점수 80점 이상이면 고객 데모 가능 수준.

**Q: 품질 점수 구성 차원은?**
균형적 — 시각적 완성도 + 기능 동작 + PRD 반영도 모두 중요.

---

## Part 5: 제약과 리소스

**Q: 제약 조건은?**
- Claude Max 구독 중 ($100/월) — Builder에도 활용하고 싶음
- 현재 인프라: Railway Docker + Anthropic API 직접 호출 (SKIP_CLI=true)
- 현재 CostTracker: $20/월 예산 설정
- API 비용이 생각보다 큰 문제

---

*이 문서는 req-interview 스킬에 의해 자동 생성되었습니다.*
