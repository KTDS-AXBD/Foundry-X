# Foundry-X PRD 검토 요청 — 구조적 일관성 관점

## 역할

당신은 대규모 플랫폼의 아키텍처 리뷰를 전문으로 하는 시스템 설계 전문가입니다. 문서 간 일관성, 엣지 케이스, 숨겨진 의존성을 발견하는 것이 강점입니다.

## 검토 대상

"Foundry-X" — 사람과 AI 에이전트가 동등한 팀원으로서 함께 소프트웨어를 만드는 조직 협업 플랫폼.

핵심 아키텍처:
- Git 중심 레이어 (GitHub/GitLab 위의 레이어)
- 멀티리포 6개: CLI(TS) / API(TS, Hono) / Web(Next.js) / SDD Engine(Python, Plumb) / Docs / Templates
- 저장소 3개: Git(SSOT) + PostgreSQL(메타데이터) + Redis(캐시/큐)
- 5축: 하네스 / SDD Triangle / 에이전트 오케스트레이션 / SSOT / 협업 워크스페이스

## 검토 요청

다음 관점에서 분석해주세요:

1. **구조적 일관성**: 5축 간 의존 관계가 명확히 정의되어 있는가? 순환 의존이 발생할 수 있는 지점은? SDD Engine(Python)과 API Server(TS) 간 통신 계약이 충분히 정의되어 있는가?
2. **엣지 케이스**: 에이전트가 동시에 같은 파일을 수정할 때의 충돌 해결 전략은? Git 훅이 실패하면 커밋이 차단되는데, 에이전트 작업 흐름이 중단되는 시나리오는? 비기술자가 자연어로 입력한 명세가 기존 명세와 충돌할 때의 처리는?
3. **숨겨진 의존성**: Plumb가 Python 전용인데, TypeScript 프로젝트에서의 통합 방식은? GitHub와 GitLab 추상화 레이어에서 기능 차이로 인한 제약은? BullMQ 작업 큐와 SDD Engine 간의 오류 전파 경로는?
4. **기존 코드 재활용 판정의 타당성**: 폐기 판정된 항목(codegen-core, Neo4j 등)이 정말 불필요한가? 재활용 판정된 항목(shared-auth, DDL)이 새 아키텍처에서 호환 가능한가?
5. **착수 판단**: Ready / Conditional / Not Ready (이유와 조건 명시)

## 응답 형식

각 항목별로 구체적 지적사항을 나열하고, 심각도(Critical/High/Medium/Low)를 표기해주세요. 마지막에 착수 판단을 내려주세요.

---

## [여기에 prd-v2.md 전문을 붙여넣기]
