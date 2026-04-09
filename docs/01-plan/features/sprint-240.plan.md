---
code: FX-PLAN-S240
title: "Sprint 240 Plan — F488 Phase 29 요구사항 거버넌스 자동화"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude Sonnet 4.6 (autopilot)
sprint: 240
f_items: [F488]
---

# Sprint 240 Plan — F488 Phase 29 요구사항 거버넌스 자동화

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 240 |
| F-items | F488 |
| 목표 | req-manage `--create-issue` 스마트 기본화 + req-integrity 2카테고리 분리 리포트 |
| 배경 | req-integrity drift 근본 원인 치료 — opt-in 구조로는 실시간 drift 재발 불가피 |
| 우선순위 | P0 |
| 의존성 | 없음 (ax 스킬 수정만) |

## 문제 정의

### 현재 문제
1. **opt-in 구조 한계**: `/ax:req-manage new`에서 Issue 생성이 선택적 → 개발자가 잊으면 drift 재발
2. **합산 리포트 맹점**: req-integrity가 구조적 공백(F100+ 미등록)과 실시간 drift(상태 불일치)를 합산 → 어디서 개선했는지 시각적으로 불분명

### 목표 상태
1. `req-manage new` 실행 시 gh/token 감지 → 자동 Issue 생성 (fallback: skip.log 기록)
2. `--no-issue` opt-out 옵션으로 기존 동작 선택 가능
3. req-integrity 리포트가 2카테고리 분리:
   - **구조적 공백**: F100+ 이상의 미등록 F-item
   - **실시간 drift**: 등록된 F-item의 상태 불일치

## F-item 상세

### F488: req-manage `--create-issue` 스마트 기본화 + req-integrity 2카테고리 분리 (P0)

**변경 대상**: ax 스킬 2개
- `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-manage/SKILL.md`
- `~/.claude/plugins/marketplaces/ax-marketplace/skills/req-integrity/SKILL.md`

**구현 내용**:
1. `req-manage new`: GitHub Issue 생성 로직 기본값으로 전환
   - gh CLI 존재 + GITHUB_REPO 감지 시 → 자동 Issue 생성
   - gh 없거나 GITHUB_REPO 없을 시 → `/tmp/req-issue-skip.log`에 경고
   - `--no-issue` 플래그로 opt-out 가능
2. `req-integrity check`: 2카테고리 분리 리포트
   - 구조적 공백: F{N} SPEC 존재 but GitHub Issue 없음 (특히 F100+ 대규모 미등록)
   - 실시간 drift: SPEC 상태 ↔ GitHub Issue 상태 불일치
3. 8곳 동기화: 마켓플레이스 소스 + 캐시 양쪽 (1.0.0, 1.1.0)

## 구현 계획

### Phase A: req-manage 스킬 수정
- `new` 서브커맨드의 Step 6 (GitHub Issue 생성) 로직을 기본값으로 전환
- `--no-issue` opt-out 조건 분기 추가
- 스킵 시 `/tmp/req-issue-skip.log` 기록 로직 추가

### Phase B: req-integrity 스킬 수정
- `check` 서브커맨드 Step 1 리포트를 2카테고리 분리
- 구조적 공백: `SPEC 존재 + Issue 미생성` 케이스 별도 집계
- 실시간 drift: `Issue 존재 + 상태 불일치` 케이스 별도 집계
- 출력 형식에 2개 섹션 추가

### Phase C: 캐시 동기화 (8곳 중 2곳)
- `cache/ax-marketplace/ax/1.0.0/skills/req-manage/` 동기화
- `cache/ax-marketplace/ax/1.1.0/skills/req-manage/` 동기화
- `cache/ax-marketplace/ax/1.0.0/skills/req-integrity/` 동기화
- `cache/ax-marketplace/ax/1.1.0/skills/req-integrity/` 동기화

## 완료 기준

| 기준 | 측정 방법 |
|------|----------|
| req-manage new 기본 Issue 생성 | SKILL.md Step 6 조건 확인 |
| `--no-issue` opt-out 동작 | 조건 분기 존재 확인 |
| skip.log 기록 | 로직 존재 확인 |
| req-integrity 2카테고리 분리 | 출력 섹션 2개 확인 |
| 캐시 동기화 완료 | 4개 캐시 경로 파일 일치 |

## 리스크

| 리스크 | 대응 |
|--------|------|
| `--no-issue` 사용 패턴 누락 | req-manage new 도움말에 명시 |
| 캐시 중 1.0.0/1.1.0 불일치 | Phase C에서 양쪽 동시 업데이트 |
