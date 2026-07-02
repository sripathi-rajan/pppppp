<div align="center">
  <h1>🚗 DriveLegal</h1>
  <p><em>Your AI-powered digital legal companion for the road.</em></p>

  [![Expo](https://img.shields.io/badge/Expo_54-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
  [![React Native](https://img.shields.io/badge/React_Native_0.81-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
  [![Ollama](https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)
</div>

<br />

**DriveLegal** is an AI-powered mobile + web application that simplifies traffic laws, regulations, and fine management across **six countries** (India, UAE, UK, USA, Singapore, Saudi Arabia). It uses an **agentic AI architecture** — a local LLM autonomously decides which tools to call, executes them against real databases, and synthesizes grounded natural-language responses.

---

## Table of Contents

- [Key Features](#key-features)
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Mobile Setup](#mobile-setup)
  - [Quick Start (PowerShell)](#quick-start-powershell)
- [Environment Variables](#environment-variables)
- [Backend Documentation](#backend-documentation)
  - [API Reference](#api-reference)
  - [Agent Engine](#agent-engine)
  - [Tool System](#tool-system)
  - [NLP / Hybrid Search](#nlp--hybrid-search)
  - [Fines Module](#fines-module)
  - [Rules Module](#rules-module)
  - [Geofencing Module](#geofencing-module)
  - [Normalization Layer](#normalization-layer)
  - [Sync Module](#sync-module)
- [Mobile Documentation](#mobile-documentation)
  - [App Screens](#app-screens)
  - [Custom Hooks](#custom-hooks)
  - [Components](#components)
  - [Local Database](#local-database)
  - [Utilities](#utilities)
- [Data Pipeline](#data-pipeline)
  - [Web Scraper](#web-scraper)
  - [Data Sources](#data-sources)
  - [Database Schema](#database-schema)
- [Multi-Country Support](#multi-country-support)
- [Internationalization (i18n)](#internationalization-i18n)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Disclaimer](#disclaimer)

---

## Key Features

| Feature | Description |
|---|---|
| **Agentic AI** | Local Ollama (with Gemini cloud fallback) autonomously decides which tools to call — fine lookup, rule search, zone check, web search — and synthesizes grounded responses |
| **Tool Calling** | 5 integrated tools (`lookup_fine`, `lookup_rule`, `check_zone`, `search_rules`, `search_web`) backed by SQLite, JSON data, and live web scraping |
| **Multi-turn Memory** | Full conversation history passed to the agent for context-aware follow-up queries |
| **Multi-Country** | Traffic law data for India (16 states), UAE, UK, USA, Singapore, and Saudi Arabia |
| **Real-time Geofencing** | GPS-based traffic zone detection using GeoJSON polygons + Shapely |
| **Challan Calculator** | Vehicle registration number lookup for pending fine estimation |
| **Image Analysis** | Upload challan photos / traffic signs for AI-powered extraction + database cross-verification |
| **Voice Integration** | Hands-free voice-to-text search for safe driving |
| **Offline-First** | Local SQLite database on-device for instant rule/fine access without internet |
| **Hybrid Search (RAG)** | ChromaDB vector search + BM25 lexical search for intelligent fallback |
| **Multi-Language** | UI in English, Tamil, Hindi, and Telugu |
| **Premium UI** | Clean, high-performance interface with dark amber accent theme |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo/RN)                       │
│  ┌──────┐ ┌─────┐ ┌───────┐ ┌───────┐ ┌──────────┐          │
│  │ Home │ │ Ask │ │ Fines │ │ Rules │ │ Settings │          │
│  └──┬───┘ └──┬──┘ └───┬───┘ └───┬───┘ └────┬─────┘          │
│     │        │        │         │           │                │
│  ┌──┴────────┴────────┴─────────┴───────────┴──────┐         │
│  │              Custom React Hooks                  │         │
│  │  useQuery · useLocalDB · useSync · useSettings   │         │
│  │  useHistory · useUI                              │         │
│  └──────────────────────┬──────────────────────────┘         │
│                         │ HTTP POST /query                   │
│              ┌──────────┴──────────┐                         │
│              │  Local SQLite (offline) │                      │
│              └─────────────────────┘                         │
└─────────────────────────┬────────────────────────────────────┘
                          │ fetch()
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │               Agent Engine                         │      │
│  │  Priority: Ollama → Gemini → Keyword Fallback      │      │
│  │                                                    │      │
│  │  ┌─────────────────────────────────────────────┐   │      │
│  │  │            Tool Executor                    │   │      │
│  │  │  lookup_fine  · lookup_rule  · search_web   │   │      │
│  │  │  check_zone   · search_rules               │   │      │
│  │  └──────┬──────────┬──────────┬────────────┬───┘   │      │
│  │         │          │          │            │        │      │
│  │    ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌─────▼──┐    │      │
│  │    │ Fines  │ │ Rules  │ │Geofence│ │Hybrid  │    │      │
│  │    │(SQLite)│ │ (JSON) │ │(GeoJSON)│ │Search  │    │      │
│  │    └────────┘ └────────┘ └────────┘ │(ChromaDB│    │      │
│  │                                     │+ BM25) │    │      │
│  │                                     └────────┘    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  Sync Router: /sync/fines · /sync/rules · /sync/zones       │
└──────────────────────────────────────────────────────────────┘
                          ▲
                          │ Playwright scraping
┌─────────────────────────┴────────────────────────────────────┐
│                    SCRAPER (Python)                           │
│  scrape_fines.py → Parivahan, TN Transport → fines.db        │
└──────────────────────────────────────────────────────────────┘
```

### Agent Loop Detail

```
User message
    │
    ▼
LLM (Ollama local / Gemini cloud) with tools + system prompt
    │
    ├── Decides: lookup_fine("no helmet", "2W", "Tamil Nadu")
    │       └── ToolExecutor._lookup_fine() → queries SQLite
    │               └── returns { amount_inr: 1000, section: "129" }
    │
    ├── Decides: lookup_rule("NO_HELMET", "Tamil Nadu")
    │       └── ToolExecutor._lookup_rule() → queries rules.json
    │               └── returns { title:…, description:… }
    │
    └── Synthesizes tool results → natural language response
            └── "The fine for no helmet in TN is ₹1,000
                 under Section 194D of the MV Act 1988…"
    │
    ▼
Final structured response returned to mobile app
```

---

## Technology Stack

### Backend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **FastAPI** | Async REST API server |
| AI (Primary) | **Ollama** (via OpenAI SDK) | Local LLM for agentic tool calling |
| AI (Fallback) | **Google Gemini** (google-genai SDK) | Cloud LLM fallback |
| NLP / RAG | **ChromaDB** + **BM25Okapi** | Hybrid vector+lexical search |
| Embeddings | **Ollama** (nomic-embed-text) | Local embedding generation |
| Geofencing | **Shapely** | GeoJSON polygon point-in-polygon checks |
| Fines DB | **SQLite** | Structured traffic fine storage |
| Rules DB | **JSON** | Motor Vehicles Act rules + state overrides |
| Scraping | **Playwright** | Automated government website scraping |
| Server | **Uvicorn** | ASGI server |
| Validation | **Pydantic** | Request/response model validation |

### Mobile (Frontend)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Expo 54** / **React Native 0.81** | Cross-platform mobile app |
| Language | **TypeScript 5.3+** | Type-safe development |
| Navigation | **Expo Router v3** | File-based routing |
| Data Fetching | **TanStack Query 5** | Server state management |
| Maps | **MapLibre React Native** | Interactive maps |
| Local Storage | **Expo SQLite** | Offline rule/fine cache |
| Settings | **Async Storage** | User preferences persistence |
| Location | **Expo Location** | GPS for geofencing |
| Camera | **Expo Image Picker** | Challan/document photo capture |
| UI Icons | **@expo/vector-icons** (Ionicons) | Tab bar and UI icons |

---

## Project Structure

```
DriveLegal/
├── 📄 README.md                    # This file
├── 📄 .gitignore                   # Git ignore rules
│
├── 📂 backend/                     # FastAPI server
│   ├── 📄 main.py                  # App entry, routes, CORS
│   ├── 📄 requirements.txt         # Python dependencies
│   ├── 📄 .env.example             # Environment variable template
│   ├── 📄 __init__.py
│   │
│   ├── 📂 data/                    # Runtime data (auto-generated)
│   │   ├── 📄 fines.db             # SQLite fines database
│   │   ├── 📄 rules.json           # Traffic rules JSON
│   │   ├── 📂 zones/               # GeoJSON zone files
│   │   ├── 📂 vector_db/           # ChromaDB persistence
│   │   └── 📂 drivelegal_dataset/  # Extended KB dataset
│   │
│   ├── 📂 modules/
│   │   ├── 📂 agent/               # AI Agent system
│   │   │   ├── 📄 engine.py        # AgentEngine: Ollama/Gemini/fallback
│   │   │   ├── 📄 tools.py         # Tool definitions + ToolExecutor
│   │   │   └── 📄 normalize.py     # Input normalization maps
│   │   │
│   │   ├── 📂 nlp/                 # NLP & search
│   │   │   └── 📄 hybrid_search.py # ChromaDB + BM25 hybrid search
│   │   │
│   │   ├── 📂 fines/               # Fine lookup
│   │   │   └── 📄 lookup.py        # FineLookup (SQLite queries)
│   │   │
│   │   ├── 📂 rules/               # Rule loading
│   │   │   └── 📄 loader.py        # RulesLoader (JSON with state overrides)
│   │   │
│   │   ├── 📂 geofencing/          # GPS zone detection
│   │   │   ├── 📄 engine.py        # GeofencingEngine (Shapely)
│   │   │   └── 📄 offline_geocoder.py # Offline reverse geocoding
│   │   │
│   │   ├── 📂 sync/                # Mobile sync API
│   │   │   └── 📄 router.py        # /sync/* endpoints
│   │   │
│   │   └── 📂 response/            # (Reserved for response formatting)
│   │
│   ├── 📂 scripts/                 # DB seed & merge scripts
│   └── 📂 tests/                   # Backend test suite
│
├── 📂 mobile/                      # Expo / React Native app
│   ├── 📄 package.json             # Node dependencies
│   ├── 📄 app.json                 # Expo config
│   ├── 📄 tsconfig.json            # TypeScript config
│   ├── 📄 babel.config.js          # Babel config
│   ├── 📄 metro.config.js          # Metro bundler config
│   ├── 📄 .env.example             # Mobile env template
│   │
│   ├── 📂 app/                     # Expo Router pages
│   │   ├── 📄 _layout.tsx          # Root layout (providers)
│   │   ├── 📄 index.tsx            # Splash / entry redirect
│   │   ├── 📄 location.tsx         # Location permission screen
│   │   ├── 📄 sos.tsx              # SOS / emergency screen
│   │   ├── 📄 vehicle.tsx          # Vehicle management screen
│   │   │
│   │   ├── 📂 (tabs)/             # Tab navigation
│   │   │   ├── 📄 _layout.tsx      # Tab bar config
│   │   │   ├── 📄 index.tsx        # Home tab (dashboard)
│   │   │   ├── 📄 ask.tsx          # Ask AI tab (chat UI)
│   │   │   ├── 📄 fines.tsx        # Fines explorer tab
│   │   │   ├── 📂 zones/           # Rules/zones tab
│   │   │   └── 📂 settings/        # Settings tab
│   │   │
│   │   ├── 📂 components/          # Route-specific components
│   │   └── 📂 hooks/               # Route-specific hooks
│   │
│   ├── 📂 components/              # Shared UI components
│   │   ├── 📄 ChallanCalculator.tsx # Vehicle fine calculator
│   │   ├── 📄 FineCard.tsx         # Fine display card
│   │   ├── 📄 RuleCard.tsx         # Rule display card
│   │   ├── 📄 Sidebar.tsx          # Collapsible sidebar
│   │   ├── 📄 SidebarRail.tsx      # Sidebar rail (collapsed)
│   │   ├── 📄 Hamburger.tsx        # Hamburger menu button
│   │   └── 📄 OfflineBadge.tsx     # Offline status indicator
│   │
│   ├── 📂 hooks/                   # Shared React hooks
│   │   ├── 📄 useQuery.ts          # API query with GPS
│   │   ├── 📄 useLocalDB.ts        # SQLite local DB
│   │   ├── 📄 useSync.ts           # Backend sync
│   │   ├── 📄 useSettings.tsx      # Settings context + i18n
│   │   ├── 📄 useHistory.tsx       # Chat history context
│   │   └── 📄 useUI.tsx            # UI state
│   │
│   ├── 📂 lib/                     # Utility functions
│   │   ├── 📄 api.ts               # Backend URL resolution
│   │   ├── 📄 citations.ts         # Citation label builder
│   │   └── 📄 welcome.ts           # Welcome message generator
│   │
│   ├── 📂 local_db/                # SQLite schema
│   │   └── 📄 schema.sql           # Table definitions
│   │
│   └── 📂 assets/                  # Static assets
│
├── 📂 scraper/                     # Data collection
│   ├── 📄 scrape_fines.py          # Playwright scraper
│   └── 📄 sources.json             # Scraping source config
│
└── 📂 scripts/                     # Dev automation
    ├── 📄 start-dev.ps1            # Start backend + Expo
    └── 📄 start-everywhere.ps1     # Start for all platforms
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Python** | 3.10+ | Backend server |
| **Node.js** | 18+ | Mobile app |
| **Ollama** | Latest | Local AI inference |
| **Git** | Latest | Version control |
| **Expo CLI** | Latest | Mobile dev server (`npx expo`) |

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Dakshankarthic/Drive.git
cd Drive

# 2. Create and activate a virtual environment
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment variables
copy .env.example .env
# Edit .env with your GEMINI_API_KEY (optional)

# 5. Pull an Ollama model (choose one)
ollama pull qwen2.5-coder:7b       # Good for tool calling
ollama pull llama3.2-vision         # Adds image analysis support

# 6. (Optional) Pull embedding model for RAG
ollama pull nomic-embed-text

# 7. Start the backend
python main.py
# Server runs at http://0.0.0.0:8000
# Docs at http://127.0.0.1:8000/docs
```

### Mobile Setup

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install Node.js dependencies
npm install

# 3. Configure backend URL (for physical device testing)
copy .env.example .env
# Set EXPO_PUBLIC_API_HOST to your PC's LAN IP

# 4. Start Expo dev server
npx expo start

# Or run on specific platform
npx expo start --web       # Web browser
npx expo start --android   # Android device/emulator
npx expo start --ios       # iOS simulator (macOS only)
```

### Quick Start (PowerShell)

The project includes a one-command startup script for Windows:

```powershell
.\scripts\start-dev.ps1
```

This script:
1. Checks if Ollama is available
2. Creates `fines.db` if it doesn't exist
3. Kills stale processes on port 8000
4. Launches the FastAPI backend in a new window
5. Launches Expo web in a new window

After startup:
- **App**: http://localhost:8081
- **API Docs**: http://127.0.0.1:8000/docs
- **Health Check**: http://127.0.0.1:8000/health

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434/v1` | Ollama OpenAI-compatible API endpoint |
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` | Ollama model for chat + tool calling |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Ollama model for vector embeddings |
| `GEMINI_API_KEY` | *(none)* | Google Gemini API key (cloud fallback) |
| `PORT` | `8000` | Backend server port |

### Mobile (`mobile/.env`)

| Variable | Default | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | *(none)* | Full backend URL override |
| `EXPO_PUBLIC_API_HOST` | *(none)* | Backend host IP (for physical device testing) |
| `EXPO_PUBLIC_API_PORT` | `8000` | Backend port |

---

## Backend Documentation

### API Reference

#### `GET /`
Root endpoint. Returns welcome message and useful links.

```json
{
  "message": "Welcome to DriveLegal API",
  "docs": "/docs",
  "health": "/health",
  "status": "online"
}
```

---

#### `POST /query`
**Main AI agent endpoint.** Sends a user question to the agentic AI engine.

**Request Body:**
```json
{
  "text": "What is the fine for no helmet in Tamil Nadu?",
  "gps": { "lat": 13.0827, "lon": 80.2707 },
  "image_base64": null,
  "image_mime": "image/jpeg",
  "history": [
    { "role": "user", "parts": ["previous question"] },
    { "role": "model", "parts": ["previous answer"] }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | ✅ | User's natural language query |
| `gps` | `{lat, lon}` | ❌ | GPS coordinates for location-aware queries |
| `image_base64` | `string` | ❌ | Base64-encoded image (challan photo, etc.) |
| `image_mime` | `string` | ❌ | Image MIME type (default: `image/jpeg`) |
| `history` | `array` | ❌ | Conversation history for multi-turn context |

**Response:**
```json
{
  "status": "ok",
  "response": "**SHORT ANSWER:** Yes, there is a fine for riding without a helmet in Tamil Nadu.\n\n**CONSEQUENCES & REQUIREMENTS:** You will be stopped by traffic police and required to pay a fine. Both rider and pillion must wear helmets.\n\n**IMPORTANT FACTS:** Always ensure your helmet has an ISI MARK.\n\n**FINE SECTION:**\n- First offence: ₹1,000\n- Repeat offence: ₹1,000\n- Action: License may be suspended for up to 3 months.\n\n**SOURCE:** Based on Motor Vehicles Act 1988, Section 194D.",
  "tools_used": [
    {
      "tool": "lookup_fine",
      "params": { "offence_type": "NO_HELMET", "vehicle_class": "TWO_WHEELER", "state": "TN" },
      "result": { "found": true, "amount_inr": 1000, "section_ref": "194D" }
    }
  ],
  "citations": ["194D: ₹1000 (local fines.db, updated 2024-04-16)"],
  "agent_powered": true,
  "model": "ollama/qwen2.5-coder:7b"
}
```

---

#### `POST /challan/calculate`
Look up pending challans by vehicle registration number. Currently uses demo data.

**Request Body:**
```json
{ "vehicle_number": "TN01AB1234" }
```

**Response:**
```json
{
  "demo": true,
  "demo_notice": "Demo sample data only…",
  "vehicle_number": "TN01AB1234",
  "owner": "J*** S***",
  "vehicle_type": "Motor Car (LMV)",
  "pending_challans": [
    { "date": "2024-03-15", "violation": "Over Speeding", "amount": 1000, "status": "Pending", "location": "Anna Salai, Chennai" }
  ],
  "total_fine": 1000,
  "last_updated": "2026-05-27T22:00:00"
}
```

---

#### `GET /health`
Returns server status, active AI model, and data freshness.

```json
{
  "status": "ok",
  "agent_mode": "ollama/qwen2.5-coder:7b",
  "db_age": "last updated 3 days ago",
  "rules_count": 42,
  "chat_handler": "v3-memory"
}
```

---

#### `GET /sync/fines`
Returns all fines or changed fines since a given timestamp.

| Query Param | Type | Description |
|---|---|---|
| `since` | `string` (ISO timestamp) | Only return fines updated after this time |

---

#### `GET /sync/rules`
Returns all rules if the `rules.json` file has been modified since the given timestamp.

| Query Param | Type | Description |
|---|---|---|
| `since` | `string` (ISO timestamp) | Only return if rules changed since this time |

---

#### `GET /sync/zones`
Returns zone GeoJSON for requested Indian states.

| Query Param | Type | Description |
|---|---|---|
| `states` | `string` | Comma-separated state codes (e.g., `TN,DL,MH`) |

---

#### `GET /sync/status`
Returns data counts and last scrape timestamp.

```json
{
  "fines_count": 245,
  "rules_count": 42,
  "zones_count": 15,
  "last_scraped_at": "2024-04-16T10:30:00"
}
```

---

### Agent Engine

**File:** `backend/modules/agent/engine.py`

The `AgentEngine` is the core AI orchestrator. It follows a priority chain:

```
1. Ollama (local)  →  2. Gemini (cloud)  →  3. Keyword Fallback
```

#### Class: `AgentEngine`

| Method | Description |
|---|---|
| `run(user_text, history, gps, image_base64, image_mime)` | Main entry point. Routes to Ollama, Gemini, or fallback |
| `_run_ollama(...)` | OpenAI-compatible agentic loop with tool calling (up to 5 iterations) |
| `_run_gemini(...)` | Google Gemini SDK agentic loop with function calling |
| `_keyword_fallback(text, gps)` | No-LLM fallback using keyword detection + tool execution |

#### Agentic Loop

The engine supports up to **5 tool-calling iterations** per query:

1. User message + system prompt sent to LLM with tool definitions
2. LLM decides to call one or more tools (e.g., `lookup_fine`)
3. Tools are executed against real databases
4. Results are fed back to the LLM
5. LLM synthesizes a final natural-language answer

#### Special Handling

- **Qwen3 models**: Automatically appends `/no_think` to disable thinking mode tags
- **Vision models**: Disables native tool calls; uses manual JSON-based tool calling
- **Follow-up detection**: Recognizes "5th time?" as a repeat-offence follow-up
- **Conversational fast-path**: Greetings, fillers ("ok", "thanks") bypass tool calling entirely
- **Thinking tag stripping**: Removes `<thought>`, `<think>`, `<reasoning>` blocks from output

---

### Tool System

**File:** `backend/modules/agent/tools.py`

#### Available Tools

| Tool | Parameters | Data Source | Description |
|---|---|---|---|
| `lookup_fine` | `offence_type`, `vehicle_class`, `state`, `country`, `is_repeat` | SQLite `fines.db` | Look up exact fine amounts |
| `lookup_rule` | `offence_type`, `state` | `rules.json` | Get legal section + description |
| `check_zone` | `lat`, `lon` | GeoJSON files | Check traffic zone restrictions at GPS location |
| `search_rules` | `keywords[]` | `rules.json` | Full-text keyword search across all rules |

#### Class: `ToolExecutor`

The `ToolExecutor` bridges AI tool calls to backend modules:

```python
executor.execute("lookup_fine", {"offence_type": "no helmet", "vehicle_class": "2W", "state": "Tamil Nadu"}, gps)
# → Normalizes inputs → Queries SQLite → Returns structured result
```

Each tool handler:
1. **Normalizes** inputs via `normalize.py` (e.g., "no helmet" → `NO_HELMET`)
2. **Queries** the appropriate data source
3. **Returns** a structured dict (always includes `found: bool`)
4. On no exact match, returns **similar entries** as soft fallback

---

### NLP / Hybrid Search

**File:** `backend/modules/nlp/hybrid_search.py`

The `HybridSearch` engine combines two search strategies:

| Strategy | Technology | Strength |
|---|---|---|
| **Vector Search** | ChromaDB + Ollama embeddings (nomic-embed-text) | Semantic similarity |
| **Lexical Search** | BM25Okapi | Exact keyword matching |

#### Indexed Corpora

1. **`rules.json`** — Motor Vehicles Act rules (title, description, section, tags)
2. **DriveLegalKB violations** — Extended violation knowledge chunks
3. **DriveLegalKB FAQs** — Common traffic law Q&A

#### Search Algorithm

```
query → Vector search (ChromaDB) → ranked results (1/rank scoring)
                                ↘
                              merge
                                ↗
query → BM25 search           → scored results (normalized BM25)

Combined results sorted by (vector_score + 0.3 × bm25_score) → top_k
```

**Graceful degradation:**
- If Ollama embeddings unavailable → BM25-only fallback
- If ChromaDB empty → rebuilds index on startup
- If both fail → keyword fallback in agent engine

---

### Fines Module

**File:** `backend/modules/fines/lookup.py`

#### Class: `FineLookup`

Wraps a SQLite database containing traffic fine records.

| Method | Description |
|---|---|
| `query(offence_code, vehicle_class, state, repeat, country)` | Look up a specific fine. Prioritizes state-specific over `ALL` |
| `query_by_section(section_ref)` | Search fines by legal section reference |
| `get_db_age()` | Human-readable "last updated X days ago" |
| `get_changes(since)` | All fines modified after ISO timestamp |
| `get_all(country)` | All fines, optionally filtered by country |
| `get_count()` | Total number of fine records |

#### Query Priority

```
1. Exact match: offence_code + vehicle_class + state + country
2. Fallback: offence_code + vehicle_class + state='ALL' + country
3. Fallback: offence_code + any vehicle_class (if GENERAL)
```

If `repeat=True` and a `repeat_amount_inr` exists, the repeat amount is returned instead.

---

### Rules Module

**File:** `backend/modules/rules/loader.py`

#### Class: `RulesLoader`

Loads and indexes `rules.json`, providing lookup by rule ID, offence code, or keyword search.

| Method | Description |
|---|---|
| `get_by_rule_id(rule_id)` | Exact rule ID lookup |
| `get_by_offence_code(offence_code, state)` | Find rule by offence, with state override support |
| `search(query_tokens)` | Full-text token search across title + description |
| `get_state_override(rule_id, state)` | Get state-specific rule override |

#### State Override System

Rules can have state-specific overrides stored within the rule object:

```json
{
  "rule_id": "R001",
  "title": "Helmet Mandatory",
  "description": "National baseline…",
  "state_overrides": [
    { "state": "Tamil Nadu", "description": "TN-specific enforcement…" }
  ]
}
```

When a state is specified, the loader checks for an override first, merging it with the base rule.

---

### Geofencing Module

**File:** `backend/modules/geofencing/engine.py`

#### Class: `GeofencingEngine`

Loads GeoJSON files from the `zones/` directory and performs point-in-polygon checks using Shapely.

| Method | Description |
|---|---|
| `detect_zones(lat, lon)` | Find all zones containing the GPS point |
| `is_in_zone(lat, lon, zone_type)` | Check if point is in a specific zone type |
| `get_applicable_rules(lat, lon, current_time)` | Get active zones considering time-of-day rules |

#### Zone Properties

Each GeoJSON feature has properties:

```json
{
  "name": "Anna University School Zone",
  "zone_type": "school_zone",
  "active_hours": "07:00-16:00",
  "rules": ["Speed limit: 25 km/h", "No honking"]
}
```

`active_hours` supports `"ALL"` (always active) or `"HH:MM-HH:MM"` ranges (including overnight).

---

### Normalization Layer

**File:** `backend/modules/agent/normalize.py`

Maps free-text AI inputs to standardized database keys:

| Normalizer | Example Input | Output |
|---|---|---|
| `normalize_offence_code()` | `"no helmet"` | `NO_HELMET` |
| `normalize_vehicle_class()` | `"bike"` | `TWO_WHEELER` |
| `normalize_state()` | `"Tamil Nadu"` | `TN` |
| `detect_country()` | `"Dubai"` | `AE` |
| `detect_country_and_state()` | `"California"` | `("US", "CALIFORNIA")` |
| `get_currency_symbol()` | `"AE"` | `AED ` |
| `get_currency_code()` | `"GB"` | `GBP` |

#### Supported Country Codes

| Code | Country | Currency | Symbol |
|---|---|---|---|
| `IN` | India | INR | ₹ |
| `AE` | UAE / Dubai | AED | AED |
| `GB` | United Kingdom | GBP | £ |
| `US` | United States | USD | $ |
| `SG` | Singapore | SGD | S$ |
| `SA` | Saudi Arabia | SAR | SAR |

---

### Sync Module

**File:** `backend/modules/sync/router.py`

Provides REST endpoints for the mobile app to sync its local SQLite database with the backend:

| Endpoint | Method | Description |
|---|---|---|
| `/sync/fines` | GET | Delta or full sync of fine records |
| `/sync/rules` | GET | Full rules if modified since timestamp |
| `/sync/zones` | GET | GeoJSON for requested states |
| `/sync/status` | GET | Data counts + last scrape timestamp |

---

## Mobile Documentation

### App Screens

| Tab | Screen | File | Description |
|---|---|---|---|
| 🏠 Home | Dashboard | `app/(tabs)/index.tsx` | Location card, quick actions, daily brief |
| 💬 Ask | AI Chat | `app/(tabs)/ask.tsx` | Multi-turn chat with AI agent, voice input, image upload |
| 📄 Fines | Explorer | `app/(tabs)/fines.tsx` | Browse/search fine amounts |
| 📖 Rules | Rules & Zones | `app/(tabs)/zones/` | Traffic rules browser, zone map |
| 👤 You | Settings | `app/(tabs)/settings/` | Profile, language, vehicles, offline pack |

#### Additional Screens (Non-tab)

| Screen | File | Description |
|---|---|---|
| Location | `app/location.tsx` | Location permission request |
| SOS | `app/sos.tsx` | Emergency / roadside help |
| Vehicle | `app/vehicle.tsx` | Vehicle management |

---

### Custom Hooks

#### `useQuery` — Backend API Communication

**File:** `mobile/hooks/useQuery.ts`

Manages HTTP communication with the FastAPI backend, including GPS injection.

```typescript
const { data, isLoading, isOffline, error, submitQuery } = useQuery();

// Submit a query with optional history and image attachment
await submitQuery(
  "fine for drunk driving in Delhi",
  chatHistory,
  { imageBase64: "...", imageMime: "image/jpeg" }
);
```

Features:
- Automatic GPS coordinate injection (if permission granted)
- 120-second timeout with abort controller
- Offline detection and error messaging
- Supports image attachments (Base64)

---

#### `useLocalDB` — Offline SQLite Database

**File:** `mobile/hooks/useLocalDB.ts`

Provides offline-first access to fines, rules, and zones via Expo SQLite.

```typescript
const { queryFine, queryRule, getZonesForPoint, initialized } = useLocalDB();

const fine = await queryFine("NO_HELMET", "TWO_WHEELER", "TN");
const zones = await getZonesForPoint(13.0827, 80.2707);
```

Features:
- Auto-initializes schema on first use
- Client-side point-in-polygon for zone detection (pure JS, no Shapely needed)
- Web platform fallback (SQLite unavailable → returns null)

---

#### `useSync` — Backend Synchronization

**File:** `mobile/hooks/useSync.ts`

Manages syncing the local SQLite database with the backend API.

```typescript
const { isSyncing, syncStatus, triggerSync, clearCache } = useSync();
```

---

#### `useSettings` — User Preferences & i18n

**File:** `mobile/hooks/useSettings.tsx`

React Context provider for user settings, language, and translations.

```typescript
const { language, setLanguage, profile, updateProfile, t } = useSettings();

// Translate a key
const label = t('helmet');        // "HELMET" or "தலைக்கவசம்" (Tamil)
const greeting = t('greeting');   // "GOOD MORNING, {name}" (auto-filled)
```

Persists to Async Storage:
- Language preference (`en` | `ta` | `hi` | `te`)
- User profile (name, avatar, driving since)
- Notification preferences
- Selected vehicle

---

#### `useHistory` — Chat Session History

**File:** `mobile/hooks/useHistory.tsx`

React Context provider for managing chat session history.

```typescript
const { sessions, addSession, deleteSession, renameSession, toggleStar, clearHistory } = useHistory();
```

Features:
- Stores up to 20 sessions in Async Storage
- Star/unstar sessions
- Deduplicates by query text
- Auto-persists on every change

---

#### `useUI` — UI State

**File:** `mobile/hooks/useUI.tsx`

Manages transient UI state (sidebar visibility, etc.).

---

### Components

| Component | File | Description |
|---|---|---|
| `ChallanCalculator` | `components/ChallanCalculator.tsx` | Vehicle registration input + fine calculation result display |
| `FineCard` | `components/FineCard.tsx` | Card displaying fine amount, section, and vehicle type |
| `RuleCard` | `components/RuleCard.tsx` | Card displaying rule title, section, and description |
| `Sidebar` | `components/Sidebar.tsx` | Collapsible sidebar with chat history, search, and settings links |
| `SidebarRail` | `components/SidebarRail.tsx` | Collapsed sidebar rail with icons |
| `Hamburger` | `components/Hamburger.tsx` | Hamburger menu toggle button |
| `OfflineBadge` | `components/OfflineBadge.tsx` | Badge showing offline status |

---

### Local Database

**File:** `mobile/local_db/schema.sql`

The mobile app uses an on-device SQLite database for offline access:

```sql
-- Fine records synced from backend
CREATE TABLE fines (
  id INTEGER PRIMARY KEY,
  offence_code TEXT NOT NULL,
  vehicle_class TEXT NOT NULL,
  state TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  repeat_amount_inr INTEGER,
  section_ref TEXT,
  source_url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  version_hash TEXT NOT NULL UNIQUE
);

-- Traffic rules synced from backend
CREATE TABLE rules (
  rule_id TEXT PRIMARY KEY,
  section TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'ALL',
  raw_json TEXT NOT NULL
);

-- GeoJSON zones for offline geofencing
CREATE TABLE zones (
  zone_id TEXT PRIMARY KEY,
  zone_type TEXT NOT NULL,
  state TEXT NOT NULL,
  rule_set_id TEXT,
  geometry_json TEXT NOT NULL,
  fine_multiplier REAL DEFAULT 1.0
);

-- Sync audit log
CREATE TABLE sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  synced_at TEXT NOT NULL,
  module TEXT NOT NULL,
  rows_updated INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  error TEXT
);
```

---

### Utilities

#### API Base URL Resolution (`lib/api.ts`)

Automatically determines the correct backend URL based on platform and environment:

```
Priority:
1. EXPO_PUBLIC_API_URL      (full URL override)
2. EXPO_PUBLIC_API_HOST      (LAN IP for physical device)
3. Expo debugger host URI    (same machine / LAN)
4. 10.0.2.2 (Android emulator)
5. 127.0.0.1 (web fallback)
```

#### Citation Builder (`lib/citations.ts`)

Builds trust-footer labels shown under AI answers:

```
Source: 194D · ₹1000 from DriveLegal DB (16 Apr 2024)
```

#### Welcome Message (`lib/welcome.ts`)

Generates personalized welcome messages and suggestion chips:

```
Hi Dakshan 👋 I'm your DriveLegal assistant…

Suggestions:
• "What's the fine for no helmet in Tamil Nadu?"
• "Is drunk driving a criminal offence?"
• "What rules apply at my location?"
```

---

## Data Pipeline

### Web Scraper

**File:** `scraper/scrape_fines.py`

Automated data collection from government websites using Playwright:

```
sources.json → Playwright (headless Chromium) → Parse HTML tables
     → Normalize offence/vehicle/amount → Upsert to fines.db
```

#### How It Works

1. Reads source URLs from `sources.json`
2. Launches headless Chromium via Playwright
3. Navigates to each source and extracts `<table>` elements
4. Heuristically maps column headers to fields (`offence_code`, `amount_inr`, `section_ref`, `vehicle_class`)
5. Generates a `version_hash` (SHA-256 of offence + class + state + amount)
6. Upserts into SQLite: inserts new records, updates changed amounts
7. Logs each scrape to `sync_log` table

#### Running the Scraper

```bash
cd scraper
python scrape_fines.py
```

### Data Sources

**File:** `scraper/sources.json`

```json
{
  "sources": [
    {
      "state": "ALL",
      "name": "Parivahan Sewa",
      "url": "https://parivahan.gov.in/parivahan//en/content/mvd-fines",
      "type": "table",
      "enabled": true
    },
    {
      "state": "TN",
      "name": "Tamil Nadu Transport",
      "url": "https://tnsta.gov.in/transport/compounding.do",
      "type": "table",
      "enabled": true
    }
  ]
}
```

### Database Schema

The backend `fines.db` (SQLite) contains:

| Table | Description |
|---|---|
| `fines` | Traffic fine amounts with offence code, vehicle class, state, country, section reference, and source URL |
| `sync_log` | Scraping audit trail (source, status, rows inserted/updated) |

---

## Multi-Country Support

DriveLegal supports traffic laws across six countries:

| Country | States/Regions | Legal Framework | Currency |
|---|---|---|---|
| 🇮🇳 India | TN, DL, MH, KA, KL, AP, TS, WB, GJ, RJ, UP, PB, HR, OR, BR, MP | Motor Vehicles Act 1988 | ₹ INR |
| 🇦🇪 UAE | Dubai, Abu Dhabi | Federal Traffic Law + Black Points | AED |
| 🇬🇧 UK | National | Road Traffic Act 1988, Fixed Penalty Notices | £ GBP |
| 🇺🇸 USA | California, New York, Texas | Federal + State traffic codes | $ USD |
| 🇸🇬 Singapore | National | Road Traffic Act, Demerit Points | S$ SGD |
| 🇸🇦 Saudi Arabia | National | Moroor traffic fine schedule | SAR |

The agent detects country from natural language (e.g., "Dubai", "UK", "California") and uses the correct country code for database lookups and currency display.

---

## Internationalization (i18n)

The mobile app supports four languages via the `useSettings` hook:

| Code | Language | Script |
|---|---|---|
| `en` | English | Latin |
| `ta` | Tamil | தமிழ் |
| `hi` | Hindi | हिन्दी |
| `te` | Telugu | తెలుగు |

Translations are stored in `hooks/useSettings.tsx` as a flat key-value map covering:
- Tab labels (Home, Ask, Fines, Rules, You)
- Home screen elements (greeting, speed, zone labels)
- Settings labels (profile, language, vehicles, notifications)
- AI assistant labels (name, status, input placeholder)

Language preference persists across sessions via Async Storage.

---

## Deployment

### Production Considerations

- **CORS**: Tighten `allow_origins` in `main.py` from `["*"]` to your specific domains
- **Challan API**: Replace mock challan data with real Parivahan / eChallan integration
- **HTTPS**: Deploy behind a reverse proxy (nginx/Caddy) with TLS
- **Ollama**: Consider GPU-accelerated hosting for faster inference
- **Database**: For high traffic, migrate from SQLite to PostgreSQL
- **Scraper**: Schedule periodic runs (cron) to keep fine data current
- **Mobile**: Build APK/AAB via EAS Build (`eas build --platform android`)

### Minimum Hardware (Backend)

| Component | Requirement |
|---|---|
| RAM | 8 GB (16 GB recommended for 7B models) |
| CPU | 4 cores |
| GPU | Optional (speeds up Ollama inference significantly) |
| Storage | 10 GB (model weights + database) |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** changes: `git commit -m 'Add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript**: Strict mode, prefer `const`, use interfaces
- **Git**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)

### Adding a New Tool

1. Define the tool in `TOOL_DEFINITIONS` in `backend/modules/agent/tools.py`
2. Add a handler method `_my_tool()` in `ToolExecutor`
3. Register it in the `handlers` dict inside `execute()`
4. The agent will automatically discover and use the new tool

### Adding a New Country

1. Add offence aliases in `normalize.py` → `COUNTRY_ALIASES`
2. Add state mappings in `normalize.py` → `STATE_MAP`
3. Add currency in `normalize.py` → `CURRENCY_MAP` and `CURRENCY_SYMBOL`
4. Insert fine data into `fines.db` with the correct `country` code
5. Add rules to `rules.json` if applicable

---

## Disclaimer

> **DriveLegal is an educational and informational tool.** It does not constitute official legal advice. Fine amounts, sections, and regulations are sourced from publicly available government data and may not reflect the latest amendments. Always consult official sources ([parivahan.gov.in](https://parivahan.gov.in), [echallan.parivahan.gov.in](https://echallan.parivahan.gov.in)) or a legal professional for official interpretations of traffic laws.

<div align="center">
  <br />
  <p><strong>Developed to make roads safer and laws more accessible.</strong></p>
  <p>Built with ❤️ by <a href="https://github.com/Dakshankarthic">Dakshan Karthic</a></p>
</div>
