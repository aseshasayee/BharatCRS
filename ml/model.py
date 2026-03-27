"""
BharatCRS ML — Multi-Task IndicBERT Model
══════════════════════════════════════════
IndicBERT backbone with 6 task-specific heads:
  1. primary_domain   (6-class classification)
  2. sub_domain       (23-class classification)
  3. issue_type       (44-class classification)
  4. severity_level   (regression, 0-1)
  5. public_safety    (binary)
  6. vulnerable_pop   (binary)
"""
import torch
import torch.nn as nn
from transformers import AutoModel

from config import (
    MODEL_NAME, NUM_DOMAINS, NUM_SUBDOMAINS, NUM_ISSUE_TYPES, LOSS_WEIGHTS
)


class MultiTaskCivicClassifier(nn.Module):
    """
    Multi-task model built on top of IndicBERTv2.
    Uses the [CLS] token representation → shared projection → task heads.
    """

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        num_domains: int = NUM_DOMAINS,
        num_subdomains: int = NUM_SUBDOMAINS,
        num_issue_types: int = NUM_ISSUE_TYPES,
        hidden_dropout: float = 0.3,
    ):
        super().__init__()

        # ── Backbone ──
        self.encoder = AutoModel.from_pretrained(model_name)
        hidden_size = self.encoder.config.hidden_size  # 768 for IndicBERT

        # ── Shared projection layer ──
        self.shared_projection = nn.Sequential(
            nn.Linear(hidden_size, 512),
            nn.GELU(),
            nn.LayerNorm(512),
            nn.Dropout(hidden_dropout),
        )

        # ── Classification heads ──
        self.domain_head = nn.Sequential(
            nn.Linear(512, 256),
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(256, num_domains),
        )

        self.subdomain_head = nn.Sequential(
            nn.Linear(512, 256),
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(256, num_subdomains),
        )

        self.issue_type_head = nn.Sequential(
            nn.Linear(512 + num_domains, 256),  # Input size increased to include domain logits
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(256, num_issue_types),
        )

        # ── Regression head (severity) ──
        self.severity_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(128, 1),
            nn.Sigmoid(),  # Output in [0, 1]
        )

        # ── Binary heads ──
        self.safety_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(128, 1),
        )

        self.vulnerable_head = nn.Sequential(
            nn.Linear(512, 128),
            nn.GELU(),
            nn.Dropout(hidden_dropout),
            nn.Linear(128, 1),
        )

    def forward(self, input_ids, attention_mask):
        """
        Returns a dict of logits/predictions for each task head.
        """
        # Encode
        outputs = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )

        # [CLS] token representation
        cls_output = outputs.last_hidden_state[:, 0, :]  # (batch, hidden_size)

        # Shared projection
        shared = self.shared_projection(cls_output)  # (batch, 512)

        # Predictions
        domain_logits = self.domain_head(shared)
        subdomain_logits = self.subdomain_head(shared)
        
        # ── Hierarchical conditioning for issue_type ──
        # Concatenate shared representation with domain logits to give the head 'context'
        issue_input = torch.cat([shared, domain_logits.detach()], dim=-1)
        issue_logits = self.issue_type_head(issue_input)

        return {
            "domain_logits": domain_logits,
            "subdomain_logits": subdomain_logits,
            "issue_logits": issue_logits,
            "severity_pred": self.severity_head(shared).squeeze(-1),
            "safety_logit": self.safety_head(shared).squeeze(-1),
            "vulnerable_logit": self.vulnerable_head(shared).squeeze(-1),
        }


# ─── Multi-Task Loss ─────────────────────────────────────────────────────────

class MultiTaskLoss(nn.Module):
    """
    Weighted combination of:
      - CrossEntropy for domain, subdomain, issue_type
      - MSE for severity
      - BCEWithLogits for public_safety_flag, vulnerable_population_flag
    """

    def __init__(self, label_smoothing: float = 0.1):
        super().__init__()
        self.ce_loss = nn.CrossEntropyLoss(label_smoothing=label_smoothing)
        self.mse_loss = nn.MSELoss()
        self.bce_loss = nn.BCEWithLogitsLoss()

    def forward(self, predictions: dict, targets: dict) -> tuple[torch.Tensor, dict]:
        """
        Returns (total_loss, loss_breakdown_dict).
        """
        losses = {}

        losses["primary_domain"] = self.ce_loss(
            predictions["domain_logits"], targets["domain_label"]
        )
        losses["sub_domain"] = self.ce_loss(
            predictions["subdomain_logits"], targets["subdomain_label"]
        )
        losses["issue_type"] = self.ce_loss(
            predictions["issue_logits"], targets["issue_label"]
        )
        losses["severity"] = self.mse_loss(
            predictions["severity_pred"], targets["severity"]
        )
        losses["public_safety_flag"] = self.bce_loss(
            predictions["safety_logit"], targets["safety_flag"]
        )
        losses["vulnerable_population_flag"] = self.bce_loss(
            predictions["vulnerable_logit"], targets["vulnerable_flag"]
        )

        # Weighted sum
        total_loss = sum(
            LOSS_WEIGHTS[key] * losses[key] for key in losses
        )

        return total_loss, {k: v.item() for k, v in losses.items()}


# ─── Quick Test ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    model = MultiTaskCivicClassifier()
    print(f"[Model] Total parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(f"[Model] Trainable parameters: {sum(p.numel() for p in model.parameters() if p.requires_grad):,}")

    # Test forward pass with dummy data
    dummy_ids = torch.randint(0, 1000, (2, 256))
    dummy_mask = torch.ones(2, 256, dtype=torch.long)
    output = model(dummy_ids, dummy_mask)
    print(f"[Model] Output keys: {list(output.keys())}")
    for k, v in output.items():
        print(f"  {k}: shape={v.shape}")
