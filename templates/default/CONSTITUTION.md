# CONSTITUTION.md — 에이전트 행동 경계

## Always (항상 해도 됨)
- specs/ 파일 읽기
- 테스트 실행 (read-only)
- lint 실행
- feature branch 생성
- progress.md 업데이트
- ADR 초안 작성 (commit 전 human 확인 필요)

## Ask (반드시 확인 후 실행)
- 외부 API 호출 (부작용 있는 것)
- 의존성 추가 (package.json / requirements.txt 수정)
- 스키마 변경
- PR merge 또는 main 브랜치 직접 수정
- 새 환경 변수 추가
- 기존 테스트 삭제 또는 skip 처리

## Never (절대 금지)
- main 브랜치 직접 push
- --no-verify 플래그 사용
- 인증 정보(API key, 비밀번호) Git commit
- DB 직접 수정 (마이그레이션 스크립트 외)
- 다른 에이전트의 작업 브랜치에 직접 push
