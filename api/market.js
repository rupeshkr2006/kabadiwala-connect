export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||"").trim();
  const key=String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key) return res.status(503).json({error:"Market data is not configured on Vercel."});
  try{
    const days=Math.min(Math.max(Number(req.query?.days||30)||30,1),90);
    const headers={apikey:key,Authorization:"Bearer "+key};
    // Read the source price observations directly so a newly published
    // admin price is immediately visible to every user. The view is kept for
    // compatibility elsewhere, but this endpoint must not depend on a
    // potentially stale view/schema cache.
    const pricesUrl=url+"/rest/v1/prices?select=material_name,sub_category,city,state,buying_price,selling_price,unit,market_min,market_max,source,valid_from,observed_at,price_type&order=observed_at.desc&limit=2000";
    const since=new Date(Date.now()-days*86400000).toISOString();
    const trendUrl=url+"/rest/v1/price_trends?select=material_name,city,state,price_day,avg_buying_price,market_min,market_max,observations&price_day=gte."+encodeURIComponent(since)+"&order=price_day.asc,material_name.asc&limit=1000";
    const [pricesRes,trendRes]=await Promise.all([fetch(pricesUrl,{headers}),fetch(trendUrl,{headers})]);
    const priceRows=await pricesRes.json().catch(()=>[]);
    const trends=await trendRes.json().catch(()=>[]);
    if(!pricesRes.ok)throw new Error("Market price query failed: "+JSON.stringify(priceRows));
    // Price cards are the primary shared board. A trend-query problem must
    // never make newly published admin prices disappear from the main board.
    const safeTrends=trendRes.ok && Array.isArray(trends)?trends:[];
    const seen=new Set();
    const latest=(Array.isArray(priceRows)?priceRows:[]).filter(row=>{
      const key=[String(row.material_name||"").trim().toLowerCase(),String(row.city||"").trim().toLowerCase(),String(row.state||"").trim().toLowerCase(),String(row.unit||"").trim().toLowerCase()];
      if(!key[0])return false;
      const k=key.join("|");
      if(seen.has(k))return false;
      seen.add(k);
      return true;
    }).sort((a,b)=>String(a.material_name||"").localeCompare(String(b.material_name||"")));
    return res.status(200).json({latest,trends:safeTrends,days,generated_at:new Date().toISOString()});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Market data query failed.",detail:e.message});
  }
}
