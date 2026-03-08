# CampusCoPilot – AI-Powered Study Planner (Lean MVP)

**Team Neurixia** · Built on Azure AI Foundry + Llama

---

## What It Does

A student uploads a **syllabus PDF** -> CampusCoPilot extracts topics -> the **Planner Agent** (powered by Llama on Azure) generates a **personalized, week-by-week study campaign** with daily tasks, time-slots, and priorities -> disruptions (canceled class, sick day) can be simulated and the plan **dynamically re-plans** itself.

---

## Architecture (Budget-Friendly)

```
┌──────────────┐    PDF     ┌──────────────────────────────┐
│   Frontend   │ ────────►  │  FastAPI Backend              │
│  (HTML/JS)   │ ◄────────  │                                │
└──────────────┘   JSON     │  ┌─────────────┐              │
                            │  │ PDF Parser   │  (PyPDF2)   │
                            │  │ (free/local) │              │
                            │  └──────┬──────┘              │
                            │         ▼                      │
                            │  ┌─────────────┐              │
                            │  │ ChromaDB     │  (local)    │
                            │  │ Vector Store │              │
                            │  └──────┬──────┘              │
                            │         ▼                      │
                            │  ┌─────────────┐              │
                            │  │ Planner Agent│              │
                            │  │ (prompts +   │              │
                            │  │  orchestrate)│              │
                            │  └──────┬──────┘              │
                            └─────────┼──────────────────────┘
                                      ▼
                            ┌─────────────────┐
                            │ Azure AI Foundry │  ← only Azure cost
                            │ (Llama model)    │
                            └─────────────────┘
```

**Cost strategy**: Everything runs locally except the Llama inference call. Token usage is tracked in real-time to protect the **$100 budget**.

---

## Project Structure

```
NEURIXIA/
├── backend/
│   ├── main.py                # FastAPI app + all endpoints
│   ├── config.py              # Env vars / settings
│   ├── agents/
│   │   ├── planner.py         # Planner Agent orchestration
│   │   └── prompts.py         # All Llama prompt templates
│   ├── services/
│   │   ├── pdf_parser.py      # PyPDF2 text extraction + chunking
│   │   ├── vector_store.py    # ChromaDB local RAG
│   │   └── llama_client.py    # Azure AI Foundry HTTP client
│   └── models/
│       └── schemas.py         # Pydantic request/response models
├── frontend/
│   ├── index.html             # Single-page UI
│   ├── styles.css             # Dark-theme stylesheet
│   └── app.js                 # Frontend logic
├── requirements.txt
├── .env.example               # Template for secrets
├── .gitignore
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- **Python 3.10+**
- An **Azure AI Foundry** deployment with a Llama model
- Your Azure endpoint URL and API key

### 2. Clone & Install

```bash
cd NEURIXIA
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment

```bash
copy .env.example .env
# Edit .env with your Azure AI credentials:
#   AZURE_AI_ENDPOINT=https://YOUR-RESOURCE.openai.azure.com/
#   AZURE_AI_API_KEY=your-key
#   AZURE_AI_DEPLOYMENT=llama-3
```

### 4. Run the Server

```bash
python -m backend.main
```

The API starts at **http://localhost:8000**  
The frontend is served at **http://localhost:8000/app**

### 5. Use It

1. Open **http://localhost:8000/app** in your browser
2. Upload a syllabus PDF
3. Review extracted topics
4. Set student constraints (or click a **preset persona** like Abishek)
5. Click **Generate Study Campaign**
6. Simulate a disruption with the lightning button

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check + token usage |
| `POST` | `/api/upload-syllabus` | Upload PDF, extract & index topics |
| `POST` | `/api/generate-campaign` | Generate study campaign from topics |
| `POST` | `/api/mock-disruption` | Simulate disruption & replan |
| `POST` | `/api/replan` | Full replan with campaign + disruption + constraints |
| `GET`  | `/api/state` | Get current session state |

---

## Team Roles (Parallel Workflow)

| Member | Focus | Files |
|--------|-------|-------|
| **Pratham** | Agent logic & orchestration | `agents/planner.py`, `agents/prompts.py` |
| **Himanshu** | Prompt engineering (structured JSON output) | `agents/prompts.py`, `services/llama_client.py` |
| **Priyanshu** | Frontend UI (upload -> calendar) | `frontend/*` |
| **Shivansh** | Full-Stack Architecture, Deployment & AI Integration | Full Codebase |

---

## Testing with Personas

The UI includes preset personas. Click **Abishek** to auto-fill:

- **Name**: Abishek  
- **Hours/day**: 3 (fragmented)  
- **Weak subjects**: English, Statistics  
- **Language**: Hindi  
- **Notes**: Struggling with English comprehension, part-time work schedule  

This tests whether the planner correctly prioritizes tasks, uses simpler language, and fits tasks into short time blocks.

---

## Budget Tips

- **Monitor tokens**: The top-right badge shows cumulative token usage.
- **ChromaDB is free**: RAG runs entirely locally, zero Azure cost.
- **PyPDF2 is free**: No Document Intelligence charges during prototyping.
- **Temperature 0.3**: Lower temperature = fewer retries = fewer tokens.
- **Truncate syllabus**: Only the first ~3000 chars are sent for topic extraction.

---

## Next Steps (Post-MVP)

- [ ] Add **Retriever Agent** (deeper RAG with Azure AI Search)
- [ ] Add **Executor Agent** (push tasks to calendar APIs)
- [ ] Replace ChromaDB with Azure AI Search when budget allows
- [ ] Add authentication & per-user state (Azure Cosmos DB)
- [ ] Deploy to **Azure Container Apps** (serverless, pay-per-use)
- [ ] CI/CD via GitHub Actions

---

*Built with dedication by Team Neurixia for the Azure AI Hackathon*
