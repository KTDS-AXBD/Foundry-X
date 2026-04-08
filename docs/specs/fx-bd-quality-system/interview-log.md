# BD Quality System — 인터뷰 로그

**일시:** 2026-04-08
**참여���:** Sinclair Seo (BD팀)

---

## Part 1: 왜 (목적/문제)

**Q**: 지금 어떤 문제가 있어서 이걸 만들려고 하시나요?

**A**: Prototype 품질만이 아니라 BD 산출물 전체(PRD + Offering + Prototype)를 통합적으로 품질 관리하고 싶어요. 현재는 개별 구성요소들이 존재하지만 유기적으로 연결되지 않아서 최종 산출물 품질이 미달이에요.

**Q (후속)**: 현재 파이프라인에서 발견된 구체적 문제는?

**A**: 7개 GAP 확인:
1. Quality 점수가 생성 루프와 분리됨
2. 사���자 피드백 → 재생성 미구현
3. HITL 리뷰가 읽기 전용 (액션 없음)
4. 디자인 토큰이 생성과 단절
5. Generator/Discriminator 평가 기준 불일치
6. 메타 오케스트레이터 부재
7. Offering 디자인 관리가 Prototype에 미전달

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q**: 이 품질 체계를 사용하는 사람은 누구인가요?

**A**: BD팀 전체 (3~5명). BD팀이 Foundry-X로 산출물을 만들고, Agent가 자율적으로 품질을 보장하는 구조. 최종 수혜자는 산출물을 받는 고객.

---

## Part 3: 무엇을 (범위/기능)

**Q**: 핵심 기능을 한 문장으로 말한다면?

**A**: BD 산출물 전체 허브로서의 Sentinel + 산출물 유형별 전문 QSA Discriminator 3종 (PRD/Offering/Prototype).

**Q (후속)**: Offering과 Prototype이 핵심 고객 대면 산출물이고, PRD는 내부용?

**A**: 맞아���. 특히 Offering과 Prototype이 핵심.

**Q (후속)**: QSA를 몇 개로 나누나요?

**A**: 3개 — PRD QSA + Offering QSA + Prototype QSA. PRD도 내부용이지만 품질 기준이 필요해요.

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q**: 이 품질 체계가 성공했다는 걸 어떻게 알 수 있을까요?

**A**: **산출물이 'AI가 만들었다'는 느낌이 절대 없는 것.** 디자인/워딩/구조 모두에서 전문가가 만든 것처럼 보이는 것이 최상위 성공 기준.

---

## Part 5: 제약과 리소스 (현실 조건)

**Q**: 알아야 할 제약 조건이 있나요?

**A**: 현재 인프라 내에서 구현. Cloudflare Workers + D1 + 기존 에이전트 인프라 안에서. 새 외부 서비스 추가는 최소화.

---

## 참고: 세션 중 분석 결과

### 3개 참고 리포 분석 (세션 초반)
- **styleseed**: 5-Layer 디자인 시스템 프레임워크 (Design Language → Token → CSS Theme → Component → AI Skills)
- **awesome-design-md**: DESIGN.md 58종 산업별 컬렉션 (9개 영역 구조)
- **impeccable**: 7도메인 디자인 참조 + 20개 steering 명령 + anti-pattern 라이브러리

### 기존 설계 (세션 중 생성)
- `.claude/agents/prototype-qsa.md` — Prototype HTML 5차원 품질/보안 판별
- `.claude/agents/prototype-sentinel.md` — Prototype 파이프라인 7 Sector 자율 감시

### 인터뷰 후 방향 변경
- prototype-sentinel → **bd-sentinel** (BD 산출물 전체 커버)
- prototype-qsa 1개 → **QSA 3종** (PRD/Offering/Prototype)
