export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
  try{
    const key=String(process.env.GEMINI_API_KEY||"").trim();
    if(!key)return res.status(503).json({error:"GEMINI_API_KEY is not configured on Vercel."});
    const p=req.body||{};
    const prompt=`Estimate a fair indicative scrap purchase price for this item in India using the supplied parameters. Return ONLY valid JSON:
{
  "estimatedPrice": 0,
  "pricePerKg": 0,
  "currency": "INR",
  "confidence": 0.0,
  "basis": "short explanation"
}
Parameters:
category: ${String(p.category||"unknown")}
itemType: ${String(p.itemType||"unknown")}
weightKg: ${Number(p.weightKg||0)}
condition: ${String(p.condition||"unknown")}
location: ${String(p.location||"India")}
Do not claim a live market quote. This is an indicative estimate only. If insufficient information, return 0 and explain in basis.`;
    const models=["gemini-3.8-flash","gemini-3.5-flash-lite"];
    let upstream,payload,lastStatus=502,lastDetail="Gemini price prediction failed.";
    for(const model of models){
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      upstream=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json"}})});
      payload=await upstream.json().catch(()=>({}));
      if(upstream.ok)break;
      lastStatus=upstream.status;lastDetail=payload?.error?.message||lastDetail;
      if(![429,500,502,503,504].includes(lastStatus))break;
    }
    if(!upstream?.ok)return res.status(502).json({error:"AI price prediction failed.",detail:lastDetail,upstreamStatus:lastStatus});
    const text=payload?.candidates?.[0]?.content?.parts?.find(x=>x.text)?.text||"{}";
    let result;try{result=JSON.parse(text)}catch{result=JSON.parse(text.replace(/^\s*\`\`\`json\s*/,"").replace(/\s*\`\`\`\s*$/,""))}
    return res.status(200).json({result});
  }catch(e){console.error(e);return res.status(500).json({error:"Unexpected price prediction error."});}
}
