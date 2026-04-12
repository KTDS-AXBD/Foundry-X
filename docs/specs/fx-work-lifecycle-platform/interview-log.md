# Interview Log — fx-work-lifecycle-platform

**날짜:** 2026-04-12
**인터뷰어:** Claude (Opus 4.6)
**응답자:** Sinclair Seo

---

## Part 1: 왜 (목적/문제)

**배경 (S268 세션 피드백에서 도출)**

사용자가 프로덕션 /work-management 대시보드를 점검하면서 4가지 핵심 불만을 토로:

1. Roadmap이 과거 히스토리만 보여주고 미래 계획이 없음
2. Backlog가 비어있음 — 어떻게 등록하는지 모르겠음, 인입 경로가 CLI뿐
3. Changelog가 마크다운 raw 텍스트로 노출되고, 요구사항→Task→반영의 연결 맥락이 없음
4. 작업 분류 탭의 사용법을 모르겠음

→ **근본 문제**: Backlog→REQ→Task→Sprint→PR→Deploy 전 과정이 단절됨. 각 단계가 독립적으로 존재하여 "이 변경이 왜 일어났는지" 추적 불가.

**추가 요청**: "이게 바로 BackLog야. 누가/언제/무엇을/어떻게 형태로 남기고, 작업 라이프사이클에 따라 추적이 될 수 있도록 해야 해."

---

## Part 2: 누구를 위해

**Q: 주요 사용자는?**
**A: 외부 이해관계자 포함**

- 1차: 개발자(Sinclair, 1인 개발 모드)
- 2차: BD팀(3~5인, 향후 확장)
- 3차: 외부 이해관계자(고객/PM) — Roadmap/Changelog 조회

→ 공개 뷰(Roadmap, Changelog)와 내부 뷰(Backlog 관리, 분류) 분리 필요

---

## Part 3: 무엇을 (범위/기능)

**Q: 인입 채널은?**
**A: 웹 + CLI + Marker.io — 3채널 통합**

- 웹: 기존 '작업 분류' 탭을 확장하여 분류 후 바로 등록까지 연결
- CLI: 기존 task-start.sh 경로 유지
- Marker.io: 이미 설치된 피드백 위젯에서 들어온 피드백을 자동 수집하여 Backlog로 전환

**Q: AI 자동화 수준은?**
**A: AI 완전 자동 + 알림**

- AI가 자동으로 REQ 등록까지 완료하고 사용자에게 알림
- 분류(Track/Priority) + 중복 검사 + REQ 초안 생성을 AI가 수행

**Q: Ontology 범위는?**
**A: 메타데이터 연결만 (초기)**

- REQ↔F-item↔Sprint↔PR을 ID 기반으로 연결
- 기존 SPEC.md 파싱 + GitHub API로 구현 가능
- KG 시각화(그래프 탐색)는 후속 단계

---

## Part 4: 어떻게 판단할 것인가

**Q: 성공 기준은?**
**A: Backlog→Deploy 전 과정 추적 가능**

- 하나의 아이디어가 등록→분류→Sprint→PR→배포까지 웹에서 역추적 가능하면 성공
- Changelog에서 특정 변경을 클릭하면 원본 REQ, 관련 Sprint, PR 링크를 볼 수 있어야 함

---

## Part 5: 제약과 리소스

**Q: 마일스톤 구성은?**
**A: 3 Sprint, Ontology 포함**

- M1 (Sprint 267): Backlog 인입 파이프라인 — 웹/CLI/Marker.io 3채널 → AI 자동 분류+등록+알림
- M2 (Sprint 268): 메타데이터 트레이서빌리티 — REQ↔F↔Sprint↔PR 연결 + Changelog 구조화
- M3 (Sprint 269): Ontology 기반 — KG 스키마 정의 + 연결 데이터 D1 저장 + 탐색 뷰

기술 스택: 기존 Foundry-X 모노리포 (Hono API + React Web + D1)
인력: AI Agent 1 + 개발자 1 (혼자 개발 모드)
