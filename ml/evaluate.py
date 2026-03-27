"""
BharatCRS ML — Evaluation Script
═════════════════════════════════
Loads the best checkpoint, evaluates on the test set, and produces
per-class metrics, confusion matrices, and an evaluation report.

Usage:
    python evaluate.py
"""
import json
import os

import torch
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    classification_report, confusion_matrix,
)

from config import (
    DEVICE, BATCH_SIZE, CHECKPOINT_DIR, RESULTS_DIR,
    DOMAIN_I2L, SUBDOMAIN_I2L, ISSUE_I2L,
    PRIMARY_DOMAIN_LABELS, SUB_DOMAIN_LABELS, ISSUE_TYPE_LABELS,
)
from dataset import create_dataloaders
from model import MultiTaskCivicClassifier, MultiTaskLoss


# ─── Confusion Matrix Plotting ────────────────────────────────────────────────

def save_confusion_matrix(y_true, y_pred, labels, title, filename):
    """Saves a confusion matrix heatmap as a PNG file."""
    try:
        import matplotlib
        matplotlib.use("Agg")  # Non-interactive backend
        import matplotlib.pyplot as plt
        import seaborn as sns

        # Only include labels that appear in truth or predictions
        present_indices = sorted(set(y_true) | set(y_pred))
        present_labels = [labels[i] for i in present_indices if i < len(labels)]

        cm = confusion_matrix(y_true, y_pred, labels=present_indices)

        fig_size = max(8, len(present_labels) * 0.5)
        fig, ax = plt.subplots(figsize=(fig_size, fig_size))
        sns.heatmap(
            cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=present_labels, yticklabels=present_labels,
            ax=ax,
        )
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_title(title)
        plt.xticks(rotation=45, ha="right", fontsize=7)
        plt.yticks(fontsize=7)
        plt.tight_layout()
        plt.savefig(filename, dpi=150)
        plt.close()
        print(f"  ✅ Saved: {filename}")
    except ImportError:
        print(f"  ⚠️  matplotlib/seaborn not found — skipping confusion matrix plot.")


# ─── Main Evaluation ─────────────────────────────────────────────────────────

def evaluate():
    print(f"\n{'═' * 60}")
    print(f"  BharatCRS — Model Evaluation")
    print(f"{'═' * 60}\n")

    # ── Load Data ──
    _, _, test_loader, tokenizer = create_dataloaders(batch_size=BATCH_SIZE)
    print(f"[Eval] Test set: {len(test_loader.dataset)} samples")

    # ── Load Model ──
    checkpoint_path = os.path.join(CHECKPOINT_DIR, "best_model.pt")
    if not os.path.exists(checkpoint_path):
        print(f"[Eval] ERROR: No checkpoint found at {checkpoint_path}")
        print(f"       Run `python train.py` first!")
        return

    model = MultiTaskCivicClassifier().to(DEVICE)
    checkpoint = torch.load(checkpoint_path, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    print(f"[Eval] Loaded checkpoint from epoch {checkpoint['epoch']} (val_loss={checkpoint['val_loss']:.4f})")

    # ── Collect Predictions ──
    all_preds = {
        "domain": [], "subdomain": [], "issue": [],
        "safety": [], "vulnerable": [],
        "severity_pred": [],
    }
    all_targets = {
        "domain": [], "subdomain": [], "issue": [],
        "safety": [], "vulnerable": [],
        "severity_true": [],
    }

    with torch.no_grad():
        for batch in test_loader:
            input_ids = batch["input_ids"].to(DEVICE)
            attention_mask = batch["attention_mask"].to(DEVICE)

            preds = model(input_ids, attention_mask)

            all_preds["domain"].extend(preds["domain_logits"].argmax(dim=1).cpu().tolist())
            all_preds["subdomain"].extend(preds["subdomain_logits"].argmax(dim=1).cpu().tolist())
            all_preds["issue"].extend(preds["issue_logits"].argmax(dim=1).cpu().tolist())
            all_preds["safety"].extend((preds["safety_logit"] > 0).int().cpu().tolist())
            all_preds["vulnerable"].extend((preds["vulnerable_logit"] > 0).int().cpu().tolist())
            all_preds["severity_pred"].extend((preds["severity_pred"].cpu() * 9 + 1).tolist())

            all_targets["domain"].extend(batch["domain_label"].tolist())
            all_targets["subdomain"].extend(batch["subdomain_label"].tolist())
            all_targets["issue"].extend(batch["issue_label"].tolist())
            all_targets["safety"].extend(batch["safety_flag"].int().tolist())
            all_targets["vulnerable"].extend(batch["vulnerable_flag"].int().tolist())
            all_targets["severity_true"].extend((batch["severity"].cpu() * 9 + 1).tolist())

    # ── Compute Metrics ──
    report = {}

    # Primary Domain
    print(f"\n{'─' * 60}")
    print("  PRIMARY DOMAIN Classification Report")
    print(f"{'─' * 60}")
    domain_report = classification_report(
        all_targets["domain"], all_preds["domain"],
        target_names=PRIMARY_DOMAIN_LABELS,
        zero_division=0,
    )
    print(domain_report)
    report["primary_domain"] = {
        "accuracy": accuracy_score(all_targets["domain"], all_preds["domain"]),
        "weighted_f1": f1_score(all_targets["domain"], all_preds["domain"], average="weighted", zero_division=0),
        "macro_f1": f1_score(all_targets["domain"], all_preds["domain"], average="macro", zero_division=0),
    }

    # Sub-Domain
    print(f"\n{'─' * 60}")
    print("  SUB-DOMAIN Classification Report")
    print(f"{'─' * 60}")
    # Only show labels that appear in data
    present_sd = sorted(set(all_targets["subdomain"]) | set(all_preds["subdomain"]))
    sd_names = [SUB_DOMAIN_LABELS[i] for i in present_sd if i < len(SUB_DOMAIN_LABELS)]
    sd_report = classification_report(
        all_targets["subdomain"], all_preds["subdomain"],
        labels=present_sd, target_names=sd_names,
        zero_division=0,
    )
    print(sd_report)
    report["sub_domain"] = {
        "accuracy": accuracy_score(all_targets["subdomain"], all_preds["subdomain"]),
        "weighted_f1": f1_score(all_targets["subdomain"], all_preds["subdomain"], average="weighted", zero_division=0),
        "macro_f1": f1_score(all_targets["subdomain"], all_preds["subdomain"], average="macro", zero_division=0),
    }

    # Issue Type
    print(f"\n{'─' * 60}")
    print("  ISSUE TYPE Classification Report")
    print(f"{'─' * 60}")
    present_it = sorted(set(all_targets["issue"]) | set(all_preds["issue"]))
    it_names = [ISSUE_TYPE_LABELS[i] for i in present_it if i < len(ISSUE_TYPE_LABELS)]
    it_report = classification_report(
        all_targets["issue"], all_preds["issue"],
        labels=present_it, target_names=it_names,
        zero_division=0,
    )
    print(it_report)
    report["issue_type"] = {
        "accuracy": accuracy_score(all_targets["issue"], all_preds["issue"]),
        "weighted_f1": f1_score(all_targets["issue"], all_preds["issue"], average="weighted", zero_division=0),
        "macro_f1": f1_score(all_targets["issue"], all_preds["issue"], average="macro", zero_division=0),
    }

    # Severity
    severity_pred = np.array(all_preds["severity_pred"])
    severity_true = np.array(all_targets["severity_true"])
    severity_mae = np.abs(severity_pred - severity_true).mean()
    severity_rmse = np.sqrt(((severity_pred - severity_true) ** 2).mean())
    print(f"\n{'─' * 60}")
    print(f"  SEVERITY Regression")
    print(f"    MAE:  {severity_mae:.3f}")
    print(f"    RMSE: {severity_rmse:.3f}")
    print(f"{'─' * 60}")
    report["severity"] = {"mae": float(severity_mae), "rmse": float(severity_rmse)}

    # Safety Flag
    safety_acc = accuracy_score(all_targets["safety"], all_preds["safety"])
    safety_f1 = f1_score(all_targets["safety"], all_preds["safety"], average="binary", zero_division=0)
    safety_prec = precision_score(all_targets["safety"], all_preds["safety"], zero_division=0)
    safety_rec = recall_score(all_targets["safety"], all_preds["safety"], zero_division=0)
    print(f"\n{'─' * 60}")
    print(f"  PUBLIC SAFETY FLAG")
    print(f"    Accuracy:  {safety_acc:.3f}")
    print(f"    Precision: {safety_prec:.3f}")
    print(f"    Recall:    {safety_rec:.3f}")
    print(f"    F1:        {safety_f1:.3f}")
    print(f"{'─' * 60}")
    report["public_safety_flag"] = {
        "accuracy": safety_acc, "precision": safety_prec,
        "recall": safety_rec, "f1": safety_f1,
    }

    # Vulnerable Population Flag
    vuln_acc = accuracy_score(all_targets["vulnerable"], all_preds["vulnerable"])
    vuln_f1 = f1_score(all_targets["vulnerable"], all_preds["vulnerable"], average="binary", zero_division=0)
    vuln_prec = precision_score(all_targets["vulnerable"], all_preds["vulnerable"], zero_division=0)
    vuln_rec = recall_score(all_targets["vulnerable"], all_preds["vulnerable"], zero_division=0)
    print(f"\n{'─' * 60}")
    print(f"  VULNERABLE POPULATION FLAG")
    print(f"    Accuracy:  {vuln_acc:.3f}")
    print(f"    Precision: {vuln_prec:.3f}")
    print(f"    Recall:    {vuln_rec:.3f}")
    print(f"    F1:        {vuln_f1:.3f}")
    print(f"{'─' * 60}")
    report["vulnerable_population_flag"] = {
        "accuracy": vuln_acc, "precision": vuln_prec,
        "recall": vuln_rec, "f1": vuln_f1,
    }

    # ── Save Report ──
    report_path = os.path.join(RESULTS_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[Eval] Report saved to: {report_path}")

    # ── Confusion Matrices ──
    print("\n[Eval] Generating confusion matrices...")
    save_confusion_matrix(
        all_targets["domain"], all_preds["domain"],
        PRIMARY_DOMAIN_LABELS, "Primary Domain Confusion Matrix",
        os.path.join(RESULTS_DIR, "cm_primary_domain.png"),
    )
    save_confusion_matrix(
        all_targets["subdomain"], all_preds["subdomain"],
        SUB_DOMAIN_LABELS, "Sub-Domain Confusion Matrix",
        os.path.join(RESULTS_DIR, "cm_sub_domain.png"),
    )
    save_confusion_matrix(
        all_targets["issue"], all_preds["issue"],
        ISSUE_TYPE_LABELS, "Issue Type Confusion Matrix",
        os.path.join(RESULTS_DIR, "cm_issue_type.png"),
    )

    print(f"\n{'═' * 60}")
    print(f"  Evaluation complete! Results in: {RESULTS_DIR}")
    print(f"{'═' * 60}\n")


if __name__ == "__main__":
    evaluate()
