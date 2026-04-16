# 인터뷰 기록 — fx-boss-demo

**일시**: 2026-04-16 오후
**참여자**: Sinclair Seo (AX BD팀)

---

## Part 1: 왜 (목적/문제)

**Q: 지금 어떤 문제가 있어서, 또는 어떤 기회를 잡으려고 이걸 만들려고 하시나요?**

A: 본부장 시연. Foundry-X의 "Spec 기반 반제품화" 능력을 보여주는 것이 목적. 핵심은 SI 코드에서 추출한 Spec으로 새로운 사업(전자화폐상품권 플랫폼)을 자동으로 만들 수 있느냐의 과정과 결과를 보여주는 것.

**Q: 일정은?**
A: 내일(4/17) 오전. 대표 보고 09:00과 동일/연계.

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q: 이걸 누가 사용하거나 영향을 받게 되나요?**

A: 본부장이 시연 대상. 엔지니어 출신이고 디테일을 중요하게 생각. Spec의 완성도, 반제품화가 이루어지는 과정, 실제 생성된 반제품화가 Prototype 수준이 아니라 실제 현업에 활용될 수 있을지에 대한 판단이 중요.

---

## Part 3: 무엇을 (범위/기능)

**Q: 핵심 기능을 딱 한 문장으로 말한다면?**

A:
- 시연 URL: https://fx.minu.best/ai-foundry-os/demo/lpon
- 실제 시연할 온누리상품권의 Spec은 Decode-X 연동 (~/work/axbd/Decode-X)
- 연동된 Spec으로 새로운 전자화폐상품권 플랫폼을 만든다는 시나리오를 생성
- 신규 시나리오에 대한 발굴 단계를 거치고, 형상화 단계를 Prototype까지 자동 생성
- 핵심은 Spec으로 반제품화를 할 수 있느냐의 과정과 결과를 보여주는 시연

**Q: 시연 형태는?**
A: 슬라이드 + 데모 혼합. 15분 이내.

**Q: 시나리오 수준은?**
A: 사전 생성 + 마지막만 라이브. 발굴/형상화는 사전 준비, Prototype 최종 결과만 라이브로 보여줌.

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q: 이게 성공했다는 걸 어떻게 알 수 있을까요?**

A: (1) Spec 완성도 인정 — 본부장이 "Spec이 현업 수준이다"라고 인정 (2) 실전 활용 가능성 확인 — 생성된 Prototype이 PoC 수준이 아니라 실제 쓸 수 있다는 판단

---

## Part 5: 제약과 리소스 (현실 조건)

**Q: 리스크는?**
A: AI 생성 품질 불안 (라이브로 생성한 결과물이 기대 이하일 가능성), 질문 대응 (본부장의 디테일 질문에 즉시 답변 못할 수 있음)

**Q: 준비 시간은?**
A: 오늘 오후 ~ 내일 아침 직전까지.

---

## 기존 자산 확인

- **LPON 6종 Spec**: 01-business-logic.md (BL 47건), 02-data-model.md (14 테이블, ERD), 03-functions.md, 04-architecture.md, 05-api.md, 06-screens.md
- **Working-version**: domain 738줄, routes 239줄, tests 518줄, migration 315줄 — 실동작 코드
- **fx.minu.best 데모 페이지**: /ai-foundry-os/demo/lpon (3-Pass 분석, KG, Harness)
- **Decode-X 리포**: ~/work/axbd/Decode-X (GitHub: KTDS-AXBD/Decode-X)
