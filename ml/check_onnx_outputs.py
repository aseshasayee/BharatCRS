import onnxruntime as ort
import os

onnx_path = r"C:\Users\asesh\OneDrive\Desktop\projects\civic issue reporting\implementation\ml\checkpoints\onnx\bharatcrs_classifier.onnx"
if not os.path.exists(onnx_path):
    print(f"File not found: {onnx_path}")
else:
    sess = ort.InferenceSession(onnx_path)
    outputs = sess.get_outputs()
    print(f"Number of outputs: {len(outputs)}")
    for i, out in enumerate(outputs):
        print(f"Output {i}: {out.name} {out.shape}")
