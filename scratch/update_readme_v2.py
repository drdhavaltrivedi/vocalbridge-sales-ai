import os

file_path = "/home/brilworks/Downloads/vocalbridge-sales-ai/README.md"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the insertion point (after Frontend Architecture)
insertion_marker = "Each route is individually wrapped in `<ErrorBoundary>`. A crash in one component does not take down the whole app."

new_diagrams = """

### User Flow

```mermaid
stateDiagram-v2
    [*] --> LandingPage: Visit Website
    LandingPage --> Login: Click Get Started
    Login --> Dashboard: Google Auth
    
    state Dashboard {
        [*] --> Overview
        Overview --> ClientManager: Manage Leads
        Overview --> CallMonitor: Start Outreach
        Overview --> KnowledgeBase: Train AI
        Overview --> Settings: Configure Agent
    }
    
    ClientManager --> AddLeads: Manual/CSV Import
    AddLeads --> CallMonitor: Select Lead
    
    CallMonitor --> ActiveCall: Start Real/Demo Call
    ActiveCall --> CallSummary: End Call
    CallSummary --> Dashboard: Update Stats
```

### Entity Relationship (ER) Diagram

VocalBridge uses a schema-less Firestore database with a structured relational design for data integrity.

```mermaid
erDiagram
    CLIENT {
        string id PK
        string name
        string phoneNumber
        string email
        string status
        string lastCallId
        timestamp createdAt
    }
    
    CALL {
        string id PK
        string clientId FK
        string clientName
        string status
        timestamp startTime
        string sentiment
        string outcome
        string summary
        float roiProjection
    }
    
    KNOWLEDGE_DOC {
        string id PK
        string title
        string content
        string categoryId FK
        timestamp lastUpdated
    }
    
    KNOWLEDGE_CATEGORY {
        string id PK
        string name
        string color
    }
    
    SETTINGS {
        string id PK "global-v1"
        string personaName
        string voiceName
        string systemInstruction
    }

    CLIENT ||--o{ CALL : "has many"
    KNOWLEDGE_CATEGORY ||--o{ KNOWLEDGE_DOC : "categorizes"
```
"""

if insertion_marker in content:
    parts = content.split(insertion_marker)
    new_content = parts[0] + insertion_marker + new_diagrams + parts[1]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully updated README.md with User Flow and ER diagrams")
else:
    print(f"Could not find insertion marker")
