import { useMemo, useState } from 'react';

export default function BudgetPicker(){
  const [budget,setBudget]=useState(15000);
  const label=useMemo(()=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(budget),[budget]);
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'end',marginBottom:14}}>
      <div><div style={{fontSize:12,fontWeight:900,textTransform:'uppercase',letterSpacing:'.12em',color:'#6b7280'}}>Бюджет під ключ</div><div style={{fontSize:38,fontWeight:950,letterSpacing:'-.04em'}}>{label}</div></div>
      <a href={`/catalog/?budget=${budget}`} style={{background:'#2563eb',color:'white',fontWeight:900,padding:'12px 18px',borderRadius:14}}>Показати варіанти</a>
    </div>
    <input aria-label="Бюджет" type="range" min="7000" max="60000" step="500" value={budget} onChange={e=>setBudget(Number(e.target.value))} style={{width:'100%',accentColor:'#2563eb'}} />
    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#6b7280',marginTop:8}}><span>$7 000</span><span>$60 000</span></div>
  </div>;
}
