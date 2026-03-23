---
code: FX-PLAN-OC1
title: OpenClaw MVP — AI PoC 빌더 플랫폼
version: 0.1
status: Draft
category: PLAN
created: 2026-03-23
updated: 2026-03-23
author: Sinclair Seo
---

# OpenClaw MVP Planning Document

> **Summary**: 비개발자가 프롬프트 입력만으로 PoC를 자동 생성하고 Cloudflare에 원클릭 배포하는 AI PoC 빌더 MVP. Bolt.new/Lovable의 사내 보안 준수 버전.
>
> **Project**: OpenClaw (별도 리포)
> **Version**: MVP v0.1.0
> **Author**: Sinclair Seo
> **Date**: 2026-03-23
> **Status**: Draft
> **PRD Reference**: `docs/specs/openclaw/prd-v2.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | PoC 제작에 2~4주 소요 (개발자 병목). 비개발자는 직접 만들 수 없고, Bolt.new/Lovable은 사내 보안 정책 미충족. |
| **Solution** | 프롬프트→AI 코드 생성→실시간 프리뷰→Cloudflare 원클릭 배포. 별도 리포(openclaw)로 독립 개발, Foundry-X 기술 스택 기반. |
| **Function/UX Effect** | 비개발자가 웹 UI에서 요구사항 입력 → AI가 풀스택 코드 생성 → 프리뷰 확인 → 배포 버튼 → 데모 URL 즉시 공유. 대화형 반복 수정 지원. |
| **Core Value** | "프롬프트 하나로 고객 데모를 만든다" — PoC 제작 시간 2~4주→수 시간, 사업개발 속도 10배 가속 |

---

## 1. Overview

### 1.1 Purpose

AX BD팀 사업개발/기획 담당자(비개발자)가 **코딩 없이** 프롬프트만으로 고객 데모용 PoC를 생성하고, 원클릭으로 배포하여 즉시 데모 URL을 공유할 수 있는 AI PoC 빌더 플랫폼을 구축한다.

### 1.2 Background

- **시장 기회**: Bolt.new, Lovable, v0 등 AI 빌더가 급성장. 사내 보안 준수 + 도메인 특화 버전의 수요
- **핵심 병목**: 고객 PoC 요청 → 개발자 스케줄 → 2~4주 소요. 사업 기회 손실
- **기술 기반**: Foundry-X 50 Sprint에 걸쳐 축적한 AI 에이전트+Cloudflare 인프라 활용 가능
- **PRD**: `docs/specs/openclaw/prd-v2.md` (인터뷰 기반, 3사 AI 검토 2라운드 완료)

### 1.3 Related Documents

- PRD v2: `docs/specs/openclaw/prd-v2.md`
- 인터뷰 로그: `docs/specs/openclaw/interview-log.md`
- 검토 Round 1~2: `docs/specs/openclaw/review/`

---

## 2. Scope

### 2.1 In Scope (MVP)

- [ ] 프롬프트 입력 UI (웹 기반, 채팅 형태)
- [ ] AI 코드 생성 엔진 (Claude API 기반, 풀스택 코드 출력)
- [ ] 실시간 프리뷰 (생성 코드 브라우저 렌더링)
- [ ] Cloudflare Pages 원클릭 배포 + URL 발급
- [ ] 대화형 반복 수정 (최소 3회 수정 사이클)
- [ ] 프로젝트 목록/이력 관리 (기본)

### 2.2 Out of Scope

- 프로덕션 수준 앱 개발 (PoC/데모 목적만)
- 커스텀 백엔드 인프라 (Cloudflare 기본만)
- 멀티 사용자 실시간 협업
- 모바일 앱 생성 (웹 앱만)
- Foundry-X 심화 연동 (후속)
- 템플릿 라이브러리 (후속)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 프롬프트 입력 → AI 코드 생성 (프론트엔드+백엔드) | P0 | Pending |
| FR-02 | 생성 코드 실시간 프리뷰 (iframe 또는 sandpack) | P0 | Pending |
| FR-03 | "배포" 버튼 → Cloudflare Pages 자동 배포 + URL 반환 | P0 | Pending |
| FR-04 | 대화형 수정: "이 부분 바꿔줘" → 코드 업데이트 → 재프리뷰 | P0 | Pending |
| FR-05 | 프로젝트 목록 조회 + 생성 이력 | P1 | Pending |
| FR-06 | 에러 핸들링: AI 생성 실패 시 재시도 + 사용자 안내 | P1 | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 프롬프트→코드 생성 60초 이내 | API 응답 시간 |
| Performance | 배포 완료 120초 이내 | wrangler deploy 소요 시간 |
| Security | 고객 데이터 AI API 전송 최소화 | 프롬프트만 전송, 생성 코드는 로컬 |
| UX | 비개발자 첫 사용 5분 이내 성공 | 사용자 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 비개발자 1명이 프롬프트만으로 PoC 생성+배포 성공
- [ ] 배포된 URL로 외부 접근 가능
- [ ] 대화형 수정 3회 이상 성공
- [ ] 기본 프로젝트 관리 (목록/이력) 동작

### 4.2 Quality Criteria

- [ ] TypeScript strict mode
- [ ] 기본 테스트 커버리지 (API + 핵심 로직)
- [ ] ESLint + Prettier
- [ ] Build 성공

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| AI 코드 생성 품질 불안정 | High | High | 반복 수정 사이클 + 프롬프트 엔지니어링 최적화 |
| Cloudflare 배포 자동화 복잡도 | Medium | Medium | wrangler CLI 래핑, Foundry-X 배포 경험 활용 |
| 비개발자 UX 진입 장벽 | High | Medium | 예시 프롬프트 + 가이드 투어 + 피드백 수집 |
| LLM API 비용 증가 | Medium | Medium | 모델 라우팅 (간단→저렴 모델, 복잡→고급 모델) |
| 사내 보안 정책 충돌 | High | Low | 프롬프트만 API 전송, 생성 코드는 Cloudflare 내부 |

---

## 6. Architecture Considerations

### 6.1 Project Level

| Level | Selected |
|-------|:--------:|
| **Dynamic** | ✅ |

### 6.2 Key Architectural Decisions

| Decision | Selected | Rationale |
|----------|----------|-----------|
| 리포 구조 | **별도 리포** (openclaw) | 독립 배포/버전 관리, 추후 외부 공개 가능성 |
| 프론트엔드 | **Next.js 15 App Router** | Foundry-X 스택 일관성, React Server Components |
| 백엔드 | **Hono (Cloudflare Workers)** | Foundry-X 스택 일관성, Edge 실행 |
| DB | **Cloudflare D1** | 프로젝트 메타/이력 저장, 서버리스 |
| AI 엔진 | **Claude API (Sonnet)** | 코드 생성 품질, 비용 효율 |
| 프리뷰 | **Sandpack (CodeSandbox)** | 브라우저 내 코드 실행, 설치 불필요 |
| 배포 | **Cloudflare Pages (wrangler)** | 자동 URL 발급, CDN 포함 |
| 인증 | **Google OAuth** (Foundry-X 동일) | 기존 팀원 Gmail 활용 |

### 6.3 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│  OpenClaw Web (Next.js 15, Cloudflare Pages)        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ 프롬프트 UI  │→│ 프리뷰 패널  │  │ 배포 패널  │ │
│  │ (채팅 형태)  │  │ (Sandpack)   │  │ (URL 발급) │ │
│  └──────┬──────┘  └──────────────┘  └─────┬──────┘ │
└─────────┼──────────────────────────────────┼────────┘
          │ API                              │ wrangler
          ▼                                  ▼
┌─────────────────────┐        ┌──────────────────────┐
│ OpenClaw API        │        │ Cloudflare Pages     │
│ (Hono, Workers)     │        │ (배포 대상)          │
│                     │        │ → demo-xxx.pages.dev │
│ ┌─────────────────┐ │        └──────────────────────┘
│ │ AI Code Engine  │ │
│ │ Claude API 호출 │ │
│ │ 프롬프트→코드   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Project Store   │ │
│ │ D1 (메타/이력)  │ │
│ └─────────────────┘ │
└─────────────────────┘
```

### 6.4 구현 범위 (파일 수준)

```
openclaw/                    # 별도 리포
├── packages/
│   ├── web/                 # Next.js 15 프론트엔드
│   │   ├── src/app/
│   │   │   ├── page.tsx          # 랜딩/대시보드
│   │   │   ├── new/page.tsx      # 새 PoC 생성 (프롬프트 UI)
│   │   │   ├── [id]/page.tsx     # PoC 상세 (프리뷰+수정+배포)
│   │   │   └── login/page.tsx    # Google OAuth
│   │   └── src/components/
│   │       ├── PromptChat.tsx    # 채팅형 프롬프트 입력
│   │       ├── CodePreview.tsx   # Sandpack 프리뷰
│   │       ├── DeployPanel.tsx   # 배포 버튼 + URL
│   │       └── ProjectList.tsx   # 프로젝트 목록
│   └── api/                 # Hono API (Workers)
│       ├── src/routes/
│       │   ├── generate.ts       # POST /generate (AI 코드 생성)
│       │   ├── refine.ts         # POST /refine (대화형 수정)
│       │   ├── deploy.ts         # POST /deploy (Cloudflare 배포)
│       │   ├── projects.ts       # CRUD /projects
│       │   └── auth.ts           # Google OAuth
│       ├── src/services/
│       │   ├── ai-engine.ts      # Claude API 래퍼
│       │   ├── deployer.ts       # wrangler 배포 자동화
│       │   └── project-store.ts  # D1 프로젝트 저장
│       └── wrangler.toml
├── package.json
├── pnpm-workspace.yaml
└── CLAUDE.md
```

---

## 7. Convention Prerequisites

### 7.1 Existing Conventions (from Foundry-X)

- [x] TypeScript strict
- [x] ESLint flat config
- [x] Vitest for testing
- [x] Hono + Zod for API
- [x] Next.js App Router + shadcn/ui

### 7.2 New Conventions

| Category | Rule |
|----------|------|
| AI 프롬프트 | `src/prompts/` 디렉토리에 시스템 프롬프트 별도 관리 |
| 생성 코드 형식 | AI가 생성하는 코드는 항상 `{ files: Record<string, string> }` JSON 형태 |
| 배포 네이밍 | `oc-{projectId}.pages.dev` 패턴 |

---

## 8. Sprint Plan (예상)

| Sprint | 목표 | F-items |
|--------|------|---------|
| **S1** | 프로젝트 세팅 + AI 코드 생성 기본 | 리포 생성, Next.js+Hono 세팅, Claude API 연동, 프롬프트→코드 생성 |
| **S2** | 프리뷰 + 배포 | Sandpack 프리뷰, Cloudflare Pages 자동 배포, URL 발급 |
| **S3** | 대화형 수정 + UX | 반복 수정 사이클, 프로젝트 관리, Google OAuth, 에러 핸들링 |
| **S4** | 내부 파일럿 + 피드백 | 팀원 사용 테스트, 피드백 수집, 버그 수정 |

---

## 8. Next Steps

1. [ ] 별도 리포 `openclaw` 생성 (GitHub KTDS-AXBD org)
2. [ ] 모노리포 세팅 (pnpm workspace + Turborepo)
3. [ ] Design 문서 작성 (`/pdca design openclaw-mvp`)
4. [ ] S1 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-23 | Initial draft (PRD v2 기반) | Sinclair Seo |
