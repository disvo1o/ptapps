import { Suspense, useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { House, ScanLine, ChartNoAxesColumnIncreasing, UserRound, Moon, Sun, ChevronDown, Settings2 } from 'lucide-react';
import { useApp } from '../context';
import { Avatar, Modal, Skeleton } from './ui';
import { useResource, type Row } from '../api';
import { tg, haptic } from '../telegram';
const nav=[{to:'/',label:'Главная',icon:House},{to:'/leaderboard',label:'Рейтинг',icon:ChartNoAxesColumnIncreasing},{to:'/scan',label:'Сканировать',icon:ScanLine},{to:'/profile',label:'Профиль',icon:UserRound}];
export default function Layout(){
 const {me,mock,switchUser,toast}=useApp();const demoUsers=useResource<Row[]>(mock?'/auth/demo-users':'/auth/config');const [demo,setDemo]=useState(false);
 const [theme,setTheme]=useState(localStorage.getItem('pt-theme')||'light');
 
 const location=useLocation(),navigate=useNavigate();const activeIndex=Math.max(0,nav.findIndex(n=>n.to==='/'?location.pathname==='/':location.pathname.startsWith(n.to)||(n.to==='/leaderboard'&&location.pathname==='/friendly')||(n.to==='/profile'&&['/collection','/statistics','/admin','/handicap','/dating','/install'].some(p=>location.pathname.startsWith(p)))));const navStyle={'--active-index':activeIndex} as React.CSSProperties;
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('pt-theme',theme);try{tg()?.setHeaderColor?.(theme==='dark'?'#14232b':'#eef1f3');tg()?.setBackgroundColor?.(theme==='dark'?'#14232b':'#eef1f3');}catch{}},[theme]);
 useEffect(()=>{window.scrollTo(0,0);const app=tg();if(!app?.initData)return;const back=()=>navigate(-1);if(location.pathname!=='/')app.BackButton.show();else app.BackButton.hide();app.BackButton.onClick(back);
 const viewport=()=>{const s=document.documentElement.style;s.setProperty('--tg-viewport',`${app.viewportStableHeight||window.innerHeight}px`);s.setProperty('--tg-safe-top',`${(app.safeAreaInset?.top||0)+(app.contentSafeAreaInset?.top||0)}px`);s.setProperty('--tg-safe-bottom',`${app.safeAreaInset?.bottom||0}px`);};
 app.onEvent('viewportChanged',viewport);app.onEvent('safeAreaChanged',viewport);app.onEvent('contentSafeAreaChanged',viewport);viewport();return()=>{app.BackButton.offClick(back);app.offEvent('viewportChanged',viewport);app.offEvent('safeAreaChanged',viewport);app.offEvent('contentSafeAreaChanged',viewport);};},[location.pathname,navigate]);
 function animateIcon(link:Element){
  if(localStorage.getItem('pt-motion')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const icon=link.querySelector('svg');if(!icon)return;
  icon.getAnimations().forEach(animation=>animation.cancel());
  const href=link.getAttribute('href');
  const motion=href==='/scan'?['scale(1)','scale(.92)','scale(1.04)','scale(1)']:href==='/leaderboard'?['scaleY(1)','scaleY(.9)','scaleY(1.04)','scaleY(1)']:href==='/profile'?['rotate(0)','rotate(-5deg)','rotate(3deg)','rotate(0)']:['translateY(0)','translateY(-2px)','translateY(1px)','translateY(0)'];
  icon.animate(motion.map(transform=>({transform})),{duration:320,easing:'cubic-bezier(.2,.7,.3,1)'});
 }
 return <div className={`app-shell ${location.pathname==='/'?'is-home':''}`} onClickCapture={e=>{const el=(e.target as HTMLElement).closest('a,button,summary');if(el&&!el.hasAttribute('disabled')){haptic(el.closest('.tabs,.bottom-nav,.sidebar')?'selection':'soft');if(el.closest('.bottom-nav'))animateIcon(el);}}}>
 <aside className="sidebar"><Link to="/" className="wordmark" aria-label="пинг таблет — главная"><span className="brand-symbol" aria-hidden="true">↗</span>пинг таблет</Link><span className="brand-caption">клуб настольного тенниса</span><div className="nav-caption">твоя игра</div><nav className="primary-side-nav" style={navStyle}><span className="nav-glider" aria-hidden="true"/>{nav.map(({to,label,icon:Icon})=><NavLink key={to} className={to==='/scan'?'scan-nav':undefined} to={to} end={to==='/'}><Icon size={21}/><span>{label}</span></NavLink>)}</nav>{me.role==='ADMIN'&&<><div className="nav-caption">администрирование</div><nav><NavLink to="/admin"><Settings2 size={21}/>Управление</NavLink></nav></>}<div className="sidebar-bottom"><Link className="account-row" to="/profile"><Avatar user={me}/><strong>{me.display_name.split(' ')[0]}</strong></Link></div></aside>
 <div className="main-shell"><header className="topbar"><Link to="/" className="wordmark mobile-logo"><span className="brand-symbol" aria-hidden="true">↗</span>пинг таблет</Link><span className="desktop-topline"><span className="live-dot"/>Твой клуб. Твоя игра.</span><div className="top-actions">{mock&&<button className="demo-button" onClick={()=>setDemo(true)}>Демо <ChevronDown size={12}/></button>}<button className="icon-btn theme-btn" aria-label={theme==='dark'?'Светлая тема':'Тёмная тема'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button></div></header><main key={me.id}><div className="page-content" data-route={location.pathname}><Suspense fallback={<Skeleton/>}><Outlet/></Suspense></div></main><footer className="desktop-footer"><span>пинг таблет © 2026</span><span>играем. знакомимся. собираем.</span></footer></div>
 <nav className="bottom-nav" style={navStyle} aria-label="Основная навигация"><span className="nav-glider" aria-hidden="true"/>{nav.map(({to,label,icon:Icon})=><NavLink key={to} className={to==='/scan'?'scan-nav':undefined} to={to} end={to==='/'}><Icon size={22}/><span>{label}</span></NavLink>)}</nav>
 {demo&&<Modal title="Выбрать демо-игрока" onClose={()=>setDemo(false)}><p className="muted">Выберите участника для проверки приложения.</p><div className="demo-users">{demoUsers.data?.map((u:Row)=><button className={`demo-user ${me.id===u.id?'selected':''}`} key={u.id} onClick={()=>switchUser(u.id).then(()=>{setDemo(false);navigate('/');}).catch(e=>toast(e.message))}><strong>{u.display_name}</strong><span>{u.role==='ADMIN'?'Администратор':u.role==='ORGANIZER'?'Организатор':'Игрок'}</span></button>)}</div></Modal>}</div>;
}
