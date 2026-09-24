# Local AI model assets

The application expects:

- `ewaste_mobilenetv2_fp16.tflite`
- `labels.json`

Confirmed label order for the current team model:

0. battery
1. cable
2. keyboard
3. microwave
4. mobile
5. mouse
6. pcb
7. player
8. printer
9. television
10. washing_machine

The model is designed for 224x224 RGB float32 input. The app uses `minus_one_to_one` preprocessing; this should match the training pipeline. The model runs locally in the browser through TensorFlow.js TFLite/WASM, with Gemini retained as an online fallback. The service worker caches the model and runtime after the PWA is opened online once.
