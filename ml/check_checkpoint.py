import torch
import os

checkpoint_path = r"c:\Users\asesh\OneDrive\Desktop\projects\civic issue reporting\implementation\ml\checkpoints\best_model.pt"

if os.path.exists(checkpoint_path):
    try:
        # Load only the metadata to save memory
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        print(f"Epoch: {checkpoint.get('epoch', 'Unknown')}")
        print(f"Val Loss: {checkpoint.get('val_loss', 'Unknown')}")
        if 'val_metrics' in checkpoint:
            print(f"Val Metrics: {checkpoint['val_metrics']}")
    except Exception as e:
        print(f"Error loading checkpoint: {e}")
else:
    print("Checkpoint file not found.")
