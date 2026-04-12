# Work Lifecycle Platform PRD

**버전:** v1
**날짜:** 2026-04-12
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**코드네임:** fx-work-lifecycle-platform
**SPEC 항목:** C46, C47, C48 통합 → F-item 승격 대상

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
Foundry-X의 작업 라이프사이클(Idea→Backlog→REQ→Task→Sprint→PR→Deploy→Changelog) 전 과정을 웹에서 추적 가능하게 만드는 통합 플랫폼.

**배경:**
현재 Foundry-X는 SPEC.md(SSOT) + CLI(task-start.sh) + GitHub(Issues/PRs) + CHANGELOG.md로 작업을 관리하지만, 각 시스템이 단절되어 있어 "이 변경이 왜 일어났는지" 역추적이 불가능하다. 웹 대시보드(/work-management)는 읽기 전용 관찰 도구에 머물러 있고, Backlog 인입 경로가 CLI 뿐이라 비개발자는 작업을 제출할 수 없다.

**목표:**
- 웹/CLI/Marker.io 3채널에서 Backlog 인입 → AI 자동 분류·등록·알림
- Changelog의 각 항목에서 원본 요구사항(REQ)→Task→PR→배포까지 역추적 가능
- 작업 라이프사이클 전체를 메타데이터 그래프로 연결하여 "이 기능은 왜, 언제, 어떻게 만들어졌는가"에 답할 수 있는 기반 구축

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- **Backlog 인입**: CLI `task-start.sh`만 가능. 웹 '작업 분류' 탭은 분류만 하고 등록 안 됨. Marker.io 피드백은 수동 수집
- **추적 단절**: SPEC.md F-item → Sprint → PR은 사람이 수동으로 연결. PR body에 F번호를 적지만, 역방향 조회(REQ→어떤 PR에서 구현?)는 불가
- **Changelog 맥락 부재**: `## [Phase 32]` 하위에 `- F501: GitHub Projects Board` 나열이지만, F501이 어떤 REQ에서 왔고 어떤 Sprint/PR로 구현됐는지 연결 없음
- **외부 접근 불가**: BD팀/고객이 진행 상황을 보려면 개발자에게 물어봐야 함

### 2.2 목표 상태 (To-Be)
- **3채널 통합 인입**: 웹 폼 / CLI / Marker.io → 단일 Backlog 큐로 수렴
- **AI 완전 자동**: Backlog 제출 → AI가 Track(F/B/C/X) + Priority(P0~P3) 분류 + 중복 검사 + REQ 자동 생성 + 사용자 알림
- **End-to-end 트레이서빌리티**: REQ ↔ F-item ↔ Sprint ↔ PR ↔ Commit ↔ Changelog 양방향 연결
- **공개 뷰**: Roadmap/Changelog를 비개발자도 조회 가능 (내부 관리 뷰와 분리)

### 2.3 시급성
- Phase 36 완료 후 자연스러운 다음 단계 — 기존 인프라(SPEC.md 파서, GitHub API, task-start.sh, Marker.io)가 모두 갖춰져 있어 연결만 하면 됨
- BD팀 확장 시 웹 기반 협업이 필수 — CLI 의존도를 줄여야 비개발자 참여 가능

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| 개발자 (Sinclair) | 1인 개발+관리. CLI와 웹 병행 | Backlog→Deploy 전 과정 자동화, 수동 SPEC 편집 감소 |
| BD팀원 (3~5인) | 사업개발 담당, 비개발자 포함 | 웹에서 아이디어 제출, 진행 상황 조회, Changelog 확인 |
| 외부 이해관계자 (고객/PM) | 프로젝트 스폰서, 의사결정자 | Roadmap 조회, 변경 이력 확인 (공개 뷰) |

### 3.2 사용 환경
- 기기: PC (주), 모바일 (조회 전용)
- 네트워크: 인터넷 (fx.minu.best)
- 기술 수준: 혼합 (개발자 + 비개발자)

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have)

**M1: Backlog 인입 파이프라인 (Sprint 267)**

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M1-1 | 웹 Backlog 제출 폼 | /work-management에 "아이디어 제출" UI. 제목+설명+카테고리 입력 → API POST | P0 |
| M1-2 | AI 자동 분류+등록 | POST /api/work/submit → Claude Sonnet이 Track/Priority/중복검사 수행 → SPEC.md Backlog 테이블에 자동 행 추가 + GitHub Issue 생성 | P0 |
| M1-3 | Marker.io 피드백 수집 | Marker.io webhook → Backlog 자동 등록 (기존 feedback-dashboard 연동) | P0 |
| M1-4 | CLI 경로 유지 | task-start.sh 기존 동작 보존 + 웹 API와 동일한 백엔드 경유 | P1 |
| M1-5 | 알림 시스템 | Backlog 등록/REQ 전환 시 GitHub Issue comment + 웹 대시보드 뱃지 | P1 |

**M2: 메타데이터 트레이서빌리티 (Sprint 268)**

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M2-1 | REQ↔F-item↔Sprint 연결 | SPEC.md 파싱으로 REQ→F-item→Sprint 매핑 데이터 구조화 (D1 테이블) | P0 |
| M2-2 | Sprint↔PR↔Commit 연결 | GitHub API에서 PR body의 F번호, branch명의 sprint 번호를 파싱하여 연결 | P0 |
| M2-3 | Changelog 구조화 | Changelog 항목에 REQ/F-item/PR 메타데이터 자동 태깅. 클릭 시 연관 항목 조회 | P0 |
| M2-4 | 트레이서빌리티 뷰 | /work-management에 "추적" 탭 — 특정 REQ 선택 시 F-item→Sprint→PR→Changelog까지 체인 시각화 | P1 |

**M3: Ontology 기반 연결 (Sprint 269)**

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M3-1 | Work 도메인 KG 스키마 | 노드(Idea/Backlog/REQ/F-item/Sprint/Phase/PR/Commit/Deploy/Changelog) + 엣지(derives_from/implements/belongs_to/deploys_to) 정의 | P0 |
| M3-2 | KG 데이터 D1 저장 | kg_nodes + kg_edges 테이블. SPEC.md 파싱 + GitHub API → 자동 노드/엣지 생성 | P0 |
| M3-3 | KG 쿼리 API | GET /api/work/trace?id=FX-REQ-535 → 연결된 노드 체인 반환 | P1 |
| M3-4 | 공개 Roadmap/Changelog 뷰 | 인증 불필요한 공개 URL. Roadmap(미래 계획 포함) + Changelog(트레이서빌리티 링크 포함) | P1 |

### 4.2 부가 기능 (Should Have)
| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| 1 | KG 그래프 탐색 UI | 기존 `packages/web/src/components/feature/kg/` 컴포넌트 재활용한 인터랙티브 그래프 뷰 | P2 |
| 2 | Backlog 투표 | BD팀원이 Backlog 항목에 +1 투표 → Priority 자동 조정 | P2 |
| 3 | Sprint 자동 배정 AI | Backlog에서 REQ 전환 시 AI가 적절한 Sprint에 자동 배정 제안 | P2 |

### 4.3 제외 범위 (Out of Scope)
- **Jira/Linear 연동**: 외부 프로젝트 관리 도구와의 양방향 동기화는 하지 않음 (SPEC.md가 SSOT 유지)
- **실시간 협업**: Google Docs 수준의 동시 편집은 하지 않음
- **RBAC 세분화**: admin/user 2단계 이상의 세밀한 권한 구분은 M3 이후
- **모바일 네이티브 앱**: 웹 반응형으로 대체

### 4.4 외부 연동
| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| GitHub Issues/PRs | REST API (gh CLI, Octokit) | 필수 |
| SPEC.md (GitHub raw) | HTTP fetch | 필수 |
| Marker.io | Webhook (기존 설정 활용) | 필수 |
| Claude Sonnet API | Anthropic API (기존 classify 확장) | 필수 |
| Cloudflare D1 | SQL (기존 인프라) | 필수 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)
| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| Backlog 인입 채널 수 | 1 (CLI) | 3 (웹+CLI+Marker.io) | 채널별 등록 건수 |
| REQ 역추적 가능 비율 | 0% | 90%+ | 임의 REQ 5건 샘플링 → PR/Changelog까지 연결 확인 |
| 수동 SPEC.md 편집 빈도 | 매 작업 | F-item 등록만 | session-end에서 자동 처리 비율 |
| Changelog→REQ 클릭 연결 | 0건 | 전체 항목 | Changelog 렌더링에 REQ 링크 포함 여부 |

### 5.2 MVP 최소 기준
- [ ] 웹에서 아이디어 제출 → AI 분류 → SPEC.md Backlog 자동 등록
- [ ] Changelog 항목에서 REQ/F-item/PR 메타데이터 표시
- [ ] 특정 REQ 입력 시 관련 F-item→Sprint→PR 체인 조회 가능

### 5.3 실패/중단 조건
- AI 자동 분류 정확도가 60% 미만 (현재 classify regex fallback = ~70%)
- D1 스키마가 기존 테이블과 충돌하여 migration 롤백 필요
- 3 Sprint 초과 시 Walking Skeleton으로 범위 축소

---

## 6. 제약 조건

### 6.1 일정
- M1: Sprint 267 (~1~2일)
- M2: Sprint 268 (~1~2일)
- M3: Sprint 269 (~1~2일)
- 전체: ~1주

### 6.2 기술 스택
- 프론트엔드: React 18 + Vite 8 + React Router 7 (기존)
- 백엔드: Hono + Cloudflare Workers + D1 (기존)
- AI: Claude Sonnet 4.6 (Anthropic API, 기존 classify 확장)
- 인프라: Cloudflare Pages + Workers (기존 CI/CD 활용)

### 6.3 인력/예산
- 투입: AI Agent 1 + 개발자 1 (혼자 개발 모드)
- API 비용: Claude Sonnet 호출 ~$0.01/건, 월 예상 <$5

### 6.4 아키텍처 원칙
- **"Git이 진실, Foundry-X는 렌즈"** 유지 — SPEC.md가 SSOT, D1은 캐시/인덱스
- **기존 파서 재활용**: parseFItems, parseBacklogItems, fetchGithubData 확장
- **TDD**: 새 API 엔드포인트는 Red→Green 사이클 필수

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Marker.io webhook payload 구조 확인 필요 (현재 feedback-dashboard에서 처리 중이지만 Backlog 연결은 미구현) | AI | M1 착수 시 |
| 2 | SPEC.md Backlog 테이블에 AI가 직접 행을 추가할 때 git commit+push 필요 — Workers에서 GitHub API로 file update 가능한지 PoC | AI | M1 착수 시 |
| 3 | 공개 Roadmap/Changelog 뷰의 인증 면제 범위 — 현재 모든 /work-management 하위가 인증 필수 | AI | M3 착수 시 |
| 4 | KG 스키마의 엣지 방향성 — "F509 implements FX-REQ-526" vs "FX-REQ-526 implemented_by F509" 정규화 | AI | M3 착수 시 |

---

## 8. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 최초 작성 (인터뷰 기반) | - |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
