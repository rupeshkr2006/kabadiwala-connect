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

    const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(key);
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data } }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = payload?.error?.message || `Gemini returned HTTP ${upstream.status}.`;
      console.error("Gemini image analysis failed:", upstream.status, detail);
      return res.status(502).json({
        error: "AI analysis service failed.",
        detail,
        upstreamStatus: upstream.status
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