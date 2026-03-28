import os
try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import torch
    _device = "cuda" if torch.cuda.is_available() else "cpu"
except ImportError:
    torch = None
    _device = "cpu"

# We lazy-load the model to avoid huge memory overheads if unused
_model = None
_processor = None

def get_clip_model():
    global _model, _processor
    if _model is None:
        if torch is None:
            raise ImportError("PyTorch is not installed. Cannot load CLIP.")
            
        try:
            from transformers import CLIPProcessor, CLIPModel
            print(f"[CLIP] Loading model on {_device}...")
            model_id = "openai/clip-vit-base-patch32"
            _model = CLIPModel.from_pretrained(model_id).to(_device)
            _processor = CLIPProcessor.from_pretrained(model_id)
        except ImportError:
            print("[CLIP] Transformers or PyTorch not installed. Cannot load CLIP.")
            raise
    return _model, _processor

async def verify_image_context(image_path: str, issue_type: str, sub_domain: str) -> dict:
    """
    Verifies if the uploaded image contextually matches the post-classified issue text using CLIP.
    """
    if not image_path or not os.path.exists(image_path):
        return {
            "is_match": True,
            "match_probability": 1.0,
            "reason": "No image provided or file not found"
        }

    try:
        model, processor = get_clip_model()
        
        # Load image
        try:
            image = Image.open(image_path).convert("RGB")
        except Exception as e:
            return {"is_match": True, "match_probability": 1.0, "reason": f"Image load failed: {e}"}

        # Formulate generic, stable texts immune to LLM/Classification routing errors.
        target_text = "a photo showing damage, a civic issue, a public problem, or broken infrastructure"
        texts = [
            target_text,
            "a photo of a normal clean street with nothing wrong",
            "a random unrelated indoor scene, selfie, or screenshot"
        ]

        if torch is None or Image is None:
            return {"is_match": True, "match_probability": 1.0, "reason": "PyTorch or PIL not installed, skipping verification."}
            
        # Use torch.no_grad() for faster inference
        with torch.no_grad():
            inputs = processor(text=texts, images=image, return_tensors="pt", padding=True).to(_device)
            outputs = model(**inputs)
            
            # image-text similarity score
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1).cpu().numpy()[0]

        match_prob = float(probs[0])
        print(f"[CLIP Validation] Target: '{target_text}', Score: {match_prob*100:.1f}%")

        # Threshold for mismatch. If it's very low, it might be unrelated or a prank upload.
        is_match = match_prob > 0.15

        return {
            "is_match": is_match,
            "match_probability": match_prob,
            "target_text_evaluated": target_text
        }
    except Exception as e:
        print(f"[CLIP Validation Error] {e}")
        # Fail open
        return {
            "is_match": True,
            "match_probability": 1.0,
            "error": str(e)
        }
