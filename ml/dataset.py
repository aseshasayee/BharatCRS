"""
BharatCRS ML — Dataset Loading & Preprocessing
════════════════════════════════════════════════
Loads the CSV, tokenizes with IndicBERT tokenizer, encodes labels,
and returns stratified train/val/test DataLoaders.
"""
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer
from sklearn.model_selection import train_test_split

from config import (
    DATASET_PATH, MODEL_NAME, MAX_SEQ_LENGTH, BATCH_SIZE, SEED,
    TRAIN_RATIO, VAL_RATIO,
    DOMAIN_L2I, SUBDOMAIN_L2I, ISSUE_L2I,
    NUM_DOMAINS, NUM_SUBDOMAINS, NUM_ISSUE_TYPES,
)


# ─── PyTorch Dataset ──────────────────────────────────────────────────────────

class CivicComplaintDataset(Dataset):
    """
    Each sample returns:
      - input_ids, attention_mask  (tokenized text)
      - domain_label              (int)
      - subdomain_label           (int)
      - issue_type_label          (int)
      - severity                  (float, normalized 0-1)
      - public_safety_flag        (float, 0 or 1)
      - vulnerable_pop_flag       (float, 0 or 1)
    """

    def __init__(self, df: pd.DataFrame, tokenizer):
        self.tokenizer = tokenizer
        self.texts = df["input_text"].tolist()
        self.domain_labels = df["domain_idx"].tolist()
        self.subdomain_labels = df["subdomain_idx"].tolist()
        self.issue_labels = df["issue_idx"].tolist()
        self.severity = df["severity_norm"].tolist()
        self.safety_flag = df["safety_flag"].tolist()
        self.vulnerable_flag = df["vulnerable_flag"].tolist()

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            max_length=MAX_SEQ_LENGTH,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "domain_label": torch.tensor(self.domain_labels[idx], dtype=torch.long),
            "subdomain_label": torch.tensor(self.subdomain_labels[idx], dtype=torch.long),
            "issue_label": torch.tensor(self.issue_labels[idx], dtype=torch.long),
            "severity": torch.tensor(self.severity[idx], dtype=torch.float),
            "safety_flag": torch.tensor(self.safety_flag[idx], dtype=torch.float),
            "vulnerable_flag": torch.tensor(self.vulnerable_flag[idx], dtype=torch.float),
        }


# ─── Preprocessing ────────────────────────────────────────────────────────────

def _clean_bool(val) -> float:
    """Convert various boolean representations to 0.0 or 1.0."""
    if isinstance(val, bool):
        return 1.0 if val else 0.0
    if isinstance(val, str):
        return 1.0 if val.strip().lower() in ("true", "1", "yes") else 0.0
    return float(val) if val else 0.0


def _safe_label_encode(value: str, label_map: dict, fallback: int = 0) -> int:
    """Encode label to index, falling back to 0 if not in the map."""
    idx = label_map.get(value)
    if idx is not None:
        return idx
    # Try stripping whitespace
    idx = label_map.get(value.strip())
    if idx is not None:
        return idx
    print(f"  [WARN] Unknown label '{value}' — using fallback idx {fallback}")
    return fallback


def load_and_preprocess() -> pd.DataFrame:
    """
    Loads the CSV file and prepares all columns for training.
    Returns a DataFrame with computed columns ready for tokenization.
    """
    print(f"[Dataset] Loading from: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    print(f"[Dataset] Raw shape: {df.shape}")

    # Drop rows with missing critical fields
    required_cols = ["raw_text", "primary_domain", "sub_domain", "issue_type",
                     "severity_level", "public_safety_flag"]
    df = df.dropna(subset=required_cols).reset_index(drop=True)
    print(f"[Dataset] After dropping NaN: {df.shape}")

    # ── Build input text: prepend metadata as context ──
    # Format: "[Chennai] [Ward:94] [Mobile App] <raw complaint text>"
    df["city"] = df["city"].fillna("Chennai")
    df["ward_id"] = df["ward_id"].fillna(0).astype(int)
    df["submission_channel"] = df["submission_channel"].fillna("Web App")

    df["input_text"] = (
        "[" + df["city"] + "] "
        + "[Ward:" + df["ward_id"].astype(str) + "] "
        + "[" + df["submission_channel"] + "] "
        + df["raw_text"]
    )

    # ── Encode labels ──
    df["domain_idx"] = df["primary_domain"].apply(
        lambda x: _safe_label_encode(x, DOMAIN_L2I)
    )
    df["subdomain_idx"] = df["sub_domain"].apply(
        lambda x: _safe_label_encode(x, SUBDOMAIN_L2I)
    )
    df["issue_idx"] = df["issue_type"].apply(
        lambda x: _safe_label_encode(x, ISSUE_L2I)
    )

    # Severity: normalize to 0-1 range for regression
    df["severity_norm"] = (df["severity_level"].astype(float) - 1.0) / 9.0

    # Boolean flags
    df["safety_flag"] = df["public_safety_flag"].apply(_clean_bool)
    df["vulnerable_flag"] = df["vulnerable_population_flag"].apply(_clean_bool)

    # ── Print class distributions ──
    print("\n[Dataset] === Class Distributions ===")
    print(f"  primary_domain:  {df['primary_domain'].value_counts().to_dict()}")
    print(f"  sub_domain (top 10): {df['sub_domain'].value_counts().head(10).to_dict()}")
    print(f"  issue_type (top 10): {df['issue_type'].value_counts().head(10).to_dict()}")
    print(f"  public_safety_flag:  True={df['safety_flag'].sum():.0f}  False={len(df) - df['safety_flag'].sum():.0f}")
    print(f"  vulnerable_pop_flag: True={df['vulnerable_flag'].sum():.0f}  False={len(df) - df['vulnerable_flag'].sum():.0f}")
    print(f"  severity: mean={df['severity_level'].mean():.2f}  std={df['severity_level'].std():.2f}")

    return df


# ─── Data Splits & DataLoaders ────────────────────────────────────────────────

def create_dataloaders(
    batch_size: int = BATCH_SIZE,
) -> tuple[DataLoader, DataLoader, DataLoader, AutoTokenizer]:
    """
    Returns (train_loader, val_loader, test_loader, tokenizer).
    Stratified on primary_domain to maintain class balance.
    """
    df = load_and_preprocess()

    # Stratified split: 80 / 10 / 10
    train_df, temp_df = train_test_split(
        df, test_size=(1 - TRAIN_RATIO), stratify=df["domain_idx"], random_state=SEED
    )
    val_df, test_df = train_test_split(
        temp_df, test_size=0.5, stratify=temp_df["domain_idx"], random_state=SEED
    )

    print(f"\n[Dataset] Split sizes: train={len(train_df)}  val={len(val_df)}  test={len(test_df)}")

    # Load tokenizer
    print(f"[Dataset] Loading tokenizer: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    # Build datasets
    train_ds = CivicComplaintDataset(train_df.reset_index(drop=True), tokenizer)
    val_ds = CivicComplaintDataset(val_df.reset_index(drop=True), tokenizer)
    test_ds = CivicComplaintDataset(test_df.reset_index(drop=True), tokenizer)

    # Build DataLoaders
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=0, pin_memory=True)

    return train_loader, val_loader, test_loader, tokenizer


# ─── Quick Test ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    train_loader, val_loader, test_loader, tokenizer = create_dataloaders(batch_size=4)
    batch = next(iter(train_loader))
    print("\n[Dataset] Sample batch keys:", list(batch.keys()))
    print(f"  input_ids shape:     {batch['input_ids'].shape}")
    print(f"  domain_label shape:  {batch['domain_label'].shape}")
    print(f"  severity shape:      {batch['severity'].shape}")
    print(f"  safety_flag shape:   {batch['safety_flag'].shape}")
    print(f"  vulnerable_flag:     {batch['vulnerable_flag']}")
