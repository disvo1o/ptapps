const labels:Record<string,string>={
 'First Serve':'Первая подача','Winner’s Circle':'Первая победа','On Fire':'В ударе','Unstoppable':'Не остановить','Crowned':'Чемпион','Giant Slayer':'Победа над фаворитом','The Collector':'Коллекционер','Full House':'Большая коллекция','Master Collector':'Мастер коллекции','Big Stack':'Большой запас',
 'Basic':'Первый','Pro':'Особенный','Legendary':'Легендарный',
 'Welcome to PING':'Добро пожаловать в пинг таблет','Tournament champion':'Победа в турнире','You earned an opponent’s Battle Signature':'В коллекцию добавлена карточка соперника',
 'Daily warm-up':'Ежедневная разминка','Match victory':'Победа в матче','Match played':'Участие в матче','Tournament victory':'Победа в турнире','Tournament participation':'Участие в турнире','Tournament completed':'Турнир завершён','Demo opening balance':'Начальный демо-баланс',
 'GAME':'Мини-игра','MATCH_WIN':'Победа в матче','MATCH_LOSS':'Участие в матче','TOURNAMENT':'Турнир','BONUS':'Бонус','ACHIEVEMENT':'Достижение','PACK_PURCHASE':'Покупка набора','ADMIN_ADJUSTMENT':'Корректировка администратора',
 'Welcome to First Serve. Your next great rally starts here.':'Добро пожаловать в пинг таблет. Твой следующий турнир уже близко.',
 'A match result is waiting for your confirmation':'Результат матча ожидает подтверждения',
};
export function russianMessage(message:string){
 if(labels[message])return labels[message];
 return message.replace(/You joined /g,'Ты присоединился к турниру: ').replace(/\bVictory\b/g,'Победа').replace(/Match confirmed/g,'Матч подтверждён').replace(/ rating\b/g,' рейтинга').replace(/\bPP\b/g,'пинг поинтов').replace(/ finished/g,' завершён').replace(/Joined tournament: /g,'Ты присоединился к турниру: ').replace(/Achievement unlocked: /g,'Новое достижение: ').replace(/Opened /g,'Открыт набор: ').replace(/Battle sticker received/g,'Получена карточка соперника').replace(/\b(?:First Serve|Winner’s Circle|On Fire|Unstoppable|Crowned|Giant Slayer|The Collector|Full House|Master Collector|Big Stack|Basic|Pro|Legendary)\b/g,m=>labels[m]);
}
