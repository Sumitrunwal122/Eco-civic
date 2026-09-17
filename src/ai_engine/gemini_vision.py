import json
import os
import PIL.Image
from typing import Optional
from config.settings import settings
from src.ai_engine.waste_classifier import rule_based_classify, SWACHH_BHARAT_RULES
from src.database.schemas import WasteClassificationResult, WasteCategoryEnum, SwachhBharatBinColor
from src.utils.logger import get_logger

logger = get_logger("ai_engine.gemini_vision")

# System prompt enforcing Swachh Bharat Abhiyan rules and JSON format output
SWACHH_BHARAT_SYSTEM_PROMPT = """
You are an expert AI Waste Classification Engine for Indian Urban Local Bodies (ULBs) and Municipal Corporations, adhering strictly to Swachh Bharat Abhiyan guidelines.

Analyze the provided image of municipal waste and return a single valid JSON object with the following exact keys:
1. "detected_items": list of strings describing specific waste items seen in the image.
2. "primary_category": MUST be one of ["Wet Waste", "Dry Waste", "Hazardous/E-Waste", "Sanitary Waste"].
3. "bin_color": MUST be one of ["Green", "Blue", "Black/Red", "Yellow/Marked Bag"].
   - "Wet Waste" -> "Green"
   - "Dry Waste" -> "Blue"
   - "Hazardous/E-Waste" -> "Black/Red"
   - "Sanitary Waste" -> "Yellow/Marked Bag"
4. "confidence_score": float between 0.0 and 1.0.
5. "handling_instructions": specific advice for citizen/sanitation worker on how to segregate this item.
6. "swachh_bharat_advisory": official ULB advice following Indian municipal solid waste rules.
7. "is_hazardous": boolean (true if Hazardous or Sanitary, false otherwise).
8. "estimated_volume_kg": estimated weight in kg (float, e.g. 1.2).

Do NOT include markdown backticks or any conversational text around the JSON object. Output raw JSON only.
"""


class GeminiVisionEngine:
    """Wrapper for Google Gemini Vision API with robust fallback handling."""
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = None
        self._init_client()

    def _init_client(self):
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            logger.info("GEMINI_API_KEY not configured. Vision engine will use rule-based fallback mode.")
            return

        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
            logger.info(f"Gemini Vision Engine initialized successfully with model: {settings.GEMINI_MODEL}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini Vision SDK: {e}")
            self.model = None

    async def classify_waste_image(
        self,
        image_path: str,
        text_context: Optional[str] = None
    ) -> WasteClassificationResult:
        """
        Analyzes a waste image using Gemini Vision API if available,
        falling back gracefully to heuristic/rule-based processing.
        """
        # If model is available and image file exists, try Gemini Vision
        if self.model and os.path.exists(image_path):
            try:
                pil_image = PIL.Image.open(image_path)
                prompt = SWACHH_BHARAT_SYSTEM_PROMPT
                if text_context:
                    prompt += f"\nAdditional Context from Citizen: {text_context}"

                # Generate content
                response = self.model.generate_content([prompt, pil_image])
                raw_text = response.text.strip()
                
                # Clean codeblock markdown if returned
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.startswith("```"):
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                parsed = json.loads(raw_text)
                
                cat_str = parsed.get("primary_category", "Dry Waste")
                bin_str = parsed.get("bin_color", "Blue")
                
                # Match enum types safely
                cat_enum = WasteCategoryEnum.DRY
                for c in WasteCategoryEnum:
                    if c.value.lower() == cat_str.lower():
                        cat_enum = c
                        break
                        
                bin_enum = SwachhBharatBinColor.BLUE
                for b in SwachhBharatBinColor:
                    if b.value.lower() == bin_str.lower():
                        bin_enum = b
                        break

                return WasteClassificationResult(
                    detected_items=parsed.get("detected_items", ["waste material"]),
                    primary_category=cat_enum,
                    bin_color=bin_enum,
                    confidence_score=float(parsed.get("confidence_score", 0.90)),
                    handling_instructions=parsed.get("handling_instructions", "Segregate at source as per ULB guidelines."),
                    swachh_bharat_advisory=parsed.get("swachh_bharat_advisory", "Swachh Bharat Abhiyan: Keep Indian cities clean."),
                    is_hazardous=bool(parsed.get("is_hazardous", False)),
                    estimated_volume_kg=float(parsed.get("estimated_volume_kg", 1.0))
                )

            except Exception as e:
                logger.warning(f"Gemini API call failed or rate limited ({e}). Falling back to heuristic rule-based classifier.")

        # Heuristic fallback using context text or filename
        fallback_text = text_context or os.path.basename(image_path)
        return rule_based_classify(fallback_text)


gemini_vision_engine = GeminiVisionEngine()
