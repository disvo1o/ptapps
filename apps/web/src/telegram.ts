import { useEffect } from 'react';
declare global {interface Window {Telegram?:{WebApp:any}}}
export const tg=()=>window.Telegram?.WebApp;
export function haptic(){tg()?.HapticFeedback?.impactOccurred('light');}
export function useTelegramAction(text:string,callback:()=>void,active:boolean){useEffect(()=>{const app=tg();if(!app?.initData||!active)return;app.MainButton.setText(text);app.MainButton.show();app.MainButton.onClick(callback);app.enableClosingConfirmation?.();return()=>{app.MainButton.offClick(callback);app.MainButton.hide();app.disableClosingConfirmation?.();};},[text,callback,active]);}
