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
    const hasRequestedRole=role==="collector"||role==="recycler"||role==="admin";
    const requestedRole=role==="recycler"?"recycler":role==="admin"?"admin":role==="collector"?"collector":null;
    const configuredAdmin=String(process.env.ADMIN_PHONE||"9990000000").replace(/\D/g,"");
    const isAdminAccount=persistedRole==="admin"||clean===configuredAdmin;
    if(requestedRole==="admin"&&!isAdminAccount)return res.status(403).json({error:"This account is not an admin."});

    // Existing accounts always keep their registered role. A role supplied by
    // the client cannot silently turn an existing collector into a recycler.
    // For a brand-new phone number, the first OTP verification intentionally
    // returns no role so the UI can show the collector/recycler choice.
    let sessionRole=persistedRole||requestedRole||"pending";
    let isNewAccount=!persistedRole;

    // Persist the role selected during first-time setup so future logins do
    // not ask the user to choose collector/recycler again.
    if(isNewAccount&&requestedRole&&requestedRole!=="admin"){
      const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,"");
      const key=secret();
      if(url&&key){
        const headers={apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json","Prefer":"return=representation"};
        const check=await fetch(url+"/rest/v1/profiles?phone=eq."+encodeURIComponent(clean)+"&select=id,role&limit=1",{headers});
        const rows=check.ok?await check.json().catch(()=>[]):[];
        if(rows?.[0]){
          if(rows[0].role&&["collector","recycler","admin"].includes(rows[0].role))sessionRole=rows[0].role;
        }else{
          const created=await fetch(url+"/rest/v1/profiles",{method:"POST",headers,body:JSON.stringify({phone:clean,role:requestedRole,name:"New User",active:true,profile_source:"app"})});
          if(!created.ok){
            const detail=await created.text().catch(()=> "");
            return res.status(502).json({error:"Could not create account.",detail});
          }
          sessionRole=requestedRole;
        }
        isNewAccount=false;
      }
    }

    const p={phone:clean,role:sessionRole,iat:Date.now(),exp:Date.now()+maxAge*1000};
    res.setHeader("Set-Cookie",cookie(tokenFor(p)));
    return res.status(200).json({ok:true,role:p.role==="pending"?null:p.role,newAccount:isNewAccount});
  }
  if(req.method==="GET"){const s=getSession(req);return res.status(200).json({authenticated:!!s,role:s?.role||null});}
  if(req.method==="DELETE"){res.setHeader("Set-Cookie",cookie("",0));return res.status(200).json({ok:true});}
  return res.status(405).json({error:"Method not allowed"});
}
