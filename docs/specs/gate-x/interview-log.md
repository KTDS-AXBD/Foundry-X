# Gate-X Requirements Interview Log

**날짜:** 2026-04-07
**인터뷰어:** Claude (AI)
**응답자:** Sinclair Seo (AX BD팀)

---

## 프로젝트 코드네임

**Gate-X** — Foundry-X에서 검증(Gate) 도메인을 독립 서비스로 분리

---

## Part 1: 왜 (목적/문제)

**Q: Gate-X를 독립 서비스로 분리하려는 핵심 이유가 뭐예요?**

A: 외부 제공/재사용. Gate-X(검증 서비스)를 Foundry-X 모놀리스에서 분리하여 다른 팀과 고객사에서도 사용할 수 있도록 하려고 함.

**Q: 주 타겟은 누구이고 시급성은?**

A: KT DS 내부 팀, BD팀 자체 확장, 외부 고객사 — 3가지 타겟 모두 해당.

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q: 실제로 사용하는 사람은 누구?**

A: 둘 다.
- BD팀원 → Web UI 대시보드로 검증 파이프라인 운영
- 외부 개발자/팀 → REST API로 자사 서비스에 검증 기능 통합

---

## Part 3: 무엇을 (범위/기능)

**Q: 핵심 기능과 Must Have / Nice to Have 구분?**

A: gate 모듈 기능 + 확장 기능.

**Q: 확장 기능은?**

A: 다중 AI 모델 지원 + 커스텀 검증 룰 정의 + 외부 웹훅 연동 + 멀티테넌시 격리 + 과금 체계 + SDK/CLI 클라이언트.

**Q: Out-of-scope?**

A: Foundry-X 코어 기능(CLI, SDD Engine, 오케스트레이션) + 다른 모듈(auth, portal, launch) 분리 — Gate-X 검증 서비스만 집중.

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q: 성공 기준은?**

A: 독립 배포 + API 안정성. Gate-X가 독립 Cloudflare Workers로 배포되고 API가 안정적으로 작동하면 성공.

---

## Part 5: 제약과 리소스 (현실 조건)

**Q: 제약 조건은?**

A: Cloudflare 스택 유지 (Workers + D1 + Pages). harness-kit 기반.

**Q: D1 데이터베이스 전략은?**

A: 인터뷰/분석에서 결정. 새 D1 vs Shared DB + Strangler proxy — PRD에서 트레이드오프 분석 후 결정.

---

## 요약 확인

사용자 확인: "맞아요, PRD 진행" ✅

---

*이 문서는 ax:req-interview 스킬에 의해 자동 생성되었습니다.*
