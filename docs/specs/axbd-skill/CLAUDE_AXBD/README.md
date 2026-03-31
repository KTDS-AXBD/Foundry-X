# CLAUDE_AXBD — AX BD팀 AI 사업개발 작업 폴더

이 폴더는 Claude Code와 연결하여 **AI 기반 사업 발굴(2단계)** 을 수행하는 작업 공간입니다.

## 포함 리소스

| 구분 | 수량 | 설명 |
|------|:----:|------|
| Skills | 76개 | pm-skills 64 + ai-biz 11 + sentiment-analysis 1 |
| Commands | 36개 | 복합 분석 워크플로우 (discover, business-model 등) |
| Rules | 1개 | 단계별 프레임워크 실행 정의 (skill-execution.md) |
| References | 4개 | 스킬 카탈로그 + 프로세스 시각화 HTML 3개 |

## 시작하기

### 방법 1. Claude Code (터미널)

```bash
# 1) 이 폴더를 로컬에 복사 또는 clone
git clone https://github.com/KTDS-AXBD/CLAUDE_AXBD.git
cd CLAUDE_AXBD

# 2) Claude Code 실행
claude

# 3) 대화 시작
나는 AX BD팀 [이름]입니다. [아이템]에 대해 2단계 발굴을 시작합니다.
```

### 방법 2. Claude Desktop App (Code 탭)

1. Claude Desktop 앱 열기
2. Code 탭 > "Select folder" > 이 폴더 선택
3. 대화 시작

## 폴더 구조

```
CLAUDE_AXBD/
├── CLAUDE.md              <- Claude가 매 세션 자동으로 읽는 팀 컨텍스트
├── README.md              <- 이 파일 (팀원 안내용)
├── outputs/               <- AI가 생성한 분석 산출물 저장 위치
├── references/
│   ├── skill-catalog.md   <- 전체 스킬 카탈로그 (팀원 참고용)
│   ├── 01_AX사업개발_프로세스설명.html        <- 전체 프로세스 시각화
│   ├── 02_AI사업개발_AI멀티페르소나평가.html  <- 2-9 AI 사전평가 에이전트
│   └── 03_AX사업개발_발굴단계완료(안).html    <- 2-8 발굴 결과 패키징
└── .claude/               <- Claude Code 설정 (숨김 폴더)
    ├── rules/
    │   └── skill-execution.md  <- 단계별 프레임워크 실행 정의
    ├── skills/ (76개)     <- 개별 분석 스킬 (/스킬명 으로 호출)
    ├── commands/ (36개)   <- 복합 워크플로우 (/커맨드명 으로 호출)
    └── settings.local.json <- 기본 퍼미션 (WebSearch, WebFetch)
```

> `.claude/` 폴더는 숨김 폴더입니다. 파일 탐색기에서 보이지 않을 수 있습니다.
> Windows: 파일 탐색기 > 보기 > 숨긴 항목 체크

## 스킬 호출 예시

```
/swot-analysis 물류 AI 플랫폼
/ai-biz-moat-analysis 손해사정 자동화
/competitive-analysis AI 기반 ESG 컨설팅
/discover 헬스케어 AI 개인비서
/business-model 제조업 예지정비 SaaS
```

## 2단계 발굴 프로세스 요약

| 단계 | 이름 | 설명 |
|:----:|------|------|
| 2-0 | 아이템 분류 | 5유형(I/M/P/T/S) 분류 + 초기 분석 |
| 2-1 | 레퍼런스 분석 | 경쟁사/서비스 벤치마킹 |
| 2-2 | 수요 시장 검증 | TAM/SAM/SOM + Why Now |
| 2-3 | 경쟁/자사 분석 | SWOT, 5 Forces, 해자 분석 |
| 2-4 | 사업 아이템 도출 | OST + BMC 초안 + 엘리베이터 피치 |
| 2-5 | 핵심 아이템 선정 | Commit Gate (4개 심화 질문) |
| 2-6 | 타겟 고객 정의 | 페르소나 + JTBD + 인터뷰 |
| 2-7 | BM 정의 | BMC + 수익 모델 + Unit Economics |
| 2-8 | 발굴 결과 패키징 | GTM + KPI + 사업계획서 |
| 2-9 | AI 사전 평가 | 8개 내부 페르소나 평가 |
| 2-10 | 팀 공유/검토 | Go / Hold / Drop 판정 |

## 스킬 출처

| 출처 | 설명 | 라이선스 |
|------|------|----------|
| phuryn/pm-skills | 64개 스킬 + 36개 커맨드 (Pawel Huryn, The Product Compass) | MIT |
| ai-biz | AI 사업개발 특화 스킬 11종 (AX BD팀 제작) | Internal |
| 경영전략 프레임워크 | a16z, McKinsey, Gartner, NIST, Porter 등 | 프롬프트 기반 |

## 주의사항

- `.claude/` 하위 파일을 임의로 삭제/이동하지 마세요
- `outputs/` 폴더에 생성된 산출물은 자유롭게 복사/공유 가능
- `CLAUDE.md`를 수정하면 Claude의 동작 방식이 바뀝니다

---
*AX BD팀 · 2단계 발굴 프로세스 v8.2 · 2026-03*
