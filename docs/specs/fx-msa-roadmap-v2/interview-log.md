# fx-msa-roadmap-v2 Interview Log

**날짜:** 2026-04-14
**진행자:** Claude (via `/ax:req-interview`)
**참조 문서**:
- `docs/specs/fx-msa-roadmap/msa-transition-diagnosis.md` (내부 진단)
- `docs/specs/fx-msa-roadmap/enterprise-blueprint-v3.html` (사업 Blueprint)

---

## 프레임 설정

**프로젝트명**: `fx-msa-roadmap-v2`
**시간 스코프**: W+1~W+7 (2026-04-14 ~ 2026-06-01) — Blueprint 단기 + GTM 연계

**기존 PRD 이어받기 맥락**:
- `fx-msa-roadmap/prd-final.md`(Phase 39 Walking Skeleton PRD)은 완료됨
- Enterprise Blueprint는 W+14~W+16에 "6 *-X 서비스 완전 분리 = MSA 완성"을 명시
- 본 PRD는 **중간 구간(W+1~W+7)**의 MSA 관점 원칙을 다룸 — GTM 보호 관점

---

## Part 1: Why (목적/문제)

**Q1: W+1~W+7 7주 기간 동안 MSA 관련 작업에서 '절대 하지 말아야 할 것'은?**
- ✅ packages/api 대규모 분리 (GTM 데모 환경 파괴 위험)
- ✅ Agent/Harness 도메인 분리 (횡단 의존성, W+2~W+3 신규 구조 작업과 순환 위험)

**Q2: 반대로, W+1~W+7에 'MSA 측면에서 반드시 해야 할 최소한'은?**
- ✅ Type 1 SKU 분리 단위 결정 (SKU 경계 = 향후 *-X 서비스 경계)
- ✅ 신규 구조를 MSA 친화적 설계 (F534~F536 등 신규 F-item을 처음부터 독립 경계로)

**정리**:
- **금지선**: 기존 코드 1,139파일 건드리지 않기. 복잡한 도메인(Agent/Harness) 분리 금지
- **필수선**: 사업 경계(SKU) 결정 + 신규 코드 MSA 친화 설계
- **프레이밍**: "기존은 건드리지 않고, 앞으로 만들 신규 코드만 MSA 친화적으로 — 점진적 하드닝"

---

## Part 2: Who (사용자/이해관계자)

**Q1: 핵심 이해관계자는?**
- ✅ Sinclair 단독 개발자
- ✅ AI 에이전트 (Claude, autopilot)
- ❌ 본부장 (선택 안 됨)
- ❌ Type 1 첫 고객 (선택 안 됨)

**Q2: Type 1 첫 고객의 '수용 가능한 MSA 성숙도'?**
- ✅ 보이지 않아도 됨 (고객은 사용자 입장, 내부 구조 무관)

**정리**:
- 이 PRD의 진짜 고객 = **개발자 본인 + AI 에이전트**
- 본부장/고객 마케팅용 ❌, 순수 **기술부채 방지 + Sprint 병렬성** 목적
- Blueprint의 Type 1 GTM은 **MSA와 별개 트랙**으로 진행되어야 함

---

## Part 3: What (범위/기능)

**Q1: 신규 구조를 'MSA 친화적으로' 설계한다는 것의 구체적 원칙은?**
- ✅ `core/{domain}/` 아래만 사용 — packages/api/src/routes, services 직접 추가 금지
- ✅ 도메인 간 import 금지 — contract(types)만 import 허용, ESLint 룰로 강제
- ✅ Hono sub-app 패턴 — `core/{domain}/routes/index.ts`에서 sub-app 묶어 mount
- ❌ D1 테이블 prefix 규약 (선택 안 됨)

**Q2: Type 1 SKU 분리 단위 결정의 산출물?**
- ✅ SKU별 서비스 경계 테이블 — HR/손해사정/문서처리 각각이 필요로 하는 *-X 서비스 매핑

**Q3: Out-of-scope 명시적 제외 대상?**
- ✅ 기존 api 패키지 리팩토링
- ✅ D1 분리 실행
- ✅ fx-gateway 프로덕션 전환
- ❌ Agent/Harness 도메인 리팩토링 (명시하지 않아도 Q1.2에서 배제됨)

---

## Part 4: Success (성공 기준)

**Q1: W+7 마감 시점 정량 지표?**
- ✅ 신규 F-item import 위반 0건 — ESLint로 자동 검증

**Q2: MVP 최소 기준?**
- ✅ 신규 F-item 원칙 적용 + SKU 경계 테이블 (둘 다)

**Q3: 실패/중단 조건?**
- ✅ GTM 데모에 지장 발생 (W+4 데모 리허설 우선)
- ✅ F534/F535/F536 출시 일정 지연 30%+ (MSA 원칙이 속도 저해)

---

## Part 5: Constraints (제약과 리소스)

**Q1: Phase 43 HyperFX Activation (F534~F536)이 이미 진행 중, 원칙 적용 시점?**
- ✅ F534 이후 Sprint부터 원칙 적용 — 뒤틀림 없이 자연 유입

**Q2: ESLint 룰 배포 시점?**
- ✅ PRD 작성 직후 즉시 — W+1 내 PR CI 연입

**Q3: latency 벤치마크 필요성 재검토?**
- ✅ 제외 유지 — fx-gateway 프로덕션 전환이 W+8+이므로 현 단계 벤치마크 불필요

---

## 최종 요약

- **프레이밍**: "기존 보호 + 신규 하드닝" 점진적 MSA 하드닝
- **핵심 이해관계자**: 개발자 + AI 에이전트 (내부 인프라)
- **Must Have 4종**: core/{domain} 한정 · 도메인 간 import 금지 · Hono sub-app · SKU 경계 테이블
- **성공 = import 위반 0건 + SKU 경계 테이블 완성**
- **중단 = GTM 지장 또는 F534~F536 30%+ 지연**
