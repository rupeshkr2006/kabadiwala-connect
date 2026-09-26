const CACHE_NAME = "kabadiwala-connect-v20-final-async-fix";
const APP_SHELL = [
  "/",
  "/index.html",
  "/main.mjs",
  "/styles.css",
  "/favicon.svg",
  "/offline-db.mjs",
  "/manifest.webmanifest", "/admin.html",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.20.0/dist/tf.min.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.9/dist/tf-tflite.min.js",
  "/offline-ai.mjs"
];
const CACHE_ORIGINS = new Set([self.location.origin,"https://cdn.jsdelivr.net"]);

async function cacheOne(cache,url){
  try{
    const res=await fetch(url,{mode:"cors"});
    if(res.ok||res.type==="opaque")await cache.put(url,res.clone());
  }catch{}
}
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map(url=>cacheOne(cache,url)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(!CACHE_ORIGINS.has(url.origin))return;
  event.respondWith(
    caches.match(req).then(cached=>cached||fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
      return res;
    }).catch(()=>{
      if(url.origin===self.location.origin)return caches.match("/index.html");
      throw new Error("offline");
    }))
  );
});
