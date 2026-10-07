ALTER TABLE tournaments ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE tournaments ADD COLUMN source_url TEXT NOT NULL DEFAULT '';
ALTER TABLE tournaments ADD COLUMN source_message_id TEXT NOT NULL DEFAULT '';
ALTER TABLE tournaments ADD COLUMN source_text TEXT NOT NULL DEFAULT '';
ALTER TABLE tournaments ADD COLUMN imported_at TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_source_message ON tournaments(source_message_id) WHERE source_message_id<>'';
