export { ShardDocService } from "./services/shard-doc.js";
// NOTE: schemas barrel re-export 금지 (S336 — foundry-x-api/no-types-schema-barrel).
// schemas 심볼은 호출자가 "./schemas/shard-doc.js" 에서 직접 import.
