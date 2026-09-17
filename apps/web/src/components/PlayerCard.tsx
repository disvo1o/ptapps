import '../player-cards.css';
import { LockKeyhole, ArrowUpRight } from 'lucide-react';
import type { Row } from '../api';
import { Avatar } from './ui';
export const rarityNames:Record<string,string>={ALL:'Любая',COMMON:'Обычная',UNCOMMON:'Необычная',RARE:'Редкая',EPIC:'Эпическая',LEGENDARY:'Легендарная',MYTHIC:'Мифическая'};
export function PlayerCard({card,onClick}:{card:Row;onClick?:()=>void}){
 const locked=card.quantity===0,name=card.name||card.display_name;
 const content=<><div className="player-card-top"><span>пинг таблет</span>{locked?<LockKeyhole size={10} aria-hidden="true"/>:<ArrowUpRight size={11} aria-hidden="true"/>}</div><div className="player-card-photo"><div className="card-court-lines"/><Avatar user={card} size="large"/><span className="card-rating">{card.rating??100}<small>Эло</small></span></div><strong>{name}</strong><div className="player-card-stats"><span><b>{card.wins??0}</b>победы</span><span><b>{card.win_rate??0}%</b>успех</span><span><b>{card.games??0}</b>матчи</span></div></>;
 const className=`player-card ${locked?'locked':'collected'}`;
 return onClick?<button className={className} data-player-id={card.owner_id} aria-label={`${name} — ${locked?'пока не получена':'в коллекции'}`} onClick={onClick}>{content}</button>:<div className={className}>{content}</div>;
}
