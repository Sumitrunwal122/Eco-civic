import base64
import io
import os
import uuid
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image

def process_and_save_image(
    file_bytes: bytes,
    upload_dir: str,
    max_dimension: int = 1280,
    quality: int = 85
) -> Tuple[str, str]:
    """
    Validates, compresses and saves an uploaded image.
    Returns: (saved_relative_path, saved_absolute_path)
    """
    os.makedirs(upload_dir, exist_ok=True)
    
    # Open image with PIL
    image = Image.open(io.BytesIO(file_bytes))
    
    # Convert RGBA / P to RGB for JPEG compatibility
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
        
    # Resize if larger than max_dimension maintaining aspect ratio
    width, height = image.size
    if width > max_dimension or height > max_dimension:
        if width > height:
            new_width = max_dimension
            new_height = int((max_dimension / width) * height)
        else:
            new_height = max_dimension
            new_width = int((max_dimension / height) * width)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
    filename = f"waste_{uuid.uuid4().hex[:12]}.jpg"
    abs_path = os.path.join(upload_dir, filename)
    
    # Save optimized JPEG
    image.save(abs_path, format="JPEG", quality=quality, optimize=True)
    rel_path = f"/uploads/{filename}"
    
    return rel_path, abs_path


def image_bytes_to_base64(image_bytes: bytes) -> str:
    """Converts image bytes to base64 string."""
    return base64.b64encode(image_bytes).decode("utf-8")


def image_file_to_pil(file_path: str) -> Image.Image:
    """Opens an image file and returns a PIL Image in RGB format."""
    img = Image.open(file_path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    return img
