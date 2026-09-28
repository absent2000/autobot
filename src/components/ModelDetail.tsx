import { useEffect, useState } from 'react';
const API='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api/model';
type Props={type:string;make:string;model:string};
export default function ModelDetail({type,make,model}:Props){
  const [data,setData]=useState<any>(null);const [error,setError]=useState('');
  useEffect(()=>{fetch(`${API}?type=${encodeURIComponent(type)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||'Помилка');setData(j.data)}).catch(e=>setError(String(e.message||e)))},[type,make,model]);
  if(error)return <div className="modelState">Не вдалося завантажити характеристики.</div>;
  if(!data)return <div className="modelState">Завантажую перевірені дані Cars24…</div>;
  const gens=Array.isArray(data.generations)?data.generations:[];
  return <div>
    {data.image_url&&<div className="heroImage"><img src={data.image_url} alt={`${data.make_name} ${data.model_name}`} /></div>}
    <div className="modelFacts"><div><span>Роки моделі</span><b>{data.year_from||'—'} — {data.year_to||'дотепер'}</b></div><div><span>Поколінь у базі</span><b>{gens.length}</b></div><div><span>Тип</span><b>{data.vehicle_type==='moto'?'Мото':'Авто'}</b></div></div>
    {gens.map((g:any)=><section className="generation" key={g.id}><div className="genHead"><div><span>Покоління</span><h2>{g.generation_name||g.platform_code||`${g.year_from||''}–${g.year_to||'дотепер'}`}</h2></div><strong>{g.year_from||'—'} — {g.year_to||'дотепер'}</strong></div>
      <div className="specGrid">{[['Кузов',g.body_style],['Клас',g.vehicle_class],['Місця',g.seats],['Двері',g.doors],['Довжина',g.specs?.length_mm?`${g.specs.length_mm} мм`:null],['Колісна база',g.specs?.wheelbase_mm?`${g.specs.wheelbase_mm} мм`:null],['Кліренс',g.specs?.ground_clearance_mm?`${g.specs.ground_clearance_mm} мм`:null]].filter(([,v])=>v).map(([l,v])=><div key={String(l)}><span>{l}</span><b>{String(v)}</b></div>)}</div>
      {!!g.powertrains?.length&&<div className="powertrains">{g.powertrains.map((p:any)=><div className="power" key={p.id}><b>{p.name||p.fuel_type||'Силова установка'}</b><p>{[p.engine_displacement_l?`${p.engine_displacement_l} л`:null,p.horsepower_hp?`${p.horsepower_hp} к.с.`:null,p.drivetrain,p.transmission,p.battery_kwh?`${p.battery_kwh} кВт·год`:null].filter(Boolean).join(' · ')}</p></div>)}</div>}
    </section>)}
    <style>{`.modelState{padding:24px;border:1px solid #d9d6ce;border-radius:18px;background:#fffdf8;color:#6b7280}.heroImage{border-radius:24px;overflow:hidden;background:#e9e6df;max-height:520px}.heroImage img{width:100%;height:100%;max-height:520px;object-fit:cover}.modelFacts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}.modelFacts>div,.specGrid>div{background:#fffdf8;border:1px solid #d9d6ce;border-radius:14px;padding:14px}.modelFacts span,.specGrid span,.genHead span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;font-weight:850;margin-bottom:4px}.generation{margin-top:28px;background:#fffdf8;border:1px solid #d9d6ce;border-radius:22px;padding:22px}.genHead{display:flex;justify-content:space-between;gap:16px;align-items:start}.genHead h2{font-size:28px;margin:4px 0 18px}.specGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.powertrains{margin-top:14px;display:grid;gap:8px}.power{padding:14px;background:#f4f1e9;border-radius:14px}.power p{margin:5px 0 0;color:#6b7280}@media(max-width:700px){.modelFacts{grid-template-columns:1fr}.specGrid{grid-template-columns:1fr 1fr}.genHead{display:block}}`}</style>
  </div>;
}
