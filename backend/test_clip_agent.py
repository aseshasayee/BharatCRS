import asyncio
import os
from app.agents.clip_agent import verify_image_context

async def main():
    print("Testing CLIP Agent...")
    
    # We will just test with any existing file or a dummy image if we have one.
    # Let's create a dummy white image first if none exists.
    from PIL import Image
    dummy_path = "dummy_test_image.jpg"
    if not os.path.exists(dummy_path):
        img = Image.new('RGB', (100, 100), color = (255, 255, 255))
        img.save(dummy_path)
        print("Created dummy image.")
        
    result = await verify_image_context(dummy_path, "pothole", "Roads")
    print("Result:", result)
    
    # Clean up
    if os.path.exists(dummy_path):
        os.remove(dummy_path)

if __name__ == "__main__":
    asyncio.run(main())
