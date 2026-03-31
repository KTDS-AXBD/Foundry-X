---
code: FX-PLAN-S97
title: "Sprint 97 — 발굴 UX 통합 QA + 팀 데모"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-DSGN-FDU]]"
---

# Sprint 97: 발굴 UX 통합 QA + 팀 데모

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F263~F266 전체 통합 검증 + AX BD팀 데모 |
| Sprint | 97 |
| 우선순위 | P0 |
| 의존성 | Sprint 94(F263+F265), Sprint 95(F264), Sprint 96(F266) 모두 merge 완료 |
| Design | docs/02-design/features/fx-discovery-ux.design.md §8 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 개별 기능은 동작하지만 E2E 통합 검증 + 실사용 피드백 부재 |
| Solution | 4가지 핵심 시나리오 E2E + Help Agent PoC 검증 + 팀 데모 |
| Function UX Effect | 실사용 환경에서 전체 흐름 검증 완료 |
| Core Value | MVP 완성 → 팀 실사용 전환 기반 확보 |

## 작업 목록

### E2E 테스트 (신규)

| # | 파일 | 시나리오 |
|---|------|----------|
| 1 | `web/e2e/discovery-wizard.spec.ts` | 위저드 기본 흐름: 아이템 선택 → 단계 탐색 → 스킬 실행 → 결과 확인 |
| 2 | `web/e2e/help-agent.spec.ts` | Help Agent: "다음 뭐 해야 돼?" → 응답 수신 → 스킬 추천 클릭 |
| 3 | `web/e2e/hitl-review.spec.ts` | HITL: 스킬 실행 → 결과 패널 → 승인 → 다음 단계 자동 이동 |
| 4 | `web/e2e/discovery-tour.spec.ts` | 온보딩 투어: 첫 방문 → 5스텝 완료 → 재방문 시 미표시 |

### Help Agent PoC 검증

| # | 시나리오 | 예상 응답 유형 | 판정 기준 |
|---|----------|---------------|-----------|
| 1 | "다음 단계가 뭐야?" | 로컬 (bd-process.ts) | 즉시 응답, 정확한 다음 단계 |
| 2 | "BMC가 뭐야?" | LLM | 정확한 설명 + 프로세스 연계 |
| 3 | "이 아이템에 적합한 스킬은?" | 로컬 (bd-skills.ts) | 현재 단계 기준 필터링 |
| 4 | "시장 규모 분석 방법 알려줘" | LLM | 구체적 가이드 + 관련 스킬 추천 |
| 5 | "체크포인트 질문 보여줘" | 로컬 | 현재 단계 체크포인트 목록 |
| 6 | "경쟁사 분석 결과를 BMC에 어떻게 반영해?" | LLM | 프로세스 컨텍스트 인식 응답 |
| 7 | "현재 단계 완료 조건은?" | 로컬 | 9기준 중 현재 단계 해당 항목 |
| 8 | "이 사업의 리스크가 뭐야?" | LLM | biz-item 정보 기반 분석 |
| 9 | "GIVC 관련 스킬 있어?" | 로컬/LLM | 스킬 카탈로그 검색 |
| 10 | "다른 팀원들은 어디까지 진행했어?" | LLM | 진행 상태 참조 |

- **합격 기준**: 10건 중 8건 이상 "만족" (정확+유용)

### 배포 + 데모

| # | 작업 | 설명 |
|---|------|------|
| 5 | Workers 배포 | `wrangler d1 migrations apply --remote` + `wrangler deploy` |
| 6 | Pages 배포 | Vite build + Pages deploy |
| 7 | Feature Flag | 초기 2명 대상 배포 (localStorage 기반 토글) |
| 8 | 팀 데모 | 전체 흐름 시연 + 피드백 수집 |

## 사전 조건

- [ ] Sprint 94~96 모두 merge 완료
- [ ] OPENROUTER_API_KEY Workers secret 설정
- [ ] D1 마이그레이션 0078~0079 remote 적용

## 성공 기준 (MVP)

- [ ] 4가지 Must Have 기능(F263~F266) 모두 동작
- [ ] E2E 테스트 4건 통과
- [ ] Help Agent PoC: 10건 중 8건 만족
- [ ] AX BD팀 대상 데모 완료
- [ ] 1건 이상의 biz-item을 위저드로 시작~2단계까지 진행 가능
