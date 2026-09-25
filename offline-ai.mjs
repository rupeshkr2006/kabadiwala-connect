const DB_NAME = "kabadiwala-connect-ai";
const DB_VERSION = 1;
const STORE = "models";
const MODEL_KEY = "ewaste-mobilenetv2";
const INPUT_SIZE = 224;

// Class order used by the supplied 11-class MobileNetV2 model.
const LABELS = [
  "Battery",
  "Cable",
  "Keyboard",
  "Microwave",
  "Mobile",
  "Mouse",
  "PCB",
  "Player",
  "Printer",
  "Television",
  "Washing Machine"
];

let modelPromise = null;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("AI storage unavailable"));
  });
}

async function getStoredModel() {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(MODEL_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error("Could not read offline model"));
  });
}

async function putStoredModel(buffer) {
  const db = await openDb();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(buffer, MODEL_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error("Could not save offline model"));
  });
}

async function waitForRuntime() {
  const started = Date.now();
  while ((!window.tf || !window.tflite) && Date.now() - started < 20000) {
    await new Promise(r => setTimeout(r, 100));
  }
  if (!window.tf || !window.tflite) {
    throw new Error("TensorFlow Lite runtime is not available. Open the app online once so the offline AI runtime can be cached.");
  }
  await window.tf.setBackend("cpu");
  await window.tf.ready();
}

async function loadModel() {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    await waitForRuntime();
    const buffer = await getStoredModel();
    if (!buffer) throw new Error("Offline e-waste model is not installed on this device.");
    return await window.tflite.loadTFLiteModel(buffer, { numThreads: 1 });
  })().catch(err => {
    modelPromise = null;
    throw err;
  });
  return modelPromise;
}

async function hasModel() {
  try { return !!(await getStoredModel()); } catch { return false; }
}

async function installModel(file) {
  if (!file) throw new Error("Choose the ewaste_mobilenetv2_fp16 TFLite model file.");
  if (!/\.tflite$/i.test(file.name)) throw new Error("Please select a .tflite model file.");
  if (file.size > 25 * 1024 * 1024) throw new Error("The selected model is too large.");
  const buffer = await file.arrayBuffer();
  const magic = new TextDecoder().decode(new Uint8Array(buffer.slice(4, 8)));
  if (magic !== "TFL3") throw new Error("This is not a valid TFLite model.");
  await putStoredModel(buffer);
  modelPromise = null;
  await loadModel();
  return { size: buffer.byteLength, name: file.name };
}

async function classify(file) {
  const model = await loadModel();
  const tf = window.tf;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  if (bitmap.close) bitmap.close();

  let input = null;
  let output = null;
  try {
    input = tf.tidy(() => {
      const pixels = tf.browser.fromPixels(canvas).toFloat();
      const resized = tf.image.resizeBilinear(pixels, [INPUT_SIZE, INPUT_SIZE]);
      return tf.sub(tf.div(resized, 127.5), 1).expandDims(0);
    });
    output = model.predict(input);
    const scores = Array.from(output.dataSync());
    const ranked = scores.map((score, index) => ({
      index,
      label: LABELS[index] || `Class ${index + 1}`,
      score: Number(score) || 0
    })).sort((a, b) => b.score - a.score);
    const top = ranked[0] || { index: 0, label: LABELS[0], score: 0 };
    return {
      category: "e-waste",
      itemType: top.label,
      confidence: Math.max(0, Math.min(1, top.score)),
      labelIndex: top.index,
      notes: `Local MobileNetV2 classification: ${top.label}. No network request was used.`,
      top3: ranked.slice(0, 3)
    };
  } finally {
    if (output && typeof output.dispose === "function") output.dispose();
    if (input && typeof input.dispose === "function") input.dispose();
  }
}

export const localWasteAI = { labels: LABELS, hasModel, installModel, classify, loadModel };
