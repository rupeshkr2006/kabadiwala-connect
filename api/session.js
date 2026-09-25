import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName="kc_session";
const maxAge=30*24*60*60;
const b64=s=>Buffer.from(s).toString("base64url");
const unb64=s=>Buffer.from(s,"base64url").toString();
function secret(){return String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();}
function sign(body){return createHmac("sha256",secret()).update(body).digest("base64url");}
function tokenFor(payload){const body=b64(JSON.stringify(payload));return body+"."+sign(body);}
function verify(token){
  try{
    const [body,sig]=String(token||"").split(".");
    if(!body||!sig||!secret())return null;
    const expected=sign(body);
    const a=Buffer.from(sig),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b))return null;
    const p=JSON.parse(unb64(body));
    if(!p.exp||p.exp<Date.now())return null;
    return p;
  }catch{return null;}
}
function cookie(value,age=maxAge){return cookieName+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+age;}
export function getSession(req){const raw=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(cookieName+"="));return verify(raw?.slice(cookieName.length+1));}

async function registeredRole(phone){
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
  const key=secret();
  if(!url||!key)return null;
  try{
    const r=await fetch(url+"/rest/v1/profiles?phone=eq."+encodeURIComponent(phone)+"&active=eq.true&select=role&limit=1",{headers:{apikey:key,Authorization:"Bearer "+key}});
    if(!r.ok)return null;
    const rows=await r.json().catch(()=>[]);
    const role=rows?.[0]?.role;
    return ["collector","recycler","admin"].includes(role)?role:null;
  }catch{return null;}
}

export default async function handler(req,res){
  if(req.method==="POST"){
    if(!secret())return res.status(503).json({error:"Session signing is not configured."});
    const {phone,otp,role}=req.body||{};
    const clean=String(phone||"").replace(/\D/g,"");
    if(!/^\d{10}$/.test(clean)||String(otp||"")!=="123456")return res.status(401).json({error:"Invalid demo credentials."});

    const persistedRole=await registeredRole(clean);
    const requestedRole=role==="recycler"?"recycler":role==="admin"?"admin":"collector";
    const configuredAdmin=String(process.env.ADMIN_PHONE||"9990000000").replace(/\D/g,"");
    const isAdminAccount=persistedRole==="admin"||clean===configuredAdmin;
    if(requestedRole==="admin"&&!isAdminAccount)return res.status(403).json({error:"This account is not an admin."});
    const sessionRole=requestedRole==="admin"?"admin":(persistedRole||requestedRole);

    const p={phone:clean,role:sessionRole,iat:Date.now(),exp:Date.now()+maxAge*1000};
    res.setHeader("Set-Cookie",cookie(tokenFor(p)));
    return res.status(200).json({ok:true,role:p.role});
  }
  if(req.method==="GET"){const s=getSession(req);return res.status(200).json({authenticated:!!s,role:s?.role||null});}
  if(req.method==="DELETE"){res.setHeader("Set-Cookie",cookie("",0));return res.status(200).json({ok:true});}
  return res.status(405).json({error:"Method not allowed"});
}
