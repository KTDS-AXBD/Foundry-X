#!/usr/bin/env bash
# Azure SQL 마이그레이션 스크립트 — Sprint 46 F162 PoC
#
# 사전 조건:
#   - sqlcmd 설치 (Azure CLI 포함)
#   - AZURE_SQL_SERVER, AZURE_SQL_DB, AZURE_SQL_USER, AZURE_SQL_PASS 환경변수
#
# 사용법:
#   export AZURE_SQL_SERVER="your-server.database.windows.net"
#   export AZURE_SQL_DB="foundry-x-poc"
#   export AZURE_SQL_USER="admin"
#   export AZURE_SQL_PASS="your-password"
#   bash packages/api/src/db/azure/migrate.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════"
echo "  Foundry-X Azure SQL Migration (PoC)"
echo "═══════════════════════════════════════"

# 환경변수 확인
for var in AZURE_SQL_SERVER AZURE_SQL_DB AZURE_SQL_USER AZURE_SQL_PASS; do
  if [ -z "${!var:-}" ]; then
    echo "❌ ERROR: $var is not set"
    exit 1
  fi
done

SQLCMD_OPTS="-S $AZURE_SQL_SERVER -d $AZURE_SQL_DB -U $AZURE_SQL_USER -P $AZURE_SQL_PASS -C"

echo ""
echo "📡 Server: $AZURE_SQL_SERVER"
echo "📦 Database: $AZURE_SQL_DB"
echo ""

# Step 1: 테이블 생성
echo "🔧 Step 1: Creating core tables..."
sqlcmd $SQLCMD_OPTS -i "$SCRIPT_DIR/001_create_core_tables.sql"
echo "   ✅ Core tables created"

# Step 2: 시드 데이터
echo "🌱 Step 2: Seeding demo data..."
sqlcmd $SQLCMD_OPTS -i "$SCRIPT_DIR/002_seed_demo_data.sql"
echo "   ✅ Demo data seeded"

# Step 3: 검증
echo "🔍 Step 3: Verifying..."
sqlcmd $SQLCMD_OPTS -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME;" -h -1
echo ""

TABLE_COUNT=$(sqlcmd $SQLCMD_OPTS -Q "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE';" -h -1 | tr -d ' ')
echo "   📊 Tables created: $TABLE_COUNT"

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Migration complete!"
echo "═══════════════════════════════════════"
