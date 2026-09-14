import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, post, type Row } from './api';
import { tg, haptic } from './telegram';
import { ErrorView, Skeleton } from './components/ui';
type AppState={me:Row;version:number;refresh:()=>Promise<void>;toast:(message:string)=>void;mock:boolean;switchUser:(id:string)=>Promise<void>};
const Context=createContext<AppState>(null!);
export const useApp=()=>useContext(Context);
export function AppProvider({children}:{children:ReactNode}){
 const [me,setMe]=useState<Row|null>(null),[version,setVersion]=useState(0),[message,setMessage]=useState(''),[mock,setMock]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const refresh=useCallback(async()=>{setMe(await api('/me'));setVersion(v=>v+1);},[]);
 useEffect(()=>{let active=true;(async()=>{const settings=await api('/auth/config');if(!active)return;setMock(settings.mock);const app=tg();await post('/auth/telegram',app?.initData?{initData:app.initData}:{});if(active)setMe(await api('/me'));app?.ready();app?.expand();})().catch(e=>active&&setError(e.message));return()=>{active=false;};},[retry]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),4500);return()=>clearTimeout(timer);},[message]);
 async function switchUser(id:string){await post('/auth/telegram',{demoId:id});await refresh();setMessage('Demo account switched');}
 if(error&&!me)return <div className="boot"><div className="wordmark">PING<span>●</span></div><ErrorView message={error} retry={()=>{setError('');setRetry(v=>v+1);}}/></div>;
 if(!me)return <div className="boot"><div className="wordmark">PING<span>●</span></div><p>Getting your game ready…</p><Skeleton/></div>;
 return <Context.Provider value={{me,version,refresh,mock,switchUser,toast:m=>{setMessage(m);haptic();}}}>{children}{message&&<div className="toast" role="status">{message}</div>}</Context.Provider>;
}
