-- Extend existing records and retain an explicit history of scale conversion.
DROP TRIGGER IF EXISTS ratings_initial_hundred;
ALTER TABLE ratings ADD COLUMN rating_deviation REAL NOT NULL DEFAULT 300;
ALTER TABLE ratings ADD COLUMN rating_level INTEGER NOT NULL DEFAULT 2 CHECK(rating_level BETWEEN 1 AND 3);
ALTER TABLE ratings ADD COLUMN calibrated_games INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ratings ADD COLUMN friendly_rating INTEGER NOT NULL DEFAULT 1200;
ALTER TABLE ratings ADD COLUMN friendly_deviation REAL NOT NULL DEFAULT 300;
ALTER TABLE ratings ADD COLUMN friendly_games INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ratings ADD COLUMN friendly_wins INTEGER NOT NULL DEFAULT 0;
UPDATE ratings SET rating_deviation=MAX(80,300/SQRT(1+games/4.0)),calibrated_games=games;
CREATE TRIGGER ratings_new_prior AFTER INSERT ON ratings WHEN NEW.games=0 AND NEW.rating=100
BEGIN UPDATE ratings SET rating=1200,highest_rating=1200 WHERE user_id=NEW.user_id; END;
ALTER TABLE rating_history ADD COLUMN system TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE rating_history ADD COLUMN previous_rating INTEGER;
ALTER TABLE rating_history ADD COLUMN rating_change INTEGER;
ALTER TABLE rating_history ADD COLUMN uncertainty_before REAL;
ALTER TABLE rating_history ADD COLUMN uncertainty_after REAL;
ALTER TABLE rating_history ADD COLUMN tournament_id TEXT;
ALTER TABLE rating_history ADD COLUMN details TEXT NOT NULL DEFAULT '{}';
INSERT INTO rating_history(id,user_id,rating,created_at,system,previous_rating,rating_change,uncertainty_before,uncertainty_after,details)
SELECT 'rating-v2-'||user_id,user_id,rating+1100,STRFTIME('%Y-%m-%dT%H:%M:%fZ','now'),'CALIBRATION',rating,1100,rating_deviation,rating_deviation,'{"reason":"Переход со старой шкалы 100 на шкалу 1200","model":"Club Bayesian v1"}' FROM ratings WHERE rating<400;
UPDATE ratings SET rating=rating+1100,highest_rating=highest_rating+1100 WHERE rating<400;
ALTER TABLE tournaments ADD COLUMN started_at TEXT;
ALTER TABLE tournaments ADD COLUMN finished_at TEXT;
ALTER TABLE tournaments ADD COLUMN rating_processed_at TEXT;
ALTER TABLE matches ADD COLUMN rating_system TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE matches ADD COLUMN confirmed_by TEXT REFERENCES users(id);
CREATE TABLE tournament_guest_details(user_id TEXT PRIMARY KEY REFERENCES users(id),tournament_id TEXT NOT NULL REFERENCES tournaments(id),nickname TEXT NOT NULL,name TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT '',created_by TEXT REFERENCES users(id));
CREATE TABLE venue_offers (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,address TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',
 image TEXT NOT NULL DEFAULT '',promo_code TEXT NOT NULL,discount TEXT NOT NULL,additional_text TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE game_sessions (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),game TEXT NOT NULL DEFAULT 'FLAPPY',
 seed INTEGER NOT NULL,started_at TEXT NOT NULL,expires_at TEXT NOT NULL,finished_at TEXT,
 score INTEGER,frames INTEGER,reward INTEGER NOT NULL DEFAULT 0,inputs TEXT
);
CREATE INDEX game_user ON game_sessions(user_id,started_at);
CREATE UNIQUE INDEX one_active_game ON game_sessions(user_id) WHERE finished_at IS NULL;
