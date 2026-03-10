# CampusCoPilot – AI-Powered Multi-Agent Study Platform

**Team Neurixia** · Built on Azure AI Foundry

> **Live:** [campuscopilot.me](https://campuscopilot.me)

---

## What It Does

CampusCoPilot is a **5-agent AI system** that turns any syllabus into a personalized, adaptive study experience:

1. **Upload** a syllabus PDF or image → AI extracts structured topics
2. **Planner Agent** generates a week-by-week study campaign with daily time-slots and priorities
3. **Disruptions** (sick day, canceled class, surprise assignment) trigger **real-time replanning**
4. **Retriever Agent** curates micro-lessons, videos, practice questions per topic
5. **Micro-Tutor Agent** generates quizzes, flashcards, and resume bullet points
6. **Scheduler Agent** optimizes your daily timetable around fixed + dynamic events
7. **Executor Agent** runs Pomodoro focus sessions, tracks streaks, awards badges, and sends well-being nudges

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────────────────┐
│   React Frontend    │  REST   │  FastAPI Backend (Azure App Service) │
│   (Vite + GSAP)     │ ◄─────► │                                      │
│   Azure Static      │  JSON   │  ┌────────────┐  ┌───────────────┐  │
│   Web App           │         │  │ PDF Parser  │  │ Azure Doc     │  │
└─────────────────────┘         │  │ (PyPDF2)    │  │ Intelligence  │  │
                                │  └──────┬──────┘  └───────┬───────┘  │
                                │         ▼                  ▼          │
                                │  ┌─────────────┐  ┌──────────────┐   │
                                │  │ ChromaDB    │  │ Azure AI     │   │
                                │  │ Vector Store│  │ Search (RAG) │   │
                                │  └──────┬──────┘  └──────┬───────┘   │
                                │         ▼                 ▼          │
                                │  ┌─────────────────────────────────┐ │
                                │  │         5 AI Agents             │ │
                                │  │  Planner · Retriever · Tutor   │ │
                                │  │  Scheduler · Executor           │ │
                                │  └──────────────┬──────────────────┘ │
                                └─────────────────┼────────────────────┘
                                                  ▼
                                ┌──────────────────────────┐
                                │   Azure AI Foundry       │
                                │   (LLM Inference)        │
                                └──────────────────────────┘
                                ┌──────────────────────────┐
                                │   Azure Cosmos DB        │
                                │   (MongoDB API)          │
                                └──────────────────────────┘
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Syllabus Upload** | PDF or image → OCR (Azure Document Intelligence) → structured topic extraction |
| **Study Campaign** | Week-by-week plan with daily tasks, time-slots, priorities, and breaks |
| **Disruption Replanning** | Sick day / canceled class / extra assignment → AI redistributes tasks |
| **Semester Planner** | Multi-subject semester-wide campaign with midterm/endterm awareness |
| **Micro-Tutor** | AI-generated quizzes, flashcards, and adaptive learning content |
| **Resource Packs** | Micro-lessons, video recommendations, practice questions per topic |
| **Smart Scheduler** | Optimizes fixed + dynamic events into a conflict-free timetable |
| **Pomodoro Timer** | Focus sessions with mini-goals and completion checklists |
| **Gamification** | Streaks, 12 badge types, achievements dashboard |
| **Well-being Nudges** | AI detects overwork and suggests breaks / lighter days |
| **Scan Notes** | Upload handwritten notes → OCR → formatted AI summaries |
| **Portfolio & Resume** | Track projects, generate AI resume bullet points |
| **Study Squads** | Find and join study groups by university/branch |
| **Profile & Analytics** | Track study hours, topics covered, completion rates |

---

## Project Structure

```
NEURIXIA/
├── backend/
│   ├── main.py                # FastAPI app + all endpoints
│   ├── config.py              # Env vars / settings
│   ├── auth.py                # JWT authentication
│   ├── db.py                  # Azure Cosmos DB (MongoDB API)
│   ├── agents/
│   │   ├── planner.py         # Planner Agent – campaign generation & replanning
│   │   ├── retriever.py       # Retriever Agent – micro-lessons & resource packs
│   │   ├── micro_tutor.py     # Micro-Tutor Agent – quizzes, flashcards, resume
│   │   ├── scheduler.py       # Scheduler Agent – smart timetable optimization
│   │   ├── executor.py        # Executor Agent – focus sessions, streaks, badges
│   │   └── prompts.py         # All LLM prompt templates
│   ├── services/
│   │   ├── pdf_parser.py      # PyPDF2 text extraction + chunking
│   │   ├── vector_store.py    # ChromaDB local vector store
│   │   ├── azure_search.py    # Azure AI Search integration
│   │   └── llama_client.py    # Azure AI Foundry HTTP client
│   └── models/
│       └── schemas.py         # Pydantic request/response models
├── frontend/
│   ├── index.html             # Entry point
│   ├── vite.config.js         # Vite build config
│   └── src/
│       ├── App.jsx            # React router + layout
│       ├── api/client.js      # API client with auth
│       ├── context/           # Auth & notification providers
│       ├── components/        # Sidebar, 3D background, protected routes
│       └── pages/             # Dashboard, Planner, Campaign, MicroTutor,
│                              # Scheduler, Pomodoro, Analytics, Achievements,
│                              # ScanNotes, Portfolio, Squads, Profile, etc.
├── requirements.txt
├── startup.sh                 # Azure App Service startup
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- Azure AI Foundry deployment + API key
- Azure Cosmos DB (MongoDB API) connection string

### Backend

```bash
cd NEURIXIA
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt

# Configure .env with:
#   AZURE_AI_ENDPOINT=https://your-resource.services.ai.azure.com/models
#   AZURE_AI_API_KEY=your-key
#   AZURE_AI_DEPLOYMENT=your-model-name
#   MONGO_URI=mongodb+srv://...
#   JWT_SECRET=your-secret

python -m backend.main
```

Backend runs at **http://localhost:8000**

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET`  | `/api/auth/me` | Current user info |

### Core Study Flow
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload-syllabus` | Upload PDF/image → extract topics |
| `POST` | `/api/generate-campaign` | Generate study campaign from topics |
| `POST` | `/api/mock-disruption` | Simulate disruption → replan |
| `POST` | `/api/schedule` | Generate optimized schedule |
| `GET`  | `/api/sessions` | List all sessions |
| `GET`  | `/api/sessions/{id}` | Get session + campaign |

### Semester Planning
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/semester-plan` | Create semester plan |
| `POST` | `/api/semester-plan/{id}/add-subject` | Add subject manually |
| `POST` | `/api/semester-plan/{id}/upload-subject` | Upload subject PDF |
| `POST` | `/api/semester-plan/{id}/generate-campaign` | Generate semester campaign |

### Learning & Practice
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/quiz/generate` | Generate AI quiz |
| `POST` | `/api/flashcards/generate` | Generate flashcard deck |
| `POST` | `/api/resources` | Get resource pack for a topic |
| `POST` | `/api/scan-notes` | OCR handwritten notes |
| `POST` | `/api/format-notes` | AI-format scanned notes |

### Productivity & Engagement
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/focus-session` | Generate Pomodoro session plan |
| `POST` | `/api/pomodoro/log` | Log completed Pomodoro |
| `POST` | `/api/tasks/complete` | Mark task as done |
| `GET`  | `/api/gamification` | Streaks, badges, achievements |
| `GET`  | `/api/wellbeing/nudge` | AI well-being recommendations |

### Social & Profile
| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/profile` | Get user profile |
| `PUT`  | `/api/profile` | Update profile |
| `POST` | `/api/portfolio` | Add portfolio entry |
| `POST` | `/api/portfolio/resume-bullets` | AI resume generation |
| `POST` | `/api/squads` | Create study squad |
| `POST` | `/api/squads/join` | Join a squad |

---

## The 5 AI Agents

| Agent | Role | Key Capabilities |
|-------|------|-------------------|
| **Planner** | Brain of the system | Syllabus parsing, topic extraction, campaign generation, disruption replanning, semester planning |
| **Retriever** | Knowledge scout | RAG-powered micro-lessons, video recommendations, practice questions, key formulas |
| **Micro-Tutor** | Adaptive learning | Quiz generation, flashcard decks, resume bullet points |
| **Scheduler** | Time optimizer | Fixed/dynamic event scheduling, conflict resolution, break insertion |
| **Executor** | Action driver | Pomodoro focus sessions, streak tracking, badge system (12 types), well-being nudges |

---

## Azure Services Used

| Service | Purpose |
|---------|---------|
| **Azure AI Foundry** | LLM inference for all 5 agents |
| **Azure Cosmos DB** | User data, sessions, campaigns (MongoDB API) |
| **Azure App Service** | Backend hosting |
| **Azure Static Web Apps** | Frontend hosting |
| **Azure Document Intelligence** | OCR for images and handwritten notes |
| **Azure AI Search** | RAG vector search for resource retrieval |
| **ChromaDB** | Local vector store for syllabus chunks |

---

## Team Roles

| Member | Focus |
|--------|-------|
| **Pratham** | Agent logic & orchestration |
| **Himanshu** | Prompt engineering (structured JSON output) |
| **Priyanshu** | Frontend UI & UX |
| **Shivansh** | Full-Stack Architecture, Deployment & AI Integration |

---

*Built with dedication by Team Neurixia for the Azure AI Hackathon*
