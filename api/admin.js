import { getSession } from "./session.js";

function supabase(){
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=String(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key)throw new Error("Supabase backend is not configured.");
  return {url,key,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"}};
}
async function rest(path,options={}){
  const {url,headers}=supabase();
  const r=await fetch(url+path,{...options,headers:{...headers,...(options.headers||{})}});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}};
  if(!r.ok)throw new Error(data?.message||data?.error||text||"Supabase request failed");
  return data;
}
function requireAdmin(req,res){
  const session=getSession(req);
  if(!session){res.status(401).json({error:"Authentication required."});return null;}
  if(session.role!=="admin"){res.status(403).json({error:"Admin access required."});return null;}
  return session;
}
async function signedDocumentUrl(path){
  const {url,key}=supabase();
  const r=await fetch(url+"/storage/v1/object/sign/recycler-documents/"+path,{
    method:"POST",
    headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn:1800})
  });
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok)throw new Error(data?.message||data?.error||text||"Could not create signed document URL");
  const signed=data?.signedURL||data?.signedUrl||data?.signed_url;
  if(!signed)throw new Error("Signed document URL missing.");
  return signed.startsWith("http")?signed:url+"/storage/v1"+signed;
}
export default async function handler(req,res){
  const session=requireAdmin(req,res);if(!session)return;
  const action=String(req.query?.action||"");
  try{
    if(req.method==="GET"&&action==="overview"){
      const [collectors,recyclers,lots,offers,transactions,handovers,earnings]=await Promise.all([
        rest("/rest/v1/profiles?role=eq.collector&select=id,phone,name,preferred_language,general_location,active,created_at,updated_at&order=created_at.desc&limit=200").catch(()=>[]),
        rest("/rest/v1/profiles?role=eq.recycler&select=id,phone,name,business_name,general_location,facility_address,preferred_language,accepted_materials,pickup_radius_km,latitude,longitude,active,registration_number,gst_number,authorization_number,authorization_type,authorization_expiry,contact_email,pickup_available,service_area,offered_rate_notes,recycler_documents,verification_status,verification_badge,verified_at,verified_by,verification_note,created_at,updated_at&order=created_at.desc&limit=200").catch(()=>[]),
        rest("/rest/v1/platform_lots?select=*&order=created_at.desc&limit=300").catch(()=>[]),
        rest("/rest/v1/platform_offers?select=*&order=created_at.desc&limit=300").catch(()=>[]),
        rest("/rest/v1/platform_transactions?select=*&order=created_at.desc&limit=300").catch(()=>[]),
        rest("/rest/v1/platform_handovers?select=*&order=created_at.desc&limit=300").catch(()=>[]),
        rest("/rest/v1/platform_earnings?select=*&order=created_at.desc&limit=300").catch(()=>[]),
        rest("/rest/v1/latest_price_board?select=id,material_id,material_name,sub_category,city,state,buying_price,selling_price,unit,market_min,market_max,source,valid_from,observed_at,price_type&order=material_name.asc").catch(()=>[])
      ]);
      const pending=(recyclers||[]).filter(x=>String(x.verification_status||"pending")==="pending").length;
      const verified=(recyclers||[]).filter(x=>String(x.verification_status)==="verified").length;
      return res.status(200).json({
        summary:{collectors:(collectors||[]).length,recyclers:(recyclers||[]).length,pending_recycler_verification:pending,verified_recyclers:verified,lots:(lots||[]).length,offers:(offers||[]).length,transactions:(transactions||[]).length,handovers:(handovers||[]).length,earnings:(earnings||[]).length},
        collectors:collectors||[],recyclers:recyclers||[],lots:lots||[],offers:offers||[],transactions:transactions||[],handovers:handovers||[],earnings:earnings||[],market:market||[],
        generated_at:new Date().toISOString()
      });
    }
    if(req.method==="POST"&&action==="save-market-item"){
      const p=req.body||{};
      const materialName=String(p.material_name||"").trim().slice(0,120);
      const subCategory=String(p.sub_category||"").trim().slice(0,120)||null;
      const city=String(p.city||"Vijayawada").trim().slice(0,120)||"Vijayawada";
      const state=String(p.state||"Andhra Pradesh").trim().slice(0,120)||"Andhra Pradesh";
      const unit=String(p.unit||"kg").trim().slice(0,20)||"kg";
      const source=String(p.source||"Admin verified market price").trim().slice(0,200)||"Admin verified market price";
      const buying=Number(p.buying_price), selling=Number(p.selling_price||buying), min=Number(p.market_min||buying), max=Number(p.market_max||selling);
      if(!materialName||![buying,selling,min,max].every(Number.isFinite)||buying<0||selling<0||min<0||max<0)return res.status(400).json({error:"Enter a valid market item and non-negative prices."});
      let materialId=null;
      const existingMaterial=await rest("/rest/v1/materials?name=eq."+encodeURIComponent(materialName)+"&select=id&limit=1");
      if(existingMaterial?.[0]?.id){
        materialId=existingMaterial[0].id;
        await rest("/rest/v1/materials?id=eq."+encodeURIComponent(materialId),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({active:true,sub_category:subCategory,updated_at:new Date().toISOString()})});
      }else{
        const created=await rest("/rest/v1/materials",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({name:materialName,sub_category:subCategory,category:materialName,source_type:"admin",active:true})});
        materialId=created?.[0]?.id||null;
      }
      const now=new Date().toISOString();
      const rows=await rest("/rest/v1/prices",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify({material_id:materialId,material_name:materialName,sub_category:subCategory,city,state,buying_price:buying,selling_price:selling,unit,market_min:min,market_max:max,source,price_type:"admin",valid_from:now,observed_at:now})});
      return res.status(200).json({ok:true,item:rows?.[0]||null});
    }
    if(req.method==="POST"&&action==="verify-recycler"){
      const p=req.body||{},phone=String(p.phone||"").replace(/\D/g,""),decision=String(p.decision||"").toLowerCase();
      if(!/^\d{10}$/.test(phone))return res.status(400).json({error:"Valid recycler phone is required."});
      if(!["verify","reject","suspend"].includes(decision))return res.status(400).json({error:"Invalid verification decision."});
      const exists=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(phone)+"&role=eq.recycler&select=phone,recycler_documents");
      if(!exists?.[0])return res.status(404).json({error:"Recycler account not found."});
      if(decision==="verify"){
        const docs=Array.isArray(exists[0].recycler_documents)?exists[0].recycler_documents:[];
        const required=["authorization","registration","address_proof"];
        const missing=required.filter(type=>!docs.some(d=>String(d?.document_type||"")===type));
        if(missing.length)return res.status(400).json({error:"Cannot verify recycler until all compulsory documents are submitted.",missing_documents:missing});
      }
      const status=decision==="verify"?"verified":decision==="reject"?"rejected":"suspended";
      const patch={verification_status:status,verification_badge:status==="verified",verified_at:status==="verified"?new Date().toISOString():null,verified_by:session.phone,verification_note:String(p.note||"").slice(0,500)||null,active:status!=="suspended"};
      const rows=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(phone),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify(patch)});
      return res.status(200).json({ok:true,recycler:rows?.[0]||patch});
    }
    if(req.method==="POST"&&action==="document-url"){
      const p=req.body||{},phone=String(p.phone||"").replace(/\D/g,""),path=String(p.path||"");
      if(!/^\d{10}$/.test(phone)||!path.startsWith("recyclers/"+phone+"/"))return res.status(400).json({error:"Invalid document reference."});
      const profile=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(phone)+"&role=eq.recycler&select=recycler_documents");
      if(!profile?.[0])return res.status(404).json({error:"Recycler not found."});
      const docs=Array.isArray(profile[0].recycler_documents)?profile[0].recycler_documents:[];
      if(!docs.some(x=>String(x.path||"")===path))return res.status(404).json({error:"Document not found."});
      return res.status(200).json({url:await signedDocumentUrl(path)});
    }
    return res.status(400).json({error:"Unknown admin action."});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Admin request failed.",detail:e.message});
  }
}
