import { useEffect, useState, useCallback } from 'react';
export type Row=Record<string,any>;
export async function api(path:string,options:RequestInit={}){const response=await fetch('/api'+path,{...options,credentials:'include',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});let data;try{data=await response.json();}catch{throw new Error('Не удалось подключиться. Попробуйте ещё раз.');}if(!response.ok)throw new Error(data.error||'Не удалось выполнить действие. Попробуйте ещё раз.');return data;}
export const post=(path:string,body:unknown={})=>api(path,{method:'POST',body:JSON.stringify(body)});
export const patch=(path:string,body:unknown)=>api(path,{method:'PATCH',body:JSON.stringify(body)});
export function useResource<T=any>(path:string,version=0){const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[tick,setTick]=useState(0);const reload=useCallback(()=>setTick(x=>x+1),[]);useEffect(()=>{let active=true;setError('');setData(null);api(path).then(d=>active&&setData(d)).catch(e=>active&&setError(e.message));return()=>{active=false;};},[path,tick,version]);return {data,error,reload};}
export const number=(n:number)=>new Intl.NumberFormat('ru-RU').format(n);
export const date=(v:string)=>new Date(v).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
export const datetime=(v:string)=>new Date(v).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
