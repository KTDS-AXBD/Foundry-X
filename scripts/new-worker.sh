#!/usr/bin/env bash
# F569(d): new-worker.sh — harness-kit scaffold로 새 Worker 생성
# Usage: bash scripts/new-worker.sh <name> <service-id>
# Example: bash scripts/new-worker.sh fx-agent foundry-x
# Available service-ids: foundry-x | discovery-x | ai-foundry | gate-x | launch-x | eval-x

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/new-worker.sh <name> <service-id>"
  echo "  name       — kebab-case Worker 이름 (예: fx-agent)"
  echo "  service-id — ServiceId 타입 (예: foundry-x | discovery-x | ai-foundry | gate-x | launch-x | eval-x)"
  echo ""
  echo "Example:"
  echo "  bash scripts/new-worker.sh fx-agent foundry-x"
  exit 1
fi

WORKER_NAME="$1"
SERVICE_ID="$2"
OUTPUT_DIR="$PROJECT_ROOT/packages/$WORKER_NAME"

if [[ -d "$OUTPUT_DIR" ]]; then
  echo "❌ Error: $OUTPUT_DIR already exists"
  exit 1
fi

echo "🏗️  Creating Worker scaffold: $WORKER_NAME ($SERVICE_ID)"
echo "   Output: $OUTPUT_DIR"
echo ""

# harness-kit scaffold CLI 실행
npx --yes tsx "$PROJECT_ROOT/packages/harness-kit/src/cli/index.ts" scaffold \
  --name "$WORKER_NAME" \
  --service-id "$SERVICE_ID" \
  --output-dir "$OUTPUT_DIR" \
  2>/dev/null || node "$PROJECT_ROOT/packages/harness-kit/dist/cli/index.js" scaffold \
  --name "$WORKER_NAME" \
  --service-id "$SERVICE_ID" \
  --output-dir "$OUTPUT_DIR"

echo ""
echo "✅ Scaffold created: $OUTPUT_DIR"
echo ""
echo "📋 다음 단계:"
echo "  1. pnpm-workspace.yaml에 추가:"
echo "     - 'packages/$WORKER_NAME'"
echo ""
echo "  2. pnpm install"
echo ""
echo "  3. wrangler.toml에서 Cloudflare account_id와 D1 database_id 설정"
echo ""
echo "  4. Secrets 등록:"
echo "     npx wrangler secret put JWT_SECRET --env production"
echo ""
echo "  5. Deploy:"
echo "     cd packages/$WORKER_NAME && npx wrangler deploy"
