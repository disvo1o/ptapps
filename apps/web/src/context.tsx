import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, post, setSessionToken, type Row } from './api';
import { tg, haptic } from './telegram';
import BrowserLogin from './pages/Install';
import { ErrorView, Skeleton } from './components/ui';
type AppState={me:Row;version:number;refresh:()=>Promise<void>;toast:(message:string)=>void;mock:boolean;switchUser:(id:string)=>Promise<void>};
const Context=createContext<AppState>(null!);
export const useApp=()=>useContext(Context);
export function AppProvider({children}:{children:ReactNode}){
 const [me,setMe]=useState<Row|null>(null),[version,setVersion]=useState(0),[message,setMessage]=useState(''),[mock,setMock]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0),[splash,setSplash]=useState(true),[login,setLogin]=useState<Row|null>(null);
 const refresh=useCallback(async()=>{setMe(await api('/me'));setVersion(v=>v+1);},[]);
 useEffect(()=>{let active=true;(async()=>{const settings=await api('/auth/config');if(!active)return;setMock(settings.mock);const app=tg();setSessionToken(null);let session;if(app?.initData||settings.mock){session=await post('/auth/telegram',app?.initData?{initData:app.initData}:{demoId:sessionStorage.getItem('pt-demo-user')||'alex'});}else{try{session=await post('/auth/refresh');}catch{if(active)setLogin(settings);return;}}setSessionToken(session.token||null);if(active)setMe(await api('/me'));app?.ready();app?.expand();})().catch(e=>active&&setError(e.message));return()=>{active=false;};},[retry]);
 useEffect(()=>{if(!me)return;const timer=setTimeout(()=>setSplash(false),1150);return()=>clearTimeout(timer);},[me]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(timer);},[message]);
 async function switchUser(id:string){setSessionToken(null);const session=await post('/auth/telegram',{demoId:id});setSessionToken(session.token||null);sessionStorage.setItem('pt-demo-user',id);await refresh();setMessage('Демо-игрок изменён');}
 const logo=<img className="splash-logo-image" src="/branding/ping-tablet.svg" alt="пинг таблет"/>;
 if(login&&!me)return <BrowserLogin settings={login} onLogin={()=>{setLogin(null);setRetry(v=>v+1);}}/>;
 if(error&&!me)return <div className="boot boot-error">{logo}<ErrorView message={error} retry={()=>{setError('');setRetry(v=>v+1);}}/></div>;
 if(!me)return <div className="boot boot-loading">{logo}<p>Готовим твою подачу…</p><Skeleton/></div>;
 return <Context.Provider value={{me,version,refresh,mock,switchUser,toast:m=>{setMessage(m);haptic();}}}>{children}{splash&&<div className="splash-overlay" aria-hidden="true">{logo}</div>}{message&&<div className="toast" role="status">{message}</div>}</Context.Provider>;
}
