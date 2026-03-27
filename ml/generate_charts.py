"""
BharatCRS — Chart Generator
============================
Run this script to generate all training and evaluation charts as PNG files.
All data is hardcoded from the actual training logs and evaluation report.

Usage:
    python generate_charts.py

Output:
    Creates a folder called 'bharatcrs_charts/' with 8 PNG files.
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

OUT_DIR = "bharatcrs_charts"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Style ─────────────────────────────────────────────────────────────────────
plt.rcParams.update({
    "figure.facecolor": "white",
    "axes.facecolor": "#FAFAFA",
    "axes.grid": True,
    "grid.color": "#E0E0E0",
    "grid.linewidth": 0.6,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.spines.left": True,
    "axes.spines.bottom": True,
    "axes.edgecolor": "#CCCCCC",
    "axes.labelcolor": "#555555",
    "xtick.color": "#555555",
    "ytick.color": "#555555",
    "font.family": "DejaVu Sans",
    "font.size": 11,
    "axes.titlesize": 13,
    "axes.titleweight": "medium",
    "axes.titlepad": 12,
    "figure.dpi": 150,
})

BLUE   = "#378ADD"
GREEN  = "#1D9E75"
AMBER  = "#BA7517"
RED    = "#E24B4A"
PURPLE = "#7F77DD"
PINK   = "#D4537E"
CORAL  = "#D85A30"
GRAY   = "#888780"

# ── Data ──────────────────────────────────────────────────────────────────────

epochs = list(range(1, 12))

train_loss   = [6.4734, 3.6473, 2.3386, 2.1457, 2.1225, 2.1127, 2.1066, 2.1044, 2.0978, 2.0944, 2.0906]
val_loss     = [4.7475, 2.4600, 2.1158, 2.0996, 2.1114, 2.0912, 2.0896, 2.0882, 2.0928, 2.0890, 2.0948]

domain_acc   = [0.839, 0.899, 0.899, 0.899, 0.898, 0.899, 0.899, 0.897, 0.899, 0.897, 0.889]
subdomain_acc= [0.665, 0.865, 0.870, 0.870, 0.870, 0.871, 0.870, 0.870, 0.870, 0.866, 0.864]
issue_acc    = [0.484, 0.834, 0.858, 0.859, 0.859, 0.859, 0.859, 0.859, 0.858, 0.859, 0.858]

domain_f1    = [0.840, 0.904, 0.904, 0.904, 0.902, 0.904, 0.903, 0.901, 0.902, 0.901, 0.892]
subdomain_f1 = [0.635, 0.876, 0.885, 0.891, 0.890, 0.892, 0.887, 0.890, 0.888, 0.878, 0.871]
issue_f1     = [0.421, 0.858, 0.893, 0.895, 0.893, 0.895, 0.894, 0.890, 0.881, 0.876, 0.879]

safety_f1    = [0.605, 0.895, 0.927, 0.927, 0.927, 0.927, 0.927, 0.927, 0.924, 0.924, 0.927]
vuln_f1      = [0.744, 0.920, 0.925, 0.925, 0.925, 0.925, 0.925, 0.925, 0.925, 0.925, 0.925]
severity_mae = [1.26,  0.67,  0.41,  0.32,  0.31,  0.33,  0.28,  0.30,  0.30,  0.30,  0.28]

lr_end = [5.20e-6, 1.00e-5, 9.92e-6, 9.70e-6, 9.33e-6,
          8.83e-6, 8.21e-6, 7.50e-6, 6.71e-6, 5.87e-6, 5.00e-6]

domain_labels = [
    "Core Infrastructure\n& Public Works",
    "Emergency, Safety\n& Accountability",
    "Sanitation,\nEnvironment & Parks",
    "Social Infrastructure\n& Public Health",
    "Transportation\n& Traffic",
    "Urban Planning\n& Real Estate",
]
domain_prec   = [0.70, 1.00, 0.98, 1.00, 0.90, 1.00]
domain_recall = [0.97, 0.90, 0.81, 0.89, 0.84, 0.90]
domain_f1_test= [0.82, 0.95, 0.89, 0.94, 0.87, 0.95]

issue_labels = [
    "abandoned_vehicle", "air_pollution", "anganwadi_issue", "blockage",
    "bribery", "contaminated_water", "encroachment", "fire_risk",
    "flooding", "food_safety_risk_flag", "hospital_service_failure",
    "illegal_building", "illegal_parking", "land_use_violation",
    "manhole_overflow", "missing_zebra_crossing", "mosquito_breeding",
    "negligence", "no_collection", "no_lighting", "no_water",
    "noise_pollution", "open_dumping", "overflow", "pipe_leak",
    "pothole", "road_blockage", "road_collapse", "rodent_infestation",
    "school_maintenance", "sewer_collapse", "signal_malfunction",
    "transport_disruption", "unsafe_structure",
]
issue_f1_test = [
    0.90, 0.81, 0.93, 0.87, 0.94, 0.85, 0.90, 0.96,
    0.95, 0.96, 0.95, 0.93, 0.93, 0.95, 0.89, 0.88,
    0.86, 0.93, 0.41, 0.89, 0.91, 0.80, 0.89, 0.93,
    0.87, 0.89, 0.83, 0.93, 0.94, 0.92, 0.92, 0.92,
    0.89, 0.94,
]

subdomain_labels = [
    "Construction", "Corruption", "Drainage/Sewerage", "Emergency",
    "Environment", "Food Safety", "Garbage", "Healthcare", "Parking",
    "Pedestrian Safety", "Public Transport", "Roads", "Schools",
    "Street Lighting", "Traffic Signals", "Vector Control",
    "Water Supply", "Zoning",
]
subdomain_f1_test = [
    0.94, 0.94, 0.57, 0.96, 0.86, 0.96, 0.87, 0.94,
    0.91, 0.88, 0.89, 0.89, 0.92, 0.89, 0.92, 0.90,
    0.88, 0.95,
]


# ── 1. Loss curve ─────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(epochs, train_loss, "o-", color=BLUE,  linewidth=2.2, markersize=5, label="Train loss")
ax.plot(epochs, val_loss,   "o-", color=CORAL, linewidth=2.2, markersize=5, label="Val loss")
ax.axvline(x=8, color=GRAY, linewidth=1, linestyle="--", alpha=0.6)
ax.text(8.15, 4.0, "Best checkpoint\n(epoch 8)", fontsize=9, color=GRAY)
ax.set_xlabel("Epoch")
ax.set_ylabel("Loss")
ax.set_title("Training & validation loss over epochs")
ax.set_xticks(epochs)
ax.legend(frameon=False)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "01_loss_curve.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 01_loss_curve.png")


# ── 2. Accuracy per head ──────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(epochs, domain_acc,    "o-", color=BLUE,  lw=2.2, ms=5, label="Domain")
ax.plot(epochs, subdomain_acc, "s-", color=GREEN, lw=2.2, ms=5, label="Subdomain")
ax.plot(epochs, issue_acc,     "^-", color=AMBER, lw=2.2, ms=5, label="Issue type")
ax.axhline(y=0.90, color=RED, linewidth=1, linestyle="--", alpha=0.5, label="90% target")
ax.set_ylim(0.40, 1.02)
ax.set_xlabel("Epoch")
ax.set_ylabel("Accuracy")
ax.set_title("Classification accuracy per head over epochs")
ax.set_xticks(epochs)
ax.legend(frameon=False, ncol=2)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "02_accuracy_per_head.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 02_accuracy_per_head.png")


# ── 3. F1 per head ────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(epochs, domain_f1,    "o-", color=BLUE,  lw=2.2, ms=5, label="Domain F1")
ax.plot(epochs, subdomain_f1, "s-", color=GREEN, lw=2.2, ms=5, label="Subdomain F1")
ax.plot(epochs, issue_f1,     "^-", color=AMBER, lw=2.2, ms=5, label="Issue type F1")
ax.axhline(y=0.90, color=RED, linewidth=1, linestyle="--", alpha=0.5, label="0.90 target")
ax.set_ylim(0.35, 1.02)
ax.set_xlabel("Epoch")
ax.set_ylabel("Weighted F1")
ax.set_title("Weighted F1 score per head over epochs")
ax.set_xticks(epochs)
ax.legend(frameon=False, ncol=2)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "03_f1_per_head.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 03_f1_per_head.png")


# ── 4. Safety & vulnerable F1 ─────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(epochs, safety_f1, "o-", color=PINK,   lw=2.2, ms=5, label="Safety flag F1")
ax.plot(epochs, vuln_f1,   "s-", color=PURPLE, lw=2.2, ms=5, label="Vulnerable flag F1")
ax.set_ylim(0.55, 1.02)
ax.set_xlabel("Epoch")
ax.set_ylabel("F1 score")
ax.set_title("Safety & vulnerable population flag F1 over epochs")
ax.set_xticks(epochs)
ax.legend(frameon=False)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "04_safety_vulnerable_f1.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 04_safety_vulnerable_f1.png")


# ── 5. Severity MAE ───────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
ax.fill_between(epochs, severity_mae, alpha=0.15, color=GRAY)
ax.plot(epochs, severity_mae, "o-", color=GRAY, lw=2.2, ms=5)
ax.set_xlabel("Epoch")
ax.set_ylabel("MAE (severity 1–10 scale)")
ax.set_title("Severity prediction MAE over epochs (lower is better)")
ax.set_xticks(epochs)
for i, v in enumerate(severity_mae):
    ax.annotate(f"{v:.2f}", (epochs[i], v), textcoords="offset points",
                xytext=(0, 8), ha="center", fontsize=9, color=GRAY)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "05_severity_mae.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 05_severity_mae.png")


# ── 6. Domain precision / recall / F1 (test set) ─────────────────────────────
x = np.arange(len(domain_labels))
w = 0.26
fig, ax = plt.subplots(figsize=(12, 6))
ax.bar(x - w, domain_prec,   width=w, color=BLUE,  label="Precision", alpha=0.85)
ax.bar(x,     domain_recall, width=w, color=GREEN, label="Recall",    alpha=0.85)
ax.bar(x + w, domain_f1_test,width=w, color=AMBER, label="F1",        alpha=0.85)
ax.set_xticks(x)
ax.set_xticklabels(domain_labels, fontsize=9)
ax.set_ylim(0.60, 1.08)
ax.set_ylabel("Score")
ax.set_title("Test set — domain precision, recall & F1 per class")
ax.legend(frameon=False)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "06_domain_precision_recall_f1.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 06_domain_precision_recall_f1.png")


# ── 7. Issue type F1 (test set, horizontal bar) ───────────────────────────────
sorted_pairs = sorted(zip(issue_f1_test, issue_labels))
f1_sorted    = [p[0] for p in sorted_pairs]
lbl_sorted   = [p[1] for p in sorted_pairs]
colors_issue = [RED if v < 0.55 else AMBER if v < 0.88 else BLUE for v in f1_sorted]

fig, ax = plt.subplots(figsize=(10, 13))
bars = ax.barh(lbl_sorted, f1_sorted, color=colors_issue, alpha=0.85)
ax.set_xlim(0.3, 1.05)
ax.set_xlabel("F1 score")
ax.set_title("Test set — issue type F1 scores (34 classes)")
ax.axvline(x=0.90, color=GRAY, lw=1, linestyle="--", alpha=0.5)
for bar, val in zip(bars, f1_sorted):
    ax.text(val + 0.005, bar.get_y() + bar.get_height() / 2,
            f"{val:.2f}", va="center", fontsize=8.5,
            color=RED if val < 0.55 else "#444")
legend_patches = [
    mpatches.Patch(color=BLUE,  label="Good (≥ 0.88)"),
    mpatches.Patch(color=AMBER, label="Fair (0.55–0.87)"),
    mpatches.Patch(color=RED,   label="Needs fix (< 0.55)"),
]
ax.legend(handles=legend_patches, frameon=False, fontsize=9, loc="lower right")
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "07_issue_type_f1.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 07_issue_type_f1.png")


# ── 8. Subdomain F1 (test set, horizontal bar) ────────────────────────────────
sorted_pairs_s = sorted(zip(subdomain_f1_test, subdomain_labels))
f1_s_sorted    = [p[0] for p in sorted_pairs_s]
lbl_s_sorted   = [p[1] for p in sorted_pairs_s]
colors_sub     = [RED if v < 0.65 else AMBER if v < 0.88 else BLUE for v in f1_s_sorted]

fig, ax = plt.subplots(figsize=(10, 8))
bars = ax.barh(lbl_s_sorted, f1_s_sorted, color=colors_sub, alpha=0.85)
ax.set_xlim(0.4, 1.05)
ax.set_xlabel("F1 score")
ax.set_title("Test set — subdomain F1 scores (18 classes)")
ax.axvline(x=0.90, color=GRAY, lw=1, linestyle="--", alpha=0.5)
for bar, val in zip(bars, f1_s_sorted):
    ax.text(val + 0.005, bar.get_y() + bar.get_height() / 2,
            f"{val:.2f}", va="center", fontsize=9,
            color=RED if val < 0.65 else "#444")
legend_patches = [
    mpatches.Patch(color=BLUE,  label="Good (≥ 0.88)"),
    mpatches.Patch(color=AMBER, label="Fair (0.65–0.87)"),
    mpatches.Patch(color=RED,   label="Needs fix (< 0.65)"),
]
ax.legend(handles=legend_patches, frameon=False, fontsize=9, loc="lower right")
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "08_subdomain_f1.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 08_subdomain_f1.png")


# ── 9. Learning rate schedule ─────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 4))
ax.fill_between(epochs, lr_end, alpha=0.15, color=PURPLE)
ax.plot(epochs, lr_end, "o-", color=PURPLE, lw=2.2, ms=5)
ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.1e}"))
ax.set_xlabel("Epoch")
ax.set_ylabel("Learning rate")
ax.set_title("Learning rate schedule (OneCycleLR — value at end of each epoch)")
ax.set_xticks(epochs)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "09_lr_schedule.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 09_lr_schedule.png")


# ── 10. Summary radar / spider chart ─────────────────────────────────────────
categories = ["Domain\nacc", "Subdomain\nacc", "Issue type\nacc",
              "Safety\nF1", "Vulnerable\nF1", "Severity\n(inv MAE)"]
values = [0.899, 0.870, 0.859, 0.927, 0.976, 1 - 0.028]

N = len(categories)
angles = [n / float(N) * 2 * np.pi for n in range(N)]
angles += angles[:1]
values_plot = values + values[:1]

fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
ax.set_facecolor("#FAFAFA")
ax.plot(angles, values_plot, "o-", color=BLUE, lw=2.2, ms=5)
ax.fill(angles, values_plot, alpha=0.15, color=BLUE)
ax.set_xticks(angles[:-1])
ax.set_xticklabels(categories, fontsize=10)
ax.set_ylim(0, 1)
ax.set_yticks([0.6, 0.7, 0.8, 0.9, 1.0])
ax.set_yticklabels(["0.6", "0.7", "0.8", "0.9", "1.0"], fontsize=8, color=GRAY)
ax.set_title("Final model — all heads summary (test set)", pad=20, fontsize=13)
ax.grid(color="#E0E0E0", linewidth=0.6)
fig.tight_layout()
fig.savefig(os.path.join(OUT_DIR, "10_model_summary_radar.png"), bbox_inches="tight")
plt.close(fig)
print("Saved 10_model_summary_radar.png")


print(f"\nAll 10 charts saved to: ./{OUT_DIR}/")
