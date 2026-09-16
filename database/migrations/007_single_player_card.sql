-- Retain historical editions and purchases for audit, but merge album ownership.
INSERT OR IGNORE INTO stickers(id,name,description,image_url,rarity,season,type,owner_id,created_at)
SELECT 'card-'||u.id,p.display_name,'Карточка игрока','', 'COMMON',NULL,'COLLECTION',u.id,u.created_at
FROM users u JOIN profiles p ON p.user_id=u.id
WHERE COALESCE((SELECT is_guest FROM player_preferences WHERE user_id=u.id),0)=0;

INSERT INTO user_stickers(user_id,sticker_id,quantity,first_received_at,last_received_at)
SELECT us.user_id,'card-'||s.owner_id,1,MIN(us.first_received_at),MAX(us.last_received_at)
FROM user_stickers us JOIN stickers s ON s.id=us.sticker_id
JOIN stickers canonical ON canonical.id='card-'||s.owner_id
WHERE us.quantity>0 AND s.owner_id IS NOT NULL
GROUP BY us.user_id,s.owner_id
ON CONFLICT(user_id,sticker_id) DO UPDATE SET quantity=1,
first_received_at=MIN(user_stickers.first_received_at,excluded.first_received_at),
last_received_at=MAX(user_stickers.last_received_at,excluded.last_received_at);

-- All packs now contain the same player cards; retire the old rarity premiums.
UPDATE packs SET active=0 WHERE id IN ('pro','legendary');
