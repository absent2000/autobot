import type { APIRoute } from 'astro';

type Item={vehicle_type:string;make_slug:string;model_slug:string};
const esc=(v:string)=>v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');

export const GET: APIRoute = async () => {
  const base='https://cars24.com.ua';
  const fixed=['/','/catalog/','/auctions/','/vin/','/journal/'];
  let models:Item[]=[];
  try{const r=await fetch('https://pmjachoteyeviwwzotks.supabase.co/functions/v1/cars24-public-api/catalog?limit=500');if(r.ok){const j=await r.json();models=Array.isArray(j.data)?j.data:[];}}catch{}
  const makePaths=[...new Set(models.map(m=>`/catalog/${m.vehicle_type}/${m.make_slug}/`))];
  const modelPaths=models.map(m=>`/catalog/${m.vehicle_type}/${m.make_slug}/${m.model_slug}/`);
  const urls=[...fixed,...makePaths,...modelPaths];
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(path=>`  <url><loc>${esc(base+path)}</loc></url>`).join('\n')}\n</urlset>`;
  return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
};
