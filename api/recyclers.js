export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||"").trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key) return res.status(503).json({error:"Recycler directory is not configured on Vercel."});
  try{
    const material=String(req.query?.material||"").trim().toLowerCase();
    const city=String(req.query?.city||"").trim().toLowerCase();
    const qs=new URLSearchParams({select:"external_id,facility_name,address,city,district,state,materials_accepted,authorization_status,authorization_source,installed_capacity_mta,offered_rate_tier,pickup_available,service_area_km",order:"city.asc,facility_name.asc"});
    if(city) qs.set("city","ilike.*"+city+"*");
    const r=await fetch(url+"/rest/v1/recycler_directory?"+qs.toString(),{headers:{apikey:key,Authorization:"Bearer "+key}});
    const rows=await r.json().catch(()=>[]);
    if(!r.ok) throw new Error("Recycler directory query failed: "+JSON.stringify(rows));
    const filtered=(Array.isArray(rows)?rows:[]).filter(x=>{
      if(!material)return true;
      const list=Array.isArray(x.materials_accepted)?x.materials_accepted.map(v=>String(v).toLowerCase()):[];
      return list.some(v=>v===material || v.includes(material) || material.includes(v));
    });
    return res.status(200).json({recyclers:filtered,generated_at:new Date().toISOString()});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Recycler directory query failed.",detail:e.message});
  }
}
