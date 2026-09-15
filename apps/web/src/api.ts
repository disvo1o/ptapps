import { useEffect, useState, useCallback } from 'react';
export type Row=Record<string,any>;
let sessionToken:string|null=null;
type CacheEntry={data:any;version:number;updated:number};
const cache=new Map<string,CacheEntry>();
let generation=0;
export function setSessionToken(token:string|null){sessionToken=token;generation++;cache.clear();}
export async function api(path:string,options:RequestInit={}){const response=await fetch('/api'+path,{...options,credentials:'include',headers:{...(sessionToken?{Authorization:`Bearer ${sessionToken}`} :{}),...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});let data;try{data=await response.json();}catch{throw new Error('Не удалось подключиться. Попробуйте ещё раз.');}if(!response.ok)throw new Error(data.error||'Не удалось выполнить действие. Попробуйте ещё раз.');return data;}
export const post=(path:string,body:unknown={})=>api(path,{method:'POST',body:JSON.stringify(body)});
export const patch=(path:string,body:unknown)=>api(path,{method:'PATCH',body:JSON.stringify(body)});
// Keep the last screen while revalidating, and never share cached data across accounts.
export function useResource<T=any>(path:string,version=0){
 const [state,setState]=useState<{path:string;data:T|null;error:string}>(()=>({path,data:cache.get(path)?.data??null,error:''}));
 const [tick,setTick]=useState(0);const reload=useCallback(()=>setTick(x=>x+1),[]);
 useEffect(()=>{let active=true;const epoch=generation,cached=cache.get(path);setState(s=>({path,data:cached?.data??(s.path===path?s.data:null),error:''}));
  if(!tick&&cached?.version===version&&Date.now()-cached.updated<30000)return;
  api(path).then(data=>{if(epoch!==generation)return;cache.set(path,{data,version,updated:Date.now()});if(cache.size>100)cache.delete(cache.keys().next().value!);if(active)setState({path,data,error:''});}).catch(e=>{if(active)setState(s=>({...s,error:e.message}));});
  return()=>{active=false;};
 },[path,version,tick]);
 return {data:(state.path===path?state.data:cache.get(path)?.data??null) as T|null,error:state.path===path?state.error:'',reload};
}
export const number=(n:number)=>new Intl.NumberFormat('ru-RU').format(n);
export const date=(v:string)=>new Date(v).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
export const datetime=(v:string)=>new Date(v).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
