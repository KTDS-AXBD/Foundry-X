# Offering HTML 디자인 토큰 (Phase 1)

> **Phase 1:** MD 문서 (Sprint 165 F365)
> **Phase 2:** JSON 정규 포맷 + API (Sprint 173 F381)
> **Phase 3:** Web 실시간 에디터 + CSS 커스터마이징 (Sprint 173 F381)

KOAMI v0.5 CSS에서 추출한 디자인 토큰. 모든 사업기획서 HTML에 일관된 시각 언어를 적용한다.

---

## 1. Color Tokens

### 1.1 텍스트

| Token | CSS Variable | Value | 용도 |
|-------|-------------|-------|------|
| color.text.primary | `--black` | `#111` | 본문, 제목, 강조 텍스트 |
| color.text.secondary | `--gray-600` | `#666` | 서브텍스트, 설명 |
| color.text.muted | `--gray-400` | `#999` | 라벨, 각주, 보조 정보 |
| color.text.subtle | `--gray-700` | `#444` | 카드 본문, 리스트 |

### 1.2 배경

| Token | CSS Variable | Value | 용도 |
|-------|-------------|-------|------|
| color.bg.default | `--white` | `#fff` | 기본 배경 |
| color.bg.alt | `--gray-50` | `#f8f9fa` | 교차 섹션 배경 |
| color.bg.subtle | `--gray-100` | `#f0f0f0` | 카드 내부, 코드 블록 |

### 1.3 보더

| Token | CSS Variable | Value | 용도 |
|-------|-------------|-------|------|
| color.border.default | `--gray-200` | `#e5e5e5` | 기본 카드/테이블 보더 |
| color.border.strong | `--black` | `#111` | 강조 카드, CTA 보더 |
| color.border.muted | `--gray-300` | `#ccc` | 약한 구분선 |

### 1.4 데이터 시각화 (본문/제목에 사용 금지)

| Token | CSS Variable | Value | 용도 |
|-------|-------------|-------|------|
| color.data.positive | `--green` | `#16a34a` | 긍정 배지, 통과 |
| color.data.negative | `--red` | `#dc2626` | 부정 배지, 리스크 |
| color.data.warning | `--orange` | `#ea580c` | 주의 배지, 조건부 |
| color.data.caution | `--amber` | `#d97706` | 경고, 유의 사항 |

---

## 2. Typography Tokens

| Token | Font | Size | Weight | Extra |
|-------|------|------|--------|-------|
| typography.hero | Pretendard | 48px | 900 | letter-spacing: -0.04em, line-height: 1.35 |
| typography.section | Pretendard | 36px | 800 | letter-spacing: -0.03em, line-height: 1.3 |
| typography.subsection | Pretendard | 17px | 400 | line-height: 1.7 |
| typography.body | Pretendard | 15px | 400 | line-height: 1.7 |
| typography.card-title | Pretendard | 14px | 700 | — |
| typography.label | Pretendard | 12px | 600 | text-transform: uppercase, letter-spacing: 0.08em |
| typography.footnote | Pretendard | 12px | 400 | color: --gray-400 |
| typography.kpi | Pretendard | 32px | 900 | letter-spacing: -0.03em |

### 폰트 로딩

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet">
```

Fallback: `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`

---

## 3. Layout Tokens

| Token | Value | 용도 |
|-------|-------|------|
| layout.maxWidth | `1200px` | 콘텐츠 최대 폭 |
| layout.sectionPadding | `120px 40px 80px` | 섹션 상·좌우·하 여백 |
| layout.cardRadius | `16px` | 카드 모서리 반경 |
| layout.cardRadiusSmall | `12px` | 서브 카드, 팁 모서리 |
| layout.breakpoint | `900px` | 반응형 전환점 (1열로) |
| layout.navHeight | `56px` | 상단 네비게이션 높이 |
| layout.cardPadding | `28px 24px` | 카드 내부 여백 (기본) |
| layout.cardPaddingLarge | `36px` | 카드 내부 여백 (대형) |

---

## 4. Component Spacing Tokens

| Token | Value | 용도 |
|-------|-------|------|
| spacing.grid.gap | `20px` | 그리드 기본 간격 |
| spacing.grid.gapLarge | `32px` | Before/After 등 대형 간격 |
| spacing.section.marginTop | `48px` | 섹션 내 주요 블록 상단 |
| spacing.card.marginBottom | `32px` | 카드 간 세로 간격 |
| spacing.label.marginBottom | `12px` | 라벨-제목 간격 |

---

## 5. Animation Tokens

| Token | Value | 용도 |
|-------|-------|------|
| animation.fadeIn.duration | `0.7s` | 스크롤 등장 시간 |
| animation.fadeIn.easing | `ease` | 등장 이징 |
| animation.fadeIn.translateY | `30px` | 등장 이동 거리 |
| animation.nav.blur | `12px` | 네비게이션 블러 강도 |

---

## 6. 승격 경로

```
Phase 1 (현재):  design-tokens.md
    └── MD 테이블 형식, 사람이 읽고 Agent가 참조

Phase 2 (F381):  design-tokens.json
    └── JSON 정규 포맷
    └── API: GET/PUT /api/offerings/:id/tokens
    └── offering_design_tokens D1 테이블 연동

Phase 3 (F381):  Web Token Editor
    └── 실시간 CSS variable 변경 → iframe 프리뷰
    └── 고객별 브랜드 토큰 저장
    └── export: CSS custom properties snippet
```

## 7. 커스터마이징 가이드

고객별 브랜드에 맞게 토큰을 오버라이드할 때:

1. **변경 가능 (안전):** color.data.*, typography.hero/section 크기, layout.maxWidth
2. **변경 주의 (레이아웃 영향):** layout.breakpoint, spacing.grid.gap
3. **변경 금지:** typography.body (가독성), animation (접근성)

OfferingConfig.designTokenOverrides에 Partial로 전달:
```json
{
  "designTokenOverrides": {
    "color.data.positive": "#059669",
    "typography.hero.size": "52px"
  }
}
```
