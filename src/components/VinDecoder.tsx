import { useState } from 'react';

type ApiResult={vin:string;decoded?:Record<string,unknown>;history?:Array<Record<string,unknown>>;recalls?:Array<Record<string,unknown>>;meta?:Record<string,unknown>};
const API='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-vin-api';
const val=(o:Record<string,unknown>|undefined,k:string)=>typeof o?.[k]==='string'||typeof o?.[k]==='number'?String(o[k]):'';

export default function VinDecoder(){
  const [vin,setVin]=useState(''); const [data,setData]=useState<ApiResult|null>(null); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();const clean=vin.trim().toUpperCase();if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(clean)){setError('Введіть коректний VIN із 17 символів.');return;}setLoading(true);setError('');setData(null);try{const r=await fetch(`${API}?vin=${encodeURIComponent(clean)}`);const j=await r.json();if(!r.ok)throw new Error(j?.error||'Помилка декодування');setData(j);}catch(e){setError(e instanceof Error?e.message:'Помилка запиту');}finally{setLoading(false)}}
  const d=data?.decoded;
  const fields=[['Марка',val(d,'Make')],['Модель',val(d,'Model')],['Рік',val(d,'ModelYear')],['Виробник',val(d,'Manufacturer')],['Кузов',val(d,'BodyClass')],['Пальне',val(d,'FuelTypePrimary')],['Привід',val(d,'DriveType')],['Двигун',val(d,'DisplacementL')?`${val(d,'DisplacementL')} л`:val(d,'EngineModel')]].filter(([,v])=>v);
  return <div>
    <form onSubmit={submit} style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <input value={vin} onChange={e=>setVin(e.target.value.toUpperCase())} maxLength={17} placeholder="Наприклад, SMTD51HG8NTAU3229" style={{flex:'1 1 320px',padding:'15px 16px',border:'1px solid #d9d6ce',borderRadius:14,fontFamily:'monospace',fontSize:16,textTransform:'uppercase',background:'white'}} />
      <button disabled={loading} style={{border:0,borderRadius:14,padding:'14px 20px',background:'#2563eb',color:'white',fontWeight:900,cursor:'pointer'}}>{loading?'Перевіряю…':'Розшифрувати VIN'}</button>
    </form>
    {error&&<p style={{color:'#b91c1c',marginTop:14}}>{error}</p>}
    {data&&<div style={{marginTop:22}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap',marginBottom:16}}><div><div style={{fontSize:12,color:'#6b7280',fontWeight:800}}>VIN</div><strong style={{fontFamily:'monospace',fontSize:18}}>{data.vin}</strong></div><div><strong>{data.history?.length||0}</strong> записів Cars24 · <strong>{data.recalls?.length||0}</strong> відкликань NHTSA</div></div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:10}}>{fields.map(([l,v])=><div key={l} style={{border:'1px solid #d9d6ce',borderRadius:14,padding:14,background:'white'}}><div style={{fontSize:11,color:'#6b7280',fontWeight:800,marginBottom:4}}>{l}</div><strong>{v}</strong></div>)}</div>
      {!!data.history?.length&&<div style={{marginTop:18,padding:16,borderRadius:14,background:'#eff6ff'}}><strong>Cars24 знайшов цей VIN у власній історії аукціонів.</strong><div style={{color:'#475569',marginTop:5}}>Повна хронологія та фото будуть наступним шаром цієї сторінки.</div></div>}
    </div>}
  </div>;
}
