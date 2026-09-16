import '../player-cards.css';
import { LockKeyhole } from 'lucide-react';
import type { Row } from '../api';
import { Avatar } from './ui';
export const rarityNames:Record<string,string>={ALL:'Любая',COMMON:'Обычная',UNCOMMON:'Необычная',RARE:'Редкая',EPIC:'Эпическая',LEGENDARY:'Легендарная',MYTHIC:'Мифическая'};
export function PlayerCard({card,onClick}:{card:Row;onClick?:()=>void}){
 const locked=card.quantity===0,name=card.name||card.display_name;
 const content=<><div className="player-card-top"><span>пинг таблет</span>{locked&&<LockKeyhole size={11} aria-hidden="true"/>}</div><div className="player-card-photo"><Avatar user={card} size="large"/></div><strong>{name}</strong><div className="player-card-stats"><span><b>{card.rating??100}</b>рейтинг</span><span><b>{card.wins??0}</b>победы</span><span><b>{card.win_rate??0}%</b>успех</span></div></>;
 const className=`player-card ${locked?'locked':'collected'}`;
 return onClick?<button className={className} data-player-id={card.owner_id} aria-label={`${name} — ${locked?'пока не получена':'в коллекции'}`} onClick={onClick}>{content}</button>:<div className={className}>{content}</div>;
}
