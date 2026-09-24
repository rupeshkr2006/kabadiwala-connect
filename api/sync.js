import { getSession } from "./session.js";
export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  const session=getSession(req);if(!session)return res.status(401).json({error:"Authentication required."});
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,""),key=String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key)return res.status(503).json({error:"Supabase sync is not configured."});
  const h={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"};
  const call=async(path,opt={})=>{const r=await fetch(url+path,{...opt,headers:{...h,...(opt.headers||{})}});const t=await r.text();let j={};try{j=t?JSON.parse(t):{}}catch{}if(!r.ok)throw new Error(j?.message||j?.error||t);return j;};
  try{
    const {operations=[]}=req.body||{};if(!Array.isArray(operations)||operations.length>100)return res.status(400).json({error:"Invalid sync batch."});
    const order={profile:1,lot:2,photo:3,transaction:4,handover:5,payment:6};operations.sort((a,b)=>(order[a.type]||99)-(order[b.type]||99));
    const results=[];
    for(const op of operations){
      const p=op.data||{};
      if(op.type==="profile"){
        const phone=String(p.phone||"").replace(/\D/g,"");if(phone!==session.phone)throw new Error("Profile session mismatch.");
        await call("/rest/v1/profiles?on_conflict=phone",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({phone,role:p.role||session.role,name:p.name||"New User",preferred_language:p.preferred_language||"en",general_location:p.general_location||null})});
      }else if(op.type==="lot"){
        const ref=String(p.lotReference||"");if(!ref)throw new Error("lotReference required.");
        await call("/rest/v1/platform_lots?on_conflict=lot_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({lot_reference:ref,collector_phone:session.phone,material_category:p.category||"unknown",sub_category:p.itemType||null,condition:p.condition||null,approximate_weight_kg:Number(p.weightKg||0),source_type:p.sourceType||"field",collection_address:p.address||null,collection_latitude:p.lat??null,collection_longitude:p.lng??null,estimated_value:p.indicativeTotal??null,quoted_value:p.expectedPrice??null,status:p.status||"pending",notes:p.notes||null,collected_at:p.collectedAt||new Date().toISOString(),image_url:p.imageUrl||null,source_photo_count:p.imageUrl?1:0})});
      }else if(op.type==="transaction"){
        await call("/rest/v1/platform_transactions?on_conflict=transaction_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({...p,collector_phone:session.phone})});
      }else if(op.type==="handover"){
        await call("/rest/v1/platform_handovers?on_conflict=transaction_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(p)});
        const confirmed=!!p.collector_confirmed&&!!p.recycler_confirmed;
        await call("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(p.transaction_reference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:confirmed?"handed_over":"accepted",handed_over_at:confirmed?(p.handover_at||new Date().toISOString()):null,handover_address:p.handover_address||null,handover_latitude:p.handover_latitude??null,handover_longitude:p.handover_longitude??null})}).catch(()=>{});
      }else if(op.type==="payment"){
        await call("/rest/v1/platform_earnings?on_conflict=transaction_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({...p,collector_phone:session.phone})});
        await call("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(p.transaction_reference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({final_price:p.amount,payment_status:"paid",payment_method:p.payment_method||null,payment_reference:p.payment_reference||null,status:"completed",updated_at:p.paid_at||new Date().toISOString()})}).catch(()=>{});
        const tx=await call("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(p.transaction_reference)+"&select=lot_reference");
        if(tx?.[0]?.lot_reference)await call("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(tx[0].lot_reference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"completed",final_sale_value:p.amount})}).catch(()=>{});
      }
      results.push({id:op.id,type:op.type});
    }
    return res.status(200).json({ok:true,results});
  }catch(e){console.error(e);return res.status(502).json({error:"Sync failed.",detail:e.message});}
}
