export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const key = String(process.env.GEMINI_API_KEY || "").trim();
    if (!key) return res.status(503).json({ error: "Voice service is not configured." });
    const { audio, mimeType } = req.body || {};
    if (!audio || typeof audio !== "string") return res.status(400).json({ error: "Audio is required." });
    const clean = audio.includes(",") ? audio.split(",").pop() : audio;
    const type = String(mimeType || "audio/webm").split(";")[0];
    if (!/^audio\//i.test(type)) return res.status(400).json({ error: "Unsupported audio format." });
    if (clean.length > 8_000_000) return res.status(413).json({ error: "Voice recording is too large." });
    const prompt = `Transcribe this short voice recording exactly as spoken. Return ONLY the spoken words as plain text. Do not add labels, explanations, punctuation-heavy formatting, or guesses. The speaker may use English, Hindi, Marathi, or a mixture of Indian English and these languages. Preserve numbers and units such as kg when they are spoken.`;
    const models=["gemini-3.8-flash","gemini-2.5-flash-lite"];
    let lastDetail="Voice transcription failed.", lastStatus=502, upstream;
    for(const model of models){
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      upstream=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:type,data:clean}}]}]} )});
      const body=await upstream.json().catch(()=>({}));
      if(upstream.ok){
        const text=body?.candidates?.[0]?.content?.parts?.find(p=>p.text)?.text?.trim()||"";
        if(text)return res.status(200).json({text});
        lastDetail="No speech was detected.";
      }else{
        lastStatus=upstream.status;lastDetail=body?.error?.message||`Voice service returned HTTP ${upstream.status}.`;
        if(![404,429,500,502,503,504].includes(upstream.status))break;
      }
    }
    return res.status(502).json({error:"Could not transcribe the recording.",detail:lastDetail,upstreamStatus:lastStatus});
  }catch(error){
    console.error(error);
    return res.status(500).json({error:"Unexpected voice input error."});
  }
}