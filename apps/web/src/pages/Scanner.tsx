import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ScanLine } from 'lucide-react';
import jsQR from 'jsqr';
import { PageTitle } from '../components/ui';
import { tg, haptic } from '../telegram';

export function invitationToken(value:string){
 const trimmed=value.trim();if(/^[A-Za-z0-9_-]{32}$/.test(trimmed))return trimmed;
 try{const url=new URL(trimmed);const token=url.pathname.match(/^\/join\/([A-Za-z0-9_-]{32})\/?$/)?.[1]||url.searchParams.get('startapp')||url.searchParams.get('tgWebAppStartParam');return token&&/^[A-Za-z0-9_-]{32}$/.test(token)?token:null;}catch{return null;}
}
export default function Scanner(){
 const navigate=useNavigate(),video=useRef<HTMLVideoElement>(null),[camera,setCamera]=useState(false),[error,setError]=useState(''),[value,setValue]=useState(''),opened=useRef(false);
 function open(raw:string){const token=invitationToken(raw);if(!token){setError('Это не приглашение на турнир. Наведи камеру на QR-код организатора.');return false;}if(opened.current)return true;opened.current=true;haptic('success');setCamera(false);navigate(`/join/${token}`,{replace:true});return true;}
 function start(){setError('');const app=tg();if(app?.initData&&app.isVersionAtLeast?.('6.4')&&app.showScanQrPopup){try{app.showScanQrPopup({text:'Наведи камеру на QR-код турнира'},(text:string)=>open(text));return;}catch{}}setCamera(true);}
 useEffect(()=>{start();return()=>{try{tg()?.closeScanQrPopup?.();}catch{}};},[]);
 useEffect(()=>{if(!camera)return;let active=true,media:MediaStream|undefined,timer:ReturnType<typeof setTimeout>;const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
 (async()=>{if(!navigator.mediaDevices?.getUserMedia)throw new Error('Камера недоступна. Открой приложение по HTTPS или вставь ссылку приглашения.');media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(!active){media.getTracks().forEach(t=>t.stop());return;}if(video.current){video.current.srcObject=media;await video.current.play();}
 const scan=()=>{if(!active)return;const v=video.current;if(v&&v.readyState>=2&&context){canvas.width=Math.min(v.videoWidth,960);canvas.height=v.videoHeight*(canvas.width/v.videoWidth);context.drawImage(v,0,0,canvas.width,canvas.height);const frame=context.getImageData(0,0,canvas.width,canvas.height),code=jsQR(frame.data,frame.width,frame.height,{inversionAttempts:'attemptBoth'});if(code&&open(code.data))return;}timer=setTimeout(scan,180);};scan();})().catch(()=>{if(active){setError('Не удалось открыть камеру. Разреши доступ к ней в настройках Telegram или браузера и попробуй ещё раз.');setCamera(false);}});
 return()=>{active=false;clearTimeout(timer);media?.getTracks().forEach(t=>t.stop());};},[camera]);
 return <><PageTitle eyebrow="встречаемся на турнире" title="Сканируй и играй." description="Наведи камеру на QR-код организатора. Откроется страница турнира с регистрацией."/><section className="panel scanner-panel">{camera?<div className="scanner-preview"><video ref={video} playsInline muted aria-label="Камера для сканирования QR-кода"/><div className="scanner-target"/></div>:<button className="scanner-start" onClick={start}><Camera size={48}/><strong>Открыть камеру</strong></button>}{error&&<p role="alert" className="form-error">{error}</p>}<form className="form-stack" onSubmit={e=>{e.preventDefault();open(value);}}><label>Или вставь ссылку приглашения<input value={value} onChange={e=>setValue(e.target.value)} placeholder="Ссылка или код турнира" autoCapitalize="none" autoCorrect="off"/></label><button className="btn primary" disabled={!value.trim()}><ScanLine size={20}/>Открыть турнир</button></form></section></>;
}
