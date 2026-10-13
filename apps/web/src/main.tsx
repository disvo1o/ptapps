import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AppProvider } from './context';
import Layout from './components/Layout';
import { Skeleton } from './components/ui';
import Home from './pages/Home';
import {Install} from './pages/Install';
import './styles.css';
const Handicap=lazy(()=>import('./pages/Handicap').then(m=>({default:m.Handicap})));

const Friendly=lazy(()=>import('./pages/Friendly'));
const Offers=lazy(()=>import('./pages/Offers')),VenueAdmin=lazy(()=>import('./pages/VenueAdmin'));
const Scanner=lazy(()=>import('./pages/Scanner')),Leaderboard=lazy(()=>import('./pages/Leaderboard')),Collection=lazy(()=>import('./pages/Collection')),Profile=lazy(()=>import('./pages/Profile')),Tournaments=lazy(()=>import('./pages/Tournaments')),TournamentDetail=lazy(()=>import('./pages/Tournaments').then(m=>({default:m.TournamentDetail}))),Admin=lazy(()=>import('./pages/Admin'));
const Dating=lazy(()=>import('./pages/Dating'));
const Statistics=lazy(()=>import('./pages/Progress').then(m=>({default:m.Statistics})));
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?<div className="boot"><h1>Вернёмся к игре.</h1><p>Произошла ошибка.</p><button className="btn primary" onClick={()=>window.location.reload()}>Перезагрузить</button></div>:this.props.children;}}
function App(){const start=new URLSearchParams(window.location.search).get('tgWebAppStartParam');return <BrowserRouter><ErrorBoundary><AppProvider><Suspense fallback={<Skeleton/>}><Routes><Route element={<Layout/>}><Route index element={start&&/^[A-Za-z0-9_-]{32}$/.test(start)?<Navigate to={`/join/${start}`} replace/>:<Home/>}/><Route path="play" element={<Navigate to="/scan" replace/>}/><Route path="games" element={<Navigate to="/" replace/>}/><Route path="games/bounce" element={<Navigate to="/" replace/>}/><Route path="tasks" element={<Navigate to="/" replace/>}/><Route path="admin/tasks" element={<Navigate to="/" replace/>}/><Route path="friendly" element={<Friendly/>}/><Route path="offers" element={<Offers/>}/><Route path="admin/offers" element={<VenueAdmin/>}/><Route path="scan" element={<Scanner/>}/><Route path="leaderboard" element={<Leaderboard/>}/><Route path="profile" element={<Profile/>}/><Route path="dating" element={<Dating/>}/><Route path="install" element={<Install/>}/><Route path="handicap" element={<Handicap/>}/><Route path="players/:id" element={<Profile/>}/><Route path="collection" element={<Collection/>}/><Route path="shop" element={<Navigate to="/" replace/>}/><Route path="statistics/:id?" element={<Statistics/>}/><Route path="achievements" element={<Navigate to="/" replace/>}/><Route path="wallet" element={<Navigate to="/" replace/>}/><Route path="notifications" element={<Navigate to="/" replace/>}/><Route path="tournaments" element={<Tournaments/>}/><Route path="tournaments/:id" element={<TournamentDetail/>}/><Route path="join/:token" element={<TournamentDetail/>}/><Route path="admin" element={<Admin/>}/><Route path="*" element={<div className="empty"><h1>Страница не найдена.</h1><Link className="btn primary" to="/">На главную</Link></div>}/></Route></Routes></Suspense></AppProvider></ErrorBoundary></BrowserRouter>;}
createRoot(document.getElementById('root')!).render(<App/>);

if(import.meta.env.PROD&&'serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});
