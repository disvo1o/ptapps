import { Link } from 'react-router-dom';
import { ArrowUpRight, Wine } from 'lucide-react';
import { useApp } from '../context';
import { useResource, number, type Row } from '../api';
import { Avatar } from '../components/ui';
import { OfferCard } from '../components/OfferCard';
export default function Home(){const {me,version}=useApp(),offers=useResource<Row[]>('/offers',version);return <div className="home-hub">
 <div className="hub-greeting"><div><span>Твой клуб настольного тенниса</span><h1>Привет, {me.display_name.split(' ')[0]}.</h1></div><Link to="/profile" aria-label="Мой профиль"><Avatar user={me} size="large"/></Link></div>
 <Link to="/tournaments" className="hub-tournaments"><div><span>ВСТРЕЧАЕМСЯ У СТОЛА</span><h2>Турниры</h2><p>Сегодня. Здесь. Вместе.</p></div><div className="table-mark" aria-hidden="true"><i/><b/></div><ArrowUpRight/></Link>
 <div className="hub-stats"><Link to="/leaderboard"><span>Турнирный рейтинг</span><strong>{number(me.rating)}</strong></Link><Link to="/wallet"><span>Понгсы</span><strong>{number(me.pingpoints)} <small>ПП</small></strong></Link></div>
 <section className="hub-discovery"><div className="hub-section-heading"><h2>Хочешь выпить?</h2><Link to="/offers">Все места <ArrowUpRight size={16}/></Link></div>{offers.data?.length?<OfferCard offer={offers.data[0]} compact/>:<Link className="venue-empty" to="/offers"><Wine size={25}/><div><strong>{offers.error?'Открыть предложения':'После игры — вместе'}</strong><span>{offers.error?'Проверить доступные места':'Предложения заведений появятся здесь'}</span></div><ArrowUpRight size={18}/></Link>}</section>
 </div>;}
