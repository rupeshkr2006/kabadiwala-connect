const DB_NAME = "kabadiwala-connect";
const DB_VERSION = 2;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if(!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox",{keyPath:"id"});
      if(!db.objectStoreNames.contains("models")) db.createObjectStore("models");
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

export async function putState(key,value){
  if(!("indexedDB" in window)) return;
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("state","readwrite");
    tx.objectStore("state").put(value,key);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}

export async function getState(key){
  if(!("indexedDB" in window)) return null;
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction("state").objectStore("state").get(key);
    req.onsuccess=()=>resolve(req.result ?? null);
    req.onerror=()=>reject(req.error);
  });
}

export async function putModel(key,value){
  if(!("indexedDB" in window)) return;
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("models","readwrite");
    tx.objectStore("models").put(value,key);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}

export async function getModel(key){
  if(!("indexedDB" in window)) return null;
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction("models").objectStore("models").get(key);
    req.onsuccess=()=>resolve(req.result ?? null);
    req.onerror=()=>reject(req.error);
  });
}

export async function enqueue(operation){
  if(!("indexedDB" in window)) return;
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("outbox","readwrite");
    tx.objectStore("outbox").put({...operation,id:operation.id||crypto.randomUUID(),createdAt:Date.now()});
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}

export async function getOutbox(){
  if(!("indexedDB" in window)) return [];
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction("outbox").objectStore("outbox").getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>reject(req.error);
  });
}

export async function removeOutbox(id){
  const db=await openDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("outbox","readwrite");
    tx.objectStore("outbox").delete(id);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
}
