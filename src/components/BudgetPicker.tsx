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
        const r=await fetch(`${API}?amount=${budget}&limit=6`,{signal:ctrl.signal});
        const j=await r.json();
        if(!r.ok) throw new Error(j?.error||'Помилка');
        setItems(Array.isArray(j.data)?j.data:[]);
      }catch(e){if((e as Error).name!=='AbortError')setError('Не вдалося завантажити приклади.');}
      finally{if(!ctrl.signal.aborted)setLoading(false);}
    },220);
    return()=>{window.clearTimeout(timer);ctrl.abort();};
  },[budget,mode]);

  const fill=Math.max(0,Math.min(100,((budget-7000)/(60000-7000))*100));
  return <div className="budgetPicker" id="budget">
    <div className="modeSwitch" role="tablist" aria-label="Спосіб пошуку">
      <button className={mode==='budget'?'on':''} onClick={()=>setMode('budget')}>У мене є бюджет</button>
      <button className={mode==='model'?'on':''} onClick={()=>setMode('model')}>Я знаю, що хочу</button>
    </div>

    {mode==='budget'?<>
      <div className="budgetTop">
        <div><span>Повний бюджет покупки</span><strong>{label}</strong></div>
        <div className="kindSwitch"><button className="on">Авто</button><button>Мото</button></div>
      </div>
      <input className="budgetRange" style={{background:`linear-gradient(90deg,#ffd000 0 ${fill}%,#222a31 ${fill}% 100%)`}} aria-label="Бюджет" type="range" min="7000" max="60000" step="500" value={budget} onChange={e=>setBudget(Number(e.target.value))}/>
      <div className="rangeEnds"><span>$7 000</span><span>$60 000</span></div>
      <div className="presets">{[10000,15000,20000,30000].map(v=><button className={budget===v?'on':''} onClick={()=>setBudget(v)} key={v}>${v/1000}k</button>)}</div>

      <div className="resultHead"><div><span>Результат</span><b>Що траплялося в цьому бюджеті</b></div><small>Реальні Cars24 reference-приклади</small></div>
      {loading?<div className="loading">Підбираю варіанти…</div>:error?<div className="loading">{error}</div>:items.length?<div className="budgetCards">{items.map(x=>{
        const photo=x.photos?.[0];
        const href=`/vin/?vin=${encodeURIComponent(x.vin)}`;
        return <article className="budgetCard" key={x.id}>
          <a href={href} className="budgetPhoto">{photo?<img src={photo} loading="lazy" alt={`${x.make_name} ${x.model_name}`} />:<span>AUTO</span>}</a>
          <div className="budgetBody"><div className="cardTop"><span>{x.model_year||''} · {x.vehicle_type==='moto'?'Мото':'Авто'}</span></div><h3>{x.make_name} {x.model_name}</h3><p>{[x.fuel,x.drive].filter(Boolean).join(' · ')||'Cars24 reference'}</p><div className="money"><div><small>Лот</small><strong>{x.auction_price_usd?`$${Number(x.auction_price_usd).toLocaleString('en-US')}`:'—'}</strong></div><div><small>Орієнтир в Україні</small><strong>≈ ${Number(x.reference_budget_usd).toLocaleString('en-US')}</strong></div></div>{x.damage&&<div className="signal">Пошкодження: <b>{x.damage.replace(/^Повреждение\s*/i,'')}</b></div>}<a href={href} className="details">Деталі по VIN <span>→</span></a></div>
        </article>;
      })}</div>:<div className="loading">У поточній reference-вибірці немає варіантів до цього бюджету.</div>}
      <div className="budgetNote"><b>Важливо:</b> це збережені Cars24 орієнтири для конкретних відібраних лотів, а не поточна комерційна пропозиція. Точний Max Bid рахується окремо за актуальними тарифами.</div>
    </>:<div className="knownModel"><div><span>Марка або модель</span><strong>Знайдіть конкретне авто чи мото</strong><p>Каталог Cars24 з'єднує моделі, покоління, характеристики, аукціонні дані та VIN.</p></div><a href="/catalog/">Перейти до каталогу</a></div>}

    <style>{`.budgetPicker{display:grid;gap:14px}.modeSwitch{display:inline-flex;width:max-content;max-width:100%;gap:4px;background:#e8eaeb;border-radius:999px;padding:4px;margin-bottom:12px}.modeSwitch button{border:0;background:transparent;color:#6f7880;border-radius:999px;padding:11px 18px;font-size:13px;font-weight:850;cursor:pointer}.modeSwitch button.on{background:#111820;color:#fff}.budgetTop{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:8px 6px 0}.budgetTop span{display:block;font-size:10px;color:#7c858d;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.budgetTop strong{display:block;font-family:'Barlow Condensed',sans-serif;font-size:44px;line-height:1;margin-top:5px}.kindSwitch{display:flex;gap:4px;background:#f0f2f3;border-radius:999px;padding:4px}.kindSwitch button{border:0;background:transparent;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:800;color:#6b747c}.kindSwitch button.on{background:#fff;color:#111820;box-shadow:0 2px 9px rgba(17,24,32,.08)}.budgetRange{width:100%;height:8px;margin:20px 0 5px;appearance:none;border-radius:999px;outline:0}.budgetRange::-webkit-slider-thumb{appearance:none;width:28px;height:28px;border-radius:50%;background:#ffd000;border:7px solid #111820;box-shadow:0 0 0 4px #fff;cursor:grab}.budgetRange::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#ffd000;border:7px solid #111820;box-shadow:0 0 0 4px #fff;cursor:grab}.rangeEnds{display:flex;justify-content:space-between;color:#8a9298;font-size:10px;font-weight:750}.presets{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px}.presets button{border:0;background:#f1f3f4;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:800;color:#5d6670;cursor:pointer}.presets button.on{background:#ffd000;color:#111820}.resultHead{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-top:1px solid #edf0f1;padding:24px 6px 16px}.resultHead span,.resultHead b{display:block}.resultHead span{font-size:10px;color:#7f8890;text-transform:uppercase;letter-spacing:.09em;font-weight:850}.resultHead b{font-size:20px;margin-top:4px}.resultHead small{color:#9aa1a7;font-size:10px}.budgetCards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.budgetCard{min-width:0;background:#f5f6f7;border-radius:19px;overflow:hidden;transition:.25s transform,.25s box-shadow}.budgetCard:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(17,24,32,.08)}.budgetPhoto{display:block;height:230px;background:#e7eaec;overflow:hidden}.budgetPhoto img{width:100%;height:100%;object-fit:cover;transition:.35s transform}.budgetCard:hover .budgetPhoto img{transform:scale(1.025)}.budgetBody{padding:18px}.cardTop>span{font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#8b949b}.budgetBody h3{font-size:21px;line-height:1.15;margin:12px 0 5px}.budgetBody p{margin:0;color:#747e86;font-size:11px}.money{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:18px 0 10px}.money div{background:#fff;border-radius:12px;padding:12px}.money small,.money strong{display:block}.money small{font-size:9px;color:#8a939b}.money strong{font-size:19px;margin-top:3px}.signal{background:#eef1f3;color:#5f6972;border-radius:11px;padding:10px 12px;font-size:10px;line-height:1.45}.details{display:flex;justify-content:space-between;align-items:center;margin-top:14px;color:#111820;text-decoration:none;font-size:12px;font-weight:900}.details span{font-size:18px}.budgetNote{margin:4px 6px 0;padding:14px 16px;background:#111820;color:#dce1e4;border-radius:13px;font-size:11px;line-height:1.5}.budgetNote b{color:#ffd000}.loading{padding:24px;text-align:center;background:#f4f5f6;border-radius:14px;color:#68727a}.knownModel{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:24px}.knownModel span{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#9b7900;font-weight:900}.knownModel strong{display:block;font-family:'Barlow Condensed',sans-serif;font-size:34px;margin:6px 0}.knownModel p{color:#68727a;max-width:650px;margin:0;line-height:1.6}.knownModel a{background:#ffd000;color:#111820;padding:13px 18px;border-radius:12px;font-weight:900;white-space:nowrap}@media(max-width:900px){.budgetCards{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.modeSwitch{width:100%}.modeSwitch button{flex:1;padding-inline:10px}.budgetTop{align-items:flex-start;flex-direction:column}.kindSwitch{width:100%}.kindSwitch button{flex:1}.budgetCards{grid-template-columns:1fr}.budgetPhoto{height:220px}.resultHead{align-items:flex-start;flex-direction:column}.resultHead small{display:none}.knownModel{display:grid;padding:10px}.knownModel a{text-align:center}.presets button{flex:1;min-width:calc(50% - 4px)}}`}</style>
  </div>;
}
