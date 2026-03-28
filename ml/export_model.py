"""
BharatCRS ML — Model Export
═══════════════════════════
Exports the best trained checkpoint to ONNX format for
fast production inference in the Perception Agent.

Usage:
    python export_model.py
"""
import os
import json

import torch

from config import (
    CHECKPOINT_DIR, RESULTS_DIR, MAX_SEQ_LENGTH,
    PRIMARY_DOMAIN_LABELS, SUB_DOMAIN_LABELS, ISSUE_TYPE_LABELS,
    DOMAIN_I2L, SUBDOMAIN_I2L, ISSUE_I2L,
)
from model import MultiTaskCivicClassifier


def export():
    print(f"\n{'═' * 60}")
    print(f"  BharatCRS — Model Export")
    print(f"{'═' * 60}\n")

    # ── Load Checkpoint ──
    checkpoint_path = os.path.join(CHECKPOINT_DIR, "best_model.pt")
    if not os.path.exists(checkpoint_path):
        print(f"[Export] ERROR: No checkpoint found at {checkpoint_path}")
        print(f"         Run `python train.py` first!")
        return

    model = MultiTaskCivicClassifier()
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()
    print(f"[Export] Loaded checkpoint from epoch {checkpoint['epoch']}")

    # ── Export to ONNX ──
    export_dir = os.path.join(CHECKPOINT_DIR, "onnx")
    os.makedirs(export_dir, exist_ok=True)
    onnx_path = os.path.join(export_dir, "bharatcrs_classifier.onnx")

    dummy_input_ids = torch.randint(0, 1000, (1, MAX_SEQ_LENGTH))
    dummy_attention_mask = torch.ones(1, MAX_SEQ_LENGTH, dtype=torch.long)

    print(f"[Export] Exporting to ONNX: {onnx_path}")
    torch.onnx.export(
        model,
        (dummy_input_ids, dummy_attention_mask),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=[
            "domain_logits", "issue_logits",
            "severity_pred", "safety_logit", "vulnerable_logit",
        ],
        dynamic_axes={
            "input_ids": {0: "batch_size"},
            "attention_mask": {0: "batch_size"},
            "domain_logits": {0: "batch_size"},
            "issue_logits": {0: "batch_size"},
            "severity_pred": {0: "batch_size"},
            "safety_logit": {0: "batch_size"},
            "vulnerable_logit": {0: "batch_size"},
        },
        opset_version=14,
    )
    print(f"  ✅ ONNX model saved!")

    # ── Save Label Maps alongside model ──
    label_maps = {
        "primary_domain": DOMAIN_I2L,
        "sub_domain": SUBDOMAIN_I2L,
        "issue_type": ISSUE_I2L,
        "primary_domain_labels": PRIMARY_DOMAIN_LABELS,
        "sub_domain_labels": SUB_DOMAIN_LABELS,
        "issue_type_labels": ISSUE_TYPE_LABELS,
        "max_seq_length": MAX_SEQ_LENGTH,
    }

    # Convert int keys to strings for JSON serialization
    serializable = {}
    for key, value in label_maps.items():
        if isinstance(value, dict):
            serializable[key] = {str(k): v for k, v in value.items()}
        else:
            serializable[key] = value

    maps_path = os.path.join(export_dir, "label_maps.json")
    with open(maps_path, "w") as f:
        json.dump(serializable, f, indent=2)
    print(f"  ✅ Label maps saved: {maps_path}")

    # ── Also save PyTorch model for direct loading ──
    pt_export_path = os.path.join(export_dir, "bharatcrs_classifier.pt")
    torch.save(model.state_dict(), pt_export_path)
    print(f"  ✅ PyTorch state dict saved: {pt_export_path}")

    print(f"\n{'═' * 60}")
    print(f"  Export complete! Files in: {export_dir}")
    print(f"  - ONNX model:  bharatcrs_classifier.onnx")
    print(f"  - PyTorch:     bharatcrs_classifier.pt")
    print(f"  - Label maps:  label_maps.json")
    print(f"  - Tokenizer:   {os.path.join(CHECKPOINT_DIR, 'tokenizer')}")
    print(f"{'═' * 60}\n")


if __name__ == "__main__":
    export()
