export const defaults={newK:40,regularK:24,highK:16,newGames:30,highRating:1800,matchWin:30,matchLoss:5,tournamentParticipation:100,tournamentWin:500,dailyActivity:10,pairCooldownMinutes:60,dailyRewardMatches:10,leagues:[{name:'BRONZE',min:0},{name:'SILVER',min:1000},{name:'GOLD',min:1200},{name:'PLATINUM',min:1400},{name:'DIAMOND',min:1600},{name:'MASTER',min:1800}]};
export type GameConfig=typeof defaults;
export function elo(rating:number,opponent:number,games:number,win:boolean,c:GameConfig=defaults){const k=games<c.newGames?c.newK:rating>=c.highRating?c.highK:c.regularK;return Math.round(k*((win?1:0)-1/(1+10**((opponent-rating)/400))));}
export function league(rating:number,c:GameConfig=defaults){return [...c.leagues].reverse().find(l=>rating>=l.min)?.name || 'BRONZE';}
export function matchReward(win:boolean,eligible:boolean,c:GameConfig=defaults){return eligible?(win?c.matchWin:c.matchLoss):0;}
