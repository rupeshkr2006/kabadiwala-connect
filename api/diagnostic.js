import fs from "node:fs";
import path from "node:path";
export default async function handler(req,res){
  try{
    const target=String(req.query?.file||"main");
    const p=target==="public"?path.join(process.cwd(),"public","main.mjs"):path.join(process.cwd(),"main.mjs");
    const source=fs.readFileSync(p,"utf8").replace(/^import[^;]+;\s*/,"");
    if(String(req.query?.mode||"")==="runtime"){
      const callbacks=[];
      const elements=new Map();
      const makeEl=(id)=>elements.get(id)||elements.set(id,{id,innerHTML:"",value:"",checked:false,disabled:false,style:{},className:"",dataset:{},onclick:null,onsubmit:null,addEventListener(){},querySelector(){return null},querySelectorAll(){return []}}).get(id);
      const document={
        addEventListener(name,fn){if(name==="DOMContentLoaded")callbacks.push(fn);},
        getElementById:id=>makeEl(id),
        createElement:tag=>makeEl("new-"+tag)
      };
      const local={_:{},getItem(k){return this._[k]??null},setItem(k,v){this._[k]=String(v)},removeItem(k){delete this._[k]}};
      const context={document,window:{},navigator:{onLine:true},localStorage:local,sessionStorage:local,location:{hash:"",reload(){},},console,fetch:async()=>({ok:true,json:async()=>({rows:[],latest:[],trends:[]}),text:async()=>""}),setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},URL,crypto:{randomUUID:()=> "diag-id"},indexedDB:{},Event:function(){},Blob:function(){},FileReader:function(){}};
      context.window=context;context.self=context;
      context.window.addEventListener=()=>{};context.window.removeEventListener=()=>{};
      const script=new Function("document","window","navigator","localStorage","sessionStorage","location","fetch","setInterval","clearInterval","setTimeout","clearTimeout","URL","crypto","indexedDB","Event","Blob","FileReader","console",source);
      script(...["document","window","navigator","localStorage","sessionStorage","location","fetch","setInterval","clearInterval","setTimeout","clearTimeout","URL","crypto","indexedDB","Event","Blob","FileReader","console"].map(k=>context[k]));
      if(callbacks[0])await callbacks[0]();
      return res.status(200).json({ok:true,stage:"runtime"});
    }
    new Function(source);
    return res.status(200).json({ok:true,file:target,length:source.length});
  }catch(e){
    return res.status(200).json({ok:false,name:e?.name||"Error",message:e?.message||String(e),stack:String(e?.stack||"").split("\n").slice(0,6)});
  }
}
