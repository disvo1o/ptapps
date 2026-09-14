-- Preserve existing purchases, balances and collections; only translate built-in labels.
UPDATE packs SET name='Первый' WHERE id='basic' AND name='Basic';
UPDATE packs SET name='Особенный' WHERE id='pro' AND name='Pro';
UPDATE packs SET name='Легендарный' WHERE id='legendary' AND name='Legendary';
UPDATE achievements SET name='Первая подача',description='Сыграй первый матч на турнире' WHERE id='FIRST_MATCH';
UPDATE achievements SET name='Первая победа',description='Победи в первом матче' WHERE id='FIRST_WIN';
UPDATE achievements SET name='В ударе',description='Выиграй 5 матчей подряд' WHERE id='FIVE_WIN_STREAK';
UPDATE achievements SET name='Не остановить',description='Выиграй 10 матчей подряд' WHERE id='TEN_WIN_STREAK';
UPDATE achievements SET name='Чемпион',description='Выиграй турнир' WHERE id='TOURNAMENT_WINNER';
UPDATE achievements SET name='Победа над фаворитом',description='Победи игрока с рейтингом на 200 выше твоего' WHERE id='GIANT_SLAYER';
UPDATE achievements SET name='Коллекционер',description='Собери карточки 25 разных игроков' WHERE id='COLLECTOR_25';
UPDATE achievements SET name='Большой альбом',description='Собери карточки 50 разных игроков' WHERE id='COLLECTOR_50';
UPDATE achievements SET name='Мастер коллекции',description='Собери карточки 100 разных игроков' WHERE id='COLLECTOR_100';
UPDATE achievements SET name='Большой запас',description='Накопи 10 000 пинг поинтов' WHERE id='RICH_10000';
CREATE INDEX IF NOT EXISTS stickers_player ON stickers(owner_id,type,rarity);
