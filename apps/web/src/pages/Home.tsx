import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ScanLine } from 'lucide-react';
import { useApp } from '../context';
import { useResource, date, number, type Row } from '../api';
import { Avatar, SectionTitle, Skeleton, ErrorView, Empty } from '../components/ui';
import { CourtScene } from '../components/CourtScene';
export default function Home(){
 const {me,version}=useApp();const tournaments=useResource<Row[]>('/tournaments',version);
 const upcoming=tournaments.data?.find(t=>t.status==='OPEN'||t.status==='FULL');
 return <div className="home-clean">
  <div className="home-greeting"><div><span className="eyebrow">хороший день для игры</span><h1>Привет, {me.display_name.split(' ')[0]}<span className="accent-dot">.</span></h1></div><Link aria-label="Мой профиль" to="/profile"><Avatar user={me} size="large"/></Link></div>
  <section className="club-hero"><div className="club-hero-copy"><span className="hero-tag"><span/>Встречаемся у стола</span><h2>Твоя игра.<br/><em>Твои люди.</em></h2><p>Один QR-код — и ты в турнире.</p><Link to="/scan" className="btn hero-scan"><ScanLine size={21}/>Сканировать QR<ArrowUpRight size={20}/></Link></div><CourtScene/><span className="court-caption">пинг таблет / клуб настольного тенниса</span></section>
  <div className="home-summary"><Link to="/leaderboard"><span>Мой рейтинг</span><strong>{number(me.rating)}<small>Эло</small></strong><ArrowUpRight size={17}/></Link><Link to="/wallet"><span>Пинг поинты</span><strong>{number(me.pingpoints)}<small>ПП</small></strong><ArrowUpRight size={17}/></Link></div>
  <SectionTitle title="Следующая встреча" to="/tournaments" label="Все турниры"/>
  {tournaments.error?<ErrorView message={tournaments.error} retry={tournaments.reload}/>:!tournaments.data?<Skeleton/>:upcoming?<Link to={`/tournaments/${upcoming.id}`} className="featured-tournament"><div className="tournament-visual"><CalendarDays size={24}/></div><div className="tournament-info"><span className="event-status">{upcoming.status==='FULL'?'Регистрация завершена':'Регистрация открыта'}</span><h3>{upcoming.title}</h3><div className="tournament-meta"><span>{date(upcoming.start_at)}</span><span>{upcoming.player_count} / {upcoming.max_players} игроков</span></div></div><ArrowUpRight size={22}/></Link>:<Empty title="Скоро встретимся у стола" text="Турниры появятся здесь. Уже на месте? Сканируй QR организатора."/>}
 </div>;
}
