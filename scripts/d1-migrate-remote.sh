#!/usr/bin/env bash
# D1 마이그레이션 원격 적용 — wrangler 없이 Cloudflare REST API 직접 호출
# Usage: ./scripts/d1-migrate-remote.sh [migration_file.sql]
#   인자 없으면: 미적용 마이그레이션 자동 감지 + 순차 적용
#   인자 있으면: 특정 SQL 파일만 실행

set -euo pipefail

# Cloudflare 설정 (wrangler.toml에서 추출)
ACCOUNT_ID="b6c06059b413892a92f150e5ca496236"
DATABASE_ID="6338688e-b050-4835-98a2-7101f9215c76"
MIGRATIONS_DIR="packages/api/src/db/migrations"

# API Token — 환경변수 또는 wrangler 인증 파일에서 읽기
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  TOKEN="$CLOUDFLARE_API_TOKEN"
elif [ -f "$HOME/.wrangler/config/default.toml" ]; then
  TOKEN=$(grep -oP 'oauth_token\s*=\s*"\K[^"]+' "$HOME/.wrangler/config/default.toml" 2>/dev/null || true)
fi

if [ -z "${TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN 환경변수를 설정하거나 wrangler login을 실행해주세요"
  echo "   export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}"

# D1에 SQL 실행하는 함수
d1_query() {
  local sql="$1"
  curl -s -X POST "${API_BASE}/query" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"sql\": $(echo "$sql" | jq -Rs .)}" 2>/dev/null
}

# 특정 SQL 파일 실행 모드
if [ -n "${1:-}" ]; then
  SQL_FILE="$1"
  if [ ! -f "$SQL_FILE" ]; then
    # 상대 경로로도 시도
    SQL_FILE="${MIGRATIONS_DIR}/$1"
  fi
  if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 파일을 찾을 수 없어요: $1"
    exit 1
  fi

  echo "📋 실행할 파일: $SQL_FILE"
  SQL_CONTENT=$(cat "$SQL_FILE")

  # 각 statement를 ';' 기준으로 분리하여 순차 실행
  STMT_COUNT=0
  FAIL_COUNT=0
  while IFS= read -r stmt; do
    stmt=$(echo "$stmt" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    # 빈 줄, 주석만 있는 줄 건너뛰기
    [ -z "$stmt" ] && continue
    echo "$stmt" | grep -qE '^--' && continue

    RESULT=$(d1_query "$stmt")
    SUCCESS=$(echo "$RESULT" | jq -r '.success // false')
    if [ "$SUCCESS" = "true" ]; then
      ((STMT_COUNT++))
    else
      ((FAIL_COUNT++))
      ERROR=$(echo "$RESULT" | jq -r '.errors[0].message // "unknown"')
      echo "  ⚠️ 실패: $ERROR"
      echo "  SQL: ${stmt:0:80}..."
    fi
  done < <(
    # SQL을 세미콜론 기준으로 분리 (주석 제거, CREATE TABLE 등 여러 줄 처리)
    sed 's/--.*$//' "$SQL_FILE" | tr '\n' ' ' | sed 's/;/;\n/g'
  )

  echo "✅ 완료: ${STMT_COUNT} statements 성공, ${FAIL_COUNT} 실패"
  exit 0
fi

# 미적용 마이그레이션 자동 감지 모드
echo "🔍 D1 remote 마이그레이션 상태 확인 중..."

# d1_migrations 테이블에서 적용된 마이그레이션 목록 조회
APPLIED_RESULT=$(d1_query "SELECT name FROM d1_migrations ORDER BY id")
APPLIED_SUCCESS=$(echo "$APPLIED_RESULT" | jq -r '.success // false')

if [ "$APPLIED_SUCCESS" != "true" ]; then
  echo "⚠️ d1_migrations 테이블 조회 실패 — wrangler 관리 마이그레이션이 아닐 수 있어요"
  echo "   특정 파일을 지정해서 실행해주세요: $0 0083_captured_engine.sql"
  exit 1
fi

# 적용된 마이그레이션 이름 추출
APPLIED_NAMES=$(echo "$APPLIED_RESULT" | jq -r '.result[0].results[].name' 2>/dev/null | sort)

# 로컬 마이그레이션 파일 목록
LOCAL_FILES=$(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -I{} basename {} | sort)

# 미적용 마이그레이션 찾기
PENDING=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  name="${file%.sql}"
  if ! echo "$APPLIED_NAMES" | grep -qF "$name"; then
    PENDING+=("$file")
  fi
done <<< "$LOCAL_FILES"

if [ ${#PENDING[@]} -eq 0 ]; then
  echo "✅ 모든 마이그레이션이 이미 적용되어 있어요"
  exit 0
fi

echo "📋 미적용 마이그레이션 ${#PENDING[@]}건:"
for f in "${PENDING[@]}"; do
  echo "  - $f"
done
echo ""
read -p "적용할까요? (y/N) " -n 1 -r
echo ""
[ "$REPLY" != "y" ] && [ "$REPLY" != "Y" ] && { echo "취소됨"; exit 0; }

# 순차 적용
for f in "${PENDING[@]}"; do
  echo "🔄 적용 중: $f"
  "$0" "${MIGRATIONS_DIR}/$f"

  # d1_migrations 테이블에 기록 (wrangler 호환)
  MIGRATE_SQL="INSERT INTO d1_migrations (name) VALUES ('${f%.sql}')"
  d1_query "$MIGRATE_SQL" > /dev/null
  echo "  ✅ d1_migrations에 기록 완료"
done

echo ""
echo "🎉 전체 ${#PENDING[@]}건 마이그레이션 적용 완료"
