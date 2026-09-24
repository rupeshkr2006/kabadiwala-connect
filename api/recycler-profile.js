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
function extForMime(mime){const m=String(mime||"").toLowerCase();if(m.includes("pdf"))return "pdf";if(m.includes("png"))return "png";if(m.includes("webp"))return "webp";if(m.includes("jpeg")||m.includes("jpg"))return "jpg";return null;}
async function uploadDocument(dataUrl,phone,fileName){
  const match=String(dataUrl||"").match(/^data:(application\/pdf|image\/(?:png|jpe?g|webp));base64,(.+)$/i);
  if(!match)throw new Error("Only PDF, JPG, PNG or WEBP documents are accepted.");
  const mime=match[1].toLowerCase(),buf=Buffer.from(match[2],"base64");
  if(buf.length>2*1024*1024)throw new Error("Document is too large. Maximum size is 2 MB.");
  const safe=String(fileName||"document").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,80);
  const ext=extForMime(mime)||safe.split(".").pop()||"bin";
  const path="recyclers/"+phone+"/"+Date.now()+"-"+safe.replace(/\.[^.]+$/,"")+"."+ext;
  const {url,key}=supabase();
  const r=await fetch(url+"/storage/v1/object/recycler-documents/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":mime,"x-upsert":"true"},body:buf});
  if(!r.ok){const t=await r.text();throw new Error(t||"Document upload failed.");}
  return {path,file_name:safe,mime_type:mime,size_bytes:buf.length,uploaded_at:new Date().toISOString()};
}
export default async function handler(req,res){
  const session=getSession(req);if(!session)return res.status(401).json({error:"Authentication required."});
  if(session.role!=="recycler")return res.status(403).json({error:"Recycler profile access required."});
  const action=String(req.query?.action||"save");
  try{
    if(req.method==="GET"){
      const rows=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(session.phone)+"&role=eq.recycler&select=*");
      return res.status(200).json({profile:rows?.[0]||null});
    }
    if(req.method==="POST"&&action==="save"){
      const p=req.body||{};
      const materials=Array.isArray(p.accepted_materials)?p.accepted_materials:String(p.accepted_materials||"").split(",").map(x=>x.trim()).filter(Boolean);
      const patch={role:"recycler",name:String(p.name||"Recycler").slice(0,120),preferred_language:["en","hi","mr"].includes(p.preferred_language)?p.preferred_language:"en",general_location:String(p.general_location||"").slice(0,250)||null,business_name:String(p.business_name||"").slice(0,160)||null,facility_address:String(p.facility_address||p.general_location||"").slice(0,300)||null,accepted_materials:materials,pickup_radius_km:Math.max(1,Math.min(100,Number(p.pickup_radius_km||5))),latitude:p.latitude??null,longitude:p.longitude??null,pickup_available:p.pickup_available!==false,service_area:String(p.service_area||"").slice(0,200)||null,registration_number:String(p.registration_number||"").slice(0,120)||null,gst_number:String(p.gst_number||"").slice(0,40)||null,authorization_number:String(p.authorization_number||"").slice(0,160)||null,authorization_type:String(p.authorization_type||"").slice(0,100)||null,authorization_expiry:p.authorization_expiry||null,contact_email:String(p.contact_email||"").slice(0,160)||null,offered_rate_notes:String(p.offered_rate_notes||"").slice(0,500)||null,verification_status:"pending",verification_badge:false,verified_at:null,verified_by:null,verification_note:null,active:true,profile_source:"recycler_registration"};
      const rows=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(session.phone),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify(patch)});
      return res.status(200).json({ok:true,profile:rows?.[0]||patch,verification_status:"pending"});
    }
    if(req.method==="POST"&&action==="document"){
      const p=req.body||{},type=String(p.document_type||"other").toLowerCase();
      const allowed=["authorization","registration","gst","address_proof","other"];
      if(!allowed.includes(type))return res.status(400).json({error:"Invalid document type."});
      const doc=await uploadDocument(p.data_url,session.phone,p.file_name);
      const current=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(session.phone)+"&role=eq.recycler&select=recycler_documents");
      const docs=Array.isArray(current?.[0]?.recycler_documents)?current[0].recycler_documents:[];
      const next=[...docs.filter(x=>String(x.document_type||"")!==type),{...doc,document_type:type,status:"submitted"}];
      const rows=await rest("/rest/v1/profiles?phone=eq."+encodeURIComponent(session.phone),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify({recycler_documents:next,verification_status:"pending",verification_badge:false,verified_at:null,verified_by:null,verification_note:null})});
      return res.status(200).json({ok:true,document:doc,profile:rows?.[0]||null});
    }
    return res.status(400).json({error:"Unknown recycler action."});
  }catch(e){
    console.error(e);
    return res.status(502).json({error:"Recycler profile request failed.",detail:e.message});
  }
}
