# Changelog

모든 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) 를 따릅니다.

## [2026-03-16] F21: 프로젝트 관리 점검 및 개선 완료

**Match Rate**: 90% (초기 78% → 최종 90%)
**Status**: Partial (의도적 지연 1건 — 팀 리뷰 사이클은 팀원 합류 후 실행)

### Added
- GitHub Projects 보드 생성 (https://github.com/orgs/KTDS-AXBD/projects/1)
  - Org-level 통합 보드
  - 4개 커스텀 필드: Priority, Work Type, REQ Code, Deliverable
  - 4개 뷰: 요구사항 목록(Table), WBS 보드(Board), 일정(Roadmap), P0/P1 긴급(Board)
  - 7개 아이템 등록 (F15~F21 Issues)

- Branch Protection 규칙 적용 (master 브랜치)
  - PR 필수 + 1명 Approve
  - Linear history (Squash merge 권장)
  - enforce_admins: Yes (관리자도 동일 규칙 적용)

- PR 템플릿 및 Issue 템플릿 배포
  - `.github/PULL_REQUEST_TEMPLATE.md` (Design §5.1과 100% 일치)
  - `.github/ISSUE_TEMPLATE/feature-request.yml` (Design §3.1과 100% 일치)
  - `.github/ISSUE_TEMPLATE/bug-report.yml` (Design §3.1과 100% 일치)

- PR 라벨 6개 생성
  - `feature` (녹색), `chore` (노랑), `docs` (파랑)
  - `P0-critical` (진빨강), `P1-high` (주황), `needs-review` (보라)

- 팀 온보딩 가이드 (FX-GUID-001)
  - 8개 섹션: Overview / GitHub Projects 보드 사용법 / PR 워크플로우 / Branch Protection 안내 / Issue 생성 / 리뷰 SLA / FAQ / 문제 해결

### Changed
- KTDS-AXBD 조직으로 통합 (기존 AXBD-Team → KTDS-AXBD)
  - 프로젝트 리포 원격 URL 갱신
  - PAT 갱신 (read:org 스코프 추가)
  - 참조 6개 파일 일괄 업데이트

- Merge 전략 설정
  - ✅ Squash merge (기본)
  - ✅ Merge commit (선택)
  - ❌ Rebase merge (비활성)
  - ✅ Auto-delete head branches

### PDCA Cycle

**Plan**: FX-PLAN-004 (2026-03-16)
- AX BD팀 전체 프로젝트 관리 표준 정립
- 문서 체계 / WBS 관리 / 리뷰 프로세스 / 현행화 가이드 4축 설계

**Design**: FX-DSGN-004 (2026-03-16)
- GitHub Projects 보드 설계 (커스텀 필드, 뷰, 이슈 템플릿)
- Branch Protection 규칙 정의
- PR 템플릿 및 리뷰 워크플로우

**Do**: (2026-03-16)
- GitHub 설정 + Projects 보드 생성 + 템플릿 배포 (구현 완료)
- KTDS-AXBD 조직 마이그레이션

**Check**: FX-ANLS-004 (2026-03-16)
- Design vs Implementation Gap Analysis
- Match Rate: 78% (초기) → 88% (온보딩 추가) → 90% (Projects 뷰 확정)

**Act**: FX-RPRT-004 (2026-03-16)
- Completion Report 작성
- 의도적 지연 1건 기록: 팀 리뷰 사이클 (팀원 합류 후 1주일 내 실행)

---

## Related Documents

- **F21 Plan**: [프로젝트-관리-개선.plan.md](./features/프로젝트-관리-개선.plan.md) (FX-PLAN-004)
- **F21 Design**: [프로젝트-관리-개선.design.md](../../02-design/features/프로젝트-관리-개선.design.md) (FX-DSGN-004)
- **F21 Analysis**: [프로젝트-관리-개선.analysis.md](../../03-analysis/features/프로젝트-관리-개선.analysis.md) (FX-ANLS-004)
- **F21 Report**: [프로젝트-관리-개선.report.md](./features/프로젝트-관리-개선.report.md) (FX-RPRT-004)
- **Onboarding Guide**: [team-onboarding-guide.md](../../specs/team-onboarding-guide.md) (FX-GUID-001)
