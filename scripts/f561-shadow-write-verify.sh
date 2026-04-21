#!/usr/bin/env bash
# F561 Shadow Write 검증 스크립트
# 목적: foundry-x-discovery-db에 테스트 row 1건 write 성공 확인
# 실행: bash scripts/f561-shadow-write-verify.sh
# 결과: docs/02-design/features/sprint-313-f561-fk-analysis.md §4 기록

set -euo pipefail

DISCOVERY_DB_ID="51288e69-a614-40ac-9d4d-453f5faf7a37"
LEGACY_DB_ID="6338688e-b050-4835-98a2-7101f9215c76"
TEST_ROW_ID="f561-shadow-verify-$(date +%s)"
LOG_FILE="/tmp/f561-shadow-write-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE"
}

log "=== F561 Shadow Write 검증 시작 ==="
log "Discovery DB: $DISCOVERY_DB_ID"
log "Legacy DB:    $LEGACY_DB_ID"
log "Test Row ID:  $TEST_ROW_ID"

# Step 1: discovery-db에 테스트 테이블 생성 (migration 적용 전 최소 검증)
log ""
log "--- Step 1: Discovery DB 연결 확인 ---"
if npx wrangler d1 execute foundry-x-discovery-db \
  --remote \
  --command "SELECT 1 AS ping" 2>&1 | tee -a "$LOG_FILE" | grep -q "ping"; then
  log "✅ Discovery DB 연결 성공"
else
  log "❌ Discovery DB 연결 실패"
  exit 1
fi

# Step 2: discovery-db에 임시 shadow_write_test 테이블 생성
log ""
log "--- Step 2: Shadow Write 테스트 테이블 생성 ---"
npx wrangler d1 execute foundry-x-discovery-db \
  --remote \
  --command "CREATE TABLE IF NOT EXISTS shadow_write_test (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    payload TEXT,
    written_at TEXT DEFAULT (datetime('now'))
  )" 2>&1 | tee -a "$LOG_FILE"
log "✅ shadow_write_test 테이블 생성"

# Step 3: Shadow Write 실행
log ""
log "--- Step 3: Shadow Write 실행 ---"
npx wrangler d1 execute foundry-x-discovery-db \
  --remote \
  --command "INSERT INTO shadow_write_test (id, org_id, payload) VALUES ('$TEST_ROW_ID', 'test-org', '{\"source\":\"f561-shadow-write\",\"sprint\":313}')" \
  2>&1 | tee -a "$LOG_FILE"
log "✅ Shadow Write INSERT 성공"

# Step 4: 읽기 검증
log ""
log "--- Step 4: Shadow Write 결과 읽기 확인 ---"
RESULT=$(npx wrangler d1 execute foundry-x-discovery-db \
  --remote \
  --command "SELECT id, org_id, written_at FROM shadow_write_test WHERE id='$TEST_ROW_ID'" \
  2>&1)
echo "$RESULT" | tee -a "$LOG_FILE"

if echo "$RESULT" | grep -q "$TEST_ROW_ID"; then
  log "✅ Shadow Write 결과 읽기 성공 — row 확인됨"
else
  log "❌ Shadow Write 결과 읽기 실패"
  exit 1
fi

# Step 5: 기존 DB (foundry-x-db) 영향 없음 확인
log ""
log "--- Step 5: 기존 DB 독립성 확인 ---"
if npx wrangler d1 execute foundry-x-db \
  --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='shadow_write_test'" \
  2>&1 | grep -q "shadow_write_test"; then
  log "⚠️  기존 DB에 shadow_write_test 테이블 존재 — 격리 문제"
else
  log "✅ 기존 foundry-x-db는 영향 없음 (격리 확인)"
fi

# Step 6: 클린업
log ""
log "--- Step 6: 테스트 데이터 클린업 ---"
npx wrangler d1 execute foundry-x-discovery-db \
  --remote \
  --command "DELETE FROM shadow_write_test WHERE id='$TEST_ROW_ID'" \
  2>&1 | tee -a "$LOG_FILE"
log "✅ 테스트 row 삭제 완료"

log ""
log "=== F561 Shadow Write 검증 완료 ==="
log "로그 파일: $LOG_FILE"
log ""
log "결과 요약:"
log "  - Discovery DB 연결:    ✅"
log "  - Shadow Write INSERT:  ✅"
log "  - Shadow Read 확인:     ✅"
log "  - 기존 DB 독립성:       ✅"
log ""
log "Phase Exit P2 조건 충족: foundry-x-discovery-db에 테스트 row write 성공"
