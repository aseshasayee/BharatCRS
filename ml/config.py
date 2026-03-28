"""
BharatCRS ML — Configuration
═════════════════════════════
Centralized hyperparameters, label maps, and paths for the
IndicBERT multi-task civic complaint classifier.
"""
import os
import torch

# ─── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "bharatcrs_v5.csv")
CHECKPOINT_DIR = os.path.join(BASE_DIR, "checkpoints")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# ─── Model ────────────────────────────────────────────────────────────────────

MODEL_NAME = "google/muril-base-cased"
MAX_SEQ_LENGTH = 256

# ─── Training Hyperparameters ─────────────────────────────────────────────────

BATCH_SIZE = 8
LEARNING_RATE = 1e-5
NUM_EPOCHS = 20
WARMUP_RATIO = 0.1
WEIGHT_DECAY = 0.01
EARLY_STOPPING_PATIENCE = 3
SEED = 42

# Train / Val / Test split ratios
TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

# ─── Device ───────────────────────────────────────────────────────────────────

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ─── Label Maps ───────────────────────────────────────────────────────────────
# These are derived from the BharatCRS Taxonomy v2.0.
# Index 0 is always the first class.

PRIMARY_DOMAIN_LABELS = [
    "Core Infrastructure & Public Works",
    "Emergency, Safety & Accountability",
    "Sanitation, Environment & Parks",
    "Social Infrastructure & Public Health",
    "Transportation & Traffic",
    "Urban Planning & Real Estate",
]

SUB_DOMAIN_LABELS = [
    "Construction",
    "Corruption",
    "Demolition",
    "Disaster Management",
    "Drainage/Sewerage",
    "Environment",
    "Fire & Safety",
    "Garbage & Waste",
    "Healthcare & Welfare",
    "Parking",
    "Pedestrian Safety",
    "Public Transport",
    "Roads",
    "Schools",
    "Street Lighting",
    "Structural Safety",
    "Traffic Signals",
    "Vector Control",
    "Water Supply",
    "Zoning",
]

ISSUE_TYPE_LABELS = [
    "civic_corruption",
    "drainage_sewage",
    "electrical_hazard",
    "encroachment",
    "environmental_pollution",
    "flooding",
    "illegal_construction",
    "parking_violation",
    "pedestrian_safety",
    "public_health_service",
    "public_transport_failure",
    "road_damage",
    "school_infrastructure",
    "street_lighting_failure",
    "structural_collapse_risk",
    "traffic_signal_fault",
    "unsafe_structure",
    "vector_pest_control",
    "waste_management",
    "water_supply_failure",
]

SUBMISSION_CHANNEL_LABELS = [
    "Citizen Kiosk",
    "Mobile App",
    "Voice Hotline",
    "Web App",
    "WhatsApp",
]

# Build label-to-index and index-to-label dicts
def _build_label_map(labels: list[str]) -> tuple[dict[str, int], dict[int, str]]:
    l2i = {label: idx for idx, label in enumerate(labels)}
    i2l = {idx: label for idx, label in enumerate(labels)}
    return l2i, i2l

DOMAIN_L2I, DOMAIN_I2L = _build_label_map(PRIMARY_DOMAIN_LABELS)
SUBDOMAIN_L2I, SUBDOMAIN_I2L = _build_label_map(SUB_DOMAIN_LABELS)
ISSUE_L2I, ISSUE_I2L = _build_label_map(ISSUE_TYPE_LABELS)
CHANNEL_L2I, CHANNEL_I2L = _build_label_map(SUBMISSION_CHANNEL_LABELS)

# Number of classes per head
NUM_DOMAINS = len(PRIMARY_DOMAIN_LABELS)
NUM_SUBDOMAINS = len(SUB_DOMAIN_LABELS)
NUM_ISSUE_TYPES = len(ISSUE_TYPE_LABELS)

# ─── Loss Weights (multi-task balancing) ──────────────────────────────────────
# These control how much each head contributes to the total loss.

LOSS_WEIGHTS = {
    "primary_domain": 1.0,   # User's refined focus
    "sub_domain": 0.8,
    "issue_type": 1.5,
    "public_safety_flag": 0.5,
    "vulnerable_population_flag": 0.5,
    "severity": 0.3,         # Lowest priority
}
