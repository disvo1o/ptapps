-- Existing ratings, cards, balances and histories are intentionally preserved.
-- Only future players receive the new friendly starting value.
CREATE TRIGGER friendly_initial_hundred AFTER INSERT ON ratings
WHEN NEW.friendly_games=0 AND NEW.friendly_rating=1200
BEGIN UPDATE ratings SET friendly_rating=100 WHERE user_id=NEW.user_id; END;
CREATE TABLE match_card_awards (
 match_id TEXT PRIMARY KEY REFERENCES matches(id),
 user_id TEXT NOT NULL REFERENCES users(id),
 sticker_id TEXT NOT NULL REFERENCES stickers(id),
 created_at TEXT NOT NULL
);
-- Mark previously confirmed results as handled; never retroactively grant cards.
INSERT OR IGNORE INTO match_card_awards
SELECT m.id,m.winner,s.id,m.confirmed_at FROM matches m JOIN stickers s ON s.id='card-'||m.loser
WHERE m.status='CONFIRMED' AND m.tournament_id IS NOT NULL AND m.winner IS NOT NULL AND m.loser IS NOT NULL;
