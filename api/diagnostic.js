import fs from "node:fs";
import path from "node:path";
export default async function handler(req,res){
  try{
    const target=String(req.query?.file||"main");
    const p=target==="public"?path.join(process.cwd(),"public","main.mjs"):path.join(process.cwd(),"main.mjs");
    let source=fs.readFileSync(p,"utf8").replace(/^import[^;]+;\s*/,"");
    new Function(source);
    return res.status(200).json({ok:true,file:target,length:source.length});
  }catch(e){
    return res.status(200).json({ok:false,name:e?.name||"Error",message:e?.message||String(e),stack:String(e?.stack||"").split("\n").slice(0,4)});
  }
}
