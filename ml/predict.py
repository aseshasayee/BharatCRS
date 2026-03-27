"""
BharatCRS ML — Inference Script
═══════════════════════════════
Load the trained 'best_model.pt' and run a prediction on custom text.

Usage:
    python predict.py "My street light is broken in Ward 12"
"""
import sys
import torch
from transformers import AutoTokenizer
from config import (
    DEVICE, MODEL_NAME, MAX_SEQ_LENGTH, CHECKPOINT_DIR,
    DOMAIN_I2L, SUBDOMAIN_I2L, ISSUE_I2L
)
from model import MultiTaskCivicClassifier

def predict(text, city="Chennai", ward=94, channel="Mobile App"):
    # 1. Load Tokenizer & Model
    print(f"[Inference] Loading model to {DEVICE}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = MultiTaskCivicClassifier().to(DEVICE)
    
    checkpoint_path = f"{CHECKPOINT_DIR}/best_model.pt"
    checkpoint = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # 2. Format Input (Metadata Prefix)
    # This must match the format used in training!
    input_text = f"[{city}] [Ward:{ward}] [{channel}] {text}"
    print(f"[Inference] Input: {input_text}\n")

    # 3. Tokenize
    inputs = tokenizer(
        input_text,
        max_length=MAX_SEQ_LENGTH,
        padding="max_length",
        truncation=True,
        return_tensors="pt"
    ).to(DEVICE)

    # 4. Forward Pass
    with torch.no_grad():
        outputs = model(inputs["input_ids"], inputs["attention_mask"])

    # 5. Decode Results
    domain = DOMAIN_I2L[outputs["domain_logits"].argmax().item()]
    subdomain = SUBDOMAIN_I2L[outputs["subdomain_logits"].argmax().item()]
    issue = ISSUE_I2L[outputs["issue_logits"].argmax().item()]
    
    # Denormalize severity: val * 9 + 1
    severity = outputs["severity_pred"].item() * 9 + 1
    
    # Binary flags (sigmoid threshold 0.5 or logit > 0)
    is_safety = outputs["safety_logit"].item() > 0
    is_vuln = outputs["vulnerable_logit"].item() > 0

    # 6. Print Output
    print("═" * 40)
    print(f"  CLASSIFICATION RESULTS")
    print("═" * 40)
    print(f"  Primary Domain:  {domain}")
    print(f"  Sub-Domain:      {subdomain}")
    print(f"  Issue Type:      {issue}")
    print(f"  Severity (1-10): {severity:.1f}")
    print(f"  Public Safety?   {'🔴 YES' if is_safety else '🟢 No'}")
    print(f"  Vulnerable Pop?  {'⚠️ YES' if is_vuln else 'No'}")
    print("═" * 40)

if __name__ == "__main__":
    test_text = sys.argv[1] if len(sys.argv) > 1 else "There is garbage overflowing near the school gate."
    predict(test_text)
