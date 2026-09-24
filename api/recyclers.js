export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||"").trim().replace(/\/$/,"");
  const key=String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key) return res.status(503).json({error:"Recycler directory is not configured on Vercel."});
  try{
    const material=String(req.query?.material||"").trim().toLowerCase();
    const city=String(req.query?.city||"").trim().toLowerCase();
    const h={apikey:key,Authorization:"Bearer "+key};
    const dQs=new URLSearchParams({select:"external_id,facility_name,address,city,district,state,materials_accepted,authorization_status,authorization_source,installed_capacity_mta,offered_rate_tier,pickup_available,service_area_km",order:"city.asc,facility_name.asc"});
    if(city)dQs.set("city","ilike.*"+city+"*");
    const pQs=new URLSearchParams({select:"id,phone,name,business_name,general_location,accepted_materials,pickup_radius_km,latitude,longitude,active",role:"eq.recycler",active:"eq.true",order:"business_name.asc,name.asc"});
    const [dr,pr]=await Promise.all([fetch(url+"/rest/v1/recycler_directory?"+dQs.toString(),{headers:h}),fetch(url+"/rest/v1/profiles?"+pQs.toString(),{headers:h})]);
    const [directory,profiles]=await Promise.all([dr.json().catch(()=>[]),pr.json().catch(()=>[])]);
    if(!dr.ok)throw new Error("Recycler directory query failed: "+JSON.stringify(directory));
    if(!pr.ok)throw new Error("Recycler account query failed: "+JSON.stringify(profiles));
    const accounts=(Array.isArray(profiles)?profiles:[]).map(x=>({
      external_id:"ACCOUNT:"+x.phone,facility_name:x.business_name||x.name||"Recycler account",address:x.general_location||"",city:x.general_location||"",district:"",state:"Andhra Pradesh",
      materials_accepted:Array.isArray(x.accepted_materials)?x.accepted_materials:[],authorization_status:"Account registered",
      authorization_source:"Self-registered in Kabadiwala Connect",installed_capacity_mta:null,offered_rate_tier:"User-set offer",
      pickup_available:true,service_area_km:Number(x.pickup_radius_km)||5,latitude:x.latitude??null,longitude:x.longitude??null,account:true
    }));
    let rows=[...(Array.isArray(directory)?directory:[]),...accounts];
    if(city)rows=rows.filter(x=>String(x.city||"").toLowerCase().includes(city)||String(x.district||"").toLowerCase().includes(city));
    if(material)rows=rows.filter(x=>(Array.isArray(x.materials_accepted)?x.materials_accepted:[]).some(v=>{const n=String(v).toLowerCase();return n===material||n.includes(material)||material.includes(n)||(material==="e-waste"&&/mixed|e-waste/.test(n));}));
    return res.status(200).json({recyclers:rows,generated_at:new Date().toISOString()});
  }catch(e){console.error(e);return res.status(502).json({error:"Recycler directory query failed.",detail:e.message});}
}
