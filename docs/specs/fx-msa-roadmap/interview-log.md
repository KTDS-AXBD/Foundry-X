# fx-msa-roadmap Interview Log

**날짜:** 2026-04-12
**인터뷰어:** Claude (req-interview skill)
**응답자:** Sinclair Seo (AX BD팀)

---

## Part 1: 왜 (목적/문제)

**Q: 지금 어떤 문제가 있어서, 또는 어떤 기회를 잡으려고 이걸 만들려고 하시나요?**

A: 규모 성장 대비 + 팀 확장 대비. 현재 심각한 Pain은 없지만 선제적으로 구조를 잡아두고 싶음.

**Q: 배포 커플링이 구체적으로 어떤 상황인가요?**

A: shared 패키지 변경 시 전체 리빌드 트리거. api/web은 이미 독립 배포 가능하지만 shared 변경 영향이 넓음.

---

## Part 2: 누구를 위해 (사용자/이해관계자)

**Q: 이걸 누가 사용하거나 영향을 받게 되나요?**

A: AX BD팀 전체. 현재는 Sinclair + AI 에이전트 단독 개발이지만, 향후 BD팀 전체가 Foundry-X를 사용/개발하는 시나리오.

---

## Part 3: 무엇을 (범위/기능)

**Q: 핵심 기능을 딱 한 문장으로 말한다면?**

A: 도메인별 서비스 분리 — api 내부를 비즈니스 도메인 단위(BD, Discovery, Work, KG 등)로 쪼개기. 패키지 독립 배포 + API 게이트웨이 도입 + DB 스키마 분리.

**Q: Out-of-scope은?**

A: PRD에서 결정.

---

## Part 4: 어떻게 판단할 것인가 (성공 기준)

**Q: 이게 성공했다는 걸 어떻게 알 수 있을까요?**

A: (1) 각 도메인 서비스가 독립 배포 가능 (2) 팀별 독립 개발 가능 (충돌 없이 작업)

---

## Part 5: 제약과 리소스

**Q: 시간, 예산, 기술 스택 등에서 알아야 할 제약 조건이 있나요?**

A:
- Cloudflare 기반 + 필요시 다른 클라우드 혼합 가능
- 일정: 1~2주 단기 (Walking Skeleton 수준)

---

## 사전 진단 결과 (인터뷰 전 수행)

| 영역 | 상태 | 비고 |
|------|------|------|
| 패키지 간 import | 건강 | 금지방향 0건 |
| shared 비대화 | 양호 | 24파일 ~3.7K줄 타입 중심 |
| D1 커플링 | 격리됨 | D1LikeDatabase 인터페이스만 shared |
| 빌드 순서 | 정상 | Turbo topological 의존성 정확 |
| 배포 격리 | 부분적 | api/web 독립 가능, shared 변경 시 전체 리빌드 |

### API 도메인 구조 (진단)

| 도메인 | 위치 | Routes | Services | 주요 D1 테이블 |
|--------|------|--------|----------|---------------|
| Discovery | core/discovery | 12 | 18 | biz_items, discovery_* |
| Shaping | core/shaping | 14 | 23 | ax_bmcs, persona_*, viability_* |
| Offering | core/offering | 12 | 23 | offerings, business_plans, prd_* |
| Agent | core/agent | 13 | 65+ | agents, skill_*, execution_events |
| Harness | core/harness | 22 | 54+ | prototype_*, ogd_*, kg_* |
| Collection | core/collection | 5 | 5 | ax_ideas, ir_proposals |
| Auth | modules/auth | 5 | - | users, organizations |
| Portal | modules/portal | 17 | - | wikis, kpi_*, notifications |
| Gate | modules/gate | 7 | - | evaluations, decisions |
| Launch | modules/launch | 8 | - | pipeline_stages, poc_* |
