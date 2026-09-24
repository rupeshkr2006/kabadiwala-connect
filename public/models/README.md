# Local AI model assets

Place the verified classifier assets in this directory:

- `ewaste_mobilenetv2_fp16.tflite`
- `labels.json`

Expected `labels.json` format:

```json
{
  "labels": [
    "class_for_output_0",
    "class_for_output_1"
  ]
}
```

The supplied model currently exposes **11 output classes**, while the supplied dataset manifest exposes only **3 classes**. Do not create `labels.json` until the training team confirms the real index-to-label mapping.

The model is about 4.8 MB. Keep it out of the browser service-worker app shell until the model has been verified and the app has a deliberate cache strategy.
