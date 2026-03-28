"""
BharatCRS ML — Training Script
═══════════════════════════════
Fine-tunes IndicBERTv2 on the BharatCRS civic complaint dataset
with multi-task classification heads.

Usage:
    python train.py
    python train.py --epochs 5 --batch_size 8 --lr 3e-5
"""
import argparse
import json
import os
import time

import torch
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from sklearn.metrics import accuracy_score, f1_score

from config import (
    DEVICE, NUM_EPOCHS, BATCH_SIZE, LEARNING_RATE, WEIGHT_DECAY,
    WARMUP_RATIO, EARLY_STOPPING_PATIENCE, CHECKPOINT_DIR, RESULTS_DIR, SEED,
)
from dataset import create_dataloaders
from model import MultiTaskCivicClassifier, MultiTaskLoss


# ─── Reproducibility ─────────────────────────────────────────────────────────

def set_seed(seed: int = SEED):
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    import random, numpy as np
    random.seed(seed)
    np.random.seed(seed)


# ─── Validation ───────────────────────────────────────────────────────────────

@torch.no_grad()
def validate(model, dataloader, loss_fn, device) -> dict:
    """Runs validation and returns loss + per-head metrics."""
    model.eval()

    total_loss = 0.0
    loss_breakdown_accum = {}
    
    # Tracking for top-2 domain metric
    domain_top2_correct = 0
    domain_total = 0

    all_preds = {
        "domain": [], "subdomain": [], "issue": [],
        "safety": [], "vulnerable": [],
    }
    all_targets = {
        "domain": [], "subdomain": [], "issue": [],
        "safety": [], "vulnerable": [],
    }
    severity_abs_errors = []

    for batch in dataloader:
        input_ids = batch["input_ids"].to(device)
        attention_mask = batch["attention_mask"].to(device)

        targets = {
            "domain_label": batch["domain_label"].to(device),
            "subdomain_label": batch["subdomain_label"].to(device),
            "issue_label": batch["issue_label"].to(device),
            "severity": batch["severity"].to(device),
            "safety_flag": batch["safety_flag"].to(device),
            "vulnerable_flag": batch["vulnerable_flag"].to(device),
        }

        preds = model(input_ids, attention_mask)
        loss, breakdown = loss_fn(preds, targets)

        total_loss += loss.item()
        for k, v in breakdown.items():
            loss_breakdown_accum[k] = loss_breakdown_accum.get(k, 0.0) + v

        # Collect predictions
        # For domain, model trained with BCE, so logit > 0 or top1 is primary prediction.
        all_preds["domain"].extend(preds["domain_logits"].argmax(dim=1).cpu().tolist())
        all_preds["subdomain"].extend(preds["subdomain_logits"].argmax(dim=1).cpu().tolist())
        all_preds["issue"].extend(preds["issue_logits"].argmax(dim=1).cpu().tolist())
        all_preds["safety"].extend((preds["safety_logit"] > 0).int().cpu().tolist())
        all_preds["vulnerable"].extend((preds["vulnerable_logit"] > 0).int().cpu().tolist())

        # Top-2 Domain Evaluation
        top2_domain_indices = preds["domain_logits"].topk(2, dim=1).indices
        correct_in_top2 = (top2_domain_indices == targets["domain_label"].unsqueeze(1)).any(dim=1).sum().item()
        domain_top2_correct += correct_in_top2
        domain_total += len(targets["domain_label"])

        all_targets["domain"].extend(batch["domain_label"].tolist())
        all_targets["subdomain"].extend(batch["subdomain_label"].tolist())
        all_targets["issue"].extend(batch["issue_label"].tolist())
        all_targets["safety"].extend(batch["safety_flag"].int().tolist())
        all_targets["vulnerable"].extend(batch["vulnerable_flag"].int().tolist())

        # Severity MAE (denormalize: val * 9 + 1)
        pred_sev = preds["severity_pred"].cpu() * 9.0 + 1.0
        true_sev = batch["severity"].cpu() * 9.0 + 1.0
        severity_abs_errors.extend((pred_sev - true_sev).abs().tolist())

    num_batches = len(dataloader)
    avg_loss = total_loss / num_batches

    metrics = {
        "val_loss": avg_loss,
        "domain_acc": accuracy_score(all_targets["domain"], all_preds["domain"]),
        "domain_top2_acc": domain_top2_correct / max(domain_total, 1),
        "domain_f1": f1_score(all_targets["domain"], all_preds["domain"], average="weighted", zero_division=0),
        "subdomain_acc": accuracy_score(all_targets["subdomain"], all_preds["subdomain"]),
        "subdomain_f1": f1_score(all_targets["subdomain"], all_preds["subdomain"], average="weighted", zero_division=0),
        "issue_acc": accuracy_score(all_targets["issue"], all_preds["issue"]),
        "issue_f1": f1_score(all_targets["issue"], all_preds["issue"], average="weighted", zero_division=0),
        "severity_mae": sum(severity_abs_errors) / len(severity_abs_errors),
        "safety_acc": accuracy_score(all_targets["safety"], all_preds["safety"]),
        "safety_f1": f1_score(all_targets["safety"], all_preds["safety"], average="binary", zero_division=0),
        "vulnerable_acc": accuracy_score(all_targets["vulnerable"], all_preds["vulnerable"]),
        "vulnerable_f1": f1_score(all_targets["vulnerable"], all_preds["vulnerable"], average="binary", zero_division=0),
    }

    # Add per-head loss breakdown
    for k, v in loss_breakdown_accum.items():
        metrics[f"loss_{k}"] = v / num_batches

    return metrics


# ─── Training Loop ────────────────────────────────────────────────────────────

def train(args):
    set_seed()
    print(f"\n{'═' * 60}")
    print(f"  BharatCRS — IndicBERT Multi-Task Training")
    print(f"  Device:     {DEVICE}")
    print(f"  Epochs:     {args.epochs}")
    print(f"  Batch Size: {args.batch_size}")
    print(f"  LR:         {args.lr}")
    print(f"{'═' * 60}\n")

    # ── Data ──
    train_loader, val_loader, test_loader, tokenizer = create_dataloaders(
        batch_size=args.batch_size
    )

    # ── Model ──
    model = MultiTaskCivicClassifier().to(DEVICE)
    loss_fn = MultiTaskLoss().to(DEVICE)

    # --- Freeze Layers (if requested) ---
    if args.freeze_layers:
        print(f"[Train] Freezing early encoder layers...")
        for name, param in model.encoder.named_parameters():
            if "layer.10" not in name and "layer.11" not in name:
                param.requires_grad = False
        print(f"  ✅ Only last 2 transformer layers and heads are trainable.")

    # ── Param Count ──
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[Train] Total params: {total_params:,}  Trainable: {trainable_params:,}")

    # ── Optimizer + Scheduler ──
    # Override defaults if flags provided
    weight_decay = args.weight_decay if args.weight_decay is not None else WEIGHT_DECAY
    
    encoder_params = [p for n, p in model.named_parameters() if 'encoder' in n and p.requires_grad]
    head_params = [p for n, p in model.named_parameters() if 'encoder' not in n and p.requires_grad]

    optimizer = AdamW(
        [
            {"params": encoder_params, "lr": 5e-6},
            {"params": head_params, "lr": 2e-4}
        ],
        weight_decay=weight_decay,
    )

    total_steps = (len(train_loader) // args.grad_accumulation) * args.epochs
    
    scheduler = CosineAnnealingWarmRestarts(
        optimizer,
        T_0=4,
    )

    # ── FP16 / AMP Setup ──
    scaler = torch.cuda.amp.GradScaler(enabled=args.fp16)

    # ── Training ──
    best_val_loss = float("inf")
    patience_counter = 0
    training_log = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss = 0.0
        epoch_start = time.time()
        optimizer.zero_grad()

        for step, batch in enumerate(train_loader, 1):
            input_ids = batch["input_ids"].to(DEVICE)
            attention_mask = batch["attention_mask"].to(DEVICE)

            targets = {
                "domain_label": batch["domain_label"].to(DEVICE),
                "subdomain_label": batch["subdomain_label"].to(DEVICE),
                "issue_label": batch["issue_label"].to(DEVICE),
                "severity": batch["severity"].to(DEVICE),
                "safety_flag": batch["safety_flag"].to(DEVICE),
                "vulnerable_flag": batch["vulnerable_flag"].to(DEVICE),
            }

            # Mixed Precision Forward Pass
            with torch.cuda.amp.autocast(enabled=args.fp16):
                preds = model(input_ids, attention_mask)
                loss, breakdown = loss_fn(preds, targets)
                # Normalize loss for accumulation
                loss = loss / args.grad_accumulation

            # Mixed Precision Backward Pass
            scaler.scale(loss).backward()

            if step % args.grad_accumulation == 0 or step == len(train_loader):
                # Gradient clipping
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

                scaler.step(optimizer)
                scaler.update()
                scheduler.step()
                optimizer.zero_grad()

            epoch_loss += loss.item() * args.grad_accumulation

            if step % 50 == 0 or step == len(train_loader):
                lr_current = scheduler.get_last_lr()[0]
                print(
                    f"  Epoch {epoch}/{args.epochs} | Step {step}/{len(train_loader)} | "
                    f"Loss: {loss.item() * args.grad_accumulation:.4f} | LR: {lr_current:.2e}"
                )

        avg_train_loss = epoch_loss / len(train_loader)
        epoch_time = time.time() - epoch_start

        # ── Validation ──
        val_metrics = validate(model, val_loader, loss_fn, DEVICE)
        val_loss = val_metrics["val_loss"]

        # --- Log Progress ---
        epoch_log = {
            "epoch": epoch,
            "train_loss": avg_train_loss,
            "epoch_time_sec": round(epoch_time, 1),
            **val_metrics,
        }
        training_log.append(epoch_log)

        print(f"\n{'─' * 60}")
        print(f"  Epoch {epoch}/{args.epochs} Summary ({epoch_time:.1f}s)")
        print(f"  Train Loss:       {avg_train_loss:.4f}")
        print(f"  Val Loss:         {val_loss:.4f}")
        print(f"  Domain Acc/F1/T2: {val_metrics['domain_acc']:.3f} / {val_metrics['domain_f1']:.3f} / {val_metrics['domain_top2_acc']:.3f}")
        print(f"  SubDomain Acc/F1: {val_metrics['subdomain_acc']:.3f} / {val_metrics['subdomain_f1']:.3f}")
        print(f"  IssueType Acc/F1: {val_metrics['issue_acc']:.3f} / {val_metrics['issue_f1']:.3f}")
        print(f"  Severity MAE:     {val_metrics['severity_mae']:.2f}")
        print(f"  Safety Acc/F1:    {val_metrics['safety_acc']:.3f} / {val_metrics['safety_f1']:.3f}")
        print(f"  Vulnerable Acc/F1:{val_metrics['vulnerable_acc']:.3f} / {val_metrics['vulnerable_f1']:.3f}")
        print(f"{'─' * 60}\n")

        # ── Checkpointing ──
        if val_metrics["val_loss"] < best_val_loss:
            best_val_loss = val_metrics["val_loss"]
            patience_counter = 0
            checkpoint_path = os.path.join(CHECKPOINT_DIR, "best_model.pt")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_loss": best_val_loss,
                "val_metrics": val_metrics,
            }, checkpoint_path)
            print(f"  ✅ Best model saved → {checkpoint_path}")
        else:
            patience_counter += 1
            print(f"  ⏳ No improvement ({patience_counter}/{EARLY_STOPPING_PATIENCE})")
            if patience_counter >= EARLY_STOPPING_PATIENCE:
                print(f"  🛑 Early stopping triggered at epoch {epoch}.")
                break

    # ── Save Training Log ──
    log_path = os.path.join(RESULTS_DIR, "training_log.json")
    with open(log_path, "w") as f:
        json.dump(training_log, f, indent=2)
    print(f"\n[Train] Training log saved to: {log_path}")

    # ── Plot Results ──
    try:
        plot_training_results(training_log, RESULTS_DIR)
    except Exception as e:
        print(f"  ⚠️  Plotting failed: {e}")

    # ── Save tokenizer alongside model ──
    tokenizer_path = os.path.join(CHECKPOINT_DIR, "tokenizer")
    tokenizer.save_pretrained(tokenizer_path)
    print(f"[Train] Tokenizer saved to: {tokenizer_path}")

    print(f"\n{'═' * 60}")
    print(f"  Training complete! Best val loss: {best_val_loss:.4f}")
    print(f"  Plots generated in: {RESULTS_DIR}")
    print(f"  Run `python evaluate.py` for full test evaluation.")
    print(f"{'═' * 60}\n")


def plot_training_results(log: list[dict], output_dir: str):
    """Generates training trend graphs using matplotlib."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    epochs = [d["epoch"] for d in log]
    
    # 1. Loss Trend
    plt.figure(figsize=(10, 6))
    plt.plot(epochs, [d["train_loss"] for d in log], "b-o", label="Train Loss")
    plt.plot(epochs, [d["val_loss"] for d in log], "r-o", label="Val Loss")
    plt.title("BharatCRS Training: Loss Reduction Over Time")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()
    plt.grid(True, linestyle="--", alpha=0.7)
    plt.savefig(os.path.join(output_dir, "loss_trend.png"), dpi=150)
    plt.close()

    # 2. Accuracy Trends (Domains)
    plt.figure(figsize=(10, 6))
    plt.plot(epochs, [d["domain_acc"] for d in log], "g-o", label="Domain Acc")
    plt.plot(epochs, [d["subdomain_acc"] for d in log], "c-s", label="SubDomain Acc")
    plt.plot(epochs, [d["issue_acc"] for d in log], "m-d", label="IssueType Acc")
    plt.title("BharatCRS Training: Multitask Accuracy Improvement")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.ylim(0, 1.0)
    plt.grid(True, linestyle="--", alpha=0.7)
    plt.savefig(os.path.join(output_dir, "accuracy_trends.png"), dpi=150)
    plt.close()

    # 3. Auxiliary Metrics (Safety/Vulnerability)
    plt.figure(figsize=(10, 6))
    plt.plot(epochs, [d["safety_f1"] for d in log], "y-^", label="Safety F1")
    plt.plot(epochs, [d["vulnerable_f1"] for d in log], "k-v", label="Vulnerable F1")
    plt.title("BharatCRS Training: Safety & Vulnerability F1 Scores")
    plt.xlabel("Epoch")
    plt.ylabel("F1 Score")
    plt.legend()
    plt.ylim(0, 1.0)
    plt.grid(True, linestyle="--", alpha=0.7)
    plt.savefig(os.path.join(output_dir, "aux_metrics_trends.png"), dpi=150)
    plt.close()

    print("  ✅ Training plots generated: loss_trend.png, accuracy_trends.png, aux_metrics_trends.png")


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BharatCRS Multi-Task Training")
    parser.add_argument("--epochs", type=int, default=NUM_EPOCHS, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=BATCH_SIZE, help="Batch size")
    parser.add_argument("--lr", type=float, default=LEARNING_RATE, help="Learning rate")
    parser.add_argument("--fp16", action="store_true", help="Enable Mixed Precision training")
    parser.add_argument("--grad_accumulation", type=int, default=4, help="Steps for gradient accumulation")
    parser.add_argument("--freeze_layers", action="store_true", help="Freezes all but last 2 transformer layers")
    parser.add_argument("--warmup_steps", type=int, default=0, help="Number of steps for warmup (overrides ratio)")
    parser.add_argument("--weight_decay", type=float, default=None, help="Weight decay for optimizer")
    args = parser.parse_args()
    train(args)
