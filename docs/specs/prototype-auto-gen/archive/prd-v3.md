# PRD → Prototype 자동 생성 & 배포

**버전:** v3
**날짜:** 2026-04-05
**문서 ID:** FX-PLAN-PROTO-001
**작성자:** AX BD팀
**상태:** 🔄 검토 중
**검토 라운드:** Round 2 완료 (69점), Six Hats 토론 완료

---

## 1. 요약 (Executive Summary)

**한 줄 정의:**
AX BD팀이 작성한 PRD를 입력하면, AI 에이전트가 인터랙티브 데모 Prototype을 자동 생성하고 Cloudflare Pages에 배포하는 파이프라인.

**배경:**
Foundry-X는 발굴(Discovery)→PRD 자동 생성→멀티 AI 리뷰까지의 파이프라인 상류는 완성했으나, **PRD→Prototype 구간이 완전히 비어 있음**. 현재 BD팀이 사업 아이템을 시각적으로 검증하려면 개발팀에 직접 의뢰해야 하며, 이에 평균 2~4주가 소요됨.

**목표:**
PRD 입력 후 10분 이내에 배포 가능한 인터랙티브 Prototype을 자동 생성하여, 사업 아이디어 검증 주기를 **4주 → 10분**으로 단축.

---

## 2. 문제 정의

### 2.1 현재 상태 (As-Is)
- PRD까지의 파이프라인은 자동화 완료 (11개 ai-biz 서브스킬, 멀티 AI 리뷰)
- PRD → Prototype 구간에 **코드 생성 엔진, 빌드/배포 자동화, 품질 루프** 모두 부재
- BD팀이 Prototype을 만들려면 개발팀 의뢰 필요 → **2~4주 지연**
- 사업 기회 발굴 건수 대비 Prototype 검증률 < 10%

### 2.2 목표 상태 (To-Be)
- PRD 완성 → "Prototype 생성" 버튼 → **10분 이내** 배포 완료
- 생성 성공률 ≥ 80%, 자동 수정 포함
- O-G-D(Orchestrator-Generator-Discriminator) 품질 루프로 PRD 정합성 보장
- 실사용자(BD팀) 피드백 → 재생성 Loop 자동화

### 2.3 시급성
- Phase 14 Agent Orchestration 완료로 오케스트레이션 인프라 확보
- BD팀 현업에서 "빠른 시각화" 요구 증가 (2026 Q1 피드백)
- 경쟁사(Vercel v0, Bolt.new 등) AI 코드 생성 서비스 급성장 — 내부 도구 미구축 시 외부 의존 심화

---

## 3. 사용자 및 이해관계자

### 3.1 주 사용자
| 구분 | 설명 | 주요 니즈 |
|------|------|-----------|
| BD팀 사업개발 담당자 | PRD 작성 후 아이디어를 시각화하고 싶은 비개발자 | 개발 의뢰 없이 빠르게 데모 확인 |
| PM/기획자 | 사업 아이템의 UX/UI를 빠르게 검증하고 싶은 기획 담당 | 이해관계자 설득용 실물 데모 |
| 팀장/의사결정자 | 사업 아이템 Go/No-Go 판단 근거 필요 | 실제 동작하는 데모로 판단 가능 |

### 3.2 이해관계자
| 구분 | 역할 | 영향도 |
|------|------|--------|
| AX BD팀 | 주 사용자 + 운영 | 높음 |
| 개발팀 (Foundry-X) | Builder Server 구축/운영 | 높음 |
| 인프라/보안 | Cloudflare 계정, 서버 보안 | 중간 |
| 경영진 | 투자 승인, 예산 | 낮음 |

### 3.3 사용 환경
- 기기: PC (Web 대시보드)
- 네트워크: 인터넷 (Cloudflare Workers + Pages)
- 기술 수준: 비개발자 (BD팀) — 코드 수정 불필요

---

## 4. 기능 범위

### 4.1 핵심 기능 (Must Have — P0)
| # | 기능 | 설명 | Phase |
|---|------|------|-------|
| 1 | PRD→코드 자동 생성 | Claude Code CLI subprocess로 PRD 기반 React SPA 생성 | A |
| 2 | 자동 빌드/배포 | `npm run build` → `wrangler pages deploy` 파이프라인 | A |
| 3 | 프로젝트 템플릿 | React 18 + Vite + TailwindCSS + shadcn/ui 기본 스캐폴딩 | A |
| 4 | Job 큐 관리 | D1 기반 상태 추적 (queued→building→deploying→live→failed) | B |
| 5 | API 엔드포인트 | POST/GET/PATCH /api/prototypes | B |
| 6 | Docker 격리 실행 | 각 Job을 독립 컨테이너에서 실행하여 리소스 격리/보안 확보 | B |
| 7 | 상태 머신(State Machine) | Dead-letter queue, timeout rollback, 정교한 상태 전환 | B |
| 8 | Fallback 아키텍처 | CLI 경로 실패 시 Claude API(유료) 자동 전환 | B |

### 4.2 부가 기능 (Should Have — P1)
| # | 기능 | 설명 | Phase |
|---|------|------|-------|
| 1 | O-G-D 품질 루프 | Generator→Discriminator→재생성 피드백 루프 (max 3 rounds) | C |
| 2 | Web 대시보드 | Prototype 목록/상세/빌드 로그/iframe 프리뷰 | C |
| 3 | 실사용자 피드백 Loop | BD팀 피드백 입력 → Generator 재생성 입력에 자동 반영 | C |
| 4 | 자동 QA 체크리스트 | UI/UX, 모바일 반응형, 접근성 자동 검증 | C |
| 5 | Slack 알림 | 완료/실패 Webhook + 장애 자동 감지 알림 | C |
| 6 | SSE 실시간 로그 | 빌드 진행 중 실시간 로그 스트리밍 | C |

### 4.3 선택/고도화 (Nice to Have — P2)
| # | 기능 | 설명 | Phase |
|---|------|------|-------|
| 1 | 다중 AI 앙상블 | Claude 외 GPT-4/Gemini를 Generator 대안으로 사용 (벤더 종속 완화) | D |
| 2 | 스크린샷 자동 캡처 | Puppeteer로 완성된 Prototype 스크린샷 저장 | D |
| 3 | 프롬프트 최적화 | A/B 테스트 기반 생성 프롬프트 품질 개선 | D |
| 4 | 접근제어 | 배포된 Prototype URL에 사내 인증/토큰 기반 접근 제한 | D |

### 4.4 제외 범위 (Out of Scope)
- **실제 제품 코드 생성**: Prototype은 데모용이며, 프로덕션 코드 품질을 보장하지 않음
- **디자인 시안 기반 생성**: Figma/XD 등 디자인 도구 연동은 범위 밖 (입력은 PRD 텍스트만)
- **멀티 프레임워크 지원**: React SPA만 지원 (Vue/Angular/Flutter 등 미지원)
- **실시간 협업 편집**: 생성된 코드의 온라인 편집기/IDE 통합은 범위 밖
- **프로덕션급 CI/CD**: Builder Server의 HA(고가용성)/멀티 리전 배포는 범위 밖

### 4.5 외부 연동
| 시스템 | 연동 방식 | 필수 여부 |
|--------|-----------|-----------|
| Claude Code CLI | subprocess (Max 구독) | 필수 |
| Claude API | REST API (Fallback) | 필수 |
| Cloudflare Pages | wrangler deploy | 필수 |
| Cloudflare D1 | SQL (기존 인프라) | 필수 |
| Slack | Webhook | 선택 |

---

## 5. 성공 기준

### 5.1 정량 지표 (KPI)
| 지표 | 현재값 | 목표값 | 측정 방법 |
|------|--------|--------|-----------|
| Prototype 생성 성공률 | 0% (미구현) | ≥ 80% | 빌드 성공 + 배포 완료 비율 |
| 평균 생성 시간 | N/A | ≤ 10분 | queued → live 소요 시간 |
| 빌드 자동 수정률 | N/A | ≥ 60% | 1차 실패 후 자동 수정 성공률 |
| 실사용자 피드백 반영률 | N/A | ≥ 80% | 피드백 → 재생성 Loop 반영 비율 |
| QA 자동화 적용률 | N/A | ≥ 70% | UI/UX+모바일+접근성 자동검증 통과율 |
| 월간 API 비용 | N/A | $0 (구독 내) | 별도 API 토큰 비용 없음 |
| 장애 자동감지/복구율 | N/A | ≥ 90% | 장애 → 알림/자동 복구 비율 |

### 5.2 MVP 최소 기준
- [ ] 단일 PRD 입력 → React SPA Prototype 생성 → Cloudflare Pages 배포 → URL 반환 (E2E)
- [ ] 생성 성공률 ≥ 80% (5종 이상 PRD 테스트)
- [ ] 평균 생성 시간 ≤ 15분
- [ ] Docker 기반 Job 격리 실행
- [ ] CLI 경로 실패 시 API Fallback 자동 전환
- [ ] 실사용자(BD팀) 1명 이상 실 사용 및 피드백

### 5.3 실패/중단 조건
- Anthropic이 Claude Code CLI의 서버 자동화 사용을 **공식 금지**하고, API Fallback 비용이 월 $500을 초과하는 경우
- 5종 다양한 PRD 테스트에서 생성 성공률 < 50%인 경우
- Builder Server 48시간 연속 운영 안정성 테스트 실패 (장애 3건 이상)

---

## 6. 제약 조건

### 6.1 일정
- **Phase A** (Foundation): 2주 — 템플릿 + Builder Server 스캐폴딩 + CLI 검증
- **Phase B** (Core Pipeline): 2주 — D1 마이그레이션 + API + Executor + Docker 격리 + Fallback
- **Phase C** (Web 통합 + 품질): 2주 — 대시보드 + O-G-D 루프 + 피드백 Loop + QA
- **Phase D** (고도화): 선택적 — 다중 AI 앙상블 + 프롬프트 최적화 + 접근제어

### 6.2 기술 스택
- **Builder Server**: Node.js 20, TypeScript, Docker
- **Generator**: Claude Code CLI (Max 구독) / Claude API (Fallback)
- **Prototype 템플릿**: React 18 + Vite 6 + TailwindCSS 3 + shadcn/ui
- **인프라**: Cloudflare Workers (API) + Pages (배포) + D1 (DB)
- **기존 시스템**: Foundry-X API (Hono), Web (React Router 7)

### 6.3 인력/예산
| Phase | 필요 인력 | 역할 |
|-------|-----------|------|
| A | 개발 1명 | Builder Server 구축, 템플릿 준비 |
| B | 개발 1명 + DevOps 0.5명 | API/Executor 구현, Docker 격리 |
| C | 개발 1명 + PM 0.5명 | Web 대시보드, 피드백 Loop 설계 |
| D | 개발 0.5명 + AI 0.5명 | 앙상블, 프롬프트 최적화 |

| 비용 항목 | 금액 | 비고 |
|-----------|------|------|
| Claude Max 구독 | ~$100/월 (기존) | 추가 과금 없음 |
| Builder Server (VPS) | ~$20~50/월 | 8GB RAM, 50GB SSD |
| Cloudflare Pages | 무료 (500 deploys/월) | 프로젝트당 무료 |
| API Fallback 예산 | ~$50~100/월 (비상) | CLI 장애 시에만 발생 |

### 6.4 보안/컴플라이언스
- Builder Server에 로그인된 Claude/Cloudflare 계정 → **최소 권한 원칙** + 계정 격리
- 생성된 Prototype에 **개인정보/민감정보 자동 탐지·차단** (PII Detection)
- Cloudflare Pages 배포 → 기본 public, Phase D에서 접근제어 추가
- Docker 컨테이너 격리로 파일/프로세스 충돌 방지

---

## 7. 아키텍처 설계

### 7.1 핵심 설계 원칙

**"구독 계정 기반, API 과금 ZERO + 다중 Fallback"** — Claude Code CLI를 Max 구독 계정으로 서버 백단에서 실행하되, CLI 경로 실패 시 Claude API 또는 다중 AI(GPT-4/Gemini)로 자동 전환.

```
┌──────────────────────────────────────────────────────────┐
│                    Foundry-X Web/API                      │
│                                                          │
│  PRD 완성 ──→ PrototypeJobService ──→ Queue (D1)        │
│                                                          │
└──────────────────────┬───────────────────────────────────┘
                       │ Webhook / Polling
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Prototype Builder Server (Linux)             │
│                                                          │
│  JobPoller ──→ PRD 파싱 ──→ Docker Container 생성         │
│                    │                                      │
│                    ▼                                      │
│  ┌─────────────────────────────────────────┐             │
│  │  Docker Container (격리 실행)             │             │
│  │                                          │             │
│  │  1. PRD → 기능 체크리스트 전처리          │             │
│  │  2. Claude Code CLI 실행 (Primary)       │             │
│  │     └─ 실패 시 → Claude API (Fallback)   │             │
│  │  3. O-G-D Loop (max 3 rounds)            │             │
│  │  4. 빌드 검증 (vite build)               │             │
│  │  5. 자동 수정 (lint/typecheck fix)        │             │
│  │  6. 최종 빌드 산출물 → dist/             │             │
│  └─────────────────────────────────────────┘             │
│                    │                                      │
│                    ▼                                      │
│  wrangler pages deploy dist/ ──→ Cloudflare Pages        │
│                    │                                      │
│  결과 URL ──→ API Callback ──→ Slack 알림                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Fallback 아키텍처 (Six Hats Green Hat 제안 반영)

벤더 종속성 완화를 위한 3단계 Fallback:

```
Primary:   Claude Code CLI (Max 구독, $0)
    │ 실패 (rate limit / 정책 변경 / 장애)
    ▼
Fallback 1: Claude API (Sonnet, ~$2-5/건)
    │ 실패
    ▼
Fallback 2: 다중 AI 앙상블 (GPT-4 / Gemini Code, ~$3-8/건) [Phase D]
```

### 7.3 상태 머신 (State Machine)

```
queued ──→ building ──→ deploying ──→ live
  │           │            │
  │           ▼            ▼
  │        failed      deploy_failed
  │           │            │
  └───────────┴────────────┘
              ▼
         dead_letter (timeout 후 자동 이동)
              ▼
         manual_review (운영자 개입)
```

### 7.4 실사용자 피드백 Loop

```
BD팀 ──→ Prototype 확인 ──→ 피드백 입력 (Web UI)
                                │
                                ▼
                         feedback.md 생성
                                │
                                ▼
                    Generator 재생성 (feedback 포함)
                                │
                                ▼
                       Prototype v2 배포 ──→ BD팀 재확인
```

---

## 8. Dry-Run 테스트 결과 (2026-04-05 실행)

### 8.1 테스트 환경

| 항목 | 값 |
|------|-----|
| Claude Code CLI | v2.1.87 |
| Node.js | v22.22.0 |
| 실행 환경 | Linux sandbox (Cowork 세션) |
| PRD | 손해사정 AI 의사결정 지원 시스템 (4개 기능) |
| 산출물 형식 | 단일 HTML (TailwindCSS + Chart.js CDN) |

### 8.2 O-G-D 루프 실행 기록

| Round | 역할 | 시간 | 품질 점수 | 주요 결과 |
|-------|------|------|-----------|-----------|
| R0 Generator | Haiku, 5턴 | 90초 | - | 대시보드 탭만 (나머지 플레이스홀더) |
| R0 Discriminator | Haiku, 3턴 | 60초 | 0.45 | Critical 4 + Major 2 + Minor 2 |
| R1 Generator | Haiku, 8턴 | 180초 | - | 4탭 전체 구현 (793줄) |
| R1 Discriminator | Haiku, 5턴 | 60초 | ~0.72 | Critical 0 + Major 3 + Minor 6 |

### 8.3 검증된 것

| 항목 | 결과 |
|------|------|
| `--print --dangerously-skip-permissions` 동작 | ✅ 정상 |
| 구독 인증 기반 CLI 실행 | ✅ 별도 API 키 없이 동작 |
| O-G-D 루프 시뮬레이션 | ✅ 피드백 루프 동작 확인 |
| Haiku 모델 충분성 | ✅ 코드 생성 품질 양호 |
| 전체 소요 시간 | ~10.5분 (목표 근접) |

### 8.4 계획 수정 사항

| 항목 | 발견 | 수정안 |
|------|------|--------|
| 파일 수정 vs 재생성 | Edit 타임아웃 발생 | 항상 새 파일로 전체 재생성 |
| max-turns | 5턴 부족, 8턴 적정 | 기본 15턴, 복잡한 PRD는 20 |
| 모델 선택 | Haiku 충분 | Generator: Haiku, 최종 Round만 Sonnet |
| PRD 정합성 | 세부 항목 누락 | PRD → 기능 체크리스트 전처리 추가 |

---

## 9. 리스크 및 완화

| # | 리스크 | 영향 | 완화 방안 |
|---|--------|------|-----------|
| R1 | **Anthropic CLI 정책 변경** — 서버 자동화 금지 | 🔴 전체 중단 | 3단계 Fallback (API→앙상블), 정책 모니터링, 예산 확보 |
| R2 | **Rate Limit** — Max 구독 일일 제한 초과 | 🟡 생성 지연 | 큐 순차 처리, 야간 배치, Fallback API 전환 |
| R3 | **생성 품질 편차** — PRD 복잡도에 따른 품질 차이 | 🟡 품질 저하 | O-G-D 루프, 기능 체크리스트 전처리, 다양한 PRD Dry-run |
| R4 | **Builder Server 장애** — 단일 서버 SPOF | 🟡 서비스 중단 | 헬스체크 + 자동 재시작, Active-Standby (Phase D) |
| R5 | **보안/민감정보 노출** — Prototype에 PII 포함 | 🔴 보안 사고 | PII Detection 자동 스캔, Docker 격리, 접근제어 |
| R6 | **PRD 전처리 실패** — 체크리스트 추출 오류 | 🟡 생성 실패 | 수동 fallback, 운영자 알림, PRD 표준 가이드 |
| R7 | **Polling 상태 불일치** — Job이 영구 building 상태 | 🟡 큐 블로킹 | State Machine + timeout rollback + dead-letter queue |

---

## 10. 오픈 이슈

| # | 이슈 | 담당 | 마감 | 상태 |
|---|------|------|------|------|
| 1 | Anthropic CLI 서버 자동화 공식 허용 여부 확인 | BD팀 | Phase A 착수 전 | ⏳ 미확인 |
| 2 | Max 구독 Rate Limit 공식 문서화 확인 | BD팀 | Phase A 착수 전 | ⏳ 미확인 |
| 3 | `--dangerously-skip-permissions` 장기 지원 여부 | BD팀 | Phase A 착수 전 | ⏳ 미확인 |
| 4 | 생성 코드 IP/라이선스 (kt ds 내부 사용) | BD팀/법무 | Phase B 전 | ⏳ 미확인 |
| 5 | Builder Server 호스팅 환경 결정 | 인프라팀 | Phase A | ⏳ 미결정 |
| 6 | Cloudflare Pages 프로젝트 자동 생성 API 권한 | DevOps | Phase B 전 | ⏳ 미확인 |

---

## 11. 검토 이력

| 라운드 | 날짜 | 주요 변경사항 | 스코어 |
|--------|------|--------------|--------|
| v1 초안 | 2026-04-05 | 현황 분석 + 아키텍처 + Dry-Run 결과 | - |
| Round 1 | 2026-04-05 | 3AI 검토: 실사용자 Loop, 보안, Fallback 부재 지적 | 63점 |
| v2 | 2026-04-05 | 15건 반영: GAP 12개로 확장, 리스크 21개, 성공지표 9개 | - |
| Round 2 | 2026-04-05 | 3AI 재검토: 커버리지/운영 설계 개선, Conditional 유지 | 69점 |
| Six Hats | 2026-04-05 | 20턴 토론: 다중 AI 앙상블, Docker 격리 P0 격상, 피드백 Loop MVP 포함 합의 | Conditional |
| v3 | 2026-04-05 | 표준 PRD 템플릿 재구성 + Six Hats 합의 반영 | - |

---

## 부록 A: CLAUDE.md 템플릿 (Prototype 프로젝트용)

```markdown
# Prototype Project — {projectName}

## 목적
이 프로젝트는 Foundry-X에서 자동 생성된 사업 아이템 데모 Prototype입니다.
PRD.md 파일에 정의된 사업 아이템을 시각적으로 보여주는 인터랙티브 데모를 만드세요.

## 기술 스택 (변경 금지)
- React 18 + TypeScript
- Vite 6
- TailwindCSS 3 + shadcn/ui
- React Router 7

## 디자인 가이드
- kt ds 브랜드 컬러: #E4002B (주), #1A1A1A (보조)
- 폰트: Pretendard
- 모바일 반응형 필수 (breakpoint: 768px)
- 다크모드 불필요

## 생성 규칙
1. PRD.md를 먼저 읽고 핵심 기능/화면을 파악하세요
2. 3~5개 주요 페이지를 구성하세요
3. 목업 데이터는 현실적으로 (한국어, 실제 업무 시나리오)
4. 모든 코드는 src/ 하위에 작성
5. 완성 후 반드시 `npm run build` 실행하여 빌드 성공 확인
6. 빌드 실패 시 에러를 읽고 수정 후 재빌드

## 빌드 명령
npm install && npm run build
```

## 부록 B: 기존 로드맵과의 정합

| 기존 계획 | 본 문서 제안 | 변경 사항 |
|-----------|-------------|-----------|
| F278: Sprint 104 | Phase A~D (4~6주) | Dry-Run 실측 기반 현실적 일정 |
| O-G-D 루프: Sprint 109~110 | Phase C (3~4주차) | Foundation 완료 후 품질 루프 |
| 단순 HTML | React SPA + Cloudflare Pages | 템플릿 기반 완성도 향상 |

## 부록 C: O-G-D 실전 적용 설계

```
┌─── Orchestrator (Node.js) ──────────────────────────────┐
│                                                          │
│  1. PRD 수신                                              │
│  2. PRD → 기능 체크리스트 변환 (전처리)                    │
│  3. CLAUDE.md + checklist.md + PRD.md → Docker Container  │
│                                                          │
│  ┌─── Round Loop (max 3) ─────────────────────────────┐  │
│  │                                                     │  │
│  │  Generator (claude --print, Haiku/Sonnet):          │  │
│  │    - Round 0: 전체 생성 (max-turns 15)              │  │
│  │    - Round N: 새 파일로 전체 재생성 (Edit 금지)      │  │
│  │                                                     │  │
│  │  Discriminator (claude --print, Haiku):              │  │
│  │    - 체크리스트 항목별 Pass/Fail 판정               │  │
│  │                                                     │  │
│  │  수렴: PASS(≥0.85)→탈출, MAJOR→재생성, ≥3R→최고채택 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  4. 최종 산출물 → 빌드 검증 → QA 자동 체크 → 배포        │
└──────────────────────────────────────────────────────────┘
```

---

*이 문서는 requirements-interview 스킬에 의해 자동 생성 및 관리됩니다.*
