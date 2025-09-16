import json
import yaml
from pocketflow import Node
from .utils import call_llm, get_singapore_resources, save_complaint

class InitialAssessmentNode(Node):
    """
    Analyzes initial complaint and decides next action.
    """
    def prep(self, shared):
        complaint = shared["complaint"]["original_text"]
        history = shared["conversation_history"]
        return complaint, history

    def exec(self, prep_res):
        complaint, history = prep_res

        # Build context for LLM
        history_text = ""
        if history:
            history_text = "\n".join([
                f"Q: {item['question']}\nA: {item['answer']}"
                for item in history[-3:]  # Last 3 exchanges
            ])

        prompt = f"""
You are an AI assistant helping Singaporeans submit better complaints to government agencies. Your goal is to help them feel heard and improve their complaint through detailed probing.

CURRENT COMPLAINT: {complaint}

CONVERSATION HISTORY:
{history_text}

Analyze this complaint and determine if it needs more details or is ready to be saved. Focus on:
1. Is the complaint clear and specific enough?
2. Do we have enough details about location, timing, impact?
3. Can we categorize the complaint appropriately?
4. Have we gathered enough context to make the citizen feel heard?

Be thorough in probing - citizens want to feel their concerns are fully understood before being saved.

Respond in YAML format:
```yaml
analysis:
  clarity: high/medium/low
  category: housing/transport/healthcare/environment/education/employment/security/general
  completeness: complete/needs_more_details
  urgency: low/medium/high

decision: needs_probing/ready_for_storage

reasoning: Brief explanation of your decision - err on the side of more probing to ensure citizen feels heard

probing_areas:
  - area1 (only if needs_probing)
  - area2 (only if needs_probing)
```
"""

        messages = [
            {"role": "system", "content": "You are an expert at analyzing citizen complaints for Singapore government agencies."},
            {"role": "user", "content": prompt}
        ]

        response = call_llm(messages)
        yaml_str = response.split("```yaml")[1].split("```")[0].strip()
        result = yaml.safe_load(yaml_str)

        # Validate required fields
        assert "analysis" in result
        assert "decision" in result
        assert result["decision"] in ["needs_probing", "ready_for_storage"]

        return result

    def post(self, shared, prep_res, exec_res):
        # Store analysis results
        shared["analysis"] = exec_res["analysis"]
        shared["agent_decision"] = exec_res["decision"]

        # Update complaint category if determined
        if "category" in exec_res["analysis"]:
            shared["complaint"]["category"] = exec_res["analysis"]["category"]

        if "urgency" in exec_res["analysis"]:
            shared["complaint"]["urgency"] = exec_res["analysis"]["urgency"]

        # Store probing areas if applicable
        if exec_res["decision"] == "needs_probing" and "probing_areas" in exec_res:
            shared["probing_areas"] = exec_res["probing_areas"]

        return exec_res["decision"]


class ProbingNode(Node):
    """
    Asks follow-up questions to clarify and enrich complaint details.
    """
    def prep(self, shared):
        complaint = shared["complaint"]
        probing_areas = shared.get("probing_areas", [])
        history = shared["conversation_history"]
        return complaint, probing_areas, history

    def exec(self, prep_res):
        complaint, probing_areas, history = prep_res

        # Determine what questions to ask based on probing areas
        areas_text = ", ".join(probing_areas) if probing_areas else "general details"

        prompt = f"""
You are helping a Singaporean citizen improve their complaint.

CURRENT COMPLAINT: {complaint["original_text"]}
COMPLAINT CATEGORY: {complaint.get("category", "unknown")}

AREAS NEEDING MORE DETAILS: {areas_text}

EXISTING DETAILS: {json.dumps(complaint.get("details", {}), indent=2)}

Generate 1-2 specific follow-up questions that will help clarify the complaint and make it more actionable.
Focus on getting concrete details like:
- Specific location (which station, block, area)
- Timing (when does this happen, how often)
- Impact (how does this affect you/others)
- What has been tried before
- Contact information if needed for follow-up

Respond in YAML format:
```yaml
questions:
  - "First follow-up question"
  - "Second follow-up question (if needed)"

explanation: "Brief explanation of what these questions will help clarify"
```
"""

        messages = [
            {"role": "system", "content": "You are an expert at helping citizens articulate clear, actionable complaints."},
            {"role": "user", "content": prompt}
        ]

        response = call_llm(messages)
        yaml_str = response.split("```yaml")[1].split("```")[0].strip()
        result = yaml.safe_load(yaml_str)

        # Validate required fields
        assert "questions" in result
        assert isinstance(result["questions"], list)

        return result

    def post(self, shared, prep_res, exec_res):
        # Store the questions that were asked
        shared["current_questions"] = exec_res["questions"]
        shared["probing_explanation"] = exec_res.get("explanation", "")

        # Return to assessment after user answers
        return "assess"


class ResourceRecommendationNode(Node):
    """
    Suggests relevant Singapore government resources and contacts.
    """
    def prep(self, shared):
        category = shared["complaint"].get("category", "general")
        complaint_text = shared["complaint"]["original_text"]
        return category, complaint_text

    def exec(self, prep_res):
        category, complaint_text = prep_res

        # Get relevant resources
        resources = get_singapore_resources(category)

        # Generate personalized recommendation
        resources_text = "\n".join([
            f"- {r['name']}: {r['description']} (Contact: {r['contact']})"
            for r in resources
        ])

        prompt = f"""
Based on this complaint: "{complaint_text}"

Here are the relevant Singapore government agencies and resources:
{resources_text}

Provide a personalized recommendation explaining:
1. Which resource(s) are most relevant for this specific complaint
2. What information/documents they should prepare before contacting
3. What to expect from the process

Keep the response helpful, encouraging, and Singapore-specific.
"""

        messages = [
            {"role": "system", "content": "You are a helpful guide for Singapore government services."},
            {"role": "user", "content": prompt}
        ]

        recommendation_text = call_llm(messages)

        return {
            "resources": resources,
            "recommendation": recommendation_text
        }

    def post(self, shared, prep_res, exec_res):
        shared["recommended_resources"] = exec_res["resources"]
        shared["resource_recommendation"] = exec_res["recommendation"]
        return "store"


class ComplaintStorageNode(Node):
    """
    Saves well-formed complaint to database and provides resource recommendations.
    """
    def prep(self, shared):
        complaint = shared["complaint"]
        category = complaint.get("category", "general")
        complaint_text = complaint["original_text"]

        return {
            "complaint_data": {
                "complaint": complaint,
                "conversation_history": shared["conversation_history"],
                "analysis": shared.get("analysis", {})
            },
            "category": category,
            "complaint_text": complaint_text
        }

    def exec(self, prep_res):
        complaint_data = prep_res["complaint_data"]
        category = prep_res["category"]
        complaint_text = prep_res["complaint_text"]

        # Save complaint and get ID
        complaint_id = save_complaint(complaint_data)

        # Get relevant resources for this complaint
        resources = get_singapore_resources(category)

        # Generate personalized resource recommendation
        resources_text = "\n".join([
            f"- {r['name']}: {r['description']} (Contact: {r['contact']})"
            for r in resources
        ])

        prompt = f"""
The citizen's complaint has been saved successfully: "{complaint_text}"

Here are relevant Singapore government agencies and resources:
{resources_text}

Provide a helpful, encouraging message that:
1. Acknowledges their complaint has been heard and saved
2. Explains which resource(s) are most relevant for follow-up
3. Suggests what information/documents they should prepare if contacting these agencies
4. Maintains a supportive, Singapore-specific tone

Keep it concise but comprehensive.
"""

        messages = [
            {"role": "system", "content": "You are a helpful guide for Singapore government services, focused on making citizens feel heard."},
            {"role": "user", "content": prompt}
        ]

        recommendation_text = call_llm(messages)

        return {
            "complaint_id": complaint_id,
            "resources": resources,
            "recommendation": recommendation_text
        }

    def post(self, shared, prep_res, exec_res):
        shared["complaint_id"] = exec_res["complaint_id"]
        shared["recommended_resources"] = exec_res["resources"]
        shared["resource_recommendation"] = exec_res["recommendation"]
        shared["is_complete"] = True

        # Generate completion message
        category = shared["complaint"].get("category", "general")
        urgency = shared["complaint"].get("urgency", "medium")

        completion_message = f"""
✅ Your complaint has been successfully processed and saved!

📋 Complaint ID: {exec_res["complaint_id"]}
📂 Category: {category.title()}
⚡ Urgency Level: {urgency.title()}

{exec_res["recommendation"]}
"""

        shared["completion_message"] = completion_message
        return "complete"