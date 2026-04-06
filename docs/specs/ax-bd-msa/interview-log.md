# AX-BD-MSA 요구사항 인터뷰 로그

**날짜:** 2026-04-07
**참석:** Sinclair Seo (AX BD팀)
**인터뷰어:** Claude Code (req-interview 스킬)
**참조 문서:** `docs/specs/AX-BD-MSA-Restructuring-Plan.md` (FX-DSGN-MSA-001 v3)

---

## 코드네임

**ax-bd-msa** 확정

---

## Part 1: 왜 (목적/문제)

**Q: Foundry-X 모놀리스를 MSA로 재조정하려는 가장 핵심적인 이유?**
- A: **BD 프로세스 독립성** — 6+1단계(수집→발굴→형상화→검증→제품화→GTM+평가) 각각이 독립적으로 배포/운영되어야 함

**Q: 이 MSA 전환의 시급성?**
- A: **다음 Phase로 즉시 착수** — Phase 20으로 우선순위 1위

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q: 주 사용자/이해관계자?**
- A: **AX BD팀 단독** (7명) — 내부 도구로 운영, 외부 확장 계획 없음

---

## Part 3: 무엇을 (범위/기능)

**Q: 설계서 Phase 19-A~D 전체를 한 번에 실행?**
- A: **Phase 20에 전체 실행** (M1~M4를 하나의 Phase로)

**Q: F268~F391 증분 서비스 재배정을 PRD에 포함?**
- A: **예, PRD에 포함**

**Q: Out-of-scope?**
- A: **Foundry-X만 실행** — 나머지 서비스들(AI Foundry, Discovery-X, Recon-X, Gate-X, Launch-X, Eval-X)은 `packages/harness-kit`을 기반으로 별도 작업 계획 수립 예정

**Q: Foundry-X만 실행한다는 것의 구체적 의미?**
- A: **모두 해당**
  1. Foundry-X에서 비핵심 기능 제거 (Auth/Dashboard/Wiki 등 이관 준비)
  2. Foundry-X를 2~3단계 전용으로 리팩토링
  3. harness-kit 공통 기반 패키지 생성 (다른 서비스 창건 템플릿)

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q: Phase 20 성공 기준?**
- A: **서비스 독립 배포 가능** — Foundry-X가 2~3단계 전용으로 독립 배포 + 기존 기능 회귀 없음

**Q: 기존 기능 회귀 없음 검증 방법?**
- A: **모두 해당** — E2E 테스트 + API 단위 테스트 + Production 배포 smoke test 3중 검증

---

## Part 5: 제약과 리소스 (현실 조건)

**Q: 기술 스택?**
- A: **Cloudflare 동일 스택** — Workers + D1 + Pages 유지

**Q: 기간?**
- A: **8~10 Sprint** (~2~2.5개월)

---

## 인터뷰 요약

| 항목 | 결정 |
|------|------|
| 코드네임 | ax-bd-msa |
| 핵심 동기 | BD 프로세스 6+1단계 독립 운영 |
| 시급성 | Phase 20 즉시 착수 |
| 사용자 | AX BD팀 7명 단독 |
| 범위 | Foundry-X 축소 + harness-kit 생성 (나머지 서비스 별도) |
| F-item 증분 | F268~F391 (124건) 서비스 재배정 PRD에 포함 |
| 성공 기준 | 독립 배포 + E2E/API/smoke 3중 검증 |
| 기술 스택 | Cloudflare Workers + D1 + Pages |
| 기간 | 8~10 Sprint |

*인터뷰 완료 — PRD v1 작성 진행*
