-- F382: Offering → Prototype 연동 (Sprint 173)
CREATE TABLE IF NOT EXISTS offering_prototypes (
  id TEXT PRIMARY KEY,
  offering_id TEXT NOT NULL,
  prototype_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(offering_id, prototype_id),
  FOREIGN KEY (offering_id) REFERENCES offerings(id) ON DELETE CASCADE,
  FOREIGN KEY (prototype_id) REFERENCES prototypes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offering_prototypes_offering ON offering_prototypes(offering_id);
