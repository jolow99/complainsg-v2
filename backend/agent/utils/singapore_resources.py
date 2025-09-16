from typing import List, Dict

# Singapore government resources and contacts
SINGAPORE_RESOURCES = {
    "housing": [
        {
            "name": "Housing Development Board (HDB)",
            "contact": "1800-225-5432",
            "website": "https://www.hdb.gov.sg",
            "description": "Public housing issues, maintenance, policies"
        }
    ],
    "transport": [
        {
            "name": "Land Transport Authority (LTA)",
            "contact": "1800-CALL-LTA (1800-2255-582)",
            "website": "https://www.lta.gov.sg",
            "description": "Road, public transport, traffic issues"
        },
        {
            "name": "PUB (Public Utilities Board)",
            "contact": "1800-CALL-PUB (1800-2255-782)",
            "website": "https://www.pub.gov.sg",
            "description": "Water supply, drainage, sewerage"
        }
    ],
    "healthcare": [
        {
            "name": "Ministry of Health (MOH)",
            "contact": "6325-9220",
            "website": "https://www.moh.gov.sg",
            "description": "Healthcare policies, hospital services"
        }
    ],
    "environment": [
        {
            "name": "National Environment Agency (NEA)",
            "contact": "1800-CALL-NEA (1800-2255-632)",
            "website": "https://www.nea.gov.sg",
            "description": "Environmental health, cleanliness, pest control"
        }
    ],
    "education": [
        {
            "name": "Ministry of Education (MOE)",
            "contact": "6872-2220",
            "website": "https://www.moe.gov.sg",
            "description": "School policies, education matters"
        }
    ],
    "employment": [
        {
            "name": "Ministry of Manpower (MOM)",
            "contact": "6438-5122",
            "website": "https://www.mom.gov.sg",
            "description": "Work pass, employment issues, workplace safety"
        }
    ],
    "security": [
        {
            "name": "Singapore Police Force",
            "contact": "1800-255-0000",
            "website": "https://www.police.gov.sg",
            "description": "Crime reporting, community safety"
        }
    ],
    "general": [
        {
            "name": "OneService App",
            "contact": "Municipal Services",
            "website": "https://www.oneservice.gov.sg",
            "description": "Municipal issues like cleanliness, lighting, infrastructure"
        },
        {
            "name": "REACH",
            "contact": "Whole-of-Government Feedback",
            "website": "https://www.reach.gov.sg",
            "description": "General government feedback and engagement"
        }
    ]
}

def get_singapore_resources(complaint_category: str) -> List[Dict]:
    """
    Get relevant Singapore government resources based on complaint category.

    Args:
        complaint_category: Category of the complaint (housing, transport, etc.)

    Returns:
        List of relevant resource dictionaries
    """
    category_lower = complaint_category.lower()

    # Check for direct category match
    if category_lower in SINGAPORE_RESOURCES:
        return SINGAPORE_RESOURCES[category_lower]

    # Check for partial matches or common synonyms
    category_mappings = {
        "mrt": "transport",
        "bus": "transport",
        "road": "transport",
        "traffic": "transport",
        "hdb": "housing",
        "flat": "housing",
        "apartment": "housing",
        "hospital": "healthcare",
        "clinic": "healthcare",
        "doctor": "healthcare",
        "school": "education",
        "student": "education",
        "job": "employment",
        "work": "employment",
        "salary": "employment",
        "police": "security",
        "crime": "security",
        "safety": "security",
        "noise": "environment",
        "cleanliness": "environment",
        "pollution": "environment",
        "water": "transport",  # PUB handles water
        "electricity": "general",
        "municipal": "general"
    }

    for keyword, mapped_category in category_mappings.items():
        if keyword in category_lower:
            return SINGAPORE_RESOURCES[mapped_category]

    # Return general resources if no specific match
    return SINGAPORE_RESOURCES["general"]

if __name__ == "__main__":
    # Test the function
    test_categories = ["housing", "transport", "mrt issues", "unknown category"]

    for category in test_categories:
        print(f"\\nCategory: {category}")
        resources = get_singapore_resources(category)
        for resource in resources:
            print(f"- {resource['name']}: {resource['description']}")