import os
import json
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

# ─── Model Constants (Must match ml/config.py and export_model.py) ────────────

MODEL_NAME = "ai4bharat/IndicBERTv2-MLM-only"
MAX_SEQ_LENGTH = 256

PRIMARY_DOMAIN_LABELS = [
    "Core Infrastructure & Public Works",
    "Emergency, Safety & Accountability",
    "Sanitation, Environment & Parks",
    "Social Infrastructure & Public Health",
    "Transportation & Traffic",
    "Urban Planning & Real Estate",
]

SUB_DOMAIN_LABELS = [
    "Construction", "Corruption", "Drainage/Sewerage", "Emergency", "Environment",
    "Food Safety", "Garbage", "Healthcare", "Parking", "Pedestrian Safety",
    "Public Transport", "Roads", "Schools", "Street Lighting", "Traffic Signals",
    "Vector Control", "Water Supply", "Zoning",
]

ISSUE_TYPE_LABELS = [
    "abandoned_vehicle", "air_pollution", "anganwadi_issue", "blockage", "bribery",
    "contaminated_water", "encroachment", "fire_risk", "flooding", "food_safety_risk_flag",
    "hospital_service_failure", "illegal_building", "illegal_parking", "land_use_violation",
    "manhole_overflow", "missing_zebra_crossing", "mosquito_breeding", "negligence",
    "no_collection", "no_lighting", "no_water", "noise_pollution", "open_dumping",
    "overflow", "pipe_leak", "pothole", "road_blockage", "road_collapse",
    "rodent_infestation", "school_maintenance", "sewer_collapse", "signal_malfunction",
    "transport_disruption", "unsafe_structure",
]

# ─── Singleton Loader ────────────────────────────────────────────────────────

_ORT_SESSION = None
_TOKENIZER = None

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
    # output_names: ["domain_logits", "subdomain_logits", "issue_logits", "severity_pred", "safety_logit", "vulnerable_logit"]
    domain_logits = ort_outputs[0]
    subdomain_logits = ort_outputs[1]
    issue_logits = ort_outputs[2]
    severity_pred = ort_outputs[3]
    safety_logit = ort_outputs[4]
    vulnerable_logit = ort_outputs[5]
    
    # Post-process
    domain_idx = np.argmax(domain_logits)
    subdomain_idx = np.argmax(subdomain_logits)
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
    
    # Calculate real confidence (probability)
    domain_probs = softmax(domain_logits)
    subdomain_probs = softmax(subdomain_logits)
    issue_probs = softmax(issue_logits)
    
    # Use average of the main classification tasks as overall confidence
    # or just the most specific one (issue_type)
    # We'll take the minimum of the three to be conservative
    confidence = float(min(
        domain_probs[0, domain_idx],
        subdomain_probs[0, subdomain_idx],
        issue_probs[0, issue_idx]
    ))
    
    return {
        "primary_domain": PRIMARY_DOMAIN_LABELS[domain_idx],
        "sub_domain": SUB_DOMAIN_LABELS[subdomain_idx],
        "issue_type": ISSUE_TYPE_LABELS[issue_idx],
        "severity_level": round(severity_level),
        "public_safety_flag": is_safety,
        "vulnerable_population_flag": is_vuln,
        "confidence": confidence,
    }
