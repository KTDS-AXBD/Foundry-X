---
code: FX-PLAN-016
title: 랜딩 페이지 콘텐츠 리뉴얼 — 사용자 관점 재구성
version: 1.0
status: Active
category: PLAN
feature: F332
sprint: Sprint 147
created: 2026-04-05
updated: 2026-04-05
author: Sinclair Seo
---

# FX-PLAN-016: 랜딩 페이지 콘텐츠 리뉴얼

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 현재 랜딩 페이지가 기술 스택 나열 중심이라 KT 내부 다른 팀이 "Foundry-X가 뭘 해주는지" 이해하기 어려움. BDP 7단계(실제 6단계), 6종 에이전트(실제 40+종), CLI Layer(미사용) 등 부정확한 정보 포함. |
| **Solution** | 사용자 관점으로 전면 재구성: 히어로 직설형 메시지, BDP 6+1단계, 에이전트 3그룹(발굴/형상화/실행), 시스템 구성도 1장, 오픈소스 연계, 핵심 마일스톤 축소. Blueprint 시각화 강화. |
| **Function UX Effect** | KT 내부 팀이 랜딩 페이지만 보고 "BD 업무를 이렇게 자동화할 수 있구나"를 30초 내에 파악 가능. |
| **Core Value** | 도구 소개 페이지에서 → 가치 전달 페이지로 전환. 내부 확산의 첫 관문. |

## §1 배경

### 1.1 현황 문제점 (req-interview 결과)

| # | 섹션 | 문제 | 심각도 |
|---|------|------|--------|
| 1 | BDP 프로세스 | "7단계" 표기 — 평가(7단계)는 미구현 | 과장 |
| 2 | 세 가지 차별점 | SDD Triangle은 내부 개발 방법론, 사용자 가치 아님 | 부적절 |
| 3 | 6종 AI 에이전트 | 실제 16종 에이전트 + 27종 스킬. Phase 5 스냅샷 | 축소 |
| 4 | 4-Layer 아키텍처 | CLI Layer 미사용. 기술 나열 | 부정확 |
| 5 | AX 생태계 | Foundry-X → Foundry-X 자기참조 순환 | 불필요 |
| 6 | 히어로 메시지 | 추상적 ("일하는 방식을 설계하다"), 타겟에 와닿지 않음 | 방향 오류 |
| 7 | Stats 영역 | API Routes/Services/D1 등 기술 수치. 사용자 무관 | 부적절 |
| 8 | 로드맵 | Phase 1~12 전체 히스토리. 외부 팀에 불필요 | 과잉 |

### 1.2 타겟 사용자

**1차 타겟: KT 내부 다른 팀** (AX BD팀 외 KT 그룹사/계열사 팀)
- BD 방법론+도구를 도입하려는 잠재 사용자
- 기술 스택보다 "뭘 해주는지" + "우리 팀도 쓸 수 있나"에 관심
- KT 내부 용어/맥락 공유 전제

## §2 변경 항목

### 2.1 히어로 섹션

| 항목 | Before | After |
|------|--------|-------|
| 헤드라인 | "AI 에이전트가 일하는 방식을 설계하다" | 사업개발 자동화 직설형 (예: "사업기회 발굴부터 데모까지, AI가 자동화해요") |
| 서브라인 | "수집→발굴→형상화→검증→제품화→GTM→평가 — BDP 7단계를 AI 에이전트가 자동화해요" | BDP 6단계 기반 직설 설명 |
| Stats | API Routes, Services, Tests, D1, Sprints (기술 수치) | BD 파이프라인 6단계, AI 에이전트 10+종, 자동화 스킬 22종, 누적 Sprint 147 |

### 2.2 BDP 프로세스 섹션

| 항목 | Before | After |
|------|--------|-------|
| 단계 수 | 7단계 (수집~평가) | 6+1 (6단계 실선 + 평가 점선) |
| 7단계 표시 | 동일 스타일 | 비활성 스타일 + "향후 구현" 라벨 |
| 설명 | 각 단계 1줄 | 각 단계 1줄 + 실제 구현 상태 표시 |

### 2.3 핵심 차별점 (Core Pillars) 섹션

| 항목 | Before | After |
|------|--------|-------|
| Pillar 1 | BDP 라이프사이클 | BDP 라이프사이클 (유지, 설명 보강) |
| Pillar 2 | AI 에이전트 하네스 | AI 에이전트 파이프라인 (규모감 + 멀티모델 강조) |
| Pillar 3 | SDD Triangle | **오케스트레이션** — 에이전트 조율, 병렬 실행, 품질 자동 검증 |

### 2.4 에이전트 섹션

| 항목 | Before | After |
|------|--------|-------|
| 구성 | 6종 개별 나열 | 3그룹 (발굴/형상화/실행) × 3~4종 |
| 규모 | "6종 AI 에이전트" | "10+ AI 에이전트 · 3개 파이프라인" |
| 시각화 | 개별 카드 6장 | 그룹별 구획 + 그룹 간 화살표 연결 |

**발굴 그룹**: InsightAgent, BMCAgent, DiscoveryAgent
**형상화 그룹**: ShapingAgent, OGD Loop, SixHats, ReviewAgent
**실행 그룹**: SprintAgent, TestAgent, DeployAgent

### 2.5 아키텍처 섹션

| 항목 | Before | After |
|------|--------|-------|
| 구성 | 4-Layer (CLI→API→Agent→Data) | 시스템 구성도 1장 (사용자→웹→API→AI→데이터 흐름) |
| CLI | CLI Layer 포함 | **제거** (사용자 미접촉) |
| 시각화 | 레이어 스택 | 좌→우 흐름도 (Blueprint 스타일) |

### 2.6 생태계 섹션

| 항목 | Before | After |
|------|--------|-------|
| 제목 | "AX 생태계" | "오픈소스 연계" |
| 구성 | Foundry-X 중심 순환도 (자기참조) | 외부 도구 연계: gstack, bkit, OpenSpec, TinaCMS, Marker.io |
| 메시지 | 자체 완결 생태계 | "혼자 하지 않는다 — 검증된 오픈소스와 함께" |

### 2.7 로드맵 섹션

| 항목 | Before | After |
|------|--------|-------|
| 구성 | Phase 1~12 전체 (6행) | 핵심 마일스톤 3~4개 |
| 내용 | 내부 개발 Phase 상세 | 기반 구축 → BD 자동화 → 현재 → 다음 목표 |

## §3 구현 항목

| # | 항목 | 난이도 | 영향 파일 |
|---|------|--------|----------|
| I1 | 히어로 메시지 + Stats 변경 | ★☆☆ | landing.tsx, hero.md |
| I2 | BDP 6+1 프로세스 (7단계 비활성) | ★★☆ | landing.tsx (processSteps + ProcessFlow) |
| I3 | 3대 차별점 (SDD→오케스트레이션) | ★☆☆ | landing.tsx (pillars) |
| I4 | 에이전트 3그룹 시각화 | ★★★ | landing.tsx (agents + AgentGrid) — 그룹 구획 + 화살표 |
| I5 | 시스템 구성도 (아키텍처 대체) | ★★★ | landing.tsx (architecture + ArchitectureBlueprint) — 좌→우 흐름도 |
| I6 | 오픈소스 연계 (생태계 대체) | ★★☆ | landing.tsx (ecosystem + EcosystemDiagram) |
| I7 | 로드맵 축소 | ★☆☆ | landing.tsx (roadmap + RoadmapTimeline) |
| I8 | CTA 메시지 갱신 | ★☆☆ | landing.tsx (CtaSection) |
| I9 | Footer 수치 갱신 | ★☆☆ | footer.tsx (Sprint/Phase) |
| I10 | hero.md TinaCMS 동기화 | ★☆☆ | content/landing/hero.md |
| I11 | prod-e2e smoke 텍스트 갱신 | ★☆☆ | e2e/prod/smoke.spec.ts |

## §4 구현 순서

1. **데이터 레이어 먼저**: landing.tsx 상단 데이터 상수 변경 (I1, I3, I7, I8)
2. **프로세스 플로우**: BDP 6+1 ProcessFlow 컴포넌트 수정 (I2)
3. **에이전트 그룹**: AgentGrid → AgentGroupGrid 리디자인 (I4) — 시각화 핵심
4. **시스템 구성도**: ArchitectureBlueprint → SystemFlowDiagram 리디자인 (I5) — 시각화 핵심
5. **오픈소스 연계**: EcosystemDiagram → OpenSourcePartners 리디자인 (I6)
6. **동기화**: hero.md, footer.tsx, smoke.spec.ts (I9, I10, I11)

## §5 검증 기준

| # | 기준 | 방법 |
|---|------|------|
| V1 | 히어로 메시지가 사업개발 자동화를 직설적으로 전달 | 텍스트 확인 |
| V2 | BDP 6단계 실선 + 평가 점선/비활성 표시 | 시각 확인 |
| V3 | SDD Triangle 제거, 오케스트레이션 추가 | pillars 데이터 확인 |
| V4 | 에이전트 3그룹 구획 표시 + 그룹 간 연결 | 시각 확인 |
| V5 | 시스템 구성도 좌→우 흐름 | 시각 확인 |
| V6 | 생태계 → 오픈소스 연계 5종 | 데이터 확인 |
| V7 | 로드맵 3~4 마일스톤 | 데이터 확인 |
| V8 | Stats 사용자 중심 수치 | 텍스트 확인 |
| V9 | 다크 모드 + 375px 반응형 | Playwright/수동 확인 |
| V10 | prod-e2e smoke 통과 | CI/CD |

## §6 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 에이전트 그룹 시각화 복잡도 | Blueprint 스타일 유지 어려움 | bp-* CSS 재활용, 그룹 bp-box 중첩 |
| 히어로 메시지 변경 → smoke test 실패 | CI 블로킹 | I11에서 smoke.spec.ts 동시 갱신 |
| hero.md TinaCMS frontmatter 변경 | TinaCloud 스키마 불일치 | tina/config.ts 확인, 필요 시 갱신 |
| 콘텐츠 양 증가 → 모바일 스크롤 길이 | UX | 그룹 접기/펼치기 고려 (복잡도 높으면 생략) |
