import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useResource, type Row } from '../api';
import { useApp } from '../context';
import { PageTitle, Modal, Skeleton, ErrorView, Empty } from '../components/ui';
import { PlayerCard } from '../components/PlayerCard';
export default function Collection(){
 const {version}=useApp();
 const {data:cards,error,reload}=useResource<Row[]>('/me/stickers',version);
 const [selected,setSelected]=useState<Row|null>(null);
 const collected=cards?.filter(card=>card.quantity>0).length||0;
 return <section className="album-page">
  <PageTitle title="Карточки" action={<Link className="btn" to="/shop">Открыть пак <ArrowUpRight size={16}/></Link>}/>
  {cards&&<p className="album-count">Собрано <strong>{collected} из {cards.length}</strong></p>}
  {error?<ErrorView message={error} retry={reload}/>:!cards?<Skeleton/>:!cards.length?<Empty title="Игроки скоро появятся"/>:<div className="collection-grid album-grid">{cards.map(card=><PlayerCard key={card.owner_id} card={card} onClick={()=>setSelected(card)}/>)}</div>}
  {selected&&<Modal title={selected.name} onClose={()=>setSelected(null)}><div className="sticker-detail"><PlayerCard card={selected}/><p>{selected.quantity>0?'В твоей коллекции':'Пока не получена'}</p><Link className="btn primary" to={`/players/${selected.owner_id}`}>Профиль игрока <ArrowUpRight size={18}/></Link></div></Modal>}
 </section>;
}
