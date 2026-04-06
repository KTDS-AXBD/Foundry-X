# AX BD MSA — IA 재구조화 설계서

> **문서 ID**: FX-DSGN-IA-002
> **날짜**: 2026-04-07
> **기준**: Phase 20 ax-bd-msa Plan/Design + sidebar.tsx + router.tsx 현행 분석
> **목적**: Sprint 179~188 모듈화에 따른 Web IA(Information Architecture) 변경 설계

---

## 1. 현행 IA 구조

### 1.1 사이드바 구조 (sidebar.tsx)

```
📊 대시보드
🚀 시작하기

── BD 프로세스 6단계 ──
📥 1. 수집 [TBD, 접힘]
  ├── Field 수집
  ├── IDEA Portal
  └── 스크리닝
🔍 2. 발굴
  ├── 발굴
  └── 평가 결과서
✏️ 3. 형상화
  ├── 사업기획서
  ├── Offerings
  ├── Offering Pack
  ├── PRD
  └── Prototype
✅ 4. 검증
  ├── 검증
  └── 산출물 공유
🚀 5. 제품화
  ├── 제품화
  └── Offering Pack
📈 6. GTM [TBD, 접힘]
  ├── 대고객 선제안
  └── 파이프라인

── Admin (관리자만) ──
⚙️ 관리
  ├── 토큰/모델
  ├── 워크스페이스
  ├── 에이전트
  ├── Prototype
  ├── Quality
  ├── 오케스트레이션
  ├── 아키텍처
  ├── 방법론
  ├── 프로젝트
  ├── NPS 대시보드
  └── 운영 지표

── 하단 고정 ──
📖 위키
⚙️ 설정
```

### 1.2 라우트 네임스페이스 (router.tsx, 79 파일)

| Namespace | 라우트 수 | 역할 |
|-----------|----------|------|
| `/collection/*` | 5 | 1단계 수집 |
| `/discovery/*` | 8 | 2단계 발굴 |
| `/shaping/*` | 13 | 3단계 형상화 |
| `/validation/*` | 5 | 4단계 검증 |
| `/product/*` | 4 | 5단계 제품화 |
| `/gtm/*` | 3 | 6단계 GTM |
| `/ax-bd/*` | 14 | 레거시 (발굴/형상화 혼합) |
| 비프로세스 | 20 | 대시보드, 설정, 관리 등 |
| redirect | 15 | 기존 경로 → 신규 경로 |
| external | 2 | Discovery-X, AI Foundry |

### 1.3 현행 문제점

| 문제 | 설명 |
|------|------|
| **모놀리스 IA** | BD 전 단계가 단일 앱에 혼재 — 수집~GTM + 포털(대시보드/위키/설정) + 관리 |
| **레거시 경로** | `/ax-bd/*` 14개가 여전히 존재 — `/discovery/`, `/shaping/`과 중복 |
| **포털 기능 혼재** | 대시보드, 위키, 설정, NPS, 온보딩이 BD 엔진과 같은 IA |
| **Admin 비대** | 관리 메뉴 11개 — Prototype/Quality/오케스트레이션은 형상화에 가까움 |
| **Offering Pack 중복** | 형상화에도, 제품화에도 Offering Pack 메뉴 존재 |

---

## 2. 변경 원칙

### 2.1 서비스-IA 대응 원칙

```
MSA 서비스               Web IA 영역
──────────────          ──────────────
AI Foundry (포털)    →   포털 셸 (대시보드, 설정, 위키, 온보딩)
Foundry-X (코어)     →   2. 발굴 + 3. 형상화 (핵심 기능)
Gate-X              →   4. 검증
Launch-X            →   5. 제품화 + 6. GTM
Discovery-X          →   1. 수집 (외부 서비스)
Eval-X              →   +1. 평가 (외부 서비스)
```

### 2.2 Phase 20 IA 변경 범위

Phase 20에서는 **실제 서비스 분리는 하지 않지만**, IA를 미리 서비스 경계에 맞게 재구조화해요.
이렇게 하면 향후 서비스가 독립 앱이 될 때 IA를 다시 변경할 필요가 없어요.

| 변경 | 이유 |
|------|------|
| 사이드바를 서비스 경계에 맞게 재그룹 | 모듈화 기준과 IA 기준 일치 |
| `/ax-bd/*` 레거시 경로 완전 제거 | `/discovery/`, `/shaping/`으로 통합 완료 |
| Admin 메뉴를 도메인별로 재분류 | 형상화 도구 ↔ 포털 관리 분리 |
| 외부 서비스 바로가기 확장 | Discovery-X, AI Foundry 외에 Gate-X 등 미래 대비 |

---

## 3. 변경 IA 구조

### 3.1 사이드바 — 서비스 경계 기반 재구조화

```
═══════════════════════════════════════════════
  ⬡ Foundry-X  [서비스 브랜드]
═══════════════════════════════════════════════

── 포털 (→ AI Foundry) ──
📊 대시보드                    /dashboard
🚀 시작하기                    /getting-started
  (조건부: 온보딩 미완료 시만)

── 핵심 기능: Foundry-X 코어 ──
🔍 발굴 (2단계)               /discovery
  ├── 발굴 대시보드             /discovery           [통합 탭 뷰]
  ├── 아이템 목록               /discovery/items
  ├── 평가 결과서               /discovery/report
  └── 스킬 카탈로그             /discovery/skills     [ax-bd/skill-catalog 이동]

✏️ 형상화 (3단계)              /shaping
  ├── 사업기획서 (BDP)          /shaping/business-plan
  ├── Offerings                /shaping/offerings
  ├── PRD                      /shaping/prd
  ├── Prototype                /shaping/prototype
  └── 형상화 리뷰               /shaping/review

── 이관 예정: 다른 서비스 ──
📥 수집 (→ Discovery-X)        /collection
  ├── Field 수집                /collection/field
  ├── IDEA Portal               /collection/ideas
  ├── Agent 자동수집             /collection/agent
  └── 스크리닝                   /collection/screening

✅ 검증 (→ Gate-X)             /validation
  ├── 검증 대시보드              /validation           [통합 탭 뷰]
  ├── 본부 검증                  /validation/division
  ├── 전사 검증                  /validation/company
  ├── 전문가 미팅                /validation/meetings
  └── 산출물 공유                /validation/share

🚀 제품화·GTM (→ Launch-X)     /product | /gtm
  ├── 제품화 대시보드             /product             [통합 탭 뷰]
  ├── MVP 추적                   /product/mvp
  ├── PoC 관리                   /product/poc
  ├── Offering Pack              /product/offering-pack
  ├── 대고객 선제안               /gtm/outreach
  └── 파이프라인                  /gtm/pipeline

── 도구·지식 ──
📖 위키                        /wiki
🔧 도구 가이드                  /tools-guide

── 관리 (Admin) ──
⚙️ 형상화 도구                   [형상화 관련 관리]
  ├── Prototype 대시보드         /prototype-dashboard
  ├── Builder Quality            /builder-quality
  ├── 오케스트레이션              /orchestration
  └── 방법론                     /methodologies

⚙️ 포털 관리                     [포털/인프라 관리]
  ├── 운영 지표                  /dashboard/metrics
  ├── NPS 대시보드               /nps-dashboard
  ├── 에이전트                   /agents
  ├── 토큰/모델                  /tokens
  ├── 아키텍처                   /architecture
  └── 백업                       /backup

⚙️ 조직 설정                     [조직/사용자 관리]
  ├── 워크스페이스               /workspace
  ├── 조직원 관리                /workspace/org/members
  ├── 조직 설정                  /workspace/org/settings
  └── Jira 연동                  /settings/jira

── 하단 고정 ──
⚙️ 설정                        /settings
```

### 3.2 변경 요약 — Before vs After

| 영역 | Before (현행) | After (Phase 20) | 변경 이유 |
|------|--------------|-------------------|----------|
| **최상위 그룹** | 6단계 프로세스 flat | 코어(발굴+형상화) + 이관 예정(수집/검증/제품화) | 서비스 경계 반영 |
| **발굴** | 2개 메뉴 | 4개 메뉴 (스킬 카탈로그 흡수) | ax-bd 레거시 통합 |
| **형상화** | 5개 메뉴 (Offering Pack 포함) | 5개 메뉴 (Offering Pack → 제품화로 이동) | 제품화 서비스 소속 명확화 |
| **수집** | 접힘 + TBD 뱃지 | 열림 + "(→ Discovery-X)" 라벨 | 이관 예정 명시 |
| **검증** | 2개 메뉴 | 5개 메뉴 (모든 검증 기능 노출) | Gate-X 경계 명확화 |
| **제품화+GTM** | 별도 그룹 | 통합 "(→ Launch-X)" 그룹 | 동일 서비스 소속 |
| **Admin** | 11개 flat | 3개 서브그룹(형상화 도구/포털 관리/조직 설정) | 도메인별 분류 |
| **레거시** | `/ax-bd/*` 14개 | 완전 제거 (redirect → 정규 경로) | 기술부채 해소 |
| **외부 서비스** | 2개 (Discovery-X, Foundry) | 이관 예정 그룹에 통합 | 서비스 전환 대비 |

### 3.3 메뉴 수 변화

| 역할 | Before | After | 변화 |
|------|--------|-------|------|
| Member 메뉴 | 12개 그룹 | 8개 그룹 | -4 (GTM 통합, 외부 흡수) |
| Admin 메뉴 | 1개 그룹 11항목 | 3개 그룹 13항목 | 서브그룹 도입 |
| 하단 고정 | 2개 | 1개 (위키→도구로 이동) | -1 |
| **총 메뉴 항목** | ~28개 | ~30개 | +2 (검증/수집 노출 증가) |

---

## 4. 라우트 네임스페이스 변경

### 4.1 레거시 `/ax-bd/*` 제거 계획

| 현행 경로 | 이동 대상 | Sprint |
|-----------|----------|--------|
| `/ax-bd/discovery` | `/discovery/items` (redirect 이미 존재) | 181 |
| `/ax-bd/discovery/:id` | 삭제 → discovery-detail은 이미 `/discovery/items/:id` | 181 |
| `/ax-bd/ideas` | `/collection/ideas` (redirect 추가) | 181 |
| `/ax-bd/ideas/:id` | `/collection/ideas/:id` (redirect 추가) | 181 |
| `/ax-bd/bmc` | `/shaping/bmc` (신규 경로) | 182 |
| `/ax-bd/bmc/new` | `/shaping/bmc/new` | 182 |
| `/ax-bd/bmc/:id` | `/shaping/bmc/:id` | 182 |
| `/ax-bd/bdp/:bizItemId` | `/shaping/business-plan/:bizItemId` | 182 |
| `/ax-bd/process-guide` | `/discovery/guide` (신규 경로) | 181 |
| `/ax-bd/skill-catalog` | `/discovery/skills` (신규 경로) | 181 |
| `/ax-bd/skill-catalog/:skillId` | `/discovery/skills/:skillId` | 181 |
| `/ax-bd/artifacts` | `/discovery/artifacts` | 181 |
| `/ax-bd/artifacts/:id` | `/discovery/artifacts/:id` | 181 |
| `/ax-bd/progress` | `/discovery/progress` (이미 존재) | 181 |
| `/ax-bd/ontology` | `/discovery/ontology` | 181 |
| `/ax-bd/demo` | `/demo` (독립 경로) | 183 |

### 4.2 Offering Pack 경로 통합

현행: 형상화(`/shaping/offering/*`) + 제품화(`/product/offering-pack/*`) 양쪽에 존재

| 현행 | Phase 20 | 이유 |
|------|----------|------|
| `/shaping/offering/*` | 유지 (편집/생성/검증은 형상화) | Offering 생성은 형상화 도메인 |
| `/product/offering-pack/*` | `/product/offering-pack/*` (유지, 뷰 전용) | Pack 관리는 제품화 도메인 |
| 사이드바 중복 | 형상화: "Offerings" / 제품화: "Offering Pack" | 역할 구분 명확화 |

### 4.3 라우트 파일 디렉토리 변경

```
packages/web/src/routes/
├── core/                        # Foundry-X 코어 (발굴+형상화)
│   ├── discovery/               # 2단계 발굴
│   │   ├── discovery-unified.tsx
│   │   ├── discovery-detail.tsx
│   │   ├── discovery-report.tsx
│   │   ├── persona-eval.tsx
│   │   ├── skill-catalog.tsx
│   │   ├── process-guide.tsx
│   │   └── ...
│   └── shaping/                 # 3단계 형상화
│       ├── offerings-list.tsx
│       ├── offering-editor.tsx
│       ├── spec-generator.tsx
│       ├── shaping-prototype.tsx
│       └── ...
├── modules/                     # 이관 대상
│   ├── collection/              # → Discovery-X
│   ├── validation/              # → Gate-X
│   ├── product/                 # → Launch-X
│   ├── gtm/                     # → Launch-X
│   └── portal/                  # → AI Foundry
│       ├── dashboard.tsx
│       ├── getting-started.tsx
│       ├── wiki.tsx
│       ├── workspace.tsx
│       └── ...
├── admin/                       # 관리자 전용
│   ├── shaping-tools/
│   ├── portal-admin/
│   └── org-settings/
├── landing.tsx                  # 랜딩 (비인증)
├── login.tsx                    # 로그인 (비인증)
└── invite.tsx                   # 초대 (비인증)
```

---

## 5. Sprint별 IA 변경 일정

| Sprint | IA 작업 | 영향 범위 |
|--------|--------|----------|
| **179** | 라우트 분류 문서 확정 (이 문서) | 문서만, 코드 변경 없음 |
| **181** | (1) `/ax-bd/*` 14개 → 정규 경로 redirect (2) 사이드바에서 ax-bd 참조 제거 | sidebar.tsx + router.tsx |
| **182** | (1) 사이드바 "이관 예정" 그룹 도입 (2) Admin 3개 서브그룹 분리 | sidebar.tsx |
| **183** | (1) 수집·검증·제품화·GTM 메뉴에 "(→ 서비스명)" 라벨 추가 (2) route 파일 디렉토리 이동 | sidebar.tsx + routes/ |
| **184** | (1) 코어(발굴+형상화) 메뉴 정리 — 스킬 카탈로그 흡수 (2) Offering Pack 중복 해소 | sidebar.tsx |
| **187** | E2E 테스트 태깅 — 서비스별 describe 그룹 | e2e/ |

---

## 6. 서비스 전환 시 IA 진화 경로

Phase 20 이후 각 서비스가 독립 앱이 되면:

### 6.1 단기 (Phase 20 완료 시점)

```
Foundry-X Web (fx.minu.best)
├── 포털 셸 (→ AI Foundry 이관 전까지 Foundry-X에서 제공)
├── 🔍 발굴        ← Foundry-X 코어
├── ✏️ 형상화       ← Foundry-X 코어
├── 📥 수집 (→ Discovery-X)  ← Foundry-X에서 제공하되 "이관 예정" 표시
├── ✅ 검증 (→ Gate-X)       ← 이관 예정
├── 🚀 제품화 (→ Launch-X)   ← 이관 예정
└── ⚙️ 관리
```

### 6.2 중기 (서비스 독립 후)

```
AI Foundry (ai-foundry.axbd.ktds.co.kr)    ← 포털 셸
├── 📊 대시보드 (전 단계 통합)
├── 🔍 발굴 → iframe/link → Foundry-X
├── ✏️ 형상화 → iframe/link → Foundry-X
├── ✅ 검증 → iframe/link → Gate-X
├── 🚀 제품화 → iframe/link → Launch-X
├── 📥 수집 → iframe/link → Discovery-X
└── ⚙️ 조직 설정

Foundry-X (fx.axbd.ktds.co.kr)
├── 🔍 발굴 (2단계)
├── ✏️ 형상화 (3단계)
└── ⚙️ 설정

Gate-X (gx.axbd.ktds.co.kr)
├── ✅ 검증 (4단계)
└── ⚙️ 설정
```

### 6.3 장기 (완전 MSA)

```
AI Foundry Portal
  └── 각 서비스를 Micro Frontend (Module Federation) 또는
      Custom Domain iframe으로 통합
      ├── Foundry-X (발굴+형상화)
      ├── Gate-X (검증)
      ├── Launch-X (제품화+GTM)
      ├── Discovery-X (수집)
      └── Eval-X (평가)
```

---

## 7. 구현 가이드라인

### 7.1 사이드바 변경 패턴

```typescript
// sidebar.tsx — 서비스 경계 기반 그룹
const FOUNDRY_CORE_GROUPS: NavGroup[] = [
  {
    key: "discover",
    label: "2. 발굴",
    icon: Search,
    stageColor: "bg-axis-violet",
    items: [/* ... */],
  },
  {
    key: "shape",
    label: "3. 형상화",
    icon: PenTool,
    stageColor: "bg-axis-warm",
    items: [/* ... */],
  },
];

const MIGRATION_TARGET_GROUPS: NavGroup[] = [
  {
    key: "collect",
    label: "수집 → Discovery-X",
    icon: Inbox,
    stageColor: "bg-axis-blue",
    badge: "이관 예정",
    items: [/* ... */],
  },
  // ...
];
```

### 7.2 라우트 이동 시 redirect 패턴

```typescript
// 레거시 → 신규 redirect (E2E 호환)
{ path: "ax-bd/skill-catalog", element: <Navigate to="/discovery/skills" replace /> },
{ path: "ax-bd/skill-catalog/:skillId", element: <Navigate to="/discovery/skills/:skillId" replace /> },
```

### 7.3 TinaCMS sidebar.json 동기화

TinaCMS가 sidebar.json을 관리하므로, 코드 변경과 함께 `content/sidebar.json`도 갱신해야 해요.

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 사이드바 변경으로 사용자 혼란 | 중간 | Sprint 182에서 점진적 변경 + 도구 가이드 갱신 |
| 레거시 경로 제거로 북마크 깨짐 | 낮음 | redirect 유지 (최소 6개월) |
| TinaCMS 동기화 누락 | 중간 | sidebar.json과 sidebar.tsx 동시 갱신 체크리스트 |
| E2E 테스트 경로 변경 | 높음 | redirect 테스트 추가 + E2E 경로 일괄 갱신 |

---

*이 문서는 Phase 20 Plan/Design 기반으로 작성되었으며, Sprint 179~188 진행 중 실제 구현에 맞게 갱신될 수 있어요.*
