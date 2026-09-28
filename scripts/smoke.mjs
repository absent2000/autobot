const base='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api';

async function get(path){
  const r=await fetch(base+path,{headers:{'user-agent':'Cars24-GitHub-Smoke'}});
  const text=await r.text();
  if(!r.ok) throw new Error(`${path}: HTTP ${r.status} ${text.slice(0,300)}`);
  let json; try{json=JSON.parse(text);}catch{throw new Error(`${path}: invalid JSON`)}
  return json;
}

const health=await get('/health');
if(health.ok!==true) throw new Error('health: ok !== true');

const catalog=await get('/catalog?limit=1');
if(!Array.isArray(catalog.data)||catalog.data.length!==1) throw new Error('catalog: expected one row');
if(!catalog.data[0]?.model_id) throw new Error('catalog: missing model_id');

const budget=await get('/budget?amount=15000&limit=1');
if(!Array.isArray(budget.data)||budget.data.length<1) throw new Error('budget: no reference examples');
if(budget.meta?.exact_calculation!==false) throw new Error('budget: reference layer must not claim exact calculation');

console.log('Cars24 API smoke: OK');
console.log(JSON.stringify({health:health.ok,catalog_model:catalog.data[0].model_id,budget_vin:budget.data[0].vin}));
