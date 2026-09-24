export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
  const url=String(process.env.SUPABASE_URL||"").trim();
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key) return res.status(503).json({error:"Supabase sync is not configured on Vercel."});
  try{
    const {operations=[]}=req.body||{};
    if(!Array.isArray(operations)||operations.length>100) return res.status(400).json({error:"Invalid sync batch."});
    const results=[];
    for(const op of operations){
      if(op.type==="profile"){
        const p=op.data||{};
        const phone=String(p.phone||"").replace(/\D/g,"");
        if(!phone) throw new Error("Profile phone is required.");
        const r=await fetch(url+"/rest/v1/profiles?on_conflict=phone",{
          method:"POST",
          headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"},
          body:JSON.stringify({phone,role:p.role||"collector",name:p.name||"New User",preferred_language:p.preferred_language||"en",general_location:p.general_location||null})
        });
        if(!r.ok) throw new Error("Profile sync failed: "+await r.text());
        results.push({id:op.id,type:op.type});
      }else if(op.type==="lot"){
        const p=op.data||{};
        const phone=String(p.collectorPhone||"").replace(/\D/g,"");
        const lookup=await fetch(url+"/rest/v1/profiles?phone=eq."+encodeURIComponent(phone)+"&select=id",{headers:{"apikey":key,"Authorization":"Bearer "+key}});
        const profiles=await lookup.json();
        const collectorId=profiles?.[0]?.id;
        if(!collectorId) throw new Error("Collector profile not found.");
        const lot={
          collector_id:collectorId,material_category:p.category||"unknown",sub_category:p.itemType||null,
          description:p.notes||null,approx_weight_kg:Number(p.weightKg||0),condition:p.condition||null,
          collection_location:p.address||null,city:p.city||null,state:p.state||null,
          latitude:p.lat??null,longitude:p.lng??null,estimated_value:Number(p.indicativeTotal||0),
          quoted_value:Number(p.expectedPrice||p.askingPrice||0),status:"pending",source_type:p.sourceType||"field"
        };
        const r=await fetch(url+"/rest/v1/lots",{
          method:"POST",headers:{"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":"return=representation"},
          body:JSON.stringify(lot)
        });
        if(!r.ok) throw new Error("Lot sync failed: "+await r.text());
        results.push({id:op.id,type:op.type,remote:await r.json()});
      }
    }
    return res.status(200).json({ok:true,results});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Sync failed.",detail:e.message});
  }
}
