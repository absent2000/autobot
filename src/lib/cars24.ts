export const API='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api';
export const base=()=>import.meta.env.BASE_URL;
export const u=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^\//,'')}`;
export async function catalog(){try{const r=await fetch(`${API}/catalog?limit=500`);if(r.ok){const j=await r.json();return j.data||[]}}catch{}return []}
export function slug(s:string){return String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function crc32(str:string){let table=(crc32 as any).t;if(!table){table=(crc32 as any).t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);table[n]=c>>>0}}let c=0^(-1);for(let i=0;i<str.length;i++)c=(c>>>8)^table[(c^str.charCodeAt(i))&0xff];return (c^(-1))>>>0}
export function demoLot(row:any,index=0){const t=row.vehicle_type==='moto'?'MOTO':'CAR';const seed=crc32(`${t}|${row.make_name}|${row.model_name}`);const from=row.year_from||2018,to=row.year_to||2026;const year=Math.min(to,Math.max(from,2022+(seed%4)));const bid=1200+(seed%11800);const buy=bid+1700+(seed%4900);const damages=['Front End','Rear End','Side','Minor Dent / Scratches','Mechanical'];const base=`DEMO-${String(seed%9999).padStart(4,'0')}`;return{year:Math.max(from,year-(index%3)),auction:index%2?'IAAI':'Copart',lot:base, id:`${base}-${index+1}`,odo:6500+(seed%49000)+(index*6900),damage:damages[seed%damages.length],bid:bid+(index*750),buy:buy+(index*1050)}}
export const years=(r:any)=>r.year_to?`${r.year_from||'—'}–${r.year_to}`:`${r.year_from||'—'}+`;
