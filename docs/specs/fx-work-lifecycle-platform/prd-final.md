# Work Lifecycle Platform PRD

**버전:** v2
<!-- CHANGED: 버전 1 → 2로 증가 (검토 의견 반영) -->
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

<!-- CHANGED: To-be 상태의 기능적 연결 외에 실제 협업 효율/품질 개선, 사용자 관점 효과 명시 및 검증 루프 필요에 따라 아래 내용을 추가함 -->
**추가 목표(정성적 효과):**
- BD팀/비개발자가 개발자에게 직접 문의하지 않고도 진행 현황·변경 이력을 명확히 파악할 수 있도록 실질적 사용성 개선
- 실제 사용성/채택률(예: 웹 인입률, 기능 미사용률) 등 정성·정량적 지표 기반의 사후 검증 루프 설계

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

<!-- CHANGED: End-to-end 트레이서빌리티의 "직관성/사용자 경험"에 대한 UX 기준 요구 반영 -->
- **직관적 트레이서빌리티 UX**: 역추적/연결 뷰는 개발자/비개발자 모두가 쉽게 이해하고 활용할 수 있도록 인터랙티브, 시각적 네비게이션 및 "한 번의 클릭/검색"으로 체인 전체를 확인할 수 있어야 함

<!-- CHANGED: 실제 협업 효율 및 사용자 정성 효과, 사용성 개선 검증(예: BD팀이 개발자 도움 없이 현황 파악, 피드백 루프) 요구 반영 -->
- **협업 효율/사용성 개선 및 검증 루프**: BD팀/비개발자가 개발자에게 직접 문의하지 않고도 진행 현황·변경 이력을 명확히 파악할 수 있는지, 실제 사용성(채택률, 피드백) 기반의 개선 루프를 반드시 설계 및 운영

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
<!-- CHANGED: AI 분류 실패, GitHub API 오류 등 예외/에러 핸들링 및 fallback 플로우 요구 반영 -->
| M1-2 | AI 자동 분류+등록 | POST /api/work/submit → Claude Sonnet이 Track/Priority/중복검사 수행 → SPEC.md Backlog 테이블에 자동 행 추가 + GitHub Issue 생성. **AI 분류 실패, API 장애 등 예외 발생 시 regex fallback 및 수동 검토/등록 워크플로우(알림 포함) 구현** | P0 |
<!-- CHANGED: 동시성/충돌 리스크, PoC 결과 확인, 분산 락/중앙 큐 등 기술적 리스크 명시 -->
| M1-2a | SPEC.md 자동 업데이트 동시성 처리 | **SPEC.md 파일의 동시 수정/충돌 방지를 위해 중앙 큐 기반 업데이트 또는 임시 DB-SSOT 동기화 체계 도입 필요. PoC 결과에 따라 구현 방식 확정(불가시 수동 merge fallback)** | P0 |
| M1-3 | Marker.io 피드백 수집 | Marker.io webhook → Backlog 자동 등록 (기존 feedback-dashboard 연동) | P0 |
| M1-4 | CLI 경로 유지 | task-start.sh 기존 동작 보존 + 웹 API와 동일한 백엔드 경유 | P1 |
<!-- CHANGED: 알림/커뮤니케이션 구체화(메일/슬랙 등), 누락 방지 정책 필요 -->
| M1-5 | 알림 시스템 | Backlog 등록/REQ 전환 등 주요 이벤트 시 GitHub Issue comment, 웹 대시보드 뱃지 **및 메일/슬랙 등 외부 채널 연동(설정 가능), 알림 누락 방지 정책(재전송, 상태 표시 등) 포함** | P1 |

**M2: 메타데이터 트레이서빌리티 (Sprint 268)**

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M2-1 | REQ↔F-item↔Sprint 연결 | SPEC.md 파싱으로 REQ→F-item→Sprint 매핑 데이터 구조화 (D1 테이블) | P0 |
<!-- CHANGED: PR body 파싱 신뢰성 한계/누락시 수동 보완/옵트인(opt-in) 방식 명시 -->
| M2-2 | Sprint↔PR↔Commit 연결 | GitHub API에서 PR body의 F번호, branch명의 sprint 번호를 파싱하여 연결. **PR 생성 시 F번호 누락/오입력 등 데이터 품질 문제 예방을 위해 입력 유도/검증, 또는 수동 보완(옵트인) 워크플로우 필수** | P0 |
<!-- CHANGED: 트레이서빌리티 데이터 정합성/UX 기준, 시각적/직관적 연결, 사용성 검증 계획 수립 -->
| M2-3 | Changelog 구조화 | Changelog 항목에 REQ/F-item/PR 메타데이터 자동 태깅. **클릭 시 연관 항목 직관적/시각적으로 탐색 가능, 사용성(UX) 테스트 및 피드백 루프 내장** | P0 |
| M2-4 | 트레이서빌리티 뷰 | /work-management에 "추적" 탭 — 특정 REQ 선택 시 F-item→Sprint→PR→Changelog까지 체인 시각화 | P1 |

**M3: Ontology 기반 연결 (Sprint 269)**

| # | 기능 | 설명 | 우선순위 |
|---|------|------|----------|
| M3-1 | Work 도메인 KG 스키마 | 노드(Idea/Backlog/REQ/F-item/Sprint/Phase/PR/Commit/Deploy/Changelog) + 엣지(derives_from/implements/belongs_to/deploys_to) 정의 | P0 |
| M3-2 | KG 데이터 D1 저장 | kg_nodes + kg_edges 테이블. SPEC.md 파싱 + GitHub API → 자동 노드/엣지 생성 | P0 |
| M3-3 | KG 쿼리 API | GET /api/work/trace?id=FX-REQ-535 → 연결된 노드 체인 반환 | P1 |
<!-- CHANGED: 공개/비공개 범위 정책 구체화, RBAC/확장성 고려 명시 -->
| M3-4 | 공개 Roadmap/Changelog 뷰 | 인증 불필요한 공개 URL. Roadmap(미래 계획 포함) + Changelog(트레이서빌리티 링크 포함). **공개 범위/민감 정보 노출 정책, 향후 RBAC 확장성(관리자/내부/외부 구분) 고려** | P1 |

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
<!-- CHANGED: 실제 사용성/채택률, BD팀 현황 파악 자가 해결률, 기능 미사용률 등 사용자 관점 정성/정량 지표 추가 -->
| BD팀/비개발자 현황 자가 파악률 | 0% | 90%+ | BD팀 대상 설문/인터뷰: "현황확인 위해 개발자 문의 필요 없음" 응답률 |
| Backlog 웹 인입률 | 0% | 50%+ | 전체 Backlog 중 웹/Marker.io 경유 비율 |
| 기능 미사용률 | - | <20% | 주요 기능별 클릭/조회 집계, 미사용자 비율 측정 |

### 5.2 정성/정량적 UX 기준
<!-- CHANGED: 트레이서빌리티 연결의 UX, 사용성 평가 기준 명시 -->
- 트레이서빌리티/역추적 뷰가 "한 번의 클릭 또는 검색"으로 전체 체인을 시각적으로 즉시 탐색 가능해야 하며, BD팀/비개발자 대상 UX 테스트(파일럿 그룹 최소 1회)에서 80% 이상이 "매우 쉽다"/"직관적이다" 평가
- 실사용자(개발자/BD팀) 대상 피드백 수렴 루프를 통한 1회 이상 개선 적용

### 5.3 MVP 최소 기준
- [ ] 웹에서 아이디어 제출 → AI 분류 → SPEC.md Backlog 자동 등록(예외 시 fallback/수동 검토 포함)
- [ ] Changelog 항목에서 REQ/F-item/PR 메타데이터 표시 및 클릭 시 연결 확인
- [ ] 특정 REQ 입력 시 관련 F-item→Sprint→PR 체인 조회 가능(직관적 탐색 UI 포함)
- [ ] BD팀/비개발자가 개발자 문의 없이 진행 현황을 확인 가능(설문/인터뷰 결과로 검증)

### 5.4 실패/중단 조건
<!-- CHANGED: AI 자동 분류 정확도 목표 상향, fallback/수동 검토 플로우 명시 -->
- AI 자동 분류 정확도가 75% 미만(현재 classify regex fallback = ~70% → 목표 상향, 미달 시 수동 검토 단계로 이관, 모델 개선 루프 운영)
- D1 스키마가 기존 테이블과 충돌하여 migration 롤백 필요
- 3 Sprint 초과 시 Walking Skeleton으로 범위 축소
- SPEC.md 자동 업데이트 PoC 결과 충돌/동시성 이슈 미해결 시 자동화 범위 축소 및 수동 병합 체계로 전환

---

## 6. 제약 조건

### 6.1 일정
<!-- CHANGED: 일정 현실화, 2~3배 이상 여유 반영 및 MVP 범위 축소 정책 명시 -->
- M1: Sprint 267 (~3~5일)
- M2: Sprint 268 (~3~5일)
- M3: Sprint 269 (~3~5일)
- 전체: ~3주(기존 대비 2~3배 여유, 일정 초과 시 각 Sprint P0 핵심 기능만으로 범위 선조정, 나머지는 후속 Phase로 이관)

### 6.2 기술 스택
- 프론트엔드: React 18 + Vite 8 + React Router 7 (기존)
- 백엔드: Hono + Cloudflare Workers + D1 (기존)
- AI: Claude Sonnet 4.6 (Anthropic API, 기존 classify 확장)
- 인프라: Cloudflare Pages + Workers (기존 CI/CD 활용)

### 6.3 인력/예산
<!-- CHANGED: AI Agent 역할 명확화, AI/외부 API 장애 시 fallback/수동 대체 플랜 명시 -->
- 투입: AI Agent 1(분류/추천 등 API 호출 자동화 한정, 실제 업무 자동화는 제한적) + 개발자 1 (혼자 개발 모드, 운영/장애 대응은 주 개발자 책임)
- API 비용: Claude Sonnet 호출 ~$0.01/건, 월 예상 <$5
- AI/외부 API 장애 시: regex fallback, 수동 분류/등록 체계 병행

### 6.4 아키텍처 원칙
- **"Git이 진실, Foundry-X는 렌즈"** 유지 — SPEC.md가 SSOT, D1은 캐시/인덱스
- **기존 파서 재활용**: parseFItems, parseBacklogItems, fetchGithubData 확장
- **TDD**: 새 API 엔드포인트는 Red→Green 사이클 필수
<!-- CHANGED: 데이터 불일치/동기화 실패, 장애 대응 및 롤백 플랜, 운영/모니터링 원칙 추가 -->
- **장애/데이터 불일치 대응**: SPEC.md-GitHub-D1 간 데이터 불일치, API 장애, 파일 충돌 발생 시 자동/수동 복구 플로우(이력 추적, 알림, 관리자 승인/rollback 등) 필수
- **운영/모니터링**: 장애/에러 발생 시 알림, 로그 기반 진단, 복구/롤백 시나리오 문서화 및 사전 점검

---

## 7. 오픈 이슈

| # | 이슈 | 담당 | 마감 |
|---|------|------|------|
| 1 | Marker.io webhook payload 구조 확인 필요 (현재 feedback-dashboard에서 처리 중이지만 Backlog 연결은 미구현) | AI | M1 착수 시 |
| 2 | SPEC.md Backlog 테이블에 AI가 직접 행을 추가할 때 git commit+push 필요 — Workers에서 GitHub API로 file update 가능한지 PoC | AI | M1 착수 시 |
<!-- CHANGED: PoC 결과 확인, 동시성/충돌 처리, fallback 정책 명시 -->
| 2-1 | SPEC.md 업데이트 동시성/충돌 처리 PoC 결과에 따라 중앙 큐/락/수동 병합 등 fallback 정책 확정 필요 | AI | M1 착수 시 |
| 3 | 공개 Roadmap/Changelog 뷰의 인증 면제 범위 — 현재 모든 /work-management 하위가 인증 필수 | AI | M3 착수 시 |
<!-- CHANGED: 공개 범위 정책 구체화, 민감 정보 노출 리스크 검토 명시 -->
| 3-1 | 공개 정보의 범위 확정 및 민감 정보 노출 리스크 사전 검토, 정책 문서화 | AI | M3 착수 시 |
| 4 | KG 스키마의 엣지 방향성 — "F509 implements FX-REQ-526" vs "FX-REQ-526 implemented_by F509" 정규화 | AI | M3 착수 시 |
<!-- CHANGED: 트레이서빌리티 데이터 품질/정합성 확보 위한 옵트인 방식, 수동 검토 프로세스 포함 요구 반영 -->
| 5 | 트레이서빌리티 데이터(REQ→PR 등) 품질 확보를 위한 수동 검토/옵트인 입력/보정 플로우 설계 | AI | M2 착수 시 |
<!-- CHANGED: 사용자 피드백/QA 루프, 파일럿 테스트 기반 개선 플랜 명시 -->
| 6 | BD팀/비개발자 대상 사용성(UX) 파일럿 테스트 및 피드백 루프 설계, 개선 플랜 수립 | AI | 각 마일스톤별 |

---

## 8. 테스트/QA/릴리즈 플랜
<!-- CHANGED: 실제 QA, 롤아웃, 장애 대응, 운영 절차 명확화(신규 섹션 추가) -->
### 8.1 QA/사용성 검증
- 각 Sprint별 개발 완료 시 BD팀/비개발자 대상 파일럿 테스트 실시(주요 기능별 수행 가능성, UX 평가)
- 피드백 수집 → 기능/UX 개선 루프 1회 이상 적용
- AI 분류/연결 정확도 실측(샘플 20건 이상) 및 목표 미달 시 수동 검토/모델 개선 적용

### 8.2 롤아웃/릴리즈 전략
- 단계적 적용(AB 테스트 또는 일부 채널/사용자 한정 오픈 후 전체 확대)
- 장애 발생 시 롤백 절차(SSOT 복원, D1/캐시 초기화 등) 사전 정의 및 문서화

### 8.3 운영/모니터링
- 알림/에러 로깅, 장애 탐지(모니터링 대시보드) 운영
- 주요 장애/오류(동시성 실패, 데이터 불일치, AI API 장애 등) 발생 시 즉시 알림 및 수동/자동 복구 플로우 실행

---

## 9. 리스크 및 대응방안
<!-- CHANGED: 심각 리스크 및 대응책, 검토 의견 반영(신규 섹션) -->
| 리스크 | 설명 | 대응/완화 방안 |
|--------|------|----------------|
| 일정 과소평가 | Sprint 당 1~2일→3~5일+로 재조정, 일정 초과 시 P0 기능만 남기고 범위 축소 | 일정관리 철저, MVP 우선순위 엄격 적용 |
| SPEC.md 동시 쓰기 충돌 | GitHub API 통한 파일 수정시 병합 충돌, 다수 동시 인입 시 SSOT 품질 저하 | PoC 후 중앙 큐/락/수동 병합 등 기술적 보완, 자동화 불가시 관리자 승인 체계 |
| 트레이서빌리티 데이터 정합성 | 수동 입력(PR body 등) 누락/오입력시 전체 연결 체인 단절 | 입력 유도/검증, 수동 보완/옵트인 방식, 품질 체크 프로세스 |
| AI 분류/자동화 품질 | Claude Sonnet API 정확도/응답속도/가용성 한계, 오분류시 신뢰도 저하 | 목표 상향(75%+), fallback(regex), 수동 검토/모델 개선 루프 |
| 외부 API 장애 | Claude, GitHub, Marker.io 등 장애시 전체 파이프라인 정지 위험 | 장애 감지/알림, fallback, 수동 프로세스 명확화 |
| 공개/비공개 정보 경계 | Roadmap/Changelog 등 공개 범위 불명확, 민감 정보 유출 위험 | 정책 수립, RBAC 확장성 내장, 정보 타입별 접근 제어 |
| 운영·유지보수 부담 | 1인 개발/운영 체계에서 장애 발생 시 대응 지연 | 장애 자동 감지/알림, 매뉴얼화, 중요 장애시 외부 지원 확보 검토 |
| 데이터 일관성/동기화 실패 | API, 파일, DB 간 불일치, 충돌/복구 부재 | 자동/수동 복구 프로세스, 정기 데이터 검증 스크립트 운영 |

---

## 10. Out of Scope
<!-- CHANGED: 범위 밖 요청/기능 명확화(Out-of-scope 신규 섹션, 검토 지적사항 반영) -->
- Jira/Linear 등 외부 프로젝트 관리 도구와의 양방향 동기화
- Google Docs 등 실시간 협업(동시 편집)
- RBAC 2단계 이상 세분화(추후 M3 이후 확장)
- 모바일 네이티브 앱(웹 반응형으로 대체)
- **분산 락/중앙 큐 등 SPEC.md 파일 기반 SSOT 한계 근본적 해결(장기 과제)**
- 실시간 Slack/Discord 챗봇 연동(추후 검토)
- GitHub/DB/AI API 장애 완전 자동화 복구(운영상 수동介入 허용)

---

## 11. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| 초안 | 2026-04-12 | 최초 작성 (인터뷰 기반) | - |
<!-- CHANGED: v2 반영 이력 추가 -->
| 2차 | 2026-04-13 | AI 검토의견 반영(정성/정량 효과, 에러/롤백, 일정, 리스크 등 보완) | Conditional |

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*