# Trained e-waste classifier handoff

## Verified assets

The supplied file `ewaste_mobilenetv2_fp16.tflite` is a TensorFlow Lite image-classification model.

Verified structure from the supplied binary:
- Input: `[1, 224, 224, 3]`, FLOAT32
- Output: `[1, 11]`, FLOAT32
- Final graph operation: Softmax
- Backbone names contain MobileNetV2 1.00 @ 224
- Model size: 4,796,700 bytes
- SHA-256: `3762c7807f99a3c601d0c7b35a52f9dcf745fad6734dfb0cea1c0a0bbf39a257`
- No human-readable class-label list is embedded in the TFLite file.

## Dataset compatibility check

The supplied classifier manifest contains 1,259 image records with three classes:
- battery: 350
- cable: 636
- pcb: 273

The model returns 11 class probabilities.

**Deployment is blocked until the team supplies the exact class-index mapping for the 11 outputs and confirms which dataset produced this model.**

Do not map output indices to battery/cable/pcb by guessing.

## Required team handoff

1. Exact `index -> class` mapping used during training.
2. Training notebook/script or export configuration.
3. Validation/test metrics: accuracy plus per-class precision, recall, F1, confusion matrix and split counts.
4. Exact preprocessing used before inference.
5. Confirmation whether this TFLite model was trained from the supplied 1,259-image three-class dataset.
6. 10–20 new field/test photos not used in training.

## Planned application integration

The app will support a local TFLite classifier for photo analysis, with the existing Gemini endpoint remaining as an online fallback.

The browser runtime can load a TFLite model and call `predict()` through TensorFlow.js's TFLite package. The local classifier should only be enabled after the label mapping and preprocessing are verified.

Reference:
- https://www.tensorflow.org/js/
- https://www.npmjs.com/package/@tensorflow/tfjs-tflite
