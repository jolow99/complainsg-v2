# Design Doc: ComplainSG Agent

> Please DON'T remove notes for AI

## Requirements

> Notes for AI: Keep it simple and clear.
> If the requirements are abstract, write concrete user stories

**User Story**: As a Singaporean citizen, I want to submit a complaint and have an AI agent help me refine it through guided questions, so that my complaint is clear, actionable, and gets directed to appropriate resources or saved for action.

**Core Requirements**:
1. **Probing Phase**: Agent asks follow-up questions to clarify and enrich the complaint
2. **Decision Making**: Agent decides when complaint is sufficiently detailed and productive
3. **Resource Recommendation**: Agent can recommend relevant resources/contacts for resolution
4. **Complaint Storage**: Agent saves well-formed complaints for further action

## Flow Design

> Notes for AI:
> 1. Consider the design patterns of agent, map-reduce, rag, and workflow. Apply them if they fit.
> 2. Present a concise, high-level description of the workflow.

### Applicable Design Pattern:

**Agent Pattern**: The system acts as an intelligent agent that:
- *Context*: Current complaint details, conversation history, and Singapore government resources
- *Actions*: Ask follow-up questions, recommend resources, or save complaint

### Flow High-level Design:

1. **Initial Assessment Node**: Analyzes the complaint and determines if more probing is needed
2. **Probing Node**: Asks targeted follow-up questions to help citizens feel heard
3. **Complaint Storage Node**: Saves well-formed complaints and provides resource recommendations

```mermaid
flowchart TD
    start[Initial Complaint] --> assess[Initial Assessment Node]
    assess -->|needs_probing| probe[Probing Node]
    assess -->|ready_for_storage| store[Complaint Storage Node]

    probe --> assess
    store --> end[Complete]
```

## Utility Functions

> Notes for AI:
> 1. Understand the utility function definition thoroughly by reviewing the doc.
> 2. Include only the necessary utility functions, based on nodes in the flow.

1. **Call LLM** (`utils/call_llm.py`)
   - *Input*: messages (List[Dict]) - OpenAI format messages
   - *Output*: response (str) - LLM response text
   - Used by assessment and probing nodes for decision making

2. **Save Complaint** (`utils/save_complaint.py`)
   - *Input*: complaint_data (dict) - structured complaint information
   - *Output*: complaint_id (str) - saved complaint identifier
   - Used by storage node to persist complaints

3. **Get Singapore Resources** (`utils/singapore_resources.py`)
   - *Input*: complaint_category (str) - type of complaint
   - *Output*: resources (List[Dict]) - relevant government resources
   - Used by recommendation node to suggest appropriate channels

## Node Design

### Shared Store

> Notes for AI: Try to minimize data redundancy

The shared store structure is organized as follows:

```python
shared = {
    "complaint": {
        "original_text": "Initial complaint from user",
        "details": {},  # Enriched details from probing
        "category": "",  # Determined complaint category
        "location": "",  # Singapore location if relevant
        "urgency": "",  # Low/Medium/High
        "contact_info": {}  # User contact details
    },
    "conversation_history": [],  # List of Q&A exchanges
    "recommended_resources": [],  # Relevant resources found
    "agent_decision": "",  # Current agent decision
    "is_complete": False  # Whether complaint processing is done
}
```

### Node Steps

> Notes for AI: Carefully decide whether to use Batch/Async Node/Flow.

1. **Initial Assessment Node**
   - *Purpose*: Analyze complaint and decide next action (probe, recommend, or store)
   - *Type*: Regular Node
   - *Steps*:
     - *prep*: Read "complaint" and "conversation_history" from shared store
     - *exec*: Call LLM utility to analyze complaint completeness and categorize
     - *post*: Update "agent_decision" and return appropriate action

2. **Probing Node**
   - *Purpose*: Ask follow-up questions to clarify and enrich complaint details
   - *Type*: Regular Node
   - *Steps*:
     - *prep*: Read current complaint details and history from shared store
     - *exec*: Call LLM utility to generate targeted follow-up questions
     - *post*: Update "conversation_history" and return "assess" to loop back

3. **Complaint Storage Node**
   - *Purpose*: Save well-formed complaint and provide relevant resource recommendations
   - *Type*: Regular Node
   - *Steps*:
     - *prep*: Read complete complaint data from shared store
     - *exec*: Call save complaint utility and generate personalized resource recommendations
     - *post*: Mark "is_complete" as True and provide completion message with resources