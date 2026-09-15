import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useResource, number, type Row } from '../api';
import { Avatar, PageTitle, Skeleton, ErrorView } from '../components/ui';
import { useApp } from '../context';
export default function Leaderboard(){const {me,version}=useApp();const {data,error,reload}=useResource<Row[]>('/leaderboard?metric=rating',version);return <><PageTitle eyebrow="весь клуб" title="Рейтинг." description="Подтверждённые результаты турниров."/><p className="muted">Стартовый рейтинг каждого игрока — 100 Эло.</p>{error?<ErrorView message={error} retry={reload}/>:!data?<Skeleton/>:<div className="leader-table">{data.map(p=><Link to={`/players/${p.id}`} className={`leader-row ${p.id===me.id?'is-me':''}`} key={p.id}><span className="rank">{String(p.rank).padStart(2,'0')}</span><div className="leader-player"><Avatar user={p}/><span><strong>{p.display_name} {p.id===me.id&&<em>ты</em>}</strong></span></div><strong>{number(p.rating)}</strong><span className="muted">Эло</span><ArrowUpRight size={16}/></Link>)}</div>}</>;}

