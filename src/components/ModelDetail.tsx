import { useEffect, useState } from 'react';

const BASE='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api';
type Props={type:string;make:string;model:string};
type HistoryRow={uid:string;vin?:string;auction?:string;auction_lot_id?:string;displayed_date_utc?:string;final_bid_amount?:number|string;model_year?:number;odometer_miles?:number;primary_damage?:string;source_url?:string};
const money=(v:unknown)=>v!==null&&v!==undefined?`$${Number(v).toLocaleString('en-US')}`:'—';
const date=(v?:string)=>v?new Date(v).toLocaleDateString('uk-UA'):'—';
const present=(v:unknown)=>v!==null&&v!==undefined&&v!=='';
const kgRange=(a?:number,b?:number)=>!present(a)?null:(present(b)&&b!==a?`${a}–${b} кг`:`${a} кг`);

export default function ModelDetail({type,make,model}:Props){
  const [data,setData]=useState<any>(null);
  const [history,setHistory]=useState<HistoryRow[]>([]);
  const [coverage,setCoverage]=useState<any>(null);
  const [error,setError]=useState('');

  useEffect(()=>{let live=true;(async()=>{try{
    const r=await fetch(`${BASE}/model?type=${encodeURIComponent(type)}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`);
    const j=await r.json();
    if(!r.ok)throw new Error(j?.error||'Помилка');
    if(!live)return;
    setData(j.data);
    if(j.data?.model_id){
      const hr=await fetch(`${BASE}/history?model_id=${j.data.model_id}`);
      const hj=await hr.json();
      if(live&&hr.ok){setHistory(Array.isArray(hj.data)?hj.data:[]);setCoverage(hj.coverage||null);}
    }
  }catch(e){if(live)setError(String((e as Error).message||e));}})();return()=>{live=false}},[type,make,model]);

  if(error)return <div className="c24-model-state">Не вдалося завантажити характеристики.</div>;
  if(!data)return <div className="c24-model-state">Завантажую перевірені дані Cars24…</div>;

  const gens=Array.isArray(data.generations)?data.generations:[];
  const latest=gens[0];
  const firstPower=latest?.powertrains?.[0];
  const years=`${data.year_from||'—'}–${data.year_to||'дотепер'}`;
  const s=latest?.specs||{};
  const meta=s?.metadata||{};
  const primarySpecs:[string,unknown][]=[
    ['Кузов',latest?.body_style],['Клас',latest?.vehicle_class],['Місця',latest?.seats],['Двері',latest?.doors],
    ['Довжина',present(s.length_mm)?`${s.length_mm} мм`:null],['Ширина',present(s.width_mm)?`${s.width_mm} мм`:null],
    ['Висота',present(s.height_mm)?`${s.height_mm} мм`:null],['Колісна база',present(s.wheelbase_mm)?`${s.wheelbase_mm} мм`:null],
    ['Кліренс',present(s.ground_clearance_mm)?`${s.ground_clearance_mm} мм`:null],['Маса',kgRange(s.curb_weight_min_kg,s.curb_weight_max_kg)],
    ['Багажник',present(s.cargo_l)?`${s.cargo_l} л`:null],['Буксирування',present(s.towing_capacity_kg)?`${s.towing_capacity_kg} кг`:null],
    ['Висота сидіння',present(meta.seat_height_mm)?`${meta.seat_height_mm}${present(meta.seat_height_max_mm)?`–${meta.seat_height_max_mm}`:''} мм`:null],
    ['Паливний бак',present(meta.fuel_tank_l)?`${meta.fuel_tank_l} л`:null],
  ].filter(([,v])=>present(v)) as [string,unknown][];

  return <div className="c24-model-wrap">
    <section className="c24-model-hero">
      <div className="c24-model-copy"><span className="c24-model-kicker">{String(data.make_name).toUpperCase()} · {data.vehicle_type==='moto'?'МОТО':'АВТО'}</span><h1>{data.make_name} <b>{data.model_name}</b></h1><p>Сторінка моделі Cars24: покоління, перевірені характеристики, джерела та реальні аукціонні VIN.</p><div className="c24-model-years">Роки моделі <strong>{years}</strong></div></div>
      <div className="c24-model-visual">{data.image_url?<img src={data.image_url} alt={`${data.make_name} ${data.model_name}`} />:<span>Фото моделі готується</span>}</div>
    </section>

    <nav className="c24-model-tabs"><a className="is-active" href="#overview">Огляд</a><a href="#generations">Покоління</a><a href="#specs">Характеристики</a><a href="#lots">Продажі</a></nav>

    <section id="overview" className="c24-model-section"><div className="c24-model-section-head"><span>МОДЕЛЬ</span><h2>{data.make_name} {data.model_name}</h2></div><div className="c24-model-overview"><p className="c24-model-lead">Cars24 зберігає модель як окрему сутність, до якої прив'язуються покоління, технічні характеристики, аукціонні продажі й конкретні VIN. Дані на цій сторінці приходять із Supabase, а не зашиті у фронтенд.</p><div className="c24-model-facts"><div><small>Тип</small><strong>{data.vehicle_type==='moto'?'Мотоцикл':'Автомобіль'}</strong></div><div><small>Поколінь</small><strong>{gens.length}</strong></div><div><small>Роки</small><strong>{years}</strong></div><div><small>Привід</small><strong>{firstPower?.drivetrain||'—'}</strong></div></div></div></section>

    <section id="generations" className="c24-model-section"><div className="c24-model-section-head"><span>ІСТОРІЯ МОДЕЛІ</span><h2>Покоління та оновлення</h2></div>{gens.length?<div className="c24-generation-list">{gens.map((g:any,i:number)=><article className={i===0?'is-current':''} key={g.id}><div><span>{g.year_from||'—'}–{g.year_to||'дотепер'}</span><h3>{g.generation_name||g.platform_code||`${data.model_name}`}</h3><p>{[g.body_style,g.vehicle_class,g.market].filter(Boolean).join(' · ')||'Перевірене покоління Cars24'}</p></div><b>{String(i+1).padStart(2,'0')}</b></article>)}</div>:<p className="emptyNote">Покоління ще не заповнені.</p>}</section>

    <section id="specs" className="c24-model-section">
      <div className="c24-model-section-head"><span>БАЗОВІ ДАНІ</span><h2>Характеристики</h2></div>
      {latest?<>
        <div className="c24-model-specs">{primarySpecs.map(([l,v])=><div key={l}><small>{l}</small><strong>{String(v)}</strong></div>)}</div>
        {latest.powertrains?.length>0&&<div className="powerList">{latest.powertrains.map((p:any)=><article key={p.id}><span>{p.name||p.fuel_type||'Силова установка'}</span><strong>{[p.engine_displacement_l?`${p.engine_displacement_l} л`:null,p.horsepower_hp?`${p.horsepower_hp} к.с.`:null,p.drivetrain,p.transmission,p.battery_kwh?`${p.battery_kwh} кВт·год`:null,p.epa_range_miles?`${p.epa_range_miles} mi EPA`:null].filter(Boolean).join(' · ')}</strong></article>)}</div>}
        {meta.scope&&<p className="specNote">{meta.scope}</p>}
        {latest.sources?.length>0&&<details className="sources"><summary>Джерела характеристик · {latest.sources.length}</summary><div>{latest.sources.slice(0,12).map((src:any,i:number)=><a href={src.source_url} target="_blank" rel="noreferrer" key={`${src.source_url}-${i}`}>{src.source_name||'Джерело'}{src.field_name?` · ${src.field_name}`:''}</a>)}</div></details>}
      </>:<p className="emptyNote">Характеристики ще не завантажені.</p>}
    </section>

    <section id="lots" className="c24-model-section"><div className="c24-model-section-head c24-model-head-row"><div><span>США · АУКЦІОНИ</span><h2>Реальні продажі моделі</h2></div><small>{coverage?.status==='partial_preview_slice'?'Поки часткове покриття Cars24':'Cars24 Data'}</small></div>{history.length?<div className="c24-model-lots">{history.slice(0,8).map(h=><a className="lotCard" key={h.uid} href={h.vin?`/vin/?vin=${encodeURIComponent(h.vin)}`:(h.source_url||'#')}><div className="lotTop"><span>{h.auction||'Аукціон'}</span><strong>{money(h.final_bid_amount)}</strong></div><h3>{h.model_year||'—'} {data.make_name} {data.model_name}</h3><p>{[h.primary_damage,h.odometer_miles?`${Number(h.odometer_miles).toLocaleString('en-US')} mi`:null].filter(Boolean).join(' · ')}</p><small>{h.vin||`Lot ${h.auction_lot_id||'—'}`} · {date(h.displayed_date_utc)}</small></a>)}<div className="c24-model-lot-cta"><span>Шукаєте {data.model_name}?</span><h3>Підберемо живі лоти та порахуємо до покупки.</h3><a className="c24-btn c24-btn-primary" href="https://t.me/Egor_Cars24" target="_blank" rel="noreferrer">Підібрати</a></div></div>:<div className="emptyNote">Для цієї моделі аукціонна історія ще не підключена.</div>}</section>

    <style>{`.c24-model-wrap{display:grid;gap:16px}.c24-model-state{background:#fff;border-radius:18px;padding:30px;color:#68727c}.c24-model-hero{display:grid;grid-template-columns:1fr 1.15fr;min-height:480px;background:#fff;border-radius:22px;overflow:hidden}.c24-model-copy{padding:55px;display:flex;flex-direction:column;justify-content:center}.c24-model-kicker,.c24-model-section-head>span,.c24-model-head-row>div>span{font-size:11px;letter-spacing:.12em;font-weight:900;color:#9b7900}.c24-model-copy h1{font-family:'Barlow Condensed',sans-serif;font-size:70px;line-height:.9;text-transform:uppercase;margin:12px 0 20px}.c24-model-copy h1 b{color:#d1a800}.c24-model-copy p{color:#68727c;line-height:1.7}.c24-model-years{margin-top:25px;font-size:12px}.c24-model-years strong{display:block;font-size:24px;margin-top:4px}.c24-model-visual{display:grid;place-items:center;background:linear-gradient(145deg,#fafafa,#eceff1);padding:30px;color:#858e98}.c24-model-visual img{width:100%;height:100%;max-height:390px;object-fit:contain}.c24-model-tabs{display:flex;gap:30px;overflow:auto;background:#fff;border-radius:14px;padding:0 22px}.c24-model-tabs a{padding:17px 0;color:#68727c;font-size:12px;font-weight:800;border-bottom:3px solid transparent;white-space:nowrap}.c24-model-tabs a.is-active{color:#111;border-color:#ffd000}.c24-model-section{background:#fff;border-radius:18px;padding:34px}.c24-model-section-head h2{font-size:30px;margin:5px 0 22px}.c24-model-overview{display:grid;grid-template-columns:1.2fr 1fr;gap:45px}.c24-model-lead{font-size:19px;line-height:1.7;margin:0}.c24-model-facts,.c24-model-specs{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#e8ecef;border-radius:13px;overflow:hidden}.c24-model-facts div,.c24-model-specs div{background:#fff;padding:16px}.c24-model-facts small,.c24-model-facts strong,.c24-model-specs small,.c24-model-specs strong{display:block}.c24-model-facts small,.c24-model-specs small{color:#808a93;font-size:10px}.c24-generation-list{display:grid;grid-template-columns:1fr 1fr;gap:14px}.c24-generation-list article{border:1px solid #e1e6e9;border-radius:14px;padding:22px;display:flex;justify-content:space-between;gap:20px}.c24-generation-list article.is-current{border-color:#e3bf29;background:#fffdf4}.c24-generation-list span{font-size:11px;color:#8c959d}.c24-generation-list h3{margin:5px 0}.c24-generation-list p{font-size:12px;line-height:1.6;color:#737d86;margin:0}.c24-generation-list b{font-size:34px;color:#d7dce0}.c24-model-specs{grid-template-columns:repeat(3,1fr)}.powerList{display:grid;gap:8px;margin-top:14px}.powerList article{background:#f7f8fa;border-radius:13px;padding:14px;display:grid;gap:5px}.powerList span{font-size:11px;color:#9b7900;font-weight:900}.specNote{font-size:11px;color:#7a848d;margin:12px 0 0;line-height:1.5}.sources{margin-top:14px;border-top:1px solid #e4e8eb;padding-top:12px}.sources summary{cursor:pointer;color:#68727c;font-size:12px;font-weight:800}.sources div{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.sources a{font-size:11px;background:#f3f4f4;border-radius:8px;padding:6px 8px}.c24-model-head-row{display:flex;justify-content:space-between;align-items:end;gap:18px}.c24-model-head-row small{color:#7a848d}.c24-model-lots{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.lotCard{border:1px solid #e4e8eb;border-radius:14px;padding:17px;background:#fff}.lotTop{display:flex;justify-content:space-between;gap:10px}.lotTop span{font-size:10px;color:#9b7900;font-weight:900}.lotTop strong{font-size:20px}.lotCard h3{font-size:17px;margin:10px 0 5px}.lotCard p,.lotCard small{font-size:11px;color:#707a83}.c24-model-lot-cta{background:#fff7df;border-radius:16px;padding:22px;display:flex;flex-direction:column;justify-content:center}.c24-model-lot-cta span{font-size:11px;font-weight:900}.c24-model-lot-cta h3{line-height:1.35}.c24-model-lot-cta .c24-btn{align-self:flex-start}.emptyNote{color:#737d86;margin:0}@media(max-width:900px){.c24-model-hero,.c24-model-overview{grid-template-columns:1fr}.c24-model-copy{padding:35px}.c24-model-lots{grid-template-columns:1fr 1fr}}@media(max-width:620px){.c24-model-copy h1{font-size:54px}.c24-model-section{padding:22px}.c24-model-specs,.c24-generation-list,.c24-model-lots{grid-template-columns:1fr}.c24-model-copy{padding:28px}.c24-model-hero{min-height:auto}}`}</style>
  </div>;
}
