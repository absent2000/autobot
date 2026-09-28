import { useEffect, useMemo, useState } from 'react';

const API='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api/budget';
type Example={id:number;vin:string;model_year:number|null;make_name:string;make_slug:string;model_name:string;model_slug:string;vehicle_type:string;auction_price_usd:number|string|null;reference_budget_usd:number|string;fuel?:string|null;drive?:string|null;damage?:string|null;photos?:string[]};

type Mode='budget'|'model';

export default function BudgetPicker(){
  const [mode,setMode]=useState<Mode>('budget');
  const [budget,setBudget]=useState(15000);
  const [items,setItems]=useState<Example[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const label=useMemo(()=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(budget),[budget]);

  useEffect(()=>{
    if(mode!=='budget') return;
    const ctrl=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setError('');
      try{
        const r=await fetch(`${API}?amount=${budget}&limit=8`,{signal:ctrl.signal});
        const j=await r.json();
        if(!r.ok) throw new Error(j?.error||'Помилка');
        setItems(Array.isArray(j.data)?j.data:[]);
      }catch(e){if((e as Error).name!=='AbortError')setError('Не вдалося завантажити приклади.');}
      finally{if(!ctrl.signal.aborted)setLoading(false);}
    },220);
    return()=>{window.clearTimeout(timer);ctrl.abort();};
  },[budget,mode]);

  return <div className="budgetPicker">
    <div className="modeSwitch" role="tablist" aria-label="Спосіб пошуку">
      <button className={mode==='budget'?'on':''} onClick={()=>setMode('budget')}>У мене є бюджет</button>
      <button className={mode==='model'?'on':''} onClick={()=>setMode('model')}>Я знаю, що хочу</button>
    </div>

    {mode==='budget'?<>
      <div className="budgetTop">
        <div><span>Повний бюджет покупки</span><strong>{label}</strong></div>
        <div className="coverage">Реальні орієнтири Cars24 · 181 модель</div>
      </div>
      <input className="budgetRange" aria-label="Бюджет" type="range" min="7000" max="60000" step="500" value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
      <div className="rangeEnds"><span>$7 000</span><span>$60 000</span></div>

      <div className="resultHead"><div><b>Що траплялося в цьому бюджеті</b><span>Відібрані Cars24 лоти з історичним орієнтиром повної вартості в Україні</span></div><a href={`/catalog/?budget=${budget}`}>Весь каталог →</a></div>
      {loading?<div className="loading">Підбираю варіанти…</div>:error?<div className="loading">{error}</div>:items.length?<div className="budgetCards">{items.map(x=>{
        const photo=x.photos?.[0];
        const href=`/vin/?vin=${encodeURIComponent(x.vin)}`;
        return <a href={href} className="budgetCard" key={x.id}>
          <div className="budgetPhoto">{photo?<img src={photo} loading="lazy" alt={`${x.make_name} ${x.model_name}`} />:<span>AUTO</span>}<em>≈ ${Number(x.reference_budget_usd).toLocaleString('en-US')}</em></div>
          <div className="budgetBody"><small>{x.model_year||''}</small><b>{x.make_name} {x.model_name}</b><p>{[x.fuel,x.drive].filter(Boolean).join(' · ')||'Cars24 reference'}</p>{x.damage&&<span>{x.damage.replace(/^Повреждение\s*/i,'')}</span>}</div>
        </a>;
      })}</div>:<div className="loading">У поточній reference-вибірці немає варіантів до цього бюджету.</div>}
      <div className="budgetNote"><b>Що означає ця цифра:</b> це не поточна комерційна пропозиція і не Max Bid. Це збережений Cars24 орієнтир для конкретного відібраного лота. Точний розрахунок перед торгами рахується окремо за актуальними тарифами.</div>
    </>:<div className="knownModel">
      <div><span>Марка або модель</span><strong>Відкрийте каталог і знайдіть конкретне авто чи мото</strong><p>На сторінці моделі збираємо покоління, характеристики, реальні аукціонні продажі, VIN та наступні шари Cars24 Data Backbone.</p></div>
      <a href="/catalog/">Перейти до каталогу</a>
    </div>}

    <style>{`.budgetPicker{display:grid;gap:14px}.modeSwitch{display:flex;width:max-content;max-width:100%;background:#ebe8e0;padding:4px;border-radius:14px;gap:4px}.modeSwitch button{border:0;background:transparent;padding:9px 13px;border-radius:10px;font-weight:850;color:#6b7280;cursor:pointer}.modeSwitch button.on{background:#111827;color:#fff}.budgetTop{display:flex;justify-content:space-between;align-items:end;gap:16px;flex-wrap:wrap}.budgetTop span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.11em;font-weight:900;color:#6b7280}.budgetTop strong{display:block;font-size:clamp(38px,6vw,62px);letter-spacing:-.055em;line-height:1;margin-top:5px}.coverage{font-size:12px;color:#6b7280;font-weight:750}.budgetRange{width:100%;accent-color:#2563eb;cursor:pointer}.rangeEnds{display:flex;justify-content:space-between;color:#8b8f98;font-size:11px;margin-top:-7px}.resultHead{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-top:8px}.resultHead div{display:grid;gap:3px}.resultHead b{font-size:17px}.resultHead span{font-size:12px;color:#6b7280}.resultHead a{font-size:12px;color:#2563eb;font-weight:850;white-space:nowrap}.budgetCards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.budgetCard{border:1px solid #dedbd3;background:#fff;border-radius:15px;overflow:hidden;min-width:0;transition:.18s transform,.18s border-color}.budgetCard:hover{transform:translateY(-2px);border-color:#94a3b8}.budgetPhoto{aspect-ratio:16/10;background:#ece9e2;position:relative;display:grid;place-items:center;color:#a1a1aa;font-weight:900}.budgetPhoto img{width:100%;height:100%;object-fit:cover}.budgetPhoto em{position:absolute;left:8px;bottom:8px;background:rgba(15,23,42,.88);color:white;border-radius:8px;padding:5px 7px;font-size:12px;font-style:normal;font-weight:900}.budgetBody{padding:10px;display:grid;gap:2px}.budgetBody small{color:#6b7280;font-weight:800}.budgetBody b{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budgetBody p{font-size:11px;color:#6b7280;margin:1px 0}.budgetBody span{font-size:10px;color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.budgetNote{font-size:11px;line-height:1.45;color:#6b7280;border-top:1px solid #e5e1d8;padding-top:11px}.budgetNote b{color:#374151}.loading{padding:24px;text-align:center;background:#f4f1e9;border-radius:14px;color:#6b7280}.knownModel{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:15px 0 4px}.knownModel span{font-size:11px;text-transform:uppercase;letter-spacing:.11em;color:#6b7280;font-weight:900}.knownModel strong{display:block;font-size:22px;margin:5px 0}.knownModel p{color:#6b7280;max-width:650px;margin:0;line-height:1.5}.knownModel a{background:#2563eb;color:#fff;padding:12px 16px;border-radius:12px;font-weight:900;white-space:nowrap}@media(max-width:820px){.budgetCards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.budgetCards{grid-template-columns:1fr 1fr;gap:7px}.budgetBody b{font-size:12px}.resultHead{align-items:start}.resultHead a{display:none}.knownModel{display:grid}.knownModel a{text-align:center}.modeSwitch{width:100%}.modeSwitch button{flex:1}}`}</style>
  </div>;
}
