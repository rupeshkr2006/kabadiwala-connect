import { createHmac } from "node:crypto";
import { getSession } from "./session.js";

const supabase=()=>{
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  if(!url||!key)throw new Error("Supabase backend is not configured.");
  return {url,key,headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"}};
};
async function rest(path,options={}){
  const {url,key,headers}=supabase();
  const r=await fetch(url+path,{...options,headers:{...headers,...(options.headers||{})}});
  const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{}}catch{data={raw:text};}
  if(!r.ok)throw new Error(data?.message||data?.error||text||`HTTP ${r.status}`);
  return data;
}
function ref(prefix){return prefix+"-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,7).toUpperCase();}
function haversine(a,b,c,d){const R=6371,toRad=x=>x*Math.PI/180;const dLat=toRad(c-a),dLon=toRad(d-b),x=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;return R*2*Math.asin(Math.min(1,Math.sqrt(x)));}
function authorizedName(s){return /authorized/i.test(String(s||""));}
function materialMatch(material,list){const m=String(material||"").toLowerCase();return (Array.isArray(list)?list:[]).some(x=>{const n=String(x).toLowerCase();return m.includes(n)||n.includes(m)||(m==="e-waste"&&/(e-waste|mixed)/.test(n));});}
function requireSession(req,res){const s=getSession(req);if(!s) {res.status(401).json({error:"Authentication required."});return null;}return s;}
async function uploadImage(image,pathPrefix,session){
  if(typeof image!=="string"||!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image))throw new Error("Invalid image.");
  const m=image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);if(!m)throw new Error("Invalid image format.");
  const buf=Buffer.from(m[2],"base64");if(buf.length>4*1024*1024)throw new Error("Image is too large (max 4 MB).");
  const ext=m[1].split("/")[1].replace("jpeg","jpg");const path=`${pathPrefix}/${session.phone}-${Date.now()}.${ext}`;
  const {url,key}=supabase();const r=await fetch(url+"/storage/v1/object/lot-images/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":m[1],"x-upsert":"true"},body:buf});
  if(!r.ok)throw new Error("Image upload failed.");
  return url+"/storage/v1/object/public/lot-images/"+path;
}
export default async function handler(req,res){
  const session=requireSession(req,res);if(!session)return;
  const action=String(req.query?.action||"");
  try{
    if(req.method==="GET"&&action==="lots"){
      const isCollector=session.role==="collector";
      const filter=isCollector?"?collector_phone=eq."+encodeURIComponent(session.phone):"?status=in.(pending,accepted,handed_over,completed)";
      const rows=await rest("/rest/v1/platform_lots"+filter+"&select=lot_reference,collector_phone,material_category,sub_category,condition,approximate_weight_kg,image_url,source_type,collection_address,collection_latitude,collection_longitude,estimated_value,quoted_value,final_sale_value,status,notes,collected_at,handed_over_at&order=created_at.desc&limit=100");
      const refs=rows.map(x=>x.lot_reference).filter(Boolean);
      let offers=[],txs=[];
      if(refs.length){
        const inList="("+refs.map(x=>encodeURIComponent(x)).join(",")+")";
        offers=await rest("/rest/v1/platform_offers?lot_reference=in."+inList+"&select=lot_reference,actor_role,actor_ref,price,created_at&order=created_at.asc").catch(()=>[]);
        txs=await rest("/rest/v1/platform_transactions?lot_reference=in."+inList+"&select=lot_reference,transaction_reference,recycler_external_id,quoted_price,final_price,payment_status,status").catch(()=>[]);
      }
      const byOffer={};offers.forEach(o=>(byOffer[o.lot_reference] ||= []).push(o));
      const byTx={};txs.forEach(t=>{byTx[t.lot_reference]=t;});
      const publicRows=rows.map(x=>{
        const o=byOffer[x.lot_reference]||[],t=byTx[x.lot_reference]||null;
        const latest=o[o.length-1]||null;
        return {...x,offers:o,latest_offer_price:latest?.price??x.quoted_value??null,latest_offer_role:latest?.actor_role??"collector",recycler_external_id:t?.recycler_external_id||null,transaction_reference:t?.transaction_reference||null};
      });
      return res.status(200).json({rows:publicRows});
    }
    if(req.method==="GET"&&action==="ledger"){
      const rows=await rest("/rest/v1/platform_earnings?collector_phone=eq."+encodeURIComponent(session.phone)+"&select=*&order=created_at.desc");
      const total=rows.reduce((a,x)=>a+Number(x.amount||0),0),paid=rows.filter(x=>x.status==="paid").reduce((a,x)=>a+Number(x.amount||0),0),pending=total-paid;
      return res.status(200).json({rows,total,paid,pending});
    }
    if(req.method==="GET"&&action==="transactions"){
      const filter=session.role==="collector"?"collector_phone=eq."+encodeURIComponent(session.phone):"";
      const rows=await rest("/rest/v1/platform_transactions?"+filter+"&select=*&order=created_at.desc&limit=100");
      return res.status(200).json({rows});
    }
    if(req.method==="POST"&&action==="match"){
      const p=req.body||{},lat=Number(p.lat),lng=Number(p.lng),material=String(p.category||"e-waste");
      const rows=await rest("/rest/v1/recycler_directory?active=eq.true&select=*");
      const ranked=rows.map(x=>{
        const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng)&&Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)); const distance=hasCoords?haversine(lat,lng,Number(x.latitude),Number(x.longitude)):null;
        const mm=materialMatch(material,x.materials_accepted), auth=authorizedName(x.authorization_status), pickup=!!x.pickup_available;
        const locationScore=distance==null?5:Math.max(0,25-Math.min(distance,25));
        const score=(mm?40:0)+locationScore+(pickup?20:0)+(auth?15:0);
        return {...x,distance_km:distance==null?null:Number(distance.toFixed(2)),location_available:distance!=null,match_score:score,material_match:mm,rate_information:x.offered_rate_tier||"No verified numeric recycler rate"};
      }).filter(x=>x.material_match).sort((a,b)=>b.match_score-a.match_score);
      return res.status(200).json({rows:ranked.slice(0,10),scoring:{material:40,location:25,pickup:20,authorization:15},note:"Numeric recycler rates are not used until verified recycler quotes are recorded."});
    }
    if(req.method==="POST"&&action==="lot"){
      const p=req.body||{},lotReference=String(p.lotReference||ref("LOT"));
      const body={lot_reference:lotReference,collector_phone:session.phone,material_category:String(p.category||"unknown"),sub_category:p.itemType||null,condition:p.condition||null,approximate_weight_kg:Number(p.weightKg||0),source_type:p.sourceType||"field",collection_address:p.address||null,collection_latitude:p.lat??null,collection_longitude:p.lng??null,estimated_value:p.indicativeTotal??null,quoted_value:p.expectedPrice??null,status:"pending",notes:p.notes||null,collected_at:p.collectedAt||new Date().toISOString()};
      const rows=await rest("/rest/v1/platform_lots?on_conflict=lot_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(body)});
      return res.status(200).json({lot:rows?.[0]||body,lotReference});
    }
    if(req.method==="POST"&&action==="photo"){
      const p=req.body||{},lotReference=String(p.lotReference||"");
      if(!lotReference)throw new Error("Lot reference required.");
      const lots=await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference)+"&select=collector_phone");
      if(!lots[0]||lots[0].collector_phone!==session.phone)throw new Error("Lot not found.");
      const url=await uploadImage(p.image,"lots",session);
      await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({image_url:url,source_photo_count:1})});
      return res.status(200).json({image_url:url});
    }
    if(req.method==="POST"&&action==="offer"){
      const p=req.body||{},lotReference=String(p.lotReference||""),price=Number(p.price||0);
      if(!lotReference||!Number.isFinite(price)||price<=0)throw new Error("Valid lot and offer price required.");
      const lots=await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference)+"&select=lot_reference,collector_phone,status");
      const lot=lots[0];if(!lot)throw new Error("Lot not found.");
      if(session.role==="collector"&&lot.collector_phone!==session.phone)throw new Error("Lot ownership check failed.");
      if(lot.status!=="pending")throw new Error("Only pending lots can be negotiated.");
      const actorRef=session.role==="recycler"?"ACCOUNT:"+session.phone:session.phone;
      await rest("/rest/v1/platform_offers",{method:"POST",headers:{"Prefer":"return=minimal"},body:JSON.stringify({lot_reference:lotReference,actor_role:session.role,actor_ref:actorRef,price})});
      await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({quoted_value:price})});
      return res.status(200).json({ok:true,offer:{lot_reference:lotReference,actor_role:session.role,actor_ref:actorRef,price}});
    }
    if(req.method==="POST"&&action==="transaction"){
      const p=req.body||{},lotReference=String(p.lotReference||"");if(!lotReference)throw new Error("Lot reference required.");
      const lots=await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference)+"&select=*");
      const lot=lots[0];if(!lot)throw new Error("Lot not found.");
      if(session.role==="collector"&&lot.collector_phone!==session.phone)throw new Error("Lot ownership check failed.");
      const txRef=String(p.transactionReference||ref("TX"));
      const body={transaction_reference:txRef,lot_reference:lotReference,collector_phone:lot.collector_phone,recycler_external_id:p.recyclerExternalId||("ACCOUNT:"+session.phone),quoted_price:p.quotedPrice??lot.quoted_value??null,final_price:p.finalPrice??p.quotedPrice??lot.quoted_value??null,payment_method:p.paymentMethod||null,payment_status:"pending",status:"accepted",collection_address:lot.collection_address,collection_latitude:lot.collection_latitude,collection_longitude:lot.collection_longitude,collected_at:lot.collected_at};
      const rows=await rest("/rest/v1/platform_transactions?on_conflict=transaction_reference",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(body)});
      await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(lotReference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"accepted",quoted_value:body.quoted_price})});
      return res.status(200).json({transaction:rows?.[0]||body});
    }
    if(req.method==="POST"&&action==="handover"){
      const p=req.body||{},txRef=String(p.transactionReference||"");if(!txRef)throw new Error("Transaction reference required.");
      const txs=await rest("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(txRef)+"&select=*");const tx=txs[0];if(!tx)throw new Error("Transaction not found.");
      if(session.role==="collector"&&tx.collector_phone!==session.phone)throw new Error("Transaction ownership check failed.");
      const hs=await rest("/rest/v1/platform_handovers?transaction_reference=eq."+encodeURIComponent(txRef)+"&select=*");
      const current=hs[0]||{transaction_reference:txRef,handover_reference:ref("HREF"),collector_confirmed:false,recycler_confirmed:false};
      if(session.role==="collector")current.collector_confirmed=true; else current.recycler_confirmed=true;
      if(p.actualWeightKg!=null)current.actual_weight_kg=Number(p.actualWeightKg);
      current.handover_latitude=p.lat??current.handover_latitude??null;current.handover_longitude=p.lng??current.handover_longitude??null;current.handover_address=p.address||current.handover_address||null;current.verification_note=p.note||current.verification_note||null;current.handover_at=new Date().toISOString();
      let saved;
      if(hs[0]) saved=(await rest("/rest/v1/platform_handovers?transaction_reference=eq."+encodeURIComponent(txRef),{method:"PATCH",headers:{"Prefer":"return=representation"},body:JSON.stringify(current)}))[0];
      else saved=(await rest("/rest/v1/platform_handovers",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify(current)}))[0];
      const both=!!saved.collector_confirmed&&!!saved.recycler_confirmed;
      await rest("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(txRef),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:both?"handed_over":"accepted",handover_address:saved.handover_address,handover_latitude:saved.handover_latitude,handover_longitude:saved.handover_longitude,handed_over_at:both?saved.handover_at:null})}).catch(()=>{});
      if(both)await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(tx.lot_reference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"handed_over",handed_over_at:saved.handover_at})});
      return res.status(200).json({handover:saved,both_confirmed:both});
    }
    if(req.method==="POST"&&action==="payment"){
      const p=req.body||{},txRef=String(p.transactionReference||""),amount=Number(p.amount||0);if(!txRef||!Number.isFinite(amount)||amount<=0)throw new Error("Valid transaction and amount required.");
      if(session.role!=="recycler")throw new Error("Only the recycler role can record a payment in this demo.");
      const txs=await rest("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(txRef)+"&select=*");const tx=txs[0];if(!tx)throw new Error("Transaction not found.");
      const method=p.method==="digital"?"digital":"cash",paidAt=new Date().toISOString();
      await rest("/rest/v1/platform_transactions?transaction_reference=eq."+encodeURIComponent(txRef),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({final_price:amount,payment_method:method,payment_status:"paid",payment_reference:p.paymentReference||null,status:"completed",updated_at:paidAt})});
      const rows=await rest("/rest/v1/platform_earnings?transaction_reference=eq."+encodeURIComponent(txRef),{method:"GET"});
      const body={collector_phone:tx.collector_phone,transaction_reference:txRef,amount,status:"paid",payment_method:method,payment_reference:p.paymentReference||null,paid_at:paidAt};
      if(rows[0])await rest("/rest/v1/platform_earnings?transaction_reference=eq."+encodeURIComponent(txRef),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify(body)});
      else await rest("/rest/v1/platform_earnings",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify(body)});
      await rest("/rest/v1/platform_lots?lot_reference=eq."+encodeURIComponent(tx.lot_reference),{method:"PATCH",headers:{"Prefer":"return=minimal"},body:JSON.stringify({status:"completed",final_sale_value:amount})});
      return res.status(200).json({ok:true});
    }
    return res.status(400).json({error:"Unknown workflow action."});
  }catch(e){console.error(e);return res.status(502).json({error:"Workflow request failed.",detail:e.message});}
}
