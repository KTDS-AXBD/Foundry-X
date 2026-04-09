# /generate-evaluation-report — 발굴단계완료 평가결과서 HTML 자동 생성

PRD-final.md를 파싱하여 AX BD팀 2단계 발굴 리포트(9탭 HTML)를 자동 생성한다.

## 사용법

```
/generate-evaluation-report [prd-파일경로]
```

- 경로 생략 시: `outputs/` 하위에서 가장 최근 `prd-*-final.md` 자동 탐색
- 출력: `outputs/{날짜}_{아이템명}/04_발굴단계완료_{아이템명}.html`

## 실행 순서

### Step 1: PRD 파일 읽기
1. 인자로 받은 경로 또는 `outputs/` 하위 자동 탐색 (`find outputs/ -name "prd-*-final.md" -type f | sort | tail -1`)
2. 파일 전체를 읽는다

### Step 2: 섹션 파싱
마크다운 `##` 헤딩 기준으로 섹션을 분리한다. 각 섹션의 제목과 내용을 추출.

### Step 3: 9탭 데이터 매핑

PRD 섹션을 아래 규칙에 따라 9탭에 배분한다:

| 탭 | PRD 섹션 매핑 (키워드 매칭) | HTML 컴포넌트 |
|----|---------------------------|--------------|
| **2-1 레퍼런스 분석** | "Pain Point", "솔루션 개요", "기술 비교", "레퍼런스", "벤치마크", "경쟁사 프로파일" | `.card` + `.tbl-wrap` 테이블 + `.insight-box` |
| **2-2 수요 시장** | "TAM", "SAM", "SOM", "시장 규모", "성장률", "Why Now", "시장 검증" | `.metric` 카드 4개 + Chart.js 바 차트 + `.insight-box` |
| **2-3 경쟁·자사** | "경쟁 환경", "SWOT", "비대칭 우위", "Porter", "해자", "Five Forces" | `.swot-grid` + 경쟁 비교 `.tbl-wrap` + `.tag` 태그들 |
| **2-4 아이템 도출** | "솔루션", "기능 백로그", "엘리베이터 피치", "Value Chain", "아이템 도출" | `.card` 솔루션 카드 + 기능 목록 + 피치 하이라이트 |
| **2-5 아이템 선정** | "성공 기준", "리스크", "Commit Gate", "우선순위", "스코어링" | 스코어 `.metric` + 리스크 테이블 + Commit Gate 박스 |
| **2-6 타겟 고객** | "페르소나", "사용자 스토리", "JTBD", "고객 여정", "ICP" | `.persona-card` 2~3개 + `.journey-track` |
| **2-7 비즈니스 모델** | "BMC", "Business Model Canvas", "투자", "매출", "수익성", "원가" | `.bmc-grid` 9블록 + `.ue-flow` Unit Economics |
| **2-8 패키징** | "실행 계획", "GTM", "Discovery Summary", "로드맵", "KPI" | `.exec-hero` 배너 + Executive Summary + 타임라인 |
| **2-9 멀티 페르소나** | "AI 평가", "페르소나 점수", "8인 평가", "멀티 페르소나" | Chart.js 레이더 차트 + 평가 카드 그리드 |

**매핑 우선순위**: 헤딩 텍스트 > 본문 첫 문단 키워드 > 섹션 순서 기반 추정

### Step 4: HTML 생성

`references/evaluation-report-template.html`의 CSS와 JS 구조를 참조하여 HTML을 생성한다.

**필수 구조**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>AX BD팀 2단계 발굴 리포트 — {아이템명}</title>
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
  <style>/* references/evaluation-report-template.html의 CSS 전체 복사 */</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>AX BD팀 2단계 발굴 리포트</h1>
    <p class="subtitle">{아이템 한줄 설명}</p>
    <span class="badge">{유형} · {날짜}</span>
  </header>
  <nav class="tab-bar" id="tabBar">
    <!-- 9탭 버튼: 2-1 ~ 2-9 -->
  </nav>
  <!-- 9탭 패널: tab1 ~ tab9 -->
</div>
<script>
// 탭 전환 JS
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
// Chart.js 렌더링 (2-2 시장 차트, 2-9 레이더 차트)
</script>
</body>
</html>
```

**CSS 컬러 팔레트** (기존 03_ 파일과 동일):
- 탭 2-1, 2-2: `data-color="mint"` (초록 계열)
- 탭 2-3, 2-4: `data-color="blue"` (파랑 계열)
- 탭 2-5, 2-6, 2-7: `data-color="amber"` (주황 계열)
- 탭 2-8: `data-color="red"` (빨강 계열)
- 탭 2-9: `data-color="purple"` (보라 계열)

### Step 5: 파일 저장 + 완료 메시지

```
✅ 평가결과서 HTML 생성 완료
📄 출력: outputs/{날짜}_{아이템명}/04_발굴단계완료_{아이템명}.html
📊 탭 9개: 2-1 레퍼런스 ~ 2-9 멀티 페르소나
💡 브라우저에서 열어 확인하세요
```

## 데이터가 부족한 탭 처리

PRD에서 해당 탭의 데이터를 찾지 못한 경우:
1. 탭은 생성하되, "이 섹션의 데이터를 PRD에서 찾지 못했습니다" 안내 메시지 표시
2. 해당 탭 버튼에 `(미완)` 표시 추가
3. 모든 탭이 비어 있으면 에러 반환

## 참조 파일
- `references/03_AX사업개발_발굴단계완료(안).html` — Fooding AI 예시 (실제 데이터가 채워진 완성 예시)
- `references/evaluation-report-template.html` — CSS/JS 범용 템플릿
