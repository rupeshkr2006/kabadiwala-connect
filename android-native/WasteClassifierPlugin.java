package com.kabadiwalaconnect.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import org.tensorflow.lite.DataType;
import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.Tensor;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "WasteClassifier")
public class WasteClassifierPlugin extends Plugin {
    private static final String MODEL_FILE = "ewaste_mobilenetv2_fp16.tflite";
    private static final String[] LABELS = {
        "Battery", "Cable", "Keyboard", "Microwave", "Mobile", "Mouse",
        "PCB", "Player", "Printer", "Television", "Washing Machine"
    };

    private Interpreter interpreter;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private synchronized Interpreter getInterpreter() throws Exception {
        if (interpreter != null) return interpreter;
        ByteBuffer model = loadModel();
        Interpreter.Options options = new Interpreter.Options();
        options.setNumThreads(2);
        interpreter = new Interpreter(model, options);
        return interpreter;
    }

    private ByteBuffer loadModel() throws Exception {
        java.io.InputStream input = getContext().getAssets().open(MODEL_FILE);
        byte[] bytes = new byte[input.available()];
        int offset = 0;
        int read;
        while (offset < bytes.length && (read = input.read(bytes, offset, bytes.length - offset)) > 0) {
            offset += read;
        }
        input.close();
        ByteBuffer buffer = ByteBuffer.allocateDirect(bytes.length).order(ByteOrder.nativeOrder());
        buffer.put(bytes);
        buffer.rewind();
        return buffer;
    }

    @PluginMethod
    public void classify(PluginCall call) {
        String imageData = call.getString("imageData");
        if (imageData == null || imageData.trim().isEmpty()) {
            call.reject("imageData is required");
            return;
        }

        executor.execute(() -> {
            try {
                Bitmap bitmap = decodeImage(imageData);
                if (bitmap == null) throw new IllegalArgumentException("Could not decode image");

                Interpreter model = getInterpreter();
                Tensor inputTensor = model.getInputTensor(0);
                int[] shape = inputTensor.shape();
                if (shape.length != 4 || shape[1] <= 0 || shape[2] <= 0 || shape[3] != 3) {
                    throw new IllegalStateException("Unsupported model input shape");
                }

                int width = shape[2];
                int height = shape[1];
                Bitmap resized = Bitmap.createScaledBitmap(bitmap, width, height, true);
                Object input = makeInput(resized, inputTensor);

                Tensor outputTensor = model.getOutputTensor(0);
                int[] outShape = outputTensor.shape();
                int outCount = 1;
                for (int s : outShape) outCount *= s;
                float[] scores = new float[outCount];

                if (outputTensor.dataType() == DataType.FLOAT32) {
                    float[][] out = new float[1][outCount];
                    model.run(input, out);
                    System.arraycopy(out[0], 0, scores, 0, outCount);
                } else {
                    ByteBuffer out = ByteBuffer.allocateDirect(outCount * 4).order(ByteOrder.nativeOrder());
                    model.run(input, out);
                    out.rewind();
                    Tensor.QuantizationParams qp = outputTensor.quantizationParams();
                    float scale = qp.getScale();
                    int zero = qp.getZeroPoint();
                    if (outputTensor.dataType() == DataType.UINT8) {
                        for (int i = 0; i < outCount; i++) {
                            int q = out.get() & 0xff;
                            scores[i] = (q - zero) * scale;
                        }
                    } else if (outputTensor.dataType() == DataType.INT8) {
                        for (int i = 0; i < outCount; i++) {
                            int q = out.get();
                            scores[i] = (q - zero) * scale;
                        }
                    } else {
                        throw new IllegalStateException("Unsupported output data type: " + outputTensor.dataType());
                    }
                }

                int best = 0;
                for (int i = 1; i < scores.length; i++) {
                    if (scores[i] > scores[best]) best = i;
                }

                JSObject result = new JSObject();
                result.put("category", "e-waste");
                String detectedLabel = best < LABELS.length ? LABELS[best] : "Unknown";
                result.put("itemType", detectedLabel);
                result.put("label", detectedLabel);
                result.put("predictedLabel", detectedLabel);
                result.put("labelIndex", best);
                result.put("confidence", clamp(scores[best], 0f, 1f));
                result.put("notes", "Offline on-device MobileNetV2 classification. No network request was used.");

                call.resolve(result);
                bitmap.recycle();
                if (resized != bitmap) resized.recycle();
            } catch (Exception e) {
                call.reject("Offline classifier failed: " + e.getMessage(), e);
            }
        });
    }

    private Object makeInput(Bitmap bitmap, Tensor tensor) {
        int[] shape = tensor.shape();
        int count = shape[1] * shape[2] * shape[3];
        DataType type = tensor.dataType();
        Tensor.QuantizationParams qp = tensor.quantizationParams();
        float scale = qp.getScale();
        int zero = qp.getZeroPoint();

        if (type == DataType.FLOAT32) {
            float[][][][] input = new float[1][shape[1]][shape[2]][3];
            int[] pixels = new int[shape[1] * shape[2]];
            bitmap.getPixels(pixels, 0, shape[2], 0, 0, shape[2], shape[1]);
            int k = 0;
            for (int y = 0; y < shape[1]; y++) {
                for (int x = 0; x < shape[2]; x++) {
                    int p = pixels[k++];
                    input[0][y][x][0] = (((p >> 16) & 255) / 127.5f) - 1f;
                    input[0][y][x][1] = (((p >> 8) & 255) / 127.5f) - 1f;
                    input[0][y][x][2] = ((p & 255) / 127.5f) - 1f;
                }
            }
            return input;
        }

        ByteBuffer input = ByteBuffer.allocateDirect(count * (type == DataType.INT8 || type == DataType.UINT8 ? 1 : 4))
                .order(ByteOrder.nativeOrder());
        int[] pixels = new int[shape[1] * shape[2]];
        bitmap.getPixels(pixels, 0, shape[2], 0, 0, shape[2], shape[1]);
        for (int p : pixels) {
            float[] rgb = {
                (((p >> 16) & 255) / 127.5f) - 1f,
                (((p >> 8) & 255) / 127.5f) - 1f,
                ((p & 255) / 127.5f) - 1f
            };
            for (float v : rgb) {
                int q = Math.round(v / scale + zero);
                if (type == DataType.UINT8) input.put((byte) Math.max(0, Math.min(255, q)));
                else if (type == DataType.INT8) input.put((byte) Math.max(-128, Math.min(127, q)));
            }
        }
        input.rewind();
        return input;
    }

    private Bitmap decodeImage(String data) {
        String encoded = data;
        int comma = encoded.indexOf(',');
        if (comma >= 0) encoded = encoded.substring(comma + 1);
        byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
    }

    private float clamp(float v, float min, float max) {
        return Math.max(min, Math.min(max, v));
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        executor.shutdownNow();
        if (interpreter != null) {
            interpreter.close();
            interpreter = null;
        }
    }
}
