import json
import yaml
from typing import Dict, List, Optional
from .call_llm import call_llm
from .get_embedding import get_embedding

# Singapore planning areas for location extraction
SINGAPORE_PLANNING_AREAS = [
    "Ang Mo Kio", "Bedok", "Bishan", "Boon Lay", "Bukit Batok", "Bukit Merah", "Bukit Panjang",
    "Bukit Timah", "Central Water Catchment", "Changi", "Changi Bay", "Choa Chu Kang", "Clementi",
    "Downtown Core", "Geylang", "Hougang", "Jurong East", "Jurong West", "Kallang", "Marine Parade",
    "Museum", "Newton", "North-Eastern Islands", "Novena", "Orchard", "Outram", "Pasir Ris",
    "Punggol", "Queenstown", "River Valley", "Rochor", "Sembawang", "Sengkang", "Serangoon",
    "Singapore River", "Southern Islands", "Straits View", "Tampines", "Tanglin", "Toa Payoh",
    "Tuas", "Western Islands", "Western Water Catchment", "Woodlands", "Yishun"
]

def extract_structured_data(complaint_text: str, conversation_history: List[Dict] = None) -> Dict:
    """
    Extract structured data from complaint text using LLM.

    Args:
        complaint_text: Original complaint text
        conversation_history: List of Q&A exchanges from the probing phase

    Returns:
        Dict containing structured complaint data
    """

    # Build context with conversation history
    context_text = complaint_text
    if conversation_history:
        qa_text = "\n".join([
            f"Q: {item['question']}\nA: {item['answer']}"
            for item in conversation_history
        ])
        context_text += f"\n\nAdditional Context:\n{qa_text}"

    planning_areas_text = ", ".join(SINGAPORE_PLANNING_AREAS)

    prompt = f"""
Extract structured data from this Singapore complaint:

COMPLAINT TEXT:
{context_text}

Extract the following information in YAML format. Be precise and only include information that is clearly mentioned or can be reasonably inferred:

```yaml
# Required fields
title: "Short descriptive title (max 100 chars)"
category: "transport|housing|healthcare|environment|education|employment|security|general"
subcategory: "Specific subcategory if applicable"
urgency: "low|medium|high"

# Location information (extract if mentioned)
location:
  description: "Location description from complaint"
  postal_code: "6-digit postal code if mentioned"
  planning_area: "One of: {planning_areas_text}"

# Temporal and impact data
timing:
  frequency: "once|daily|weekly|monthly|occasionally|ongoing"
  time_of_occurrence: "morning|afternoon|evening|night|peak_hours|off_peak|specific time"

impact:
  affected_count: 1-10000  # estimated number of people affected
  severity_description: "Brief description of impact"

# Analysis
sentiment: -1.0 to 1.0  # negative to positive
tags:
  - "keyword1"
  - "keyword2"
keywords:
  - "important_word1"
  - "important_word2"
```

Focus on Singapore-specific context. For planning areas, match to the closest area from the provided list.
"""

    messages = [
        {"role": "system", "content": "You are an expert at extracting structured data from Singapore citizen complaints. Be accurate and conservative in your extractions."},
        {"role": "user", "content": prompt}
    ]

    response = call_llm(messages)
    yaml_str = response.split("```yaml")[1].split("```")[0].strip()

    try:
        structured_data = yaml.safe_load(yaml_str)

        # Validate and clean the extracted data
        validated_data = validate_structured_data(structured_data)
        return validated_data

    except Exception as e:
        print(f"Error parsing structured data: {e}")
        # Return minimal fallback structure
        return {
            "title": complaint_text[:100] + "..." if len(complaint_text) > 100 else complaint_text,
            "category": "general",
            "subcategory": None,
            "urgency": "medium",
            "location": {},
            "timing": {},
            "impact": {},
            "sentiment": 0.0,
            "tags": [],
            "keywords": []
        }

def validate_structured_data(data: Dict) -> Dict:
    """Validate and clean extracted structured data."""

    # Valid categories
    valid_categories = ["transport", "housing", "healthcare", "environment", "education", "employment", "security", "general"]
    valid_urgencies = ["low", "medium", "high"]
    valid_frequencies = ["once", "daily", "weekly", "monthly", "occasionally", "ongoing"]
    valid_times = ["morning", "afternoon", "evening", "night", "peak_hours", "off_peak"]

    # Ensure required fields
    validated = {
        "title": str(data.get("title", ""))[:500],  # Limit title length
        "category": data.get("category", "general"),
        "subcategory": data.get("subcategory"),
        "urgency": data.get("urgency", "medium"),
        "location": data.get("location", {}),
        "timing": data.get("timing", {}),
        "impact": data.get("impact", {}),
        "sentiment": float(data.get("sentiment", 0.0)),
        "tags": data.get("tags", [])[:20],  # Limit tags
        "keywords": data.get("keywords", [])[:20]  # Limit keywords
    }

    # Validate category
    if validated["category"] not in valid_categories:
        validated["category"] = "general"

    # Validate urgency
    if validated["urgency"] not in valid_urgencies:
        validated["urgency"] = "medium"

    # Validate location planning area
    if "planning_area" in validated["location"]:
        if validated["location"]["planning_area"] not in SINGAPORE_PLANNING_AREAS:
            validated["location"]["planning_area"] = None

    # Validate timing fields
    if "frequency" in validated["timing"]:
        if validated["timing"]["frequency"] not in valid_frequencies:
            validated["timing"]["frequency"] = None

    if "time_of_occurrence" in validated["timing"]:
        if validated["timing"]["time_of_occurrence"] not in valid_times:
            validated["timing"]["time_of_occurrence"] = None

    # Validate sentiment range
    validated["sentiment"] = max(-1.0, min(1.0, validated["sentiment"]))

    # Clean and limit arrays
    validated["tags"] = [str(tag)[:50] for tag in validated["tags"] if tag][:10]
    validated["keywords"] = [str(kw)[:50] for kw in validated["keywords"] if kw][:10]

    return validated

if __name__ == "__main__":
    # Test the extraction
    test_complaint = "The MRT at Dhoby Ghaut station is always delayed during morning rush hours. This happens every day around 8-9 AM and affects hundreds of commuters trying to get to work."

    result = extract_structured_data(test_complaint)
    print("Extracted data:")
    print(json.dumps(result, indent=2))