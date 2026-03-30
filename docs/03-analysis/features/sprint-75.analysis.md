---
code: FX-ANLS-075
title: "Sprint 75 Gap Analysis — F220+F222"
version: "1.0"
status: Active
category: ANLS
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-DSGN-075]] Sprint 75 Design"
---

# Sprint 75 Gap Analysis — F220 Brownfield-first Init + F222 Changes Directory

## Match Rate: 100% (11/11)

## 분석 결과

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 1 | shared/types.ts 타입 정의 | ✅ | DocFile, DirNode, ProjectContext, ChangeEntry, SpecDelta, ChangesIndex 모두 구현 |
| 2 | shared/index.ts 타입 export | ✅ | 7개 신규 타입 정상 export |
| 3 | discover.ts F220 함수 | ✅ | discoverDocs, discoverDirectoryStructure, buildProjectContext 구현 |
| 4 | project-context-builder.ts | ✅ | 빌더 구현, 7개 섹션 생성 |
| 5 | generate.ts 빌더 등록 | ✅ | project-context.md 등록 |
| 6 | init.ts 파이프라인 확장 | ✅ | discover-context 통합 |
| 7 | changes-parser.ts | ✅ | parseChanges, parseSpecDelta 구현 |
| 8 | changes-scanner.ts | ✅ | scanChanges 구현 + 정렬 |
| 9 | sync.ts 통합 | ✅ | changes 스캔 + SyncRunResult 확장 |
| 10 | health-score.ts 확장 | ✅ | changes 파라미터 + 10% 페널티 |
| 11 | API spec-parser.ts | ✅ | parseSpecDeltas 구현 |

## 테스트 결과

- CLI 테스트: **149/149 passed** (기존 125 + 신규 24)
- typecheck: shared ✅, CLI ✅, API ✅
- 신규 테스트 파일 4개:
  - discover.test.ts (확장)
  - project-context-builder.test.ts (신규)
  - changes-parser.test.ts (신규)
  - changes-scanner.test.ts (신규)

## 파일 변경 요약

**신규 (5개):**
- packages/cli/src/harness/builders/project-context-builder.ts
- packages/cli/src/harness/builders/project-context-builder.test.ts
- packages/cli/src/harness/changes-parser.ts
- packages/cli/src/harness/changes-parser.test.ts
- packages/cli/src/harness/changes-scanner.ts
- packages/cli/src/harness/changes-scanner.test.ts

**수정 (7개):**
- packages/shared/src/types.ts
- packages/shared/src/index.ts
- packages/cli/src/harness/discover.ts
- packages/cli/src/harness/discover.test.ts
- packages/cli/src/harness/generate.ts
- packages/cli/src/commands/init.ts
- packages/cli/src/commands/sync.ts
- packages/cli/src/services/health-score.ts
- packages/api/src/services/spec-parser.ts
