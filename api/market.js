export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||"").trim();
  const key=String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key) return res.status(503).json({error:"Market data is not configured on Vercel."});
  try{
    const days=Math.min(Math.max(Number(req.query?.days||30)||30,1),90);
    const headers={apikey:key,Authorization:"Bearer "+key};
    const latestUrl=url+"/rest/v1/latest_price_board?select=material_name,sub_category,city,state,buying_price,selling_price,unit,market_min,market_max,source,valid_from,observed_at&order=material_name.asc";
    const since=new Date(Date.now()-days*86400000).toISOString();
    const trendUrl=url+"/rest/v1/price_trends?select=material_name,city,state,price_day,avg_buying_price,market_min,market_max,observations&price_day=gte."+encodeURIComponent(since)+"&order=price_day.asc,material_name.asc&limit=1000";
    const [latestRes,trendRes]=await Promise.all([fetch(latestUrl,{headers}),fetch(trendUrl,{headers})]);
    const latest=await latestRes.json().catch(()=>[]);
    const trends=await trendRes.json().catch(()=>[]);
    if(!latestRes.ok)throw new Error("Latest price board query failed: "+JSON.stringify(latest));
    if(!trendRes.ok)throw new Error("Price trend query failed: "+JSON.stringify(trends));
    return res.status(200).json({latest:Array.isArray(latest)?latest:[],trends:Array.isArray(trends)?trends:[],days,generated_at:new Date().toISOString()});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Market data query failed.",detail:e.message});
  }
}
