import pytest
from src.ai_engine.waste_classifier import rule_based_classify, SWACHH_BHARAT_RULES
from src.database.schemas import WasteCategoryEnum, SwachhBharatBinColor


def test_rule_based_classify_wet_waste():
    result = rule_based_classify("rotten banana peels and leftover kitchen food waste")
    assert result.primary_category == WasteCategoryEnum.WET
    assert result.bin_color == SwachhBharatBinColor.GREEN
    assert result.is_hazardous is False
    assert "food" in result.detected_items or "banana" in result.detected_items


def test_rule_based_classify_dry_waste():
    result = rule_based_classify("plastic bottles, cardboard boxes, and paper tetra paks")
    assert result.primary_category == WasteCategoryEnum.DRY
    assert result.bin_color == SwachhBharatBinColor.BLUE
    assert result.is_hazardous is False


def test_rule_based_classify_hazardous_waste():
    result = rule_based_classify("used electronic battery cells and paint cans")
    assert result.primary_category == WasteCategoryEnum.HAZARDOUS
    assert result.bin_color == SwachhBharatBinColor.BLACK_RED
    assert result.is_hazardous is True


def test_rule_based_classify_sanitary_waste():
    result = rule_based_classify("used diapers and medical bandages")
    assert result.primary_category == WasteCategoryEnum.SANITARY
    assert result.bin_color == SwachhBharatBinColor.MARKED_BAG
    assert result.is_hazardous is True
