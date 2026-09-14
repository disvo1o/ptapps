-- Preserve played ratings; reset only untouched starting ratings.
UPDATE ratings SET rating=100, highest_rating=100 WHERE games=0 AND rating=1000 AND highest_rating=1000;
CREATE TRIGGER IF NOT EXISTS ratings_initial_hundred AFTER INSERT ON ratings
WHEN NEW.games=0 AND NEW.rating=1000 AND NEW.highest_rating=1000
BEGIN UPDATE ratings SET rating=100,highest_rating=100 WHERE user_id=NEW.user_id; END;
INSERT OR IGNORE INTO config(key,value)
SELECT 'superadmin_telegram_id',telegram_id FROM users WHERE lower(username)='disvolo' AND telegram_id NOT LIKE 'demo-%' LIMIT 1;
UPDATE users SET role='ADMIN',banned=0 WHERE telegram_id=(SELECT value FROM config WHERE key='superadmin_telegram_id');
