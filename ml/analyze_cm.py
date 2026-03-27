import torch
import os
import json
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix
from config import (
    DEVICE, BATCH_SIZE, CHECKPOINT_DIR, PRIMARY_DOMAIN_LABELS
)
from dataset import create_dataloaders
from model import MultiTaskCivicClassifier

def get_cm_text():
    # ── Load Data ──
    _, _, test_loader, _ = create_dataloaders(batch_size=BATCH_SIZE)
    
    # ── Load Model ──
    checkpoint_path = os.path.join(CHECKPOINT_DIR, "best_model.pt")
    if not os.path.exists(checkpoint_path):
        print(f"ERROR: No checkpoint found.")
        return

    model = MultiTaskCivicClassifier().to(DEVICE)
    checkpoint = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    all_preds = []
    all_targets = []

    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch["input_ids"].to(DEVICE)
            attention_mask = batch["attention_mask"].to(DEVICE)
            preds = model(input_ids, attention_mask)
            all_preds.extend(preds["domain_logits"].argmax(dim=1).cpu().tolist())
            all_targets.extend(batch["domain_label"].tolist())

    # ── Compute CM ──
    cm = confusion_matrix(all_targets, all_preds)
    
    # Create a nice DataFrame
    df_cm = pd.DataFrame(cm, index=[f"True_{l[:15]}..." for l in PRIMARY_DOMAIN_LABELS], 
                         columns=[f"Pred_{l[:15]}..." for l in PRIMARY_DOMAIN_LABELS])
    
    print("\nPRIMARY DOMAIN CONFUSION MATRIX:")
    print(df_cm.to_string())
    
    # also print class report metrics summary
    from sklearn.metrics import classification_report
    print("\nCLASS REPORT:")
    print(classification_report(all_targets, all_preds, target_names=PRIMARY_DOMAIN_LABELS))

if __name__ == "__main__":
    get_cm_text()
