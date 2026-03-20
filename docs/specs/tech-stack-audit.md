# F98 기술 스택 점검 — 호환성 매트릭스 & 통합 전략

## 호환성 매트릭스

| 항목 | Foundry-X | Discovery-X | AI Foundry | 호환성 |
|------|-----------|-------------|------------|--------|
| 인프라 | CF Workers+Pages+D1 | CF Pages+Workers(4)+D1 | CF Pages+Workers(12)+D1+R2 | 동일 |
| 언어 | TypeScript 5.x | TypeScript 5.7.3 | TypeScript 5.7.3 | 동일 |
| Frontend | Next.js 14+React 18 | Remix v2+React 19 | React 18+Vite SPA | 프레임워크 상이 |
| UI | @base-ui+shadcn v4 | @radix-ui+AXIS DS v1.1.1 | @radix-ui+Tailwind | 프리미티브 상이 |
| CSS | Tailwind v4 (oklch) | Tailwind v4 (@theme inline) | Tailwind v4 | 동일 엔진 |
| DB | D1 (raw SQL) | D1 (Drizzle ORM) | D1+Neo4j Aura | Neo4j 별도 |
| Auth | JWT+PBKDF2+RBAC | Arctic OAuth(Google) | HMAC+RBAC | 3방식 병존 |
| 빌드 | pnpm+Turborepo | pnpm | Bun+Turborepo | 패키지매니저 |

## 통합 전략

- **Step 1: UI 통일 (F104, Sprint 25)** — Foundry-X shadcn → AXIS DS
- **Step 2: 프론트엔드 통합 (F106)** — 서브 라우트 통합
- **Step 3: 인증 SSO (F108)** — 3가지 인증 → 통합
- **Step 4: API 통합 (F109)** — BFF 패턴
- **Step 5: 데이터 통합 (F111)** — 크로스 D1

## Kill 조건 판정: Go

- AXIS DS 전환 가능 (shadcn 상위 호환)
- 인프라 동일 (Cloudflare)
- 고위험: 인증 통합 (3방식)
