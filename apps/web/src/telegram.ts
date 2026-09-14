import { useEffect } from 'react';
declare global {interface Window {Telegram?:{WebApp:any}}}
export const tg=()=>window.Telegram?.WebApp;
export type HapticKind='selection'|'light'|'soft'|'medium'|'success'|'error'|'warning';
export function haptic(kind:HapticKind='light'){
 if(localStorage.getItem('pt-haptics')==='off')return;
 try{const app=tg();if(app?.isVersionAtLeast&&!app.isVersionAtLeast('6.1'))return;const feedback=app?.HapticFeedback;
 if(feedback){if(kind==='selection')feedback.selectionChanged();else if(['success','error','warning'].includes(kind))feedback.notificationOccurred(kind);else feedback.impactOccurred(kind);}
 else if(navigator.vibrate)navigator.vibrate(kind==='success'?[15,35,25]:kind==='error'?[30,30,30]:kind==='medium'?25:10);
 }catch{/* Unsupported clients keep the interaction functional. */}
}
export function useTelegramAction(text:string,callback:()=>void,active:boolean){useEffect(()=>{const app=tg();if(!app?.initData||!active)return;app.MainButton.setText(text);app.MainButton.show();app.MainButton.onClick(callback);app.enableClosingConfirmation?.();return()=>{app.MainButton.offClick(callback);app.MainButton.hide();app.disableClosingConfirmation?.();};},[text,callback,active]);}
