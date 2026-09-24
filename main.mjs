import { putState, enqueue, getOutbox, removeOutbox } from "./offline-db.mjs";

document.addEventListener("DOMContentLoaded", () => {
  const A = document.getElementById("app");
  const demo = { lat: 16.5062, lng: 80.6480 };
  let lang = localStorage.lang || "en";
  let user = JSON.parse(localStorage.kcUser || "null");
  let accountId = localStorage.kcAccountId || user?.phone || "";
  let accounts = JSON.parse(localStorage.kcAccounts || "{}");
  let role = localStorage.role || "";
  let pos = JSON.parse(localStorage.pos || "null");
  let requests = JSON.parse(localStorage.requests || "[]");
  let profile = JSON.parse(localStorage.kcProfile || "null");
  let recognition = null;
  let maps = {};

  const T = {
    en: {
      brand:"Kabadiwala Connect", tagline:"Sell. Recycle. Repeat.", continue:"Continue", phone:"Mobile number", otp:"Enter OTP",
      demoOtp:"Demo OTP: 123456", verify:"Verify", change:"Change number", chooseRole:"How will you use Kabadiwala Connect?",
      collector:"Collector", recycler:"Recycler", collectorHint:"List scrap and find nearby recyclers.", recyclerHint:"Find collectors and manage pickups.",
      setup:"Quick setup", name:"Your name", business:"Business name", area:"Area / address", radius:"Pickup radius",
      materials:"Accepted materials", save:"Save & continue", dashboard:"Dashboard", requests:"Requests", profile:"Profile", language:"Language",
      hello:"Welcome", listScrap:"List scrap", nearbyRecyclers:"Nearby recyclers", recent:"Recent requests", noRequests:"No requests yet.",
      find:"Find", nearbyCollectors:"Nearby collectors", items:"Available scrap", accepted:"Accepted materials", pending:"Pending",
      accept:"Accept", complete:"Complete", view:"View", map:"Map", useLocation:"Use my location", chooseMap:"Choose on map",
      locationReady:"Location selected", locationFallback:"Use the map or enter an address.", category:"Material", weight:"Weight",
      condition:"Condition", notes:"Notes", submit:"Request pickup", good:"Good", used:"Used", damaged:"Damaged",
      listening:"Listening…", tapMic:"Tap the mic and speak", voiceHint:"Try: “10 kg plastic, good condition”",
      voiceUnsupported:"Speech recognition is unavailable here. You can type instead.", voiceError:"Voice input failed. Try again.",
      saved:"Saved", pickupCreated:"Pickup request sent", noLocation:"Location not selected", signOut:"Sign out", edit:"Edit profile",
      languageSaved:"Language updated", dashboardNav:"Dashboard", role:"Role", collectorCount:"recyclers nearby", collectorMap:"Nearby recyclers",
      recyclerMap:"Nearby collectors", status:"Status", emptyMap:"Allow location or choose a point on the map.",
      phoneError:"Enter a valid 10-digit mobile number.", otpError:"Use the demo OTP 123456.", roleError:"Choose a role.",
      required:"Please complete the required fields.", address:"Address", details:"Details", pickup:"Pickup", price:"Indicative value",
      kg:"kg", demoData:"Demo data", reset:"Reset demo", confirmReset:"Reset this demo session?",
      marketRate:"Indicative market rate", minimumPrice:"Minimum expected price", estimated:"Estimated value", itemType:"Item / type", askingPrice:"Your asking price", expectedPrice:"Expected price", currentOffer:"Current offer",
      counter:"Counter", acceptPrice:"Accept price", agreed:"Agreed", collectorOffer:"Collector offer", recyclerOffer:"Recycler offer",
      counterHint:"Enter a new price", priceNote:"Indicative only — final price is negotiated.", priceRequired:"Enter a valid price.",
      priceHistory:"Bargain history", waiting:"Waiting for the other side", bargain:"Bargain", photoAI:"AI scrap recognition", photoHint:"Upload a clear photo and AI will fill the details below.", uploadPhoto:"Upload scrap photo", uploadHint:"Click to choose a photo or take one with your camera.", changePhoto:"Change photo", analyzePhoto:"Analyze photo", analyzingPhoto:"Analyzing photo…", photoReady:"Photo analyzed", photoError:"Could not analyze this photo.", photoDisclaimer:"AI result is an estimate. Check the material before submitting."

    },
    hi: {
      brand:"कबाड़ीवाला कनेक्ट", tagline:"बेचें। रीसायकल करें। फिर दोहराएं।", continue:"आगे बढ़ें", phone:"मोबाइल नंबर", otp:"OTP दर्ज करें",
      demoOtp:"डेमो OTP: 123456", verify:"सत्यापित करें", change:"नंबर बदलें", chooseRole:"आप कबाड़ीवाला कनेक्ट कैसे इस्तेमाल करेंगे?",
      collector:"कलेक्टर", recycler:"रीसायकलर", collectorHint:"स्क्रैप सूची बनाएं और पास के रीसायकलर खोजें।", recyclerHint:"कलेक्टर खोजें और पिकअप संभालें।",
      setup:"त्वरित सेटअप", name:"आपका नाम", business:"व्यवसाय का नाम", area:"क्षेत्र / पता", radius:"पिकअप दूरी",
      materials:"स्वीकार्य सामग्री", save:"सेव करें", dashboard:"डैशबोर्ड", requests:"रिक्वेस्ट", profile:"प्रोफ़ाइल", language:"भाषा",
      hello:"स्वागत है", listScrap:"स्क्रैप सूची", nearbyRecyclers:"पास के रीसायकलर", recent:"हाल की रिक्वेस्ट", noRequests:"अभी कोई रिक्वेस्ट नहीं।",
      find:"खोजें", nearbyCollectors:"पास के कलेक्टर", items:"उपलब्ध स्क्रैप", accepted:"स्वीकार्य सामग्री", pending:"पेंडिंग",
      accept:"स्वीकार करें", complete:"पूरा करें", view:"देखें", map:"मैप", useLocation:"मेरी लोकेशन", chooseMap:"मैप पर चुनें",
      locationReady:"लोकेशन चुनी गई", locationFallback:"मैप चुनें या पता दर्ज करें।", category:"सामग्री", weight:"वजन",
      condition:"स्थिति", notes:"नोट्स", submit:"पिकअप रिक्वेस्ट", good:"अच्छी", used:"इस्तेमाल की हुई", damaged:"खराब",
      listening:"सुन रहा है…", tapMic:"माइक दबाकर बोलें", voiceHint:"उदाहरण: “10 किलो प्लास्टिक, अच्छी स्थिति”",
      voiceUnsupported:"यहां वॉइस रिकग्निशन उपलब्ध नहीं है। टाइप करें।", voiceError:"वॉइस इनपुट विफल हुआ। फिर कोशिश करें।",
      saved:"सेव हो गया", pickupCreated:"पिकअप रिक्वेस्ट भेजी गई", noLocation:"लोकेशन नहीं चुनी गई", signOut:"साइन आउट", edit:"प्रोफ़ाइल बदलें",
      languageSaved:"भाषा अपडेट हुई", dashboardNav:"डैशबोर्ड", role:"भूमिका", collectorCount:"रीसायकलर पास में", collectorMap:"पास के रीसायकलर",
      recyclerMap:"पास के कलेक्टर", status:"स्थिति", emptyMap:"लोकेशन की अनुमति दें या मैप पर बिंदु चुनें।",
      phoneError:"10 अंकों का मोबाइल नंबर दर्ज करें।", otpError:"डेमो OTP 123456 इस्तेमाल करें।", roleError:"भूमिका चुनें।",
      required:"जरूरी जानकारी भरें।", address:"पता", details:"जानकारी", pickup:"पिकअप", price:"अनुमानित मूल्य",
      kg:"किलो", demoData:"डेमो डेटा", reset:"डेमो रीसेट", confirmReset:"डेमो सेशन रीसेट करें?",
      marketRate:"अनुमानित बाजार दर", minimumPrice:"न्यूनतम अनुमानित कीमत", estimated:"अनुमानित मूल्य", itemType:"वस्तु / प्रकार", askingPrice:"आपकी कीमत", expectedPrice:"आपकी अपेक्षित कीमत", currentOffer:"वर्तमान ऑफर",
      counter:"नई कीमत", acceptPrice:"कीमत स्वीकार करें", agreed:"तय कीमत", collectorOffer:"कलेक्टर ऑफर", recyclerOffer:"रीसायकलर ऑफर",
      counterHint:"नई कीमत डालें", priceNote:"यह केवल अनुमान है — अंतिम कीमत बातचीत से तय होगी।", priceRequired:"सही कीमत डालें।",
      priceHistory:"बातचीत का इतिहास", waiting:"दूसरी तरफ के जवाब का इंतजार", bargain:"मोलभाव", photoAI:"AI स्क्रैप पहचान", photoHint:"साफ फोटो अपलोड करें और AI नीचे की जानकारी भर देगा।", uploadPhoto:"स्क्रैप फोटो अपलोड करें", uploadHint:"फोटो चुनने या कैमरा इस्तेमाल करने के लिए दबाएं।", changePhoto:"फोटो बदलें", analyzePhoto:"फोटो जांचें", analyzingPhoto:"फोटो जांच रहा है…", photoReady:"फोटो जांची गई", photoError:"फोटो जांच नहीं हो सकी।", photoDisclaimer:"AI परिणाम अनुमान है। सबमिट करने से पहले सामग्री जांचें."

    },
    mr: {
      brand:"कबाडीवाला कनेक्ट", tagline:"विका. रिसायकल करा. पुन्हा करा.", continue:"पुढे जा", phone:"मोबाइल नंबर", otp:"OTP टाका",
      demoOtp:"डेमो OTP: 123456", verify:"पडताळा", change:"नंबर बदला", chooseRole:"कबाडीवाला कनेक्ट कसे वापरणार?",
      collector:"कलेक्टर", recycler:"रिसायकलर", collectorHint:"भंगार नोंदवा आणि जवळचे रिसायकलर शोधा.", recyclerHint:"कलेक्टर शोधा आणि पिकअप सांभाळा.",
      setup:"जलद सेटअप", name:"तुमचे नाव", business:"व्यवसायाचे नाव", area:"परिसर / पत्ता", radius:"पिकअप अंतर",
      materials:"स्वीकारलेली सामग्री", save:"सेव्ह करा", dashboard:"डॅशबोर्ड", requests:"विनंत्या", profile:"प्रोफाइल", language:"भाषा",
      hello:"स्वागत", listScrap:"भंगार नोंदवा", nearbyRecyclers:"जवळचे रिसायकलर", recent:"अलीकडील विनंत्या", noRequests:"अजून विनंत्या नाहीत.",
      find:"शोधा", nearbyCollectors:"जवळचे कलेक्टर", items:"उपलब्ध भंगार", accepted:"स्वीकारलेली सामग्री", pending:"प्रलंबित",
      accept:"स्वीकारा", complete:"पूर्ण करा", view:"पहा", map:"नकाशा", useLocation:"माझे लोकेशन", chooseMap:"नकाशावर निवडा",
      locationReady:"लोकेशन निवडले", locationFallback:"नकाशावर निवडा किंवा पत्ता टाका.", category:"सामग्री", weight:"वजन",
      condition:"स्थिती", notes:"नोट्स", submit:"पिकअप विनंती", good:"चांगली", used:"वापरलेली", damaged:"खराब",
      listening:"ऐकत आहे…", tapMic:"माइक दाबून बोला", voiceHint:"उदाहरण: “10 किलो प्लास्टिक, चांगली स्थिती”",
      voiceUnsupported:"इथे व्हॉइस रिकग्निशन उपलब्ध नाही. टाइप करा.", voiceError:"व्हॉइस इनपुट अयशस्वी. पुन्हा प्रयत्न करा.",
      saved:"सेव्ह झाले", pickupCreated:"पिकअप विनंती पाठवली", noLocation:"लोकेशन निवडले नाही", signOut:"साइन आउट", edit:"प्रोफाइल बदला",
      languageSaved:"भाषा अपडेट झाली", dashboardNav:"डॅशबोर्ड", role:"भूमिका", collectorCount:"रिसायकलर जवळ", collectorMap:"जवळचे रिसायकलर",
      recyclerMap:"जवळचे कलेक्टर", status:"स्थिती", emptyMap:"लोकेशन परवानगी द्या किंवा नकाशावर बिंदू निवडा.",
      phoneError:"10 अंकी मोबाइल नंबर टाका.", otpError:"डेमो OTP 123456 वापरा.", roleError:"भूमिका निवडा.",
      required:"आवश्यक माहिती भरा.", address:"पत्ता", details:"माहिती", pickup:"पिकअप", price:"अंदाजे मूल्य",
      kg:"किलो", demoData:"डेमो डेटा", reset:"डेमो रीसेट", confirmReset:"डेमो सेशन रीसेट करायचे?",
      marketRate:"अंदाजे बाजार दर", minimumPrice:"किमान अंदाजे किंमत", estimated:"अंदाजे किंमत", itemType:"वस्तू / प्रकार", askingPrice:"तुमची किंमत", expectedPrice:"तुमची अपेक्षित किंमत", currentOffer:"सध्याची ऑफर",
      counter:"नवी किंमत", acceptPrice:"किंमत स्वीकारा", agreed:"ठरलेली किंमत", collectorOffer:"कलेक्टर ऑफर", recyclerOffer:"रिसायकलर ऑफर",
      counterHint:"नवी किंमत टाका", priceNote:"ही फक्त अंदाजे किंमत आहे — अंतिम किंमत चर्चेने ठरेल.", priceRequired:"योग्य किंमत टाका.",
      priceHistory:"बोलणीचा इतिहास", waiting:"दुसऱ्या बाजूच्या उत्तराची वाट पाहत आहे", bargain:"भाव करा", photoAI:"AI भंगार ओळख", photoHint:"स्वच्छ फोटो अपलोड करा आणि AI खालील माहिती भरेल.", uploadPhoto:"भंगाराचा फोटो अपलोड करा", uploadHint:"फोटो निवडण्यासाठी किंवा कॅमेरा वापरण्यासाठी दाबा.", changePhoto:"फोटो बदला", analyzePhoto:"फोटो तपासा", analyzingPhoto:"फोटो तपासत आहे…", photoReady:"फोटो तपासला", photoError:"फोटो तपासता आला नाही.", photoDisclaimer:"AI निकाल अंदाज आहे. सबमिट करण्यापूर्वी सामग्री तपासा."

    }
  };
  const tr = k => (T[lang] && T[lang][k]) || T.en[k] || k;
  const PRICE_PER_KG = {
    plastic: 25, paper: 12, cardboard: 10, metal: 40, iron: 30,
    copper: 650, aluminium: 150, "e-waste": 180
  };
  const MIN_PRICE_PER_KG = {
    plastic: 20, paper: 9, cardboard: 8, metal: 32, iron: 24,
    copper: 520, aluminium: 120, "e-waste": 145
  };
  const money = n => "₹" + Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0});
  const categoryKey = value => String(value||"").trim().toLowerCase().replace(/\s+/g,"-");
  const weightKg = value => {
    const m=String(value||"").toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|kilogram|kilograms|किलो|किलोग्राम|grams?|g|ग्रॅम|ग्राम)?/i);
    if(!m)return 0;
    const n=parseFloat(m[1].replace(",",".")); const u=(m[2]||"kg").toLowerCase();
    return /^(g|gram|grams|ग्रॅम|ग्राम)$/.test(u) ? n/1000 : n;
  };
  const rateFor = category => PRICE_PER_KG[categoryKey(category)] || 20;
  const minRateFor = category => MIN_PRICE_PER_KG[categoryKey(category)] || Math.max(15,Math.round(rateFor(category)*0.8));
  const indicativeFor = (category,weight) => Math.round(rateFor(category)*weightKg(weight));
  const minimumFor = (category,weight) => Math.round(minRateFor(category)*weightKg(weight));
  function normalizePricing(){
    let changed=false;
    requests=requests.map(r=>{
      const rate=r.rate||rateFor(r.category);
      const total=r.indicativeTotal||indicativeFor(r.category,r.quantity);
      const offers=Array.isArray(r.offers)&&r.offers.length?r.offers:[{by:"collector",price:Number(r.askingPrice||total),at:Date.now()}];
      const currentOffer=Number(r.currentOffer||offers[offers.length-1]?.price||r.askingPrice||total);
      const minRate=r.minimumRate||minRateFor(r.category);
      const minimumPrice=r.minimumPrice||minimumFor(r.category,r.quantity);
      const next={...r,rate,minimumRate:minRate,indicativeTotal:total,minimumPrice,askingPrice:Number(r.askingPrice||offers[0]?.price||total),expectedPrice:Number(r.expectedPrice||r.askingPrice||offers[0]?.price||total),offers,currentOffer,priceStatus:r.priceStatus||"Collector offer"};
      if(JSON.stringify(next)!==JSON.stringify(r))changed=true;
      return next;
    });
    if(changed)save();
  }
  function offerLabel(r){
    if(r.agreedPrice) return money(r.agreedPrice)+" agreed";
    return money(r.currentOffer||r.askingPrice||r.indicativeTotal);
  }
  function pricePanel(r,showInput=false){
    return '<div class="price-box"><div><span>Indicative</span><b>'+money(r.indicativeTotal)+'</b><small>'+money(r.rate)+' / kg</small></div><div><span>Current offer</span><b>'+offerLabel(r)+'</b><small>'+esc(r.priceStatus||"")+'</small></div>'+(showInput?'<label class="offer-input"><span>Counter offer</span><input data-offer-input="'+r.id+'" type="number" min="1" step="1" value="'+esc(r.currentOffer||r.askingPrice||r.indicativeTotal)+'" inputmode="numeric"></label>':'')+'</div>';
  }

  const save = () => {
    localStorage.lang=lang; localStorage.role=role; localStorage.pos=JSON.stringify(pos);
    localStorage.requests=JSON.stringify(requests); localStorage.kcUser=JSON.stringify(user);
    localStorage.kcProfile=JSON.stringify(profile);
    localStorage.kcAccountId=accountId;
    if(accountId) {
      accounts[accountId]={phone:accountId,role,profile,pos,verified:!!user?.verified};
      localStorage.kcAccounts=JSON.stringify(accounts);
      putState("app",{lang,role,pos,requests,user,profile,accountId}).catch(()=>{});
      enqueue({id:"profile:"+accountId,type:"profile",data:{
        phone:accountId,role,name:profile?.name||"New User",
        preferred_language:lang,general_location:profile?.area||null
      }}).catch(()=>{});
    }
  };
  async function syncPending(){
    if(!navigator.onLine)return;
    const items=await getOutbox().catch(()=>[]);
    if(!items.length)return;
    try{
      const response=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({operations:items})});
      if(!response.ok)return;
      const data=await response.json().catch(()=>({}));
      for(const item of items){
        if((data.results||[]).some(x=>x.id===item.id)) await removeOutbox(item.id).catch(()=>{});
      }
      updateNetworkStatus();
    }catch{}
  }
  function updateNetworkStatus(){
    const el=document.getElementById("netStatus");
    if(!el)return;
    el.textContent=navigator.onLine?"● Online":"● Offline";
    el.className=navigator.onLine?"net-status online":"net-status offline";
    el.title=navigator.onLine?"Connected — pending changes will sync.":"Offline — changes are saved on this device.";
  }
  window.addEventListener("online",()=>{updateNetworkStatus();syncPending();});
  window.addEventListener("offline",updateNetworkStatus);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function toast(text){ const d=document.createElement("div"); d.className="toast"; d.textContent=text; document.body.appendChild(d); setTimeout(()=>d.remove(),2600); }
  function go(p){ location.hash=p; render(); }
  function seedData(){
    if(!requests.length) {
      requests = [
        {id:"demo-1",category:"Plastic",quantity:"8 kg",condition:"Good",notes:"Bottles and containers",address:"Vijayawada",lat:16.5062,lng:80.648,status:"Pending",collector:"Demo Collector"},
        {id:"demo-2",category:"Cardboard",quantity:"15 kg",condition:"Used",notes:"Flattened boxes",address:"Benz Circle",lat:16.5108,lng:80.632,status:"Pending",collector:"Demo Collector 2"}
      ];
      save();
    }
    normalizePricing();
  }
  function topbar(){
    return '<header class="top"><a class="brand" href="#dashboard" aria-label="'+tr("brand")+'"><span class="brand-mark">↻</span><span>'+tr("brand")+'</span></a><nav class="nav">'+
      '<span id="netStatus" class="net-status">● '+(navigator.onLine?"Online":"Offline")+'</span><button data-p="dashboard">'+tr("dashboardNav")+'</button><button data-p="safety">'+(lang==="hi"?"सुरक्षा":lang==="mr"?"सुरक्षा":"Safety")+'</button><button data-p="requests">'+tr("requests")+'</button><button data-p="profile">'+tr("profile")+'</button><button class="profile-pill" data-p="profile">◉ '+esc(profile?.name||profile?.business||"Profile")+'</button>'+
      '<select class="lang" aria-label="'+tr("language")+'"><option value="en">EN</option><option value="hi">हि</option><option value="mr">मर</option></select></nav></header>';
  }
  function bindShell(){
    const s=A.querySelector(".lang"); if(s){s.value=lang;s.onchange=e=>{lang=e.target.value;save();toast(tr("languageSaved"));render();};}
    A.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>go(b.dataset.p));
  }
  function auth(){
    if(!location.hash || location.hash==="#login") return phoneScreen();
    if(location.hash==="#otp") return otpScreen();
    if(location.hash==="#role") return roleScreen();
    if(location.hash==="#setup") return setupScreen();
    return phoneScreen();
  }
  function phoneScreen(){
    A.innerHTML='<main class="auth"><div class="auth-card"><div class="logo-ring">↻</div><p class="eyebrow">KABADIWALA CONNECT</p><h1>'+tr("tagline")+'</h1><p class="lead">Sign in with your mobile number</p><form id="phoneForm"><label>'+tr("phone")+'<div class="phone-input"><span>+91</span><input id="phone" inputmode="numeric" maxlength="10" placeholder="9876543210" autocomplete="tel" autofocus required></div></label><button class="primary full">'+tr("continue")+' <span>→</span></button></form><p class="demo-note">'+tr("demoOtp")+'</p></div></main>';
    document.getElementById("phoneForm").onsubmit=e=>{
      e.preventDefault();
      const p=document.getElementById("phone").value.replace(/\D/g,"");
      if(p.length!==10)return toast(tr("phoneError"));
      accountId=p;
      const existing=accounts[p];
      user={phone:p,verified:false};
      role=existing?.role||"";
      profile=existing?.profile||null;
      pos=null;
      save();
      go("otp");
    };
  }
  function otpScreen(){
    let timer=30;
    A.innerHTML='<main class="auth"><div class="auth-card"><button class="back" id="change">← '+tr("change")+'</button><p class="eyebrow">VERIFY</p><h1>'+tr("otp")+'</h1><p class="lead">+91 '+esc(user?.phone||"")+'</p><form id="otpForm"><input class="otp-input" id="otp" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code" autofocus required><button class="primary full">'+tr("verify")+' <span>→</span></button></form><div class="otp-meta"><span id="timer">00:30</span><button type="button" id="resend" class="text-btn" disabled>'+tr("resend")+'</button></div><p class="demo-note">'+tr("demoOtp")+'</p></div></main>';
    document.getElementById("change").onclick=()=>go("login");
    const resend=document.getElementById("resend"), timerEl=document.getElementById("timer");
    const int=setInterval(()=>{timer--;if(timerEl)timerEl.textContent="00:"+String(Math.max(timer,0)).padStart(2,"0");if(timer<=0){clearInterval(int);if(resend)resend.disabled=false;}},1000);
    resend.onclick=()=>{timer=30;resend.disabled=true;toast(tr("resend"));};
    document.getElementById("otpForm").onsubmit=e=>{
      e.preventDefault();
      if(document.getElementById("otp").value!=="123456")return toast(tr("otpError"));
      user.verified=true;
      const existing=accounts[accountId];
      role=existing?.role||"";
      profile=existing?.profile||null;
      pos=existing?.pos||null;
      save();
      go(role?"dashboard":"role");
    };
  }

  function roleScreen(){
    A.innerHTML='<main class="auth"><div class="auth-card role-card"><p class="eyebrow">ONE CHOICE</p><h1>'+tr("chooseRole")+'</h1><div class="role-grid"><button class="role-option" data-role="collector"><span class="role-icon">♻</span><strong>'+tr("collector")+'</strong><small>'+tr("collectorHint")+'</small></button><button class="role-option" data-role="recycler"><span class="role-icon">⌂</span><strong>'+tr("recycler")+'</strong><small>'+tr("recyclerHint")+'</small></button></div></div></main>';
    A.querySelectorAll("[data-role]").forEach(b=>b.onclick=()=>{role=b.dataset.role;save();go("setup");});
  }
  function setupScreen(){
    const isR=role==="recycler";
    A.innerHTML='<main class="auth"><div class="auth-card setup-card"><p class="eyebrow">'+tr("setup")+'</p><h1>'+tr(role)+'</h1><form id="setupForm"><label>'+tr("name")+'<input id="name" value="'+esc(profile?.name||"")+'" required></label>'+
      (isR?'<label>'+tr("business")+'<input id="business" value="'+esc(profile?.business||"")+'"></label><label>'+tr("materials")+'<input id="materials" value="'+esc(profile?.materials||"Plastic, paper, metal")+'" placeholder="Plastic, paper, metal"></label>':'')+
      '<label>'+tr("area")+'<input id="area" value="'+esc(profile?.area||"")+'" placeholder="Vijayawada" required></label><label>'+tr("radius")+'<select id="radius"><option>5 km</option><option>10 km</option><option>20 km</option></select></label>'+
      '<div class="location-actions"><button type="button" class="secondary" id="loc">⌖ '+tr("useLocation")+'</button><button type="button" class="secondary" id="mapPick">◎ '+tr("chooseMap")+'</button></div><div id="miniMap" class="map small-map"></div><button class="primary full">'+tr("save")+' <span>→</span></button></form></div></main>';
    if(window.L)initMap("miniMap",true);
    document.getElementById("loc").onclick=getLocation;
    document.getElementById("mapPick").onclick=()=>enableMapPick("miniMap");
    document.getElementById("setupForm").onsubmit=e=>{e.preventDefault();profile={...(profile||{}),name:document.getElementById("name").value,area:document.getElementById("area").value,radius:document.getElementById("radius").value};if(isR){profile.business=document.getElementById("business").value;profile.materials=document.getElementById("materials").value;}save();go("dashboard");};
  }
  function dashboard(){
    if(role==="collector") return collectorDash();
    return recyclerDash();
  }
  function collectorDash(){
    seedData();
    A.innerHTML=topbar()+'<main class="page"><section class="welcome"><div><p class="eyebrow">'+tr("collector")+'</p><h1>'+tr("hello")+', '+esc(profile?.name||"")+'</h1><p>'+tr("nearbyRecyclers")+'</p></div><button class="primary" id="list">＋ '+tr("listScrap")+'</button></section>'+
      '<section class="dash-grid"><div class="panel map-panel"><div class="panel-head"><div><h2>'+tr("nearbyRecyclers")+'</h2><p>'+tr("collectorMap")+'</p></div><button class="icon-btn" id="dashLoc" aria-label="'+tr("useLocation")+'">⌖</button></div><div id="map" class="map"></div></div>'+
      '<div class="panel"><div class="panel-head"><div><h2>'+tr("recent")+'</h2><p>'+requests.length+' '+tr("requests")+'</p></div><button class="text-btn" data-p="requests">'+tr("view")+'</button></div><div class="mini-list">'+requests.slice(0,4).map(requestCard).join("")+'</div></div></section>'+
      '<section class="quick"><button class="quick-card" id="voiceQuick"><span>●</span><strong>'+tr("tapMic")+'</strong><small>'+tr("voiceHint")+'</small></button><button class="quick-card" id="mapQuick"><span>⌖</span><strong>'+tr("useLocation")+'</strong><small>'+tr("locationFallback")+'</small></button></section></main>';
    bindShell(); if(window.L)initMap("map");
    document.getElementById("list").onclick=()=>go("list");
    document.getElementById("voiceQuick").onclick=()=>go("list");
    document.getElementById("mapQuick").onclick=getLocation;
    document.getElementById("dashLoc").onclick=getLocation;
  }
  function recyclerDash(){
    seedData();
    A.innerHTML=topbar()+'<main class="page"><section class="welcome"><div><p class="eyebrow">'+tr("recycler")+'</p><h1>'+tr("hello")+', '+esc(profile?.name||profile?.business||"")+'</h1><p>'+tr("nearbyCollectors")+'</p></div><button class="secondary" id="rLoc">⌖ '+tr("useLocation")+'</button></section>'+
      '<section class="dash-grid"><div class="panel map-panel"><div class="panel-head"><div><h2>'+tr("nearbyCollectors")+'</h2><p>'+tr("recyclerMap")+'</p></div></div><div id="map" class="map"></div></div>'+
      '<div class="panel"><div class="panel-head"><div><h2>'+tr("items")+'</h2><p>'+requests.filter(x=>x.status!=="Completed").length+' '+tr("pending")+'</p></div><button class="text-btn" data-p="requests">'+tr("view")+'</button></div><div class="mini-list">'+requests.slice(0,4).map(requestCard).join("")+'</div></div></section>'+
      '<section class="chips"><span>'+tr("accepted")+'</span><b>'+esc(profile?.materials||"Plastic · Paper · Metal")+'</b></section></main>';
    bindShell(); if(window.L)initMap("map");
    document.getElementById("rLoc").onclick=getLocation;
  }
  function requestCard(r){
    return '<article class="request-card"><div><span class="status '+String(r.status).toLowerCase()+'">'+esc(r.status)+'</span><h3>'+esc(r.category)+' · '+esc(r.quantity)+'</h3><p>'+esc(r.address||r.collector||"")+'</p><strong class="card-price">'+money(r.agreedPrice||r.currentOffer||r.askingPrice||r.indicativeTotal)+'</strong><small class="card-min">Min. '+money(r.minimumPrice||minimumFor(r.category,r.quantity))+'</small></div><span class="arrow">→</span></article>';
  }
  async function analyzeScrapPhoto(file){
    if(!file)return;
    const state=document.getElementById("photoState"),btn=document.getElementById("analyzePhoto");
    if(state)state.textContent=tr("analyzingPhoto");
    if(btn){btn.disabled=true;btn.textContent=tr("analyzingPhoto");}
    try{
      const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
      const response=await fetch("/api/analyze-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:dataUrl})});
      const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.detail?`${data.error||"AI analysis failed"}: ${data.detail}`:(data.error||"AI analysis failed"));
      const result=data.result||{};
      if(result.category)document.getElementById("cat").value=result.category;
      if(result.itemType)document.getElementById("itemType").value=result.itemType;
      if(result.condition){const x=String(result.condition).toLowerCase(),el=document.getElementById("cond");el.selectedIndex=/damaged|broken/.test(x)?2:/used|old/.test(x)?1:0;}
      if(result.notes)document.getElementById("notes").value=result.notes;
      document.getElementById("cat").dispatchEvent(new Event("input"));document.getElementById("weight").dispatchEvent(new Event("input"));
      if(state)state.textContent=tr("photoReady")+(result.confidence?" · "+Math.round(Number(result.confidence)*100)+"%":"");
      toast("✓ "+tr("photoReady"));
    }catch(err){console.error(err);if(state)state.textContent=tr("photoError");toast(tr("photoError"));}
    finally{if(btn){btn.disabled=false;btn.textContent=tr("analyzePhoto");}}
  }
  function listScreen(){
    A.innerHTML=topbar()+'<main class="page"><section class="section-title"><div><p class="eyebrow">'+tr("listScrap")+'</p><h1>'+tr("details")+'</h1></div><button class="secondary" data-p="dashboard">← '+tr("dashboard")+'</button></section><div class="form-layout"><section class="panel form-panel"><div class="voice-box"><button type="button" class="mic" id="mic" aria-label="'+tr("tapMic")+'">●</button><div><strong>'+tr("tapMic")+'</strong><p>'+tr("voiceHint")+'</p></div><span id="listenState"></span></div><div class="photo-ai-box"><div class="photo-ai-copy"><strong>📷 '+tr("photoAI")+'</strong><p>'+tr("photoHint")+'</p></div><label class="photo-drop" id="photoDrop" for="scrapPhoto"><span class="photo-drop-icon">＋</span><span><b>'+tr("uploadPhoto")+'</b><small>'+tr("uploadHint")+'</small></span></label><input id="scrapPhoto" type="file" accept="image/*" capture="environment" class="photo-file-hidden"><div id="photoPreviewWrap" class="photo-preview-wrap" hidden><img id="photoPreview" alt="Scrap preview"><button type="button" class="photo-change" id="changePhoto">'+tr("changePhoto")+'</button></div><div class="photo-ai-actions"><button type="button" class="primary" id="analyzePhoto" disabled>'+tr("analyzePhoto")+'</button><span id="photoState"></span></div><small class="photo-disclaimer">'+tr("photoDisclaimer")+'</small></div><form id="scrapForm"><label>'+tr("category")+'<input id="cat" required placeholder="Plastic, paper, metal..."></label><label>'+tr("itemType")+'<input id="itemType" placeholder="Bottle, copper wire, cardboard box..."></label><label>'+tr("weight")+'<input id="weight" required placeholder="10 kg"></label><div id="pricePreview" class="price-preview"></div><label>'+tr("expectedPrice")+'<input id="askingPrice" type="number" min="1" step="1" required placeholder="₹"></label><p class="price-note">'+tr("priceNote")+'</p><label>'+tr("condition")+'<select id="cond"><option>'+tr("good")+'</option><option>'+tr("used")+'</option><option>'+tr("damaged")+'</option></select></label><label>'+tr("address")+'<input id="address" value="'+esc(profile?.area||"")+'" placeholder="Vijayawada"></label><label>'+tr("notes")+'<textarea id="notes" rows="3"></textarea></label><div class="location-actions"><button type="button" class="secondary" id="loc">⌖ '+tr("useLocation")+'</button><button type="button" class="secondary" id="pick">◎ '+tr("chooseMap")+'</button></div><div id="formMap" class="map small-map"></div><div id="where" class="location-line">'+(pos?tr("locationReady"):tr("noLocation"))+'</div><button class="primary full">'+tr("submit")+' <span>→</span></button></form></section><aside class="panel tips"><h2>'+tr("nearbyRecyclers")+'</h2><p>'+tr("priceNote")+'</p><div id="sideMap" class="map"></div></aside></div></main>';
    bindShell();if(window.L)initMap("formMap",true);if(window.L)initMap("sideMap",true);
    const updatePreview=()=>{const cat=document.getElementById("cat").value,weight=document.getElementById("weight").value;const total=indicativeFor(cat,weight),minimum=minimumFor(cat,weight);document.getElementById("pricePreview").innerHTML=cat&&weightKg(weight)>0?'<div><span>'+tr("marketRate")+'</span><b>'+money(rateFor(cat))+' / kg</b></div><div><span>'+tr("minimumPrice")+'</span><b>'+money(minimum)+'</b></div><div><span>'+tr("estimated")+'</span><b>'+money(total)+'</b></div>':'';};
    document.getElementById("cat").oninput=updatePreview;document.getElementById("weight").oninput=updatePreview;updatePreview();
    const photoInput=document.getElementById("scrapPhoto"),photoPreview=document.getElementById("photoPreview"),photoWrap=document.getElementById("photoPreviewWrap"),photoDrop=document.getElementById("photoDrop"),analyzeBtn=document.getElementById("analyzePhoto");
    const setPhoto=()=>{const file=photoInput.files?.[0];if(!file)return;photoPreview.src=URL.createObjectURL(file);photoWrap.hidden=false;photoDrop.hidden=true;analyzeBtn.disabled=false;document.getElementById("photoState").textContent="";analyzeScrapPhoto(file);};
    photoInput.onchange=setPhoto;
    document.getElementById("changePhoto").onclick=()=>photoInput.click();
    photoDrop.ondragover=e=>{e.preventDefault();photoDrop.classList.add("dragging");};
    photoDrop.ondragleave=()=>photoDrop.classList.remove("dragging");
    photoDrop.ondrop=e=>{e.preventDefault();photoDrop.classList.remove("dragging");const file=e.dataTransfer.files?.[0];if(file){const dt=new DataTransfer();dt.items.add(file);photoInput.files=dt.files;setPhoto();}};
    analyzeBtn.onclick=()=>analyzeScrapPhoto(photoInput.files?.[0]);
    document.getElementById("loc").onclick=getLocation;document.getElementById("pick").onclick=()=>enableMapPick("formMap");document.getElementById("mic").onclick=startVoice;
    document.getElementById("scrapForm").onsubmit=e=>{e.preventDefault();const cat=document.getElementById("cat").value.trim(),itemType=document.getElementById("itemType").value.trim(),weight=document.getElementById("weight").value.trim(),asking=Number(document.getElementById("askingPrice").value);if(!cat||!weight||!Number.isFinite(asking)||asking<=0)return toast(tr("priceRequired"));const r={id:Date.now(),category:cat,itemType,quantity:weight,condition:document.getElementById("cond").value,notes:document.getElementById("notes").value,address:document.getElementById("address").value,lat:pos?.lat||demo.lat,lng:pos?.lng||demo.lng,status:"Pending",collector:profile?.name||"Demo Collector",collectorPhone:accountId,rate:rateFor(cat),minimumRate:minRateFor(cat),indicativeTotal:indicativeFor(cat,weight),minimumPrice:minimumFor(cat,weight),expectedPrice:asking,askingPrice:asking,currentOffer:asking,priceStatus:"Collector offer",offers:[{by:"collector",price:asking,at:Date.now()}]};requests.unshift(r);save();enqueue({id:"lot:"+r.id,type:"lot",data:{
        collectorPhone:accountId,category:cat,itemType,weightKg:weightKg(weight),condition:r.condition,notes:r.notes,
        address:r.address,lat:r.lat,lng:r.lng,indicativeTotal:r.indicativeTotal,expectedPrice:r.expectedPrice
      }}).catch(()=>{});toast(tr("pickupCreated"));syncPending();go("requests");};
  }
  function requestsScreen(){
    seedData(); normalizePricing();
    const own = role==="collector" ? requests.filter(r=>r.collectorPhone===accountId) : requests;
    A.innerHTML=topbar()+'<main class="page"><section class="section-title"><div><p class="eyebrow">'+tr("requests")+'</p><h1>'+tr("pickup")+'</h1></div></section><div class="request-list">'+(own.length?own.map(r=>{
      const latestBy=r.offers?.[r.offers.length-1]?.by;
      const isPending=r.status==="Pending", isAccepted=r.status==="Accepted";
      let actions="";
      if(role==="recycler"&&isPending){
        actions='<button class="primary" data-accept="'+r.id+'">'+tr("acceptPrice")+' '+money(r.currentOffer)+'</button><input class="counter-input" data-counter="'+r.id+'" type="number" min="1" step="1" placeholder="'+tr("counterHint")+'" inputmode="numeric"><button class="secondary" data-counter-btn="'+r.id+'">'+tr("counter")+'</button>';
      } else if(role==="collector"&&isPending&&latestBy==="recycler"){
        actions='<button class="primary" data-accept="'+r.id+'">'+tr("acceptPrice")+' '+money(r.currentOffer)+'</button><input class="counter-input" data-counter="'+r.id+'" type="number" min="1" step="1" placeholder="'+tr("counterHint")+'" inputmode="numeric"><button class="secondary" data-counter-btn="'+r.id+'">'+tr("counter")+'</button>';
      } else if(isAccepted&&role==="recycler"){
        actions='<button class="primary" data-d="'+r.id+'">'+tr("complete")+'</button>';
      } else if(isPending){
        actions='<span class="waiting">'+tr("waiting")+'</span>';
      }
      return '<article class="panel full-request"><div class="request-main"><span class="status '+String(r.status).toLowerCase()+'">'+esc(r.status)+'</span><h2>'+esc(r.category)+(r.itemType?' · '+esc(r.itemType):'')+' · '+esc(r.quantity)+'</h2><p>'+esc(r.condition)+' · '+esc(r.address||"")+'</p><div class="request-prices"><span>Min <b>'+money(r.minimumPrice||minimumFor(r.category,r.quantity))+'</b></span><span>Indicative <b>'+money(r.indicativeTotal)+'</b></span><span>Expected <b>'+money(r.expectedPrice||r.askingPrice)+'</b></span><span>Current <b>'+money(r.currentOffer)+'</b></span>'+(r.agreedPrice?'<span class="agreed-price">Agreed <b>'+money(r.agreedPrice)+'</b></span>':'')+'</div><p class="muted">'+esc(r.notes||"")+'</p></div><div class="request-actions">'+actions+'<button class="secondary" data-v="'+r.id+'">'+tr("view")+'</button></div></article>';
    }).join(""):'<div class="empty panel">'+tr("noRequests")+'</div>')+'</div></main>';
    bindShell();
    A.querySelectorAll("[data-accept]").forEach(b=>b.onclick=()=>acceptOffer(b.dataset.accept));
    A.querySelectorAll("[data-counter-btn]").forEach(b=>b.onclick=()=>counterOffer(b.dataset.counterBtn));
    A.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>updateStatus(b.dataset.d,"Completed"));
    A.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{const r=requests.find(x=>String(x.id)===String(b.dataset.v));if(r&&r.lat)showRequestMap(r);});
  }
  function acceptOffer(id){
    const r=requests.find(x=>String(x.id)===String(id)); if(!r)return;
    r.agreedPrice=Number(r.currentOffer); r.status="Accepted"; r.priceStatus="Agreed"; save(); render();
  }
  function counterOffer(id){
    const r=requests.find(x=>String(x.id)===String(id)); if(!r)return;
    const input=document.querySelector('[data-counter="'+id+'"]'); const price=Number(input?.value);
    if(!Number.isFinite(price)||price<=0)return toast(tr("priceRequired"));
    const by=role==="collector"?"collector":"recycler";
    r.currentOffer=price; r.priceStatus=by==="collector"?tr("collectorOffer"):tr("recyclerOffer");
    r.offers=(r.offers||[]).concat({by,price,at:Date.now()});
    save(); render();
  }

  function showRequestMap(r){
    const old=document.getElementById("requestMapModal"); if(old)old.remove();
    const modal=document.createElement("div");
    modal.id="requestMapModal"; modal.className="map-modal";
    modal.innerHTML='<div class="map-modal-card"><div class="map-modal-head"><div><strong>'+esc(r.category)+' · '+esc(r.quantity)+'</strong><small>'+esc(r.address||"Pickup location")+'</small></div><button class="icon-btn" id="closeRequestMap">×</button></div><div id="requestMap" class="map request-map"></div></div>';
    document.body.appendChild(modal);
    document.getElementById("closeRequestMap").onclick=()=>modal.remove();
    modal.onclick=e=>{if(e.target===modal)modal.remove();};
    setTimeout(()=>{
      if(!window.L)return;
      const m=L.map("requestMap",{scrollWheelZoom:false}).setView([Number(r.lat)||demo.lat,Number(r.lng)||demo.lng],15);
      maps.requestMap=m;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(m);
      L.marker([Number(r.lat)||demo.lat,Number(r.lng)||demo.lng]).addTo(m).bindPopup(esc(r.address||"Pickup location")).openPopup();
      setTimeout(()=>m.invalidateSize(),100);
    },50);
  }
  function updateStatus(id,status){const r=requests.find(x=>String(x.id)===String(id));if(r){r.status=status;save();render();}}
  function safetyScreen(){
    const copy={
      en:[["🔥","Do not burn wires or plastic","Burning can release harmful smoke and toxic substances."],["📺","Handle CRTs carefully","Do not break, drill or open CRT glass."],["🔋","Do not open batteries","Do not cut, crush, puncture or heat batteries."],["🟩","Do not burn PCBs","Avoid burning or chemically stripping electronic boards."],["🧤","Use basic protection","Use gloves and avoid sharp, leaking or broken components."]],
      hi:[["🔥","तार या प्लास्टिक न जलाएं","जलाने से हानिकारक धुआं और जहरीले पदार्थ निकल सकते हैं।"],["📺","CRT को सावधानी से संभालें","CRT का कांच न तोड़ें, न ड्रिल करें और न खोलें।"],["🔋","बैटरी न खोलें","बैटरी को काटें, कुचलें, छेदें या गर्म न करें।"],["🟩","PCB न जलाएं","इलेक्ट्रॉनिक बोर्ड को खुद न जलाएं और न रसायन से अलग करें।"],["🧤","सुरक्षा उपकरण पहनें","दस्ताने पहनें और नुकीले, टूटे या लीक हो रहे हिस्सों से सावधान रहें।"]],
      mr:[["🔥","तारा किंवा प्लास्टिक जाळू नका","जाळल्याने हानिकारक धूर आणि विषारी पदार्थ बाहेर पडू शकतात."],["📺","CRT काळजीपूर्वक हाताळा","CRT काच तोडू, ड्रिल किंवा उघडू नका."],["🔋","बॅटरी उघडू नका","बॅटरी कापू, चिरडू, छिद्रू किंवा गरम करू नका."],["🟩","PCB जाळू नका","इलेक्ट्रॉनिक बोर्ड स्वतः जाळू नका किंवा रसायनांनी वेगळे करू नका."],["🧤","मूलभूत संरक्षण वापरा","हातमोजे वापरा आणि धारदार, तुटलेले किंवा गळणारे भाग टाळा."]]
    }[lang]||[];
    const title=lang==="hi"?"सुरक्षित स्क्रैप हैंडलिंग":lang==="mr"?"सुरक्षित भंगार हाताळणी":"Safe scrap handling";
    const sub=lang==="hi"?"चित्र और आवाज के साथ आसान सुरक्षा निर्देश।":lang==="mr"?"चित्र आणि आवाजासह सोप्या सुरक्षा सूचना.":"Simple pictorial safety guidance with optional voice.";
    const listen=lang==="hi"?"सुनें":lang==="mr"?"ऐका":"Listen";
    A.innerHTML=topbar()+'<main class="page"><section class="section-title"><div><p class="eyebrow">♻️ '+(lang==="hi"?"सुरक्षा":lang==="mr"?"सुरक्षा":"Safety")+'</p><h1>'+title+'</h1><p>'+sub+'</p></div></section><div class="safety-grid">'+copy.map(x=>'<article class="panel safety-card"><div class="safety-icon">'+x[0]+'</div><h2>'+x[1]+'</h2><p>'+x[2]+'</p><button class="secondary safety-speak" data-speak="'+esc(x[1]+". "+x[2])+'">🔊 '+listen+'</button></article>').join("")+'</div></main>';
    bindShell();
    A.querySelectorAll(".safety-speak").forEach(b=>b.onclick=()=>{if("speechSynthesis" in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(b.dataset.speak);u.lang=lang==="hi"?"hi-IN":lang==="mr"?"mr-IN":"en-IN";speechSynthesis.speak(u);}});
  }

  function profileScreen(){
    A.innerHTML=topbar()+'<main class="page narrow"><section class="section-title"><div><p class="eyebrow">'+tr("profile")+'</p><h1>'+esc(profile?.name||"")+'</h1></div></section><section class="panel profile-panel"><div class="profile-row"><span>'+tr("phone")+'</span><b>+91 '+esc(user?.phone||"")+'</b></div><div class="profile-row"><span>'+tr("role")+'</span><b>'+tr(role)+'</b></div><div class="profile-row"><span>'+tr("area")+'</span><b>'+esc(profile?.area||"")+'</b></div><div class="profile-row"><span>'+tr("language")+'</span><select id="profileLang"><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div><button class="secondary full" id="edit">'+tr("edit")+'</button><button class="danger full" id="out">'+tr("signOut")+'</button></section></main>';
    bindShell();document.getElementById("profileLang").value=lang;document.getElementById("profileLang").onchange=e=>{lang=e.target.value;save();render();};document.getElementById("edit").onclick=()=>go("setup");document.getElementById("out").onclick=()=>{if(confirm(tr("confirmReset"))){localStorage.clear();location.hash="login";render();}};
  }
  function initMap(id,compact=false){
    const el=document.getElementById(id);if(!el||!window.L)return;
    if(maps[id]){try{maps[id].remove();}catch(e){}}
    const center=pos?[pos.lat,pos.lng]:[demo.lat,demo.lng];
    const map=L.map(el,{scrollWheelZoom:false}).setView(center,compact?13:14);
    maps[id]=map;
    const tiles=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap",maxZoom:19});
    tiles.on("tileerror",()=>{const w=document.getElementById("where");if(w)w.textContent=tr("locationFallback");});
    tiles.addTo(map);
    if(pos)L.marker([pos.lat,pos.lng]).addTo(map).bindPopup(tr("locationReady")).openPopup();
    if(role==="collector"){
      [[16.515,80.637,"Green Cycle Recycler"],[16.495,80.665,"Eco Metals"],[16.523,80.610,"City Recycle Hub"]].forEach(x=>L.marker([x[0],x[1]]).addTo(map).bindPopup(x[2]));
    } else {
      requests.slice(0,8).forEach(r=>L.marker([r.lat||demo.lat,r.lng||demo.lng]).addTo(map).bindPopup(esc(r.collector)+" · "+esc(r.category)));
    }
    map.on("click",e=>setPosition(e.latlng.lat,e.latlng.lng,map,id));
    setTimeout(()=>map.invalidateSize(),150);
  }
  function setPosition(lat,lng,map,id){
    pos={lat,lng};save();
    if(map){map.setView([lat,lng],15);L.marker([lat,lng]).addTo(map).bindPopup(tr("locationReady")).openPopup();}
    const w=document.getElementById("where");if(w)w.textContent=tr("locationReady");
    const a=document.getElementById("address");if(a)a.value=lat.toFixed(5)+", "+lng.toFixed(5);
    const area=document.getElementById("area");if(area)area.value=lat.toFixed(5)+", "+lng.toFixed(5);
  }
  function enableMapPick(id){
    const m=maps[id];
    if(!m)return toast(tr("emptyMap"));
    toast(tr("chooseMap"));
    m.once("click",e=>setPosition(e.latlng.lat,e.latlng.lng,m,id));
  }
  function getLocation(){
    if(!window.isSecureContext || !navigator.geolocation)return toast(tr("locationFallback"));
    navigator.geolocation.getCurrentPosition(p=>{
      setPosition(p.coords.latitude,p.coords.longitude,maps.formMap||maps.miniMap||maps.map);
      if(document.getElementById("where"))document.getElementById("where").textContent=tr("locationReady");
      toast(tr("locationReady"));
    },()=>{
      toast(tr("locationFallback"));
    },{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
  }
  function normalizeDigits(s){return s.replace(/[०-९]/g,d=>"०१२३४५६७८९".indexOf(d)).replace(/[०-९]/g,d=>String("०१२३४५६७८९".indexOf(d)));}
  function startVoice(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR)return toast(tr("voiceUnsupported"));
    if(recognition){try{recognition.stop();}catch(e){}recognition=null;}
    recognition=new SR();recognition.lang=lang==="hi"?"hi-IN":lang==="mr"?"mr-IN":"en-IN";recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=3;
    const state=document.getElementById("listenState"), mic=document.getElementById("mic");
    recognition.onstart=()=>{if(state)state.textContent=tr("listening");if(mic)mic.classList.add("recording");};
    recognition.onresult=e=>{let text="";for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript+" ";parseVoice(text.trim());};
    recognition.onerror=()=>{if(state)state.textContent="";toast(tr("voiceError"));if(mic)mic.classList.remove("recording");};
    recognition.onend=()=>{if(state)state.textContent="";if(mic)mic.classList.remove("recording");recognition=null;};
    try{recognition.start();}catch(e){toast(tr("voiceError"));recognition=null;}
  }
  function parseVoice(text){
    const raw=normalizeDigits(text), low=raw.toLowerCase();
    const catMap=[
      ["plastic",["plastic","प्लास्टिक","प्लास्टिकचा","प्लास्टिकची"]],
      ["paper",["paper","पेपऱ","कागज","कागद","पेपर"]],
      ["cardboard",["cardboard","कार्डबोर्ड","पुठ्ठा"]],
      ["metal",["metal","धातु","धातू","मेटल"]],
      ["iron",["iron","लोखंड","लोह","आयरन"]],
      ["copper",["copper","तांबे","तांबं","कॉपर"]],
      ["aluminium",["aluminium","aluminum","अॅल्युमिनियम","अॅल्युमिनियम"]],
      ["e-waste",["e-waste","ewaste","ई-वेस्ट","इलेक्ट्रॉनिक","electronic"]]
    ];
    const found=catMap.find(([name,arr])=>arr.some(w=>low.includes(w.toLowerCase())));
    if(found)document.getElementById("cat").value=found[0];
    const numWords={one:1,two:2,three:3,four:4,five:5,ten:10,"एक":1,"दो":2,"तीन":3,"चार":4,"पांच":5,"पाच":5,"दहा":10,"एक":1,"दोन":2,"तीन":3};
    let amount=null;const digit=raw.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos|kilogram|किलो|किलोग्राम|grams?|g|ग्रॅम|ग्राम)?/i);
    if(digit)amount=digit[1].replace(",",".")+" "+(digit[2]||"kg");
    if(!amount)for(const [w,n] of Object.entries(numWords))if(low.includes(w))amount=n+" kg";
    if(amount)document.getElementById("weight").value=amount;
    if(/damaged|broken|खराब|टूटा|तुटले|फुटले/i.test(raw))document.getElementById("cond").selectedIndex=2;
    else if(/used|old|पुराना|वापरले|जुना|जुनी/i.test(raw))document.getElementById("cond").selectedIndex=1;
    else if(/good|clean|अच्छा|अच्छी|चांगला|चांगली/i.test(raw))document.getElementById("cond").selectedIndex=0;
    const item=document.getElementById("itemType");
    if(item){
      const cleaned=raw
        .replace(/\b(?:i want|i have|sell|selling|scrap|price|expect|expecting|want|for|please|is|at|around|rupees?|rs)\b/gi," ")
        .replace(/\d+(?:[.,]\d+)?\s*(?:kg|kilo|kilos|kilogram|kilograms|grams?|g|किलो|किलोग्राम|ग्राम|ग्रॅम)?/gi," ")
        .replace(/₹\s*\d+(?:[.,]\d+)?|\b(?:rs\.?|inr)\s*\d+(?:[.,]\d+)?/gi," ")
        .replace(/\s+/g," ").trim();
      const known=[found?.[0], "good","used","damaged","plastic","paper","cardboard","metal","iron","copper","aluminium","e-waste"].filter(Boolean).map(x=>String(x).toLowerCase());
      const parts=cleaned.split(/[,;]|\band\b|\bऔर\b|\bआणि\b/gi).map(x=>x.trim()).filter(Boolean);
      const candidate=parts.find(x=>!known.some(k=>x.toLowerCase()===k));
      if(candidate && candidate.length<60)item.value=candidate;
    }
    const expected=document.getElementById("askingPrice");
    if(expected){
      const priceText=raw.toLowerCase();
      let price=null;

      // First handle numeric prices: ₹500, Rs 500, 500 rupees, "price is 500", etc.
      const numericPatterns=[
        /(?:₹|rs\.?|inr)\s*(\d+(?:[.,]\d+)?)/i,
        /(\d+(?:[.,]\d+)?)\s*(?:₹|rs\.?|inr|rupees?|रुपये|रुपए|रुपया|रुपये|रुपयांना|रुपये)/i,
        /(?:expect(?:ing)?|expected|want|need|asking|price|कीमत|दाम|भाव|किंमत|अपेक्षा|अपेक्षित|हवे|हवी)[^\d₹]{0,35}(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)/i
      ];
      for(const re of numericPatterns){
        const m=raw.match(re);
        if(m){ price=Number((m[1]||m[2]).replace(",",".")); if(Number.isFinite(price))break; }
      }

      // Also understand spoken number words, e.g. "expect five hundred rupees".
      if(price===null){
        const ones={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,
          एक:1,एकं:1,दो:2,दोन्ही:2,तीन:3,चार:4,पांच:5,पाँच:5,पाच:5,सहा:6,छह:6,सात:7,आठ:8,नऊ:9,नव:9,दहा:10};
        const tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,
          बीस:20,तीस:30,चालीस:40,पचास:50,साठ:60,सत्तर:70,ऐंशी:80,नव्वद:90};
        const scale={hundred:100,thousand:1000,lakh:100000,lac:100000,करोड़:10000000,crore:10000000};
        const tokens=priceText.replace(/[,₹]/g," ").replace(/\b(?:rupees?|rs|inr)\b/g," ").split(/\s+/).filter(Boolean);
        const keywordIndex=tokens.findIndex(t=>["expect","expecting","expected","want","need","asking","price","कीमत","दाम","भाव","किंमत","अपेक्षा","अपेक्षित","हवे","हवी"].includes(t));
        const windowTokens=keywordIndex>=0?tokens.slice(keywordIndex+1,keywordIndex+9):tokens;
        let total=0,current=0,foundWord=false;
        for(const t of windowTokens){
          if(ones[t]!==undefined){current+=ones[t];foundWord=true;}
          else if(tens[t]!==undefined){current+=tens[t];foundWord=true;}
          else if(scale[t]!==undefined){
            foundWord=true;
            if(current===0)current=1;
            current*=scale[t];
            if(scale[t]>=1000){total+=current;current=0;}
          } else if(foundWord && ["and","hundred","thousand","lakh","lac","crore","करोड़"].includes(t)){}
          else if(foundWord) break;
        }
        if(foundWord){price=total+current;}
      }

      if(Number.isFinite(price)&&price>0)expected.value=Math.round(price);
    }
    const note=document.getElementById("notes");if(note)note.value=raw;
    const catEl=document.getElementById("cat"), weightEl=document.getElementById("weight");
    if(catEl&&weightEl){catEl.dispatchEvent(new Event("input"));weightEl.dispatchEvent(new Event("input"));}
    toast("✓ "+raw);
  }
  function render(){
    if(!user?.verified){return auth();}
    if(!role)return roleScreen();
    const h=location.hash.replace("#","")||"dashboard";
    if(h==="login")return phoneScreen();
    if(h==="otp")return otpScreen();
    if(h==="role")return roleScreen();
    if(h==="setup")return setupScreen();
    if(h==="list")return listScreen();
    if(h==="requests")return requestsScreen();
    if(h==="safety")return safetyScreen();
    if(h==="profile")return profileScreen();
    dashboard();
  }
  window.addEventListener("hashchange",render);
  if(!location.hash)location.hash=user?.verified?(role?"dashboard":"role"):"login";
  updateNetworkStatus();
  syncPending();
  render();
});