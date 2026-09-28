import { useEffect, useMemo, useState } from 'react';

type Row=Record<string,any>;
type Nhtsa={vin:string;vehicle?:Row;powertrain?:Row;production?:Row;ev?:Row;safety?:Row;motorcycle?:Row;wmi?:Row;vin_structure?:Row;decode_status?:Row;recalls?:Row[];safety_ratings?:Row[];meta?:Row};
type Graph={vin:string;vehicle?:Row|null;model?:Row|null;budget_reference?:Row|null;photos?:string[];observations?:Row[];auction_lots?:Row[];market_listings?:Row[];source_links?:Row[];coverage?:Row;meta?:Row};
const NHTSA='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-vin-api';
const CARS24='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api/vin';
const validVin=(v:string)=>/^[A-HJ-NPR-Z0-9]{17}$/.test(v);
const show=(v:any)=>v!==null&&v!==undefined&&v!==''&&v!==0&&v!=='0'&&v!=='Not Applicable'&&v!=='N/A';
const money=(v:any,c='USD')=>show(v)?new Intl.NumberFormat('en-US',{style:'currency',currency:c||'USD',maximumFractionDigits:0}).format(Number(v)):'—';
const date=(v:any)=>{if(!v)return '—';const d=new Date(String(v));return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('uk-UA')};
const mi=(v:any)=>show(v)?`${Number(v).toLocaleString('en-US')} mi`:'—';

function Facts({items}:{items:Array<[string,any]>}){
  const rows=items.filter(([,v])=>show(v));
  if(!rows.length)return null;
  return <div className="factGrid">{rows.map(([l,v])=><div key={l}><span>{l}</span><b>{String(v)}</b></div>)}</div>;
}

export default function VinPassport(){
  const [vin,setVin]=useState('');const [nhtsa,setNhtsa]=useState<Nhtsa|null>(null);const [graph,setGraph]=useState<Graph|null>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');

  async function load(raw:string,writeUrl=true){
    const clean=raw.trim().toUpperCase();
    if(!validVin(clean)){setError('Введіть коректний VIN із 17 символів.');return;}
    setVin(clean);setLoading(true);setError('');setNhtsa(null);setGraph(null);
    try{
      const [nr,gr]=await Promise.allSettled([
        fetch(`${NHTSA}?vin=${encodeURIComponent(clean)}`).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||'NHTSA error');return j as Nhtsa}),
        fetch(`${CARS24}?vin=${encodeURIComponent(clean)}`).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error||'Cars24 error');return j as Graph}),
      ]);
      if(nr.status==='rejected')throw nr.reason;
      setNhtsa(nr.value);
      if(gr.status==='fulfilled')setGraph(gr.value);
      if(writeUrl){const u=new URL(window.location.href);u.searchParams.set('vin',clean);window.history.replaceState({},'',u);}
    }catch(e){setError(e instanceof Error?e.message:'Помилка перевірки VIN');}
    finally{setLoading(false);}
  }

  useEffect(()=>{const q=new URLSearchParams(window.location.search).get('vin');if(q&&validVin(q.toUpperCase()))void load(q,false)},[]);
  const vehicle=nhtsa?.vehicle||{};const p=nhtsa?.powertrain||{};const prod=nhtsa?.production||{};const ev=nhtsa?.ev||{};const safety=nhtsa?.safety||{};const moto=nhtsa?.motorcycle||{};
  const budget=graph?.budget_reference||null;const photos=graph?.photos||[];
  const title=useMemo(()=>[vehicle.model_year||budget?.model_year,vehicle.make||graph?.model?.make_name||budget?.make_raw,vehicle.model||graph?.model?.model_name||budget?.model_raw].filter(Boolean).join(' '),[nhtsa,graph]);
  const modelHref=graph?.model?.make_slug&&graph?.model?.model_slug?`/catalog/${graph.model.vehicle_type}/${graph.model.make_slug}/${graph.model.model_slug}/`:null;
  const sourceCount=new Set([...(graph?.observations||[]).map(x=>x.source_code),...(graph?.market_listings||[]).map(x=>x.source_code),...(graph?.auction_lots||[]).map(x=>x.source_code)]).size;

  return <div className="passport">
    <form onSubmit={e=>{e.preventDefault();void load(vin)}} className="vinForm">
      <input value={vin} onChange={e=>setVin(e.target.value.toUpperCase())} maxLength={17} placeholder="Наприклад, 5YJ3E1EBXKF214092" aria-label="VIN"/>
      <button disabled={loading}>{loading?'Перевіряю…':'Перевірити VIN'}</button>
    </form>
    {error&&<div className="error">{error}</div>}
    {loading&&<div className="loading">Збираю NHTSA та дані Cars24…</div>}

    {nhtsa&&!loading&&<>
      <section className="identity">
        <div><div className="eyebrow2">VIN-паспорт Cars24</div><h2>{title||'Автомобіль'}</h2><code>{nhtsa.vin}</code></div>
        <div className="badges"><span>NHTSA</span>{graph?.coverage?.in_vehicle_graph&&<span>Vehicle Graph</span>}{graph?.coverage?.has_budget_reference&&<span>Cars24 reference</span>}{sourceCount>0&&<span>{sourceCount} джерел</span>}</div>
      </section>

      {modelHref&&<a className="modelLink" href={modelHref}>Відкрити енциклопедію {graph?.model?.make_name} {graph?.model?.model_name} →</a>}

      {photos.length>0&&<section className="gallery"><div className="mainPhoto"><img src={photos[0]} alt={title||nhtsa.vin}/></div>{photos.slice(1,5).map((src,i)=><img key={src} src={src} loading="lazy" alt={`${title} фото ${i+2}`}/>)}</section>}

      <Facts items={[
        ['Рік',vehicle.model_year||budget?.model_year],['Марка',vehicle.make||graph?.model?.make_name||budget?.make_raw],['Модель',vehicle.model||graph?.model?.model_name||budget?.model_raw],['Кузов',vehicle.body_class||budget?.body_type],['Пальне',p.fuel_primary||budget?.fuel],['Привід',p.drive_type||budget?.drive],['Двигун',p.displacement_l?`${p.displacement_l} л`:budget?.engine_l?`${budget.engine_l} л`:p.engine_model],['Потужність',p.engine_hp?`${p.engine_hp} к.с.`:null],['КПП',[p.transmission_style,p.transmission_speeds?`${p.transmission_speeds} ст.`:null].filter(Boolean).join(' ')],['Пробіг у Cars24',budget?.mileage_miles?mi(budget.mileage_miles):null],
      ]}/>

      {budget&&<section className="sectionCard reference"><div className="sectionLabel">Cars24 · історичний орієнтир</div><h3>Економіка цього конкретного лота</h3><div className="moneyGrid"><div><span>Ставка на аукціоні</span><b>{money(budget.auction_price_usd)}</b></div><div><span>Орієнтир повної покупки</span><b>≈ {money(budget.reference_budget_usd)}</b></div></div><p>{budget.damage||'Пошкодження не вказане'}. Ця цифра збережена зі старої відбірної моделі Cars24; це не актуальна комерційна пропозиція і не точний Max Bid.</p>{budget.source_url&&<a href={budget.source_url} target="_blank" rel="noreferrer">Першоджерело лота →</a>}</section>}

      {!!graph?.auction_lots?.length&&<section className="sectionCard"><div className="sectionLabel">Аукціонні події</div><h3>Лоти, пов’язані з VIN</h3><div className="rows">{graph.auction_lots.map((x,i)=><a key={x.lot_id||i} className="row" href={x.source_url||'#'} target="_blank" rel="noreferrer"><div><b>{x.auction_name||x.source_code} · Lot {x.lot_number||'—'}</b><span>{[x.primary_damage,x.odometer?mi(x.odometer):null].filter(Boolean).join(' · ')}</span></div><div className="right"><b>{x.hammer_price?money(x.hammer_price,x.currency):x.current_bid?money(x.current_bid,x.currency):'—'}</b><span>{date(x.sold_at||x.sale_date)}</span></div></a>)}</div></section>}

      {!!graph?.market_listings?.length&&<section className="sectionCard"><div className="sectionLabel">Ринок</div><h3>Оголошення, пов’язані з VIN</h3><div className="rows">{graph.market_listings.map((x,i)=><a key={x.id||i} className="row" href={x.source_url||'#'} target="_blank" rel="noreferrer"><div><b>{x.source_name||x.source_code}</b><span>{x.title||x.status||''}</span></div><div className="right"><b>{money(x.price,x.currency)}</b><span>{x.odometer?mi(x.odometer):date(x.last_seen_at)}</span></div></a>)}</div></section>}

      <section className="sectionCard"><div className="sectionLabel">Офіційні характеристики NHTSA</div><h3>Двигун, трансмісія та виробництво</h3><Facts items={[
        ['Виробник',prod.manufacturer],['Тип авто',vehicle.vehicle_type],['Комплектація',[vehicle.series,vehicle.trim].filter(Boolean).join(' · ')],['Циліндри',p.cylinders],['Обʼєм',p.displacement_cc?`${p.displacement_cc} см³`:null],['Модель двигуна',p.engine_model],['Виробник двигуна',p.engine_manufacturer],['Турбо',p.turbo],['Завод',[prod.plant_company,prod.plant_city,prod.plant_state,prod.plant_country].filter(Boolean).join(', ')],['Ринок призначення',prod.destination_market],['Двері',vehicle.doors],['Місця',vehicle.seats]
      ]}/></section>

      {Object.values(ev).some(show)&&<section className="sectionCard"><div className="sectionLabel">Електрифікація</div><h3>Батарея та заряджання</h3><Facts items={[
        ['Тип',ev.electrification_level],['Привід',ev.ev_drive_unit],['Батарея',ev.battery_type||ev.battery_info],['Ємність',ev.battery_kwh?`${ev.battery_kwh} кВт·год`:null],['Напруга',ev.battery_v?`${ev.battery_v} В`:null],['Модулів',ev.battery_modules],['Пакетів',ev.battery_packs],['Рівень зарядки',ev.charger_level],['Потужність зарядки',ev.charger_power_kw?`${ev.charger_power_kw} кВт`:null]
      ]}/></section>}

      {Object.values(safety).some(show)&&<section className="sectionCard"><div className="sectionLabel">NHTSA · Safety / ADAS</div><h3>Системи безпеки</h3><Facts items={[
        ['ABS',safety.abs],['ESC',safety.esc],['Traction Control',safety.traction_control],['Adaptive Cruise',safety.adaptive_cruise],['Forward Collision Warning',safety.forward_collision_warning],['Lane Departure',safety.lane_departure_warning],['Lane Keep',safety.lane_keep],['Lane Centering',safety.lane_centering],['Blind Spot',safety.blind_spot_monitoring],['Rear Cross Traffic',safety.rear_cross_traffic],['Park Assist',safety.park_assist],['Rear Camera',safety.rear_visibility],['TPMS',safety.tpms]
      ]}/><p className="note">Поле NHTSA може описувати стандартне/опційне оснащення конфігурації. Відсутність поля не доводить відсутність обладнання на конкретній машині.</p></section>}

      {Object.values(moto).some(show)&&<section className="sectionCard"><div className="sectionLabel">Мотоцикл</div><h3>Мото-поля NHTSA</h3><Facts items={Object.entries(moto).map(([k,v])=>[k.replaceAll('_',' '),v])}/></section>}

      {!!nhtsa.safety_ratings?.length&&<section className="sectionCard"><div className="sectionLabel">NHTSA 5-Star Safety Ratings</div><h3>Краш-тести моделі</h3><div className="ratingGrid">{nhtsa.safety_ratings.map((r,i)=><div key={r.vehicle_id||i}><b>{r.description||`Конфігурація ${i+1}`}</b><strong>{show(r.overall)?`${r.overall} / 5`:'—'}</strong><span>Фронт {r.front||'—'} · Бік {r.side||'—'} · Перекидання {r.rollover||'—'}</span></div>)}</div></section>}

      {!!nhtsa.recalls?.length&&<section className="sectionCard recalls"><div className="sectionLabel">NHTSA recalls</div><h3>Кампанії для моделі та року · {nhtsa.recalls.length}</h3><p className="note">Це кампанії для year/make/model. Вони не підтверджують, що конкретний VIN має невиконаний recall.</p><div className="recallList">{nhtsa.recalls.slice(0,10).map((r,i)=><details key={r.campaign||i}><summary><b>{r.component||'Кампанія'}</b><span>{r.campaign||''}</span></summary><p>{r.summary||r.consequence||''}</p>{r.remedy&&<p><b>Рішення:</b> {r.remedy}</p>}</details>)}</div></section>}

      {nhtsa.vin_structure&&<section className="sectionCard"><div className="sectionLabel">Структура VIN</div><h3>Як читається {nhtsa.vin}</h3><div className="vinParts"><div><b>{nhtsa.vin_structure.wmi}</b><span>WMI · виробник</span></div><div><b>{nhtsa.vin_structure.vds}</b><span>VDS</span></div><div><b>{nhtsa.vin_structure.check_digit}</b><span>Контроль</span></div><div><b>{nhtsa.vin_structure.model_year_code}</b><span>Рік</span></div><div><b>{nhtsa.vin_structure.plant_code}</b><span>Завод</span></div><div><b>{nhtsa.vin_structure.serial}</b><span>Серійний №</span></div></div>{nhtsa.wmi&&<Facts items={[["WMI",nhtsa.wmi.code],["Виробник",nhtsa.wmi.manufacturer_name||nhtsa.wmi.common_name],["Материнська компанія",nhtsa.wmi.parent_company],["Тип",nhtsa.wmi.vehicle_type]]}/>}</section>}

      <section className="coverage"><b>Що Cars24 знає про цей VIN зараз</b><span>NHTSA: так</span><span>Vehicle Graph: {graph?.coverage?.in_vehicle_graph?'так':'поки ні'}</span><span>Фото: {graph?.coverage?.photos||0}</span><span>Спостереження: {graph?.coverage?.observations||0}</span><span>Аукціонні лоти: {graph?.coverage?.auction_lots||0}</span><span>Ринкові оголошення: {graph?.coverage?.market_listings||0}</span></section>
    </>}

    <style>{`.passport{display:grid;gap:16px}.vinForm{display:flex;gap:10px;flex-wrap:wrap}.vinForm input{flex:1 1 330px;padding:16px;border:1px solid #d9d6ce;border-radius:14px;background:#fff;font:700 16px ui-monospace,monospace}.vinForm button{border:0;border-radius:14px;padding:14px 20px;background:#2563eb;color:#fff;font-weight:900;cursor:pointer}.vinForm button:disabled{opacity:.6}.error{padding:14px;border-radius:12px;background:#fef2f2;color:#b91c1c}.loading{padding:24px;border-radius:14px;background:#f4f1e9;text-align:center;color:#6b7280}.identity{display:flex;justify-content:space-between;gap:24px;align-items:end;flex-wrap:wrap;padding:22px 0 8px}.eyebrow2,.sectionLabel{text-transform:uppercase;letter-spacing:.12em;font-size:10px;color:#2563eb;font-weight:950}.identity h2{font-size:clamp(34px,6vw,62px);letter-spacing:-.05em;line-height:1;margin:6px 0 12px}.identity code{font-size:14px;color:#6b7280}.badges{display:flex;gap:6px;flex-wrap:wrap}.badges span,.coverage span{padding:6px 9px;border-radius:999px;background:#e8eefc;color:#1d4ed8;font-size:11px;font-weight:850}.modelLink{font-weight:850;color:#2563eb;width:max-content}.gallery{display:grid;grid-template-columns:2fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:7px;max-height:560px}.gallery img{width:100%;height:100%;object-fit:cover;border-radius:13px;background:#ece9e2}.mainPhoto{grid-row:1/3}.mainPhoto img{border-radius:20px}.factGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.factGrid>div{border:1px solid #dfdcd4;border-radius:13px;padding:12px;background:#fff}.factGrid span,.moneyGrid span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;font-weight:850;margin-bottom:4px}.sectionCard{background:#fffdf8;border:1px solid #d9d6ce;border-radius:20px;padding:20px}.sectionCard h3{font-size:25px;letter-spacing:-.025em;margin:5px 0 14px}.reference{background:#eff6ff;border-color:#bfdbfe}.moneyGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.moneyGrid>div{background:#fff;border-radius:14px;padding:14px}.moneyGrid b{font-size:28px;letter-spacing:-.04em}.reference p,.note{color:#64748b;line-height:1.5;font-size:13px}.reference a{color:#2563eb;font-weight:850}.rows{display:grid;gap:7px}.row{display:flex;justify-content:space-between;gap:16px;padding:12px;border-radius:13px;background:#f6f4ee}.row>div{display:grid;gap:3px}.row span{font-size:11px;color:#6b7280}.right{text-align:right;flex-shrink:0}.ratingGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.ratingGrid>div{padding:14px;border-radius:14px;background:#f4f1e9;display:grid;gap:6px}.ratingGrid strong{font-size:27px}.ratingGrid span{font-size:11px;color:#6b7280}.recallList{display:grid;gap:7px}.recallList details{border:1px solid #fed7aa;background:#fff7ed;border-radius:13px;padding:12px}.recallList summary{cursor:pointer;display:flex;justify-content:space-between;gap:12px}.recallList summary span{font-size:11px;color:#9a3412}.recallList p{font-size:12px;line-height:1.5;color:#6b7280}.vinParts{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:12px}.vinParts>div{padding:12px 7px;border-radius:12px;background:#111827;color:#fff;text-align:center}.vinParts b{font:800 17px ui-monospace,monospace;display:block}.vinParts span{font-size:9px;color:#cbd5e1}.coverage{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:14px 0;color:#6b7280}.coverage>b{margin-right:4px;color:#111827}@media(max-width:700px){.gallery{grid-template-columns:1fr 1fr;grid-template-rows:auto;max-height:none}.mainPhoto{grid-column:1/3;grid-row:auto}.mainPhoto img{aspect-ratio:16/10}.gallery>img{aspect-ratio:1/1}.vinParts{grid-template-columns:repeat(3,1fr)}.moneyGrid{grid-template-columns:1fr}.row{display:grid}.right{text-align:left;display:flex!important;justify-content:space-between}}`}</style>
  </div>;
}
