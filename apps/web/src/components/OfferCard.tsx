import { useState } from 'react';
import { MapPin, Copy, ArrowUpRight, Wine } from 'lucide-react';
import type { Row } from '../api';
import { useApp } from '../context';
import { Modal } from './ui';
export function OfferCard({offer:o,compact=false}:{offer:Row;compact?:boolean}){const [open,setOpen]=useState(false);const {toast}=useApp();return <><article className={`venue-card ${compact?'compact':''}`}>
{o.image&&<img src={o.image} alt="" loading="lazy"/>}<div className="venue-shade"/><div className="venue-copy"><span className="venue-discount">{o.discount}</span><h3>{o.name}</h3>{!compact&&<p>{o.description}</p>}<button className="btn" onClick={()=>setOpen(true)}>Показать промокод <ArrowUpRight size={16}/></button></div></article>{open&&<Modal title={o.name} onClose={()=>setOpen(false)}><p>{o.description}</p><div className="promo-ticket"><Wine/><strong>{o.discount}</strong><code>{o.promo_code}</code><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(o.promo_code);toast('Промокод скопирован');}catch{toast('Выдели и скопируй код вручную');}}}><Copy size={16}/>Скопировать</button></div><p>{o.additional_text}</p><a className="btn full" href={`https://yandex.ru/maps/?text=${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer"><MapPin size={17}/>{o.address}</a></Modal>}</>;}
