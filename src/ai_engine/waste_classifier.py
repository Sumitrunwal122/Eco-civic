from typing import Dict, Any, List
from src.database.schemas import WasteCategoryEnum, SwachhBharatBinColor, WasteClassificationResult

# Swachh Bharat Abhiyan Official Bin Rules & Handling
SWACHH_BHARAT_RULES = {
    WasteCategoryEnum.WET: {
        "bin_color": SwachhBharatBinColor.GREEN,
        "hex_color": "#16a34a",
        "description": "Biodegradable organic waste suitable for composting and biomethanation.",
        "handling": "Do not mix with plastic wrappers or liners. Deposit directly in the Green Bin.",
        "advisory": "Swachh Bharat Guideline: Home composting or municipal bio-methanation converts this into organic manure.",
        "keywords": [
            "food", "vegetable", "fruit", "peel", "rotten", "banana", "apple", "curry", "rice",
            "bread", "leaf", "leaves", "flower", "garland", "tea", "coffee", "eggshell", "bone",
            "meat", "organic", "plant", "garden", "compost", "kitchen waste", "coconut"
        ]
    },
    WasteCategoryEnum.DRY: {
        "bin_color": SwachhBharatBinColor.BLUE,
        "hex_color": "#2563eb",
        "description": "Non-biodegradable recyclable waste.",
        "handling": "Rinse containers if soiled, flatten cartons, and deposit dry into the Blue Bin.",
        "advisory": "Swachh Bharat Guideline: Sent to Dry Waste Collection Centres (DWCC) and registered recyclers.",
        "keywords": [
            "plastic", "bottle", "wrapper", "polythene", "packet", "pouch", "chips", "container",
            "paper", "cardboard", "box", "carton", "newspaper", "magazine", "tetra pak", "metal",
            "can", "tin", "aluminum", "foil", "glass", "jar", "thermocol", "cup", "straw"
        ]
    },
    WasteCategoryEnum.HAZARDOUS: {
        "bin_color": SwachhBharatBinColor.BLACK_RED,
        "hex_color": "#dc2626",
        "description": "Domestic hazardous and electronic waste containing toxic substances.",
        "handling": "Handle with caution. Hand over separately to municipal collectors or e-waste drop points.",
        "advisory": "Swachh Bharat Guideline: Requires specialized treatment to prevent soil and groundwater contamination.",
        "keywords": [
            "battery", "cell", "electronic", "e-waste", "wire", "cable", "bulb", "tube", "cfl",
            "led", "paint", "thinner", "chemical", "pesticide", "insecticide", "spray", "thermometer",
            "medicine", "tablet", "syrup", "toner", "cartridge"
        ]
    },
    WasteCategoryEnum.SANITARY: {
        "bin_color": SwachhBharatBinColor.MARKED_BAG,
        "hex_color": "#ea580c",
        "description": "Sanitary and bio-medical household waste requiring dignified handling.",
        "handling": "Wrap securely in old newspaper, mark with a red cross or label, and hand over separately.",
        "advisory": "Swachh Bharat Guideline: Must be incinerated safely to safeguard the dignity and health of sanitation workers.",
        "keywords": [
            "diaper", "pad", "sanitary", "napkin", "bandage", "cotton", "gauze", "syringe",
            "needle", "mask", "gloves", "wipe", "tissue", "medical"
        ]
    }
}


def rule_based_classify(text: str) -> WasteClassificationResult:
    """
    Classifies waste based on text keywords when vision model is offline or as a supplementary parser.
    """
    text_lower = text.lower()
    scores: Dict[WasteCategoryEnum, int] = {cat: 0 for cat in WasteCategoryEnum}
    detected_words: List[str] = []

    for category, meta in SWACHH_BHARAT_RULES.items():
        for kw in meta["keywords"]:
            if kw in text_lower:
                scores[category] += 1
                if kw not in detected_words:
                    detected_words.append(kw)

    # Determine highest scoring category
    best_cat = max(scores, key=scores.get)
    if scores[best_cat] == 0:
        # Default fallback is Dry Waste
        best_cat = WasteCategoryEnum.DRY
        confidence = 0.50
        detected_words = ["mixed municipal solid waste"]
    else:
        confidence = min(0.92, 0.65 + (scores[best_cat] * 0.08))

    meta = SWACHH_BHARAT_RULES[best_cat]
    is_haz = (best_cat in (WasteCategoryEnum.HAZARDOUS, WasteCategoryEnum.SANITARY))

    return WasteClassificationResult(
        detected_items=detected_words,
        primary_category=best_cat,
        bin_color=meta["bin_color"],
        confidence_score=round(confidence, 2),
        handling_instructions=meta["handling"],
        swachh_bharat_advisory=meta["advisory"],
        is_hazardous=is_haz,
        estimated_volume_kg=1.5
    )
