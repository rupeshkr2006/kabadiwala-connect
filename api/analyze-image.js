export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const key = String(process.env.GEMINI_API_KEY || "").trim();
    if (!key) return res.status(503).json({ error: "GEMINI_API_KEY is not configured on Vercel." });
    const { image } = req.body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "A valid image is required." });
    }
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: "Invalid image format." });
    const [, mimeType, data] = match;
    if (data.length > 8_000_000) return res.status(413).json({ error: "Image is too large. Use a smaller photo." });

    const prompt = `Analyze this scrap/waste photo for a recycling marketplace. Return ONLY valid JSON with these fields:
{
  "category": "one of plastic, paper, cardboard, metal, iron, copper, aluminium, e-waste, or unknown",
  "itemType": "short specific item description",
  "condition": "good, used, damaged, or unknown",
  "notes": "short evidence-based description",
  "confidence": 0.0
}
Do not identify people. Do not invent weight or price. If the material cannot be determined reliably, use "unknown". This is an estimate for form assistance, not a final material-grade determination.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data } }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    // Gemini 3.8 Flash is the primary model. If it is temporarily overloaded,
    // fall back to the other stable Flash models instead of making the user retry.
    // Prefer the lightweight multimodal model for this simple classification task.
    // Google documents Flash-Lite as supporting image input and structured JSON output.
    const models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"];
    let upstream = null;
    let payload = {};
    let lastStatus = 502;
    let lastDetail = "Gemini image analysis failed.";
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (const model of models) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
      for (let attempt = 0; attempt < 2; attempt++) {
        upstream = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });
        payload = await upstream.json().catch(() => ({}));
        if (upstream.ok) break;
        lastStatus = upstream.status;
        lastDetail = payload?.error?.message || `Gemini returned HTTP ${upstream.status}.`;
        console.error(`Gemini image analysis failed on ${model} (attempt ${attempt + 1}):`, upstream.status, lastDetail);
        if (![429, 500, 502, 503, 504].includes(upstream.status)) break;
        if (attempt === 0) await sleep(1200);
      }
      if (upstream?.ok) break;
      if (![429, 500, 502, 503, 504].includes(lastStatus)) break;
    }
    if (!upstream?.ok) {
      return res.status(502).json({
        error: "AI analysis service failed.",
        detail: lastDetail,
        upstreamStatus: lastStatus
      });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || "{}";
    let result;
    try { result = JSON.parse(text); } catch { result = JSON.parse(text.replace(/^\s*\`\`\`json\s*/,"").replace(/\s*\`\`\`\s*$/,"")); }
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return res.status(502).json({ error: "AI returned an invalid analysis result." });
    }
    return res.status(200).json({ result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unexpected image analysis error." });
  }
}