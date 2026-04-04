---
code: FX-SPEC-SKILL-UNIFY-INT
title: "Skill Unification 인터뷰 로그"
version: 1.0
status: Active
created: 2026-04-04
author: Sinclair Seo
---

# Skill Unification 인터뷰 로그

**날짜**: 2026-04-04 세션 #189
**참여자**: Sinclair (PO), Claude (interviewer)

---

## Part 1: 왜 (목적/문제)

**Q**: 3개 시스템을 통합하려는 가장 큰 동기가 뭔가요?
**A**: 전부 — 통합 플랫폼으로 완성. 스킬 가시성 + 자동 생성→실사용 + 거버넌스 자동화 모두 해결해야 Foundry-X가 스킬 오케스트레이션 플랫폼으로 완성된다.

**컨텍스트**: 현재 3개 시스템이 서로 데이터를 공유하지 않음
- skill-framework (CLI): 파일시스템 스캔 210+ 스킬, D1 미연동
- Foundry-X API: D1 skill_registry/metrics/DERIVED/CAPTURED 구현 완료, Web 미연동
- ax-marketplace: 22개 스킬 SKILL.md, 실행 메트릭 미수집

---

## Part 2: 누구를 위해

**Q**: 주 사용자는 누구인가요?
**A**: AX BD팀 전원 (7명). 실행/조회는 전원, 관리(등록/폐기)는 admin만.

---

## Part 3: 무엇을 (범위)

**Q**: 4대 단절(D1~D4) 중 이번 범위는?
**A**: D1~D4 모두 포함.
- D1: Web SkillCatalog → skill_registry API 전환 (정적→동적)
- D2: sf-scan → API 벌크 등록 (210+ 스킬을 D1에 등록)
- D3: DERIVED/CAPTURED → SKILL.md 자동 생성 + marketplace 등록
- D4: ax 스킬 실행 → usage-tracker hook → API skill_metrics 기록

**Out of Scope**: D5 ROI 벤치마크 서비스 구현 (D4 데이터 축적 후 후속)

---

## Part 4: 성공 기준

**Q**: 성공 판단 기준은?
**A**: 실사용 전환. 팀원이 웹에서 스킬 검색/조회하고, 메트릭이 실제로 쌓이는 것.

---

## Part 5: 제약

**Q**: 기존 시스템 변경 범위는?
**A**: 기존 API/D1 스키마 유지 + 연결 계층만 추가. skill-framework 대폭 리팩토링 없음.
