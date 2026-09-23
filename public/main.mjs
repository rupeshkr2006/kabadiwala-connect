document.addEventListener("DOMContentLoaded", () => {
  const A = document.getElementById("app");
  const demo = { lat: 16.5062, lng: 80.6480 };
  let lang = localStorage.lang || "en";
  let user = JSON.parse(localStorage.kcUser || "null");
  let role = localStorage.role || "";
  let pos = JSON.parse(localStorage.pos || "null");
  let requests = JSON.parse(localStorage.requests || "[]");
  let profile = JSON.parse(localStorage.kcProfile || "null");
  let recognition = null;

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
      kg:"kg", demoData:"Demo data", reset:"Reset demo", confirmReset:"Reset this demo session?"
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
      kg:"किलो", demoData:"डेमो डेटा", reset:"डेमो रीसेट", confirmReset:"डेमो सेशन रीसेट करें?"
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
      kg:"किलो", demoData:"डेमो डेटा", reset:"डेमो रीसेट", confirmReset:"डेमो सेशन रीसेट करायचे?"
    }
  };
  const tr = k => (T[lang] && T[lang][k]) || T.en[k] || k;
  const save = () => {
    localStorage.lang=lang; localStorage.role=role; localStorage.pos=JSON.stringify(pos);
    localStorage.requests=JSON.stringify(requests); localStorage.kcUser=JSON.stringify(user);
    localStorage.kcProfile=JSON.stringify(profile);
  };
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
  }
  function topbar(){
    return '<header class="top"><a class="brand" href="#dashboard" aria-label="'+tr("brand")+'"><span class="brand-mark">↻</span><span>'+tr("brand")+'</span></a><nav class="nav">'+
      '<button data-p="dashboard">'+tr("dashboardNav")+'</button><button data-p="requests">'+tr("requests")+'</button><button data-p="profile">'+tr("profile")+'</button>'+
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
    document.getElementById("phoneForm").onsubmit=e=>{e.preventDefault();const p=document.getElementById("phone").value.replace(/\D/g,"");if(p.length!==10)return toast(tr("phoneError"));user={phone:p,verified:false};save();go("otp");};
  }
  function otpScreen(){
    let timer=30;
    A.innerHTML='<main class="auth"><div class="auth-card"><button class="back" id="change">← '+tr("change")+'</button><p class="eyebrow">VERIFY</p><h1>'+tr("otp")+'</h1><p class="lead">+91 '+esc(user?.phone||"")+'</p><form id="otpForm"><input class="otp-input" id="otp" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code" autofocus required><button class="primary full">'+tr("verify")+' <span>→</span></button></form><div class="otp-meta"><span id="timer">00:30</span><button type="button" id="resend" class="text-btn" disabled>'+tr("resend")+'</button></div><p class="demo-note">'+tr("demoOtp")+'</p></div></main>';
    document.getElementById("change").onclick=()=>go("login");
    const resend=document.getElementById("resend"), timerEl=document.getElementById("timer");
    const int=setInterval(()=>{timer--;if(timerEl)timerEl.textContent="00:"+String(Math.max(timer,0)).padStart(2,"0");if(timer<=0){clearInterval(int);if(resend)resend.disabled=false;}},1000);
    resend.onclick=()=>{timer=30;resend.disabled=true;toast(tr("resend"));};
    document.getElementById("otpForm").onsubmit=e=>{e.preventDefault();if(document.getElementById("otp").value!=="123456")return toast(tr("otpError"));user.verified=true;save();go(role?"dashboard":"role");};
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
    document.getElementById("mapPick").onclick=()=>toast(tr("emptyMap"));
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
    return '<article class="request-card"><div><span class="status '+String(r.status).toLowerCase()+'">'+esc(r.status)+'</span><h3>'+esc(r.category)+' · '+esc(r.quantity)+'</h3><p>'+esc(r.address||r.collector||"")+'</p></div><span class="arrow">→</span></article>';
  }
  function listScreen(){
    A.innerHTML=topbar()+'<main class="page"><section class="section-title"><div><p class="eyebrow">'+tr("listScrap")+'</p><h1>'+tr("details")+'</h1></div><button class="secondary" data-p="dashboard">← '+tr("dashboard")+'</button></section><div class="form-layout"><section class="panel form-panel"><div class="voice-box"><button type="button" class="mic" id="mic" aria-label="'+tr("tapMic")+'">●</button><div><strong>'+tr("tapMic")+'</strong><p>'+tr("voiceHint")+'</p></div><span id="listenState"></span></div><form id="scrapForm"><label>'+tr("category")+'<input id="cat" required placeholder="Plastic, paper, metal..."></label><label>'+tr("weight")+'<input id="weight" required placeholder="10 kg"></label><label>'+tr("condition")+'<select id="cond"><option>'+tr("good")+'</option><option>'+tr("used")+'</option><option>'+tr("damaged")+'</option></select></label><label>'+tr("address")+'<input id="address" value="'+esc(profile?.area||"")+'" placeholder="Vijayawada"></label><label>'+tr("notes")+'<textarea id="notes" rows="3"></textarea></label><div class="location-actions"><button type="button" class="secondary" id="loc">⌖ '+tr("useLocation")+'</button><button type="button" class="secondary" id="pick">◎ '+tr("chooseMap")+'</button></div><div id="formMap" class="map small-map"></div><div id="where" class="location-line">'+(pos?tr("locationReady"):tr("noLocation"))+'</div><button class="primary full">'+tr("submit")+' <span>→</span></button></form></section><aside class="panel tips"><h2>'+tr("nearbyRecyclers")+'</h2><p>'+tr("voiceHint")+'</p><div id="sideMap" class="map"></div></aside></div></main>';
    bindShell();if(window.L)initMap("formMap",true);
    document.getElementById("loc").onclick=getLocation;
    document.getElementById("pick").onclick=()=>toast(tr("emptyMap"));
    document.getElementById("mic").onclick=startVoice;
    document.getElementById("scrapForm").onsubmit=e=>{e.preventDefault();const r={id:Date.now(),category:document.getElementById("cat").value,quantity:document.getElementById("weight").value,condition:document.getElementById("cond").value,notes:document.getElementById("notes").value,address:document.getElementById("address").value,lat:pos?.lat||demo.lat,lng:pos?.lng||demo.lng,status:"Pending",collector:profile?.name||"Demo Collector"};requests.unshift(r);save();toast(tr("pickupCreated"));go("requests");};
  }
  function requestsScreen(){
    seedData();
    const own = role==="collector" ? requests.filter(r=>r.collector===(profile?.name||"Demo Collector")) : requests;
    A.innerHTML=topbar()+'<main class="page"><section class="section-title"><div><p class="eyebrow">'+tr("requests")+'</p><h1>'+tr("pickup")+'</h1></div></section><div class="request-list">'+(own.length?own.map(r=>'<article class="panel full-request"><div class="request-main"><span class="status '+String(r.status).toLowerCase()+'">'+esc(r.status)+'</span><h2>'+esc(r.category)+' · '+esc(r.quantity)+'</h2><p>'+esc(r.condition)+' · '+esc(r.address||"")+'</p><p class="muted">'+esc(r.notes||"")+'</p></div><div class="request-actions">'+(role==="recycler"&&r.status==="Pending"?'<button class="primary" data-a="'+r.id+'">'+tr("accept")+'</button>':'')+(role==="recycler"&&r.status==="Accepted"?'<button class="primary" data-d="'+r.id+'">'+tr("complete")+'</button>':'')+'<button class="secondary" data-v="'+r.id+'">'+tr("view")+'</button></div></article>').join(""):'<div class="empty panel">'+tr("noRequests")+'</div>')+'</div></main>';
    bindShell();
    A.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>updateStatus(b.dataset.a,"Accepted"));
    A.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>updateStatus(b.dataset.d,"Completed"));
    A.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{const r=requests.find(x=>String(x.id)===String(b.dataset.v));if(r&&r.lat)showRequestMap(r);});
  }
  function showRequestMap(r){toast((r.address||"Pickup")+" · "+Number(r.lat).toFixed(4)+", "+Number(r.lng).toFixed(4));}
  function updateStatus(id,status){const r=requests.find(x=>String(x.id)===String(id));if(r){r.status=status;save();render();}}
  function profileScreen(){
    A.innerHTML=topbar()+'<main class="page narrow"><section class="section-title"><div><p class="eyebrow">'+tr("profile")+'</p><h1>'+esc(profile?.name||"")+'</h1></div></section><section class="panel profile-panel"><div class="profile-row"><span>'+tr("phone")+'</span><b>+91 '+esc(user?.phone||"")+'</b></div><div class="profile-row"><span>'+tr("role")+'</span><b>'+tr(role)+'</b></div><div class="profile-row"><span>'+tr("area")+'</span><b>'+esc(profile?.area||"")+'</b></div><div class="profile-row"><span>'+tr("language")+'</span><select id="profileLang"><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option></select></div><button class="secondary full" id="edit">'+tr("edit")+'</button><button class="danger full" id="out">'+tr("signOut")+'</button></section></main>';
    bindShell();document.getElementById("profileLang").value=lang;document.getElementById("profileLang").onchange=e=>{lang=e.target.value;save();render();};document.getElementById("edit").onclick=()=>go("setup");document.getElementById("out").onclick=()=>{if(confirm(tr("confirmReset"))){localStorage.clear();location.hash="login";render();}};
  }
  function initMap(id,compact=false){
    const el=document.getElementById(id);if(!el||!window.L)return;
    const center=pos?[pos.lat,pos.lng]:[demo.lat,demo.lng];
    const map=L.map(el,{scrollWheelZoom:false}).setView(center,compact?12:13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"}).addTo(map);
    if(pos)L.marker([pos.lat,pos.lng]).addTo(map).bindPopup(tr("locationReady"));
    if(role==="collector"){
      [[16.515,80.637,"Green Cycle Recycler"],[16.495,80.665,"Eco Metals"],[16.523,80.610,"City Recycle Hub"]].forEach(x=>L.marker([x[0],x[1]]).addTo(map).bindPopup(x[2]));
    } else {
      requests.slice(0,8).forEach(r=>L.marker([r.lat||demo.lat,r.lng||demo.lng]).addTo(map).bindPopup(esc(r.collector)+" · "+esc(r.category)));
    }
    map.on("click",e=>{pos={lat:e.latlng.lat,lng:e.latlng.lng};save();L.marker([pos.lat,pos.lng]).addTo(map);const w=document.getElementById("where");if(w)w.textContent=tr("locationReady")+" · "+pos.lat.toFixed(4)+", "+pos.lng.toFixed(4);});
    setTimeout(()=>map.invalidateSize(),100);
  }
  function getLocation(){
    if(!navigator.geolocation)return toast(tr("locationFallback"));
    navigator.geolocation.getCurrentPosition(p=>{pos={lat:p.coords.latitude,lng:p.coords.longitude};save();render();toast(tr("locationReady"));},()=>toast(tr("locationFallback")),{enableHighAccuracy:true,timeout:10000});
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
    const note=document.getElementById("notes");if(note)note.value=raw;
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
    if(h==="profile")return profileScreen();
    dashboard();
  }
  window.addEventListener("hashchange",render);
  if(!location.hash)location.hash=user?.verified?(role?"dashboard":"role"):"login";
  render();
});