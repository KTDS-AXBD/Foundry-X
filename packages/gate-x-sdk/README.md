# @foundry-x/gate-x-sdk

TypeScript SDK + CLI for [Gate-X](https://gate-x.ktds-axbd.workers.dev) — AX BD evaluation pipeline service.

## Installation

```bash
npm install @foundry-x/gate-x-sdk
# or
pnpm add @foundry-x/gate-x-sdk
```

## Quick Start

```typescript
import { GateXClient } from "@foundry-x/gate-x-sdk";

const client = new GateXClient({
  apiKey: process.env.GATEX_API_KEY!,
  // baseUrl: "https://gate-x.ktds-axbd.workers.dev", // optional
});

// Check service health
const health = await client.health();
console.log(health.status); // "ok"

// Create an evaluation
const evaluation = await client.evaluations.create({
  title: "헬스케어 AI 사업 검증",
  gateType: "ax_bd",
  description: "GIVC 헬스케어 AI 파일럿 프로젝트 게이트 검증",
});
console.log(evaluation.id);

// List evaluations
const list = await client.evaluations.list({ status: "in_review", limit: 10 });
console.log(list.items);
```

## API Reference

### `new GateXClient(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | string | ✅ | Gate-X API key |
| `baseUrl` | string | — | Custom base URL (default: `https://gate-x.ktds-axbd.workers.dev`) |

### `client.health()`

Check service health.

```typescript
const { service, status, ts } = await client.health();
```

---

### `client.evaluations`

#### `create(input)`

```typescript
const eval_ = await client.evaluations.create({
  title: "검증 제목",
  gateType: "ax_bd",
  bizItemId: "biz-123", // optional
  description: "설명",  // optional
});
```

#### `list(opts?)`

```typescript
const result = await client.evaluations.list({
  status: "in_review",  // draft | in_review | approved | rejected
  limit: 20,
  offset: 0,
});
// result.items, result.total, result.limit, result.offset
```

#### `get(evalId)`

```typescript
const eval_ = await client.evaluations.get("eval-uuid");
```

#### `updateStatus(evalId, status, reason?)`

```typescript
const updated = await client.evaluations.updateStatus(
  "eval-uuid",
  "approved",
  "검토 완료 — 사업성 기준 충족",
);
```

#### `createKpi(evalId, input)` / `listKpis(evalId)` / `updateKpi(evalId, kpiId, input)`

```typescript
const kpi = await client.evaluations.createKpi("eval-uuid", {
  name: "매출 목표",
  target: "1억원/분기",
});

const kpis = await client.evaluations.listKpis("eval-uuid");

await client.evaluations.updateKpi("eval-uuid", kpi.id, {
  actual: "1.2억원",
  status: "met",
});
```

#### `getHistory(evalId)` / `getPortfolio()`

```typescript
const history = await client.evaluations.getHistory("eval-uuid");
const portfolio = await client.evaluations.getPortfolio();
```

---

### `client.gatePackage`

#### `create(bizItemId, input)` / `get(bizItemId)` / `download(bizItemId)` / `updateStatus(bizItemId, status)`

```typescript
const pkg = await client.gatePackage.create("biz-123", { gateType: "ax_bd" });
const pkg2 = await client.gatePackage.get("biz-123");
const dl = await client.gatePackage.download("biz-123");
// dl.downloadUrl, dl.expiresAt
```

---

### `client.ogd`

#### `run(input)` / `getStatus(jobId)`

```typescript
const job = await client.ogd.run({
  content: "검증할 콘텐츠",
  rubric: "검증 기준 (optional)",
  maxIterations: 3,
  modelProvider: "anthropic", // anthropic | openai | google
});
// job.jobId, job.status ("queued" | "running" | "completed" | "failed")

const status = await client.ogd.getStatus(job.jobId);
```

---

## Error Handling

```typescript
import { GateXRequestError } from "@foundry-x/gate-x-sdk";

try {
  await client.evaluations.get("non-existent");
} catch (e) {
  if (e instanceof GateXRequestError) {
    console.error(e.status);  // e.g. 404
    console.error(e.error);   // e.g. "Evaluation not found"
    console.error(e.details); // optional structured details
  }
}
```

---

## CLI

```bash
# Install globally
npm install -g @foundry-x/gate-x-sdk

# Set credentials
export GATEX_API_KEY=your-api-key
export GATEX_BASE_URL=https://gate-x.ktds-axbd.workers.dev  # optional

# Health check
gate-x health
gate-x health --pretty

# Evaluations
gate-x eval list
gate-x eval list --status in_review --limit 5
gate-x eval get <evalId>
gate-x eval create --title "신규 검증" --gate-type ax_bd
gate-x eval status <evalId> approved --reason "기준 충족"

# Gate Package
gate-x gate-package get <bizItemId>
gate-x gate-package download <bizItemId>

# O-G-D Pipeline
gate-x ogd run --content "검증할 내용" --max-iterations 3 --model anthropic
gate-x ogd status <jobId>

# Global options
gate-x --api-key <key> --base-url <url> eval list
gate-x eval list --pretty
```

## License

Internal — KTDS AX BD팀
