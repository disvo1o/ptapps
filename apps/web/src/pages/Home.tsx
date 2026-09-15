import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ScanLine } from 'lucide-react';
import { useApp } from '../context';
import { useResource, date, type Row } from '../api';
import { Avatar, SectionTitle, Skeleton, ErrorView, Empty } from '../components/ui';

export default function Home(){
 const {me,version}=useApp();
 const tournaments=useResource<Row[]>('/tournaments',version);
 const upcoming=tournaments.data?.find(t=>t.status==='OPEN'||t.status==='FULL');
 return <div className="home-clean">
  <div className="home-greeting"><div><span className="eyebrow">пинг таблет</span><h1>Привет, {me.display_name.split(' ')[0]}.</h1><p>Отсканируй QR-код и приходи на турнир.</p></div><Link to="/profile"><Avatar user={me} size="large"/></Link></div>
  <section className="hero compact-hero"><div className="hero-content"><span className="hero-label">турниры рядом</span><h2>Твоя игра.<br/><em>Твой стол.</em></h2><p>Регистрация занимает секунду.</p><Link to="/scan" className="btn primary"><ScanLine size={18}/>Сканировать QR</Link></div></section>
  <div className="home-columns"><div><SectionTitle title="Ближайший турнир" to="/tournaments"/>{tournaments.error?<ErrorView message={tournaments.error} retry={tournaments.reload}/>:!tournaments.data?<Skeleton/>:upcoming?<Link to={`/tournaments/${upcoming.id}`} className="featured-tournament"><div className="tournament-visual"><CalendarDays size={46}/></div><div className="tournament-info"><span className="eyebrow">регистрация открыта</span><h3>{upcoming.title}</h3><div className="tournament-meta"><span>{date(upcoming.start_at)}</span><span>{upcoming.player_count}/{upcoming.max_players} игроков</span></div></div><ArrowUpRight size={20}/></Link>:<Empty title="Турниры скоро появятся" text="Сканируй QR организатора, чтобы зарегистрироваться."/ >}</div></div>
 </div>;
}

