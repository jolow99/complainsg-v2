# nodes.py
from pocketflow import AsyncNode
from .utils.call_llm_async import call_llm_async
from .utils.stream_llm_async import stream_llm_async
from .utils.save_complaint import save_complaint
from .utils.singapore_resources import get_singapore_resources
import json
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_async_session, Complaint
from app.conversations import create_conversation_with_messages
from uuid import UUID
import uuid

# If the complaint quality is at or below this threshold, it will try to attempt to ask more questions
complaint_threshold = 2

class HTTPDataExtractionNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
            "complaint_quality": shared.get("task_metadata", {}).get("complaint_quality", 0),
        }
        print(f"🔍 DATA EXTRACTION NODE: Current inputs = {inputs}")
        return inputs

    async def exec_async(self, inputs):
        has_been_summarized = False
        to_generate_topic = False

        # All 3 need to be filled to end the flow
        complaint_topic = inputs.get("complaint_topic", "")
        complaint_location = inputs.get("complaint_location", "")
        complaint_summary = inputs.get("complaint_summary", "")
        complaint_quality = inputs.get("complaint_quality", 0)

        print(f"🔍 DATA EXTRACTION NODE: complaint_quality (pre LLM) = {complaint_quality}")

        # Check if any required metadata is missing (and if the complaint quality is below threshold)
        missing_fields = []
        for key, value in inputs.items():
            if key in ['complaint_topic', 'complaint_location', 'complaint_summary']:
                if not value:
                    missing_fields.append(key)
            if key == 'complaint_quality':
                try:
                    quality_val = int(value) if value else 0
                    if quality_val <= complaint_threshold:
                        missing_fields.append(key)
                except (ValueError, TypeError):
                    missing_fields.append(key)

        # If no missing fields, this has been summarized before
        if not missing_fields:
            has_been_summarized = True

        if not inputs.get("complaint_topic", ""):
            to_generate_topic = True

        # Get available complaint categories from database
        try:
            session = get_async_session()
            session_obj = await session.__anext__()
            # Get existing categories from complaints table
            result = await session_obj.execute(
                select(Complaint.category).distinct()
            )
            existing_categories = [row[0] for row in result if row[0]]
            await session_obj.close()
        except Exception as e:
            print(f"Warning: Could not get categories from database: {e}")
            existing_categories = []

        # Default categories if none exist in database
        categories = existing_categories if existing_categories else [
            "transport", "housing", "healthcare", "environment",
            "education", "employment", "security", "general"
        ]

        if missing_fields:
            categories_string = ', '.join(categories)

            # Include categories in the prompt
            prompt = f"""
            Conversation history: {inputs['conversation_history']}

            IMPORTANT: Only extract information that is clearly present in the conversation. Do NOT make up or hallucinate information that isn't there.

            If the user hasn't provided enough information about a complaint, leave those fields as null.

            Extract the following information and return it as valid JSON:

            Examples:
            - complaint_topics: "Construction noise", "Transport delays", "Housing issues"
            - complaint_locations: "Joo Chiat", "Boon Lay", "Bishan", "Central Singapore", "East Coast"
            - complaint_summary: "Citizen complains about excessive construction noise in their neighborhood during early morning hours, affecting sleep and daily life. They want authorities to enforce noise regulations."
            - complaint_quality: 4

            For complaint_topic:
            - Only extract if there's a clear complaint or issue mentioned
            - Try to match to these categories: {categories_string}
            - If no complaint is evident, set to null

            For complaint_location:
            - Only extract if a specific location is mentioned in the conversation
            - Extract specific Singapore neighborhoods, districts, or planning areas (e.g., "Toa Payoh", "Jurong West", "Bedok", "Tampines", "Bishan")
            - Look for MRT station names and map them to neighborhoods (e.g., "Dhoby Ghaut MRT" = "City Hall", "Jurong East MRT" = "Jurong East")
            - If no location is mentioned, set to null

            For complaint_summary:
            - Only write a summary if there's a clear complaint described
            - Write 1-3 sentences summarizing the key issue and what the citizen wants
            - If no clear complaint is present, set to null

            For complaint_quality: Rate 1-5 based on:
                - Specificity and actionability by government
                - Detail level for policymakers
                - Community impact described
                - Constructive vs emotional content
            Scale: 1=vague/personal, 2=minimal detail, 3=somewhat productive, 4=clear/actionable, 5=very detailed/impactful

            Return ONLY valid JSON in this format:
            {{
                "complaint_topic": "specific topic or null",
                "complaint_location": "specific location or null",
                "complaint_summary": "detailed summary or null",
                "complaint_quality": 1
            }}

            CRITICAL: Use null for any field where information is not clearly present in the conversation. Do not make up information.
            """

            response = await call_llm_async(prompt)

            # Parse response into JSON - handle both raw JSON and code-block wrapped JSON
            try:
                # Try to extract JSON from code blocks first
                if "```json" in response:
                    json_str = response.split("```json")[1].split("```")[0].strip()
                elif "```" in response:
                    json_str = response.split("```")[1].split("```")[0].strip()
                else:
                    json_str = response.strip()

                result = json.loads(json_str)

                print(f"🔍 DATA EXTRACTION NODE: Result = {result}")

                # Update inputs with extracted data
                for key, value in result.items():
                    if key in inputs and value and value != "null":
                        # Convert complaint_quality to int to fix TypeError
                        if key == "complaint_quality":
                            try:
                                value = int(value)
                            except (ValueError, TypeError):
                                value = 0
                        inputs[key] = value
                        print(f"🔍 DATA EXTRACTION NODE: Updated {key} = {value}")

                # Update local variables
                complaint_topic = inputs.get("complaint_topic", "")
                complaint_location = inputs.get("complaint_location", "")
                complaint_summary = inputs.get("complaint_summary", "")
                complaint_quality = inputs.get("complaint_quality", 0)

            except (json.JSONDecodeError, IndexError) as e:
                print("❌ DATA EXTRACTION NODE: Failed to parse JSON response from LLM")
                print(f"❌ DATA EXTRACTION NODE: Raw response was: {response}")
                print(f"❌ DATA EXTRACTION NODE: Error: {e}")
                # Return default structure instead of string to avoid AttributeError
                result = {
                    "complaint_topic": complaint_topic,
                    "complaint_location": complaint_location,
                    "complaint_summary": complaint_summary,
                    "complaint_quality": complaint_quality,
                    "has_been_summarized": has_been_summarized
                }
                return result

        result = {
            "complaint_topic": complaint_topic,
            "complaint_location": complaint_location,
            "complaint_summary": complaint_summary,
            "complaint_quality": complaint_quality,
            "has_been_summarized": has_been_summarized
        }
        return result

    async def post_async(self, shared, prep_res, exec_res):

        print(f"🔍 DATA EXTRACTION NODE: complaint_quality (post LLM) = {exec_res.get('complaint_quality')}")

        # Populate task metadata with extracted data
        shared["task_metadata"]["complaint_topic"] = exec_res.get("complaint_topic")
        shared["task_metadata"]["complaint_location"] = exec_res.get("complaint_location")
        shared["task_metadata"]["complaint_summary"] = exec_res.get("complaint_summary")
        shared["task_metadata"]["complaint_quality"] = exec_res.get("complaint_quality")

        if exec_res.get("has_been_summarized"):
            return "reject"

        print(f"🔍 DATA EXTRACTION NODE: task_metadata = {shared['task_metadata']}")
        # Ensure complaint_quality is an integer for comparison
        complaint_quality = exec_res.get("complaint_quality", 0)
        try:
            complaint_quality = int(complaint_quality)
        except (ValueError, TypeError):
            complaint_quality = 0

        if (exec_res.get("complaint_topic") and
            exec_res.get("complaint_location") and
            exec_res.get("complaint_summary") and
            complaint_quality > complaint_threshold):
            print("🔍 DATA EXTRACTION NODE: All fields complete - returning 'summarize'")
            return "summarize"
        else:
            print("🔍 DATA EXTRACTION NODE: Some fields missing - returning 'continue'")
            return 'continue'


class HTTPGenerateNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        inputs = {
            # Prep history
            "conversation_history": shared["conversation_history"],
            # Prep metadata
            "complaint_topic": shared.get("task_metadata", {}).get("complaint_topic", ""),
            "complaint_summary": shared.get("task_metadata", {}).get("complaint_summary", ""),
            "complaint_location": shared.get("task_metadata", {}).get("complaint_location", ""),
            "complaint_quality": shared.get("task_metadata", {}).get("complaint_quality", 0),
            "queue": shared.get("message_queue")
        }
        return inputs

    async def exec_async(self, inputs):
        queue = inputs.get("queue")

        missing_fields = [key for key, value in inputs.items() if key in ['complaint_topic', 'complaint_location', 'complaint_summary'] and not value]

        prompt = f"""
            You are a helpful assistant handling citizen complaints. Your job is to briefly acknowledge the complaint and ask ONE final clarifying question if absolutely necessary.

            Past conversation history: {inputs['conversation_history']}

            Missing Data: {', '.join(missing_fields)}
            Complaint Quality: {inputs.get("complaint_quality", 0)}

            If we have basic complaint information (topic, location, summary), thank the citizen and let them know their complaint will be processed. Only ask ONE more question if critical information is completely missing.

            Be concise and helpful. If you ask a question, make it short and specific. Prioritize moving forward with complaint processing rather than gathering perfect information.
            """
        full_response = ""
        async for chunk in stream_llm_async([{"role": "user", "content": prompt}]):
            if chunk:
                full_response += chunk
                if queue:
                    await queue.put(chunk)
        if queue:
            await queue.put(None)
        return full_response

    async def post_async(self, shared, prep_res, exec_res):
        shared["conversation_history"].append({"role": "assistant", "content": exec_res})
        return "default"


class HTTPSummarizerNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        return {
            "conversation_history": shared["conversation_history"],
            "task_metadata": shared.get("task_metadata", {}),
            "queue": shared.get("message_queue")
        }

    async def exec_async(self, inputs):
        conversation_history = inputs["conversation_history"]
        task_metadata = inputs["task_metadata"]
        queue = inputs.get("queue")

        # Send initial status to queue
        if queue:
            await queue.put("💾 Saving your complaint to our database...\n\n")

        # Prepare complaint data for storage
        complaint_data = {
            "original_text": " ".join([msg.get("content", "") for msg in conversation_history if msg.get("role") == "user"]),
            "title": task_metadata.get("complaint_topic", "Complaint")[:100],
            "category": self._map_category(task_metadata.get("complaint_topic", "")),
            "subcategory": "general",
            "urgency": self._map_urgency(task_metadata.get("complaint_quality", 0)),
            "status": "open",
            "location_description": task_metadata.get("complaint_location", ""),
            "planning_area": task_metadata.get("complaint_location", ""),
            "conversation_history": conversation_history,
            "tags": [task_metadata.get("complaint_topic", "").lower()],
            "keywords": [task_metadata.get("complaint_topic", "").lower(), task_metadata.get("complaint_location", "").lower()],
            "sentiment_score": self._calculate_sentiment(task_metadata.get("complaint_quality", 0))
        }

        # Save complaint to database
        complaint_id = await save_complaint(complaint_data)

        if queue:
            await queue.put("✅ Complaint saved successfully!\n\n")

        # Get relevant Singapore resources based on complaint category
        complaint_category = self._map_category(task_metadata.get("complaint_topic", ""))
        relevant_resources = get_singapore_resources(complaint_category)

        # Generate summary response
        resources_text = ""
        if relevant_resources:
            resources_text = "\\n\\nFor direct assistance or to follow up on this matter, you can also contact:\\n"
            for resource in relevant_resources[:2]:  # Show top 2 most relevant resources
                resources_text += f"• {resource['name']}: {resource['contact']} ({resource['description']})\\n"

        prompt = f"""
            You are summarizing a citizen complaint conversation and providing closure.

            Conversation history:
            {conversation_history}

            Task metadata:
            Topic: {task_metadata.get("complaint_topic", "")}
            Location: {task_metadata.get("complaint_location", "")}
            Quality: {task_metadata.get("complaint_quality", 0)}

            Write a response that:
            1. Confirms their complaint has been logged with ID: {complaint_id}
            2. Briefly summarizes what they reported
            3. Explains that this helps bring community issues to light
            4. Includes relevant Singapore government contacts for direct follow-up if they want immediate action

            Relevant government resources for this complaint type:
            {resources_text}

            Keep the response professional, helpful, and reassuring. Thank them for bringing this to the community's attention.
            """

        full_response = ""
        async for chunk in stream_llm_async([{"role": "user", "content": prompt}]):
            if chunk:
                full_response += chunk
                if queue:
                    await queue.put(chunk)
        if queue:
            await queue.put(None)

        return {
            "response": full_response,
            "complaint_id": complaint_id
        }

    async def post_async(self, shared, prep_res, exec_res):
        shared["complaint_id"] = exec_res["complaint_id"]
        return "default"

    def _map_category(self, complaint_topic: str) -> str:
        """Map complaint topic to standard categories."""
        topic_lower = complaint_topic.lower()
        if any(word in topic_lower for word in ["transport", "mrt", "bus", "traffic"]):
            return "transport"
        elif any(word in topic_lower for word in ["housing", "hdb", "flat", "home"]):
            return "housing"
        elif any(word in topic_lower for word in ["health", "hospital", "clinic", "medical"]):
            return "healthcare"
        elif any(word in topic_lower for word in ["environment", "noise", "pollution", "air"]):
            return "environment"
        elif any(word in topic_lower for word in ["education", "school", "student"]):
            return "education"
        elif any(word in topic_lower for word in ["work", "job", "employment"]):
            return "employment"
        elif any(word in topic_lower for word in ["security", "safety", "crime"]):
            return "security"
        else:
            return "general"

    def _map_urgency(self, quality: int) -> str:
        """Map complaint quality to urgency level."""
        if quality >= 4:
            return "high"
        elif quality >= 3:
            return "medium"
        else:
            return "low"

    def _calculate_sentiment(self, quality: int) -> float:
        """Calculate sentiment score based on quality."""
        # Map quality (1-5) to sentiment (-1 to 1)
        return (quality - 3) / 2.0


class HTTPRejectionNodeAsync(AsyncNode):
    async def prep_async(self, shared):
        queue = shared.get("message_queue")
        return {"queue": queue}

    async def exec_async(self, inputs):
        # Response text
        response_text = "This complaint thread has ended. Create a new chat if you want to start another complaint!"

        queue = inputs.get("queue")
        full_response = ""

        # Fake streaming response lol more vibes then j throwing up a wall of text
        if queue:
            # Split the response into words
            words = response_text.split()
            # Put each word into the queue with a small delay
            for word in words:
                word_with_space = word + " "
                full_response += word_with_space
                await queue.put(word_with_space)
                await asyncio.sleep(0.1)  # Small delay to simulate streaming

            # Signal end of stream
            await queue.put(None)

        return response_text

    async def post_async(self, shared, prep_res, exec_res):
        return "default"