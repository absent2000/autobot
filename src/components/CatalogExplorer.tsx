import { useMemo, useState } from 'react';

type Model={model_id:number;vehicle_type:'car'|'moto'|string;make_name:string;make_slug:string;model_name:string;model_slug:string;year_from:number|null;year_to:number|null;image_url?:string|null};
type Props={models:Model[];stats?:{models_total?:number;cars_total?:number;motos_total?:number;makes_total?:number}};

export default function CatalogExplorer({models,stats}:Props){
  const [type,setType]=useState<'all'|'car'|'moto'>('all'); const [q,setQ]=useState('');
  const filtered=useMemo(()=>{const s=q.trim().toLowerCase();return models.filter(m=>(type==='all'||m.vehicle_type===type)&&(!s||`${m.make_name} ${m.model_name}`.toLowerCase().includes(s)));},[models,type,q]);
  return <div>
    <div className="catalogTools">
      <div className="catalogTabs">{([['all','Усі'],['car','Авто'],['moto','Мото']] as const).map(([k,l])=><button key={k} className={type===k?'on':''} onClick={()=>setType(k)}>{l}</button>)}</div>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Марка або модель" aria-label="Пошук по каталогу" />
    </div>
    <div className="catalogMeta"><strong>{filtered.length}</strong> моделей {stats?.makes_total?<>· {stats.makes_total} марок</>:null}</div>
    <div className="catalogGrid">{filtered.map(m=><a className="modelCard" key={m.model_id} href={`/catalog/${m.vehicle_type}/${m.make_slug}/${m.model_slug}/`}>
      <div className="modelMedia">{m.image_url?<img src={m.image_url} loading="lazy" alt={`${m.make_name} ${m.model_name}`} />:<div className="modelPlaceholder">{m.vehicle_type==='moto'?'MOTO':'AUTO'}</div>}</div>
      <div className="modelBody"><div className="modelType">{m.vehicle_type==='moto'?'Мото':'Авто'}</div><h3>{m.make_name} {m.model_name}</h3><p>{m.year_from||'—'} — {m.year_to||'дотепер'}</p></div>
    </a>)}</div>
    <style>{`.catalogTools{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px}.catalogTabs{display:flex;gap:6px;background:#ebe8e0;padding:4px;border-radius:14px}.catalogTabs button{border:0;background:transparent;padding:10px 15px;border-radius:11px;font-weight:850;cursor:pointer;color:#667085}.catalogTabs button.on{background:#111827;color:white}.catalogTools input{min-width:min(100%,300px);border:1px solid #d9d6ce;background:white;border-radius:14px;padding:12px 14px}.catalogMeta{color:#6b7280;margin:14px 0 18px}.catalogGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.modelCard{background:#fffdf8;border:1px solid #d9d6ce;border-radius:18px;overflow:hidden;transition:.18s transform,.18s border-color}.modelCard:hover{transform:translateY(-2px);border-color:#a8b4c8}.modelMedia{aspect-ratio:4/3;background:#ece9e2;display:grid;place-items:center;overflow:hidden}.modelMedia img{width:100%;height:100%;object-fit:cover}.modelPlaceholder{font-weight:950;color:#9ca3af;letter-spacing:.18em}.modelBody{padding:14px}.modelType{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;font-weight:900}.modelBody h3{font-size:17px;margin:5px 0 6px;letter-spacing:-.02em}.modelBody p{margin:0;color:#6b7280;font-size:13px}@media(max-width:900px){.catalogGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){.catalogGrid{grid-template-columns:1fr 1fr;gap:8px}.modelBody{padding:10px}.modelBody h3{font-size:14px}.catalogTools input{width:100%}}`}</style>
  </div>;
}
