import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, ScanLine } from 'lucide-react';
import { useApp } from '../context';
import { useResource, date, number, type Row } from '../api';
import { Avatar, SectionTitle, Skeleton, ErrorView, Empty } from '../components/ui';

export default function Home(){
 const {me,version}=useApp();
 const tournaments=useResource<Row[]>('/tournaments',version);
 const upcoming=tournaments.data?.find(t=>t.status==='OPEN'||t.status==='FULL');
 return <div className="home-clean">
  <section className="club-hero" aria-label="Твой клуб настольного тенниса">
   <img className="hero-photo" src="/images/quiet-paddle.webp" alt="" fetchPriority="high"/>
   <div className="home-greeting">
    <div><span className="eyebrow">Рады видеть тебя в клубе</span><h1>Привет, {me.display_name.split(' ')[0]}.</h1></div>
    <Link aria-label="Мой профиль" to="/profile"><Avatar user={me} size="large"/></Link>
   </div>
   <div className="club-hero-copy">
    <span className="hero-tag">КЛУБ НАСТОЛЬНОГО ТЕННИСА</span>
    <h2>Твоя игра.<br/><em>Твои люди.</em></h2>
    <p>Один QR-код — и ты в турнире.</p>
    <div className="hero-actions">
     <Link to="/scan" className="hero-action hero-scan"><ScanLine/><ArrowUpRight className="action-arrow"/><strong>Сканировать QR</strong></Link>
     <Link to="/tournaments" className="hero-action"><CalendarDays/><ArrowUpRight className="action-arrow"/><strong>Турниры клуба</strong></Link>
    </div>
   </div>
  </section>
  <span className="hero-source" title="Фото кадрировано и тонировано. Адаптация под CC BY-SA 4.0.">Фото: <a href="https://commons.wikimedia.org/wiki/File:Table_Tennis_racquet_and_ball_on_table_with_the_net_-_side_view.jpg" target="_blank" rel="noreferrer">KeepActive Australia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></span>
  <div className="home-summary">
   <Link to="/leaderboard"><span>Мой рейтинг</span><strong>{number(me.rating)}<small>Эло</small></strong><ArrowUpRight/></Link>
   <Link to="/wallet"><span>Пинг поинты</span><strong>{number(me.pingpoints)}<small>ПП</small></strong><ArrowUpRight/></Link>
  </div>
  <SectionTitle title="Следующая встреча" to="/tournaments" label="Все турниры"/>
  {tournaments.error?<ErrorView message={tournaments.error} retry={tournaments.reload}/>:!tournaments.data?<Skeleton/>:upcoming?<Link to={`/tournaments/${upcoming.id}`} className="featured-tournament"><div className="tournament-visual"><CalendarDays size={24}/></div><div className="tournament-info"><span className="event-status">{upcoming.status==='FULL'?'Регистрация завершена':'Регистрация открыта'}</span><h3>{upcoming.title}</h3><div className="tournament-meta"><span>{date(upcoming.start_at)}</span><span>{upcoming.player_count} / {upcoming.max_players} игроков</span></div></div><ArrowUpRight size={22}/></Link>:<Empty title="Скоро встретимся у стола" text="Турниры появятся здесь. Уже на месте? Сканируй QR организатора."/>}
 </div>;
}
