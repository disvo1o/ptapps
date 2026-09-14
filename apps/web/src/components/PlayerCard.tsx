import '../player-cards.css';
import type { Row } from '../api';
import { Avatar } from './ui';
export const rarityNames:Record<string,string>={ALL:'Любая',COMMON:'Обычная',UNCOMMON:'Необычная',RARE:'Редкая',EPIC:'Эпическая',LEGENDARY:'Легендарная',MYTHIC:'Мифическая'};
export function PlayerCard({card,onClick}:{card:Row;onClick?:()=>void}){
 const locked=card.quantity===0;
 const content=<><div className="player-card-top"><span>пинг таблет</span><span>{card.type==='BATTLE'?'за победу':'коллекция'}</span></div><div className="player-card-photo"><Avatar user={card} size="large"/>{card.quantity>1&&<span className="quantity">×{card.quantity}</span>}</div><span className="rarity">{rarityNames[card.rarity]||card.rarity}</span><strong>{card.name||card.display_name}</strong><div className="player-card-stats"><span><b>{card.rating??100}</b>рейтинг</span><span><b>{card.wins??0}</b>победы</span><span><b>{card.win_rate??0}%</b>успех</span></div>{locked&&<small className="player-card-locked">Ещё не в коллекции</small>}</>;
 const className=`player-card rarity-${String(card.rarity).toLowerCase()} ${locked?'locked':''}`;
 return onClick?<button className={className} onClick={onClick}>{content}</button>:<div className={className}>{content}</div>;
}
