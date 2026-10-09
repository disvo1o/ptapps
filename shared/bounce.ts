export const BOUNCE={fps:60,maxFrames:10800,width:360,height:460};
export type Bounce={frame:number;y:number;v:number;score:number;alive:boolean};
export const initialBounce=():Bounce=>({frame:0,y:110,v:0,score:0,alive:true});
export function stepBounce(s:Bounce,tap:boolean):Bounce{if(!s.alive)return s;let v=s.v+.24,y=s.y+v,score=s.score;if(tap&&v>0&&y>=310&&y<=386){v=-9;y=350;score++;}return {frame:s.frame+1,y,v,score,alive:y<425&&s.frame+1<BOUNCE.maxFrames};}
export function replayBounce(inputs:number[],frames:number){let s=initialBounce(),at=0;for(let f=1;f<=frames;f++){s=stepBounce(s,inputs[at]===f);if(inputs[at]===f)at++;if(!s.alive){if(f!==frames)throw Error('Лишние кадры после завершения');break;}}if(s.alive)throw Error('Игра ещё продолжается');return s;}
