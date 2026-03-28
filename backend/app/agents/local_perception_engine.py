import os
import json
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

# ─── Model Constants (Must match ml/config.py and export_model.py) ────────────

MODEL_NAME = "google/muril-base-cased"
MAX_SEQ_LENGTH = 256

# ─── Singleton Loader ────────────────────────────────────────────────────────

_ORT_SESSION = None
_TOKENIZER = None
_LABELS = {
    "PRIMARY_DOMAIN_LABELS": [],
    "SUB_DOMAIN_LABELS": [],
    "ISSUE_TYPE_LABELS": []
}

def get_local_perception_engine():
    global _ORT_SESSION, _TOKENIZER
    if _ORT_SESSION is None:
        print("[LocalPerception] Initializing ONNX engine...")
        
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        onnx_path = os.path.join(base_path, "ml", "checkpoints", "onnx", "bharatcrs_classifier.onnx")
        
        if not os.path.exists(onnx_path):
            # Fallback path if directory structure is different
            onnx_path = os.path.join(os.getcwd(), "ml", "checkpoints", "onnx", "bharatcrs_classifier.onnx")
            
        if not os.path.exists(onnx_path):
            raise FileNotFoundError(f"ONNX model not found at: {onnx_path}")
            
        labels_path = os.path.join(os.path.dirname(onnx_path), "label_maps.json")
        if os.path.exists(labels_path):
            with open(labels_path, "r") as f:
                maps = json.load(f)
                _LABELS["PRIMARY_DOMAIN_LABELS"] = maps.get("primary_domain_labels", [])
                _LABELS["SUB_DOMAIN_LABELS"] = maps.get("sub_domain_labels", [])
                _LABELS["ISSUE_TYPE_LABELS"] = maps.get("issue_type_labels", [])
                print(f"[LocalPerception] Loaded {len(_LABELS['ISSUE_TYPE_LABELS'])} issue labels.")
        else:
            print("[LocalPerception] WARNING: label_maps.json not found! Predictions may be out of bounds.")
            
        _TOKENIZER = AutoTokenizer.from_pretrained(MODEL_NAME)
        
        # Load ONNX session
        # Prefer CUDA if available, else CPU
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider']
        _ORT_SESSION = ort.InferenceSession(onnx_path, providers=providers)
        
        print(f"[LocalPerception] ONNX Model loaded successfully from {onnx_path}.")
        print(f"[LocalPerception] Running on: {_ORT_SESSION.get_providers()[0]}")
        
    return _ORT_SESSION, _TOKENIZER

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def softmax(x):
    e_x = np.exp(x - np.max(x, axis=1, keepdims=True))
    return e_x / e_x.sum(axis=1, keepdims=True)

async def predict_local(text, city="Chennai", ward=0, channel="Web App"):
    session, tokenizer = get_local_perception_engine()
    
    # Format input with metadata tags (identical to training format)
    input_text = f"[{city}] [Ward:{ward}] [{channel}] {text}"
    
    # Preprocess
    inputs = tokenizer(
        input_text,
        max_length=MAX_SEQ_LENGTH,
        padding="max_length",
        truncation=True,
        return_tensors="np" # Get numpy arrays directly for ONNX
    )
    
    # Prepare inputs for ONNX
    # Match input names from export_model.py
    ort_inputs = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64)
    }
    
    # Run Inference
    ort_outputs = session.run(None, ort_inputs)
    
    # Map outputs back by index (match order in export_model.py output_names)
    # output_names: ["domain_logits", "issue_logits", "severity_pred", "safety_logit", "vulnerable_logit"]
    domain_logits = ort_outputs[0]
    issue_logits = ort_outputs[1]
    severity_pred = ort_outputs[2]
    safety_logit = ort_outputs[3]
    vulnerable_logit = ort_outputs[4]
    
    # Post-process
    def sigmoid(x):
        return 1.0 / (1.0 + np.exp(-x))
    
    domain_probs = sigmoid(domain_logits)
    domain_idx = np.argmax(domain_logits)
    
    # Issue uses Softmax
    issue_idx = np.argmax(issue_logits)
    
    # Severity is sigmoid(logit) * 9 + 1 (if the model has sigmoid at end)
    # Looking at model.py: self.severity_head has nn.Sigmoid() at the end.
    # So severity_pred is already [0, 1].
    severity_level = float(severity_pred[0] * 9 + 1)
    
    # Binary flags: if logit > 0 (assuming safety_head etc didn't have sigmoid)
    # Looking at model.py: safety_head and vulnerable_head do NOT have Sigmoid().
    # They are just linear(128, 1).
    is_safety = bool(safety_logit[0] > 0)
    is_vuln = bool(vulnerable_logit[0] > 0)
    
    # Calculate real confidence (probability) via Softmax
    def softmax(x):
        e_x = np.exp(x - np.max(x))
        return e_x / e_x.sum(axis=-1, keepdims=True)

    domain_probs = sigmoid(domain_logits)
    issue_probs = softmax(issue_logits)
    
    # Best guess for overall confidence
    confidence = float(np.max(issue_probs))
    
    # Identify top domains (prob > 0.3)
    domain_indices = np.argsort(domain_probs[0])[::-1]
    top_domains = []
    for idx in domain_indices:
        if domain_probs[0, idx] > 0.3 or len(top_domains) == 0:
            top_domains.append({
                "domain": _LABELS["PRIMARY_DOMAIN_LABELS"][idx] if _LABELS["PRIMARY_DOMAIN_LABELS"] else str(idx),
                "score": float(domain_probs[0, idx])
            })
    
    return {
        "primary_domain": _LABELS["PRIMARY_DOMAIN_LABELS"][domain_idx] if _LABELS["PRIMARY_DOMAIN_LABELS"] else str(domain_idx),
        "top_domains": top_domains,
        "sub_domain": "N/A",  # Not supported by the 5-head Colab model
        "issue_type": _LABELS["ISSUE_TYPE_LABELS"][issue_idx] if _LABELS["ISSUE_TYPE_LABELS"] else str(issue_idx),
        "severity_level": round(severity_level),
        "public_safety_flag": is_safety,
        "vulnerable_population_flag": is_vuln,
        "confidence": confidence,
    }
