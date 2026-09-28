const base='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api';
const vinApi='https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-vin-api';

async function get(url){
  const r=await fetch(url,{headers:{'user-agent':'Cars24-GitHub-Smoke'}});
  const text=await r.text();
  if(!r.ok) throw new Error(`${url}: HTTP ${r.status} ${text.slice(0,300)}`);
  let json; try{json=JSON.parse(text);}catch{throw new Error(`${url}: invalid JSON`)}
  return json;
}

const health=await get(base+'/health');
if(health.ok!==true) throw new Error('health: ok !== true');

const catalog=await get(base+'/catalog?limit=1');
if(!Array.isArray(catalog.data)||catalog.data.length!==1) throw new Error('catalog: expected one row');
if(!catalog.data[0]?.model_id) throw new Error('catalog: missing model_id');

const budget=await get(base+'/budget?amount=15000&limit=1');
if(!Array.isArray(budget.data)||budget.data.length<1) throw new Error('budget: no reference examples');
if(budget.meta?.exact_calculation!==false) throw new Error('budget: reference layer must not claim exact calculation');

const sampleVin=budget.data[0].vin;
const graph=await get(base+`/vin?vin=${encodeURIComponent(sampleVin)}`);
if(graph.vin!==sampleVin) throw new Error('vin graph: wrong VIN');
if(graph.coverage?.has_budget_reference!==true) throw new Error('vin graph: expected budget reference');

const nhtsa=await get(vinApi+`?vin=${encodeURIComponent(sampleVin)}`);
if(nhtsa.vin!==sampleVin) throw new Error('nhtsa: wrong VIN');
if(!nhtsa.vehicle?.make||!nhtsa.vehicle?.model_year) throw new Error('nhtsa: normalized vehicle fields missing');

console.log('Cars24 API smoke: OK');
console.log(JSON.stringify({health:health.ok,catalog_model:catalog.data[0].model_id,budget_vin:sampleVin,graph_photos:graph.coverage?.photos,nhtsa_make:nhtsa.vehicle?.make}));
