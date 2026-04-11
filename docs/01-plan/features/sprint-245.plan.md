---
code: FX-PLAN-S245
title: "Sprint 245 Plan — F501/F502 GitHub Projects Board + CHANGELOG 도입"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-11
updated: 2026-04-11
author: Claude Opus 4.6 (sprint-245)
sprint: 245
f_items: [F501, F502]
---

# Sprint 245 Plan — GitHub Projects Board + CHANGELOG 도입

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 245 |
| F-items | F501, F502 |
| REQ | FX-REQ-496, FX-REQ-497 |
| 우선순위 | P0 |
| 의존성 | 독립 (Sprint 244와 파일 충돌 없음) |
| 목표 | 거버넌스 갭 G1,G3,G4,G6 해소 — GitHub Projects Kanban 보드 + Keep a Changelog 자동화 |
| 대상 코드 | F501: `.github/workflows/` + `gh project` CLI 스크립트 / F502: `CHANGELOG.md` (신규) + `session-end` 스킬 보강 |

## 문제 정의

### 거버넌스 갭 (Sprint 244 Gap Analysis에서 발견)

| Gap | 설명 | 영향 |
|-----|------|------|
| G1 | GitHub Issues가 미분류 상태로 방치 — Kanban 보드 없음 | 작업 가시성 부재 |
| G3 | Issue → Sprint 배정 흐름이 수동 | Pipeline 계획 시 매번 SPEC.md 파싱 필요 |
| G4 | CHANGELOG 부재 — 변경 이력이 git log에만 존재 | 마일스톤 회고 시 수동 수집 |
| G6 | Phase 완료 시 Release Notes 미생성 | 이해관계자 공유 어려움 |

### F501 — 현재 상태

- GitHub Issues: 125+ (open + closed), 라벨 12종 (`fx:track:*`, `fx:status:*`) 존재
- GitHub Projects: 미설정 — Issues가 flat list로만 조회 가능
- 자동화: Issue 생성 시 라벨은 `/ax:task start`가 부여, 프로젝트 배정 없음

### F502 — 현재 상태

- CHANGELOG.md: 미존재
- 변경 이력: SPEC.md §8 Version History에 inline 기록 (1800+ 줄)
- `/ax:session-end`: SPEC.md + MEMORY.md 갱신만, CHANGELOG 미포함
- `/ax:gov-retro`: 마일스톤 회고 시 CHANGELOG 참조하도록 설계됐으나 파일 부재

## 목표 상태

### F501 — GitHub Projects Board

1. **Repo-level Project** 생성: "Foundry-X Kanban"
2. **6 컬럼**: Inbox → Backlog → Triaged → Sprint Ready → In Progress → Done
3. **기존 Issues 마이그레이션**: open Issues를 라벨 기반으로 컬럼 배치
   - `fx:status:planned` → Sprint Ready
   - `fx:status:in_progress` → In Progress
   - 라벨 없음 → Inbox
4. **GitHub Actions 자동화**: Issue 라벨 변경 시 컬럼 자동 이동
5. **`/ax:task start` 연동**: Issue 생성 시 프로젝트에 자동 추가

### F502 — CHANGELOG.md

1. **Keep a Changelog** 형식 (`keepachangelog.com`)
2. **자동 갱신**: `/ax:session-end`에서 커밋 메시지 파싱 → CHANGELOG 항목 추가
3. **Phase Release Notes**: SemVer Minor 태그 시 Phase 단위 Release Notes 섹션 생성
4. **기존 이력 소급**: Phase 29~31(최근 3 Phase)만 소급 기록

## 범위

### In Scope

| F-item | 범위 |
|--------|------|
| F501 | `gh project create` + 컬럼 6개 + 기존 Issues 배치 + Actions workflow |
| F502 | `CHANGELOG.md` 신규 + session-end 스킬 CHANGELOG 갱신 로직 |

### Out of Scope

| 항목 | 사유 |
|------|------|
| Org-level Project | Repo-level로 충분, Org-level은 팀 확장 시 |
| CHANGELOG 전체 소급 | Phase 1~28은 너무 방대 — 최근 3 Phase만 |
| GitHub Actions CI 변경 | deploy.yml은 건드리지 않음 |

## 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| Project 타입 | Repo-level (not Org) | 단일 리포 범위, 관리 단순 |
| Board 뷰 | Kanban (not Table/Roadmap) | 작업 흐름 시각화 목적 |
| CHANGELOG 포맷 | Keep a Changelog v1.1.0 | 업계 표준, 파싱 용이 |
| 소급 범위 | Phase 29~31 | 최근 활성 Phase만, 과거는 git log 참조 |
| 자동화 방식 | `gh` CLI 스크립트 (not Actions) | Actions는 push 이벤트 전용, CLI가 유연 |

## 검증 기준

### F501

- [ ] `gh project view` 로 6 컬럼 확인
- [ ] open Issues 중 80% 이상 올바른 컬럼에 배치
- [ ] `/ax:task start`로 생성한 Issue가 프로젝트에 자동 추가

### F502

- [ ] `CHANGELOG.md` 파일 존재 + Keep a Changelog 형식 준수
- [ ] Phase 29~31 소급 섹션 포함
- [ ] `/ax:session-end` 실행 시 CHANGELOG 자동 갱신 확인

## 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| `gh project` API rate limit | 대량 Issues 배치 시 429 | 배치 간 1초 sleep |
| CHANGELOG 자동 갱신이 커밋 메시지 품질에 의존 | 무의미한 항목 축적 | `feat:`/`fix:`/`docs:` prefix 필터링 |
| Actions workflow가 기존 CI와 충돌 | 배포 지연 | 별도 workflow 파일로 격리 |
