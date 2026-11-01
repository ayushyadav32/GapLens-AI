# GapLens AI — Digital Dark Spot Intelligence Engine

> **"Intelligence begins where information ends."**
>
> *Shinchan Online Hackathon 2026 — Track: Digital Dark Spot Intelligence & Automated Research Verification*

---

## 📌 Executive Summary

Modern Large Language Models (LLMs) and search aggregators are trained to synthesize and summarize what is *present* in text. However, critical decisions in public policy, statutory compliance, scientific research, and financial risk fail because of what is **absent, contradictory, or silently out of date**.

**GapLens AI** is a purpose-built research intelligence platform that exposes the **Digital Dark Spot**. Instead of producing generic conversational summaries, GapLens systematically:
1. **Decomposes** complex investigative inquiries into orthogonal analytical dimensions.
2. **Ingests & Normalizes** heterogeneous sources (PDFs, government URLs, regulatory circulars, statutory orders) with cryptographic SHA-256 fingerprinting and strict SSRF defenses.
3. **Extracts Verifiable Claims** tied to exact verbatim character-level offsets `[char_start:char_end]` and discrete document pages.
4. **Calculates Real Dynamic Coverage** without artificial score inflation, factoring subquestion resolution depth, claim confidence, and remaining unresolved contradictions.
5. **Surfaces Latent Information Gaps, Quantitative Contradictions & Temporal Staleness**.
6. **Enforces Evidence-Backed Gap Resolution** with an immutable, append-only audit trail.

---

## 🏗️ Architecture Overview

```
                                  GAPLENS AI ARCHITECTURE
  
       ┌────────────────────────────────────────────────────────────────────────┐
       │                       REACT 18 + TYPESCRIPT SPA                        │
       │  • Three.js 3D Evidence Core      • Dynamic Interactive Node Graph    │
       │  • Dark Cinematic Observatory UI  • Responsive Split-Screen Drawers    │
       │  • Lucide Iconography             • Recharts Visual Analytics          │
       └───────────────────────────────────┬────────────────────────────────────┘
                                           │ REST / JWT Auth
                                           ▼
       ┌────────────────────────────────────────────────────────────────────────┐
       │                     DJANGO REST FRAMEWORK BACKEND                      │
       │  • Ingestion & SSRF Sanitizer     • SHA-256 Document Fingerprinter     │
       │  • PyMuPDF Multi-Page Extraction  • Append-Only Audit Trail Security   │
       │  • Dynamic Coverage Calculator    • Contradiction Adjudication Engine  │
       └───────────────────────────────────┬────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   AI PROVIDER RUNTIME   │                   │    PERSISTENCE LAYER    │
       │ • Google Gemini Primary │                   │ • SQLite / PostgreSQL   │
       │ • Groq LLaMA Fallback   │                   │ • Strict Read-Only      │
       │ • Deterministic Semantic│                   │   Audit Model Log       │
       │   Fallback Engine       │                   │ • Source Document Pages │
       └─────────────────────────┘                   └─────────────────────────┘
```

---

## 🚀 Key Differentiators

| Feature | Ordinary AI Summarizers / Chatbots | GapLens AI |
| :--- | :--- | :--- |
| **Focus** | What is written in the prompt/doc | What is **missing, omitted, or unaddressed** |
| **Evidence Traceability** | Hallucinates or paraphrases quotes | **Exact character offsets** `[char_start:char_end]` verified against source text |
| **Contradiction Detection** | Merges or ignores conflicts | **Discrepancy engine** isolating quantitative variances (e.g., ₹8 LPA vs ₹6 LPA) |
| **Temporal Intelligence** | Blends outdated and recent data | **Flags stale directives** against current statutory timelines |
| **Coverage Calculation** | Arbitrary percentages or fixed 95% | **Dynamic multi-term formula**: $F_{\text{sub}}$ overlap, claim depth, contradiction penalties |
| **Gap Closure** | Passive question-answering | **Active resolution**: requires verified ingested evidence to close gaps |
| **Auditability** | Ephemeral chat sessions | **Append-only audit trail** protected against tampering or deletion |

---

## 📦 Quick Start & Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ & npm
- Git

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows (or: source venv/bin/activate on Linux/macOS)

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env    # Windows (or: cp .env.example .env on Linux/macOS)
# Add your GEMINI_API_KEY (optional, system includes deterministic semantic fallback)

# Run database migrations
python manage.py migrate

# Start backend server
python manage.py runserver
```
The Django backend runs at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
The React frontend runs at `http://localhost:5173`.

---

## 🧪 Automated Test Suites & Verification

GapLens AI includes 4 comprehensive automated test suites covering 28 end-to-end integration and security scenarios:

```bash
# 1. Ingestion, SSRF Prevention & PDF Extraction Tests (8 tests)
python backend/test_m4_ingestion.py

# 2. AI Intelligence Engine, Fallback & Decomposition Tests (7 tests)
python backend/test_m5_ai_engine.py

# 3. End-to-End Intelligence Experience & Gap Closure Tests (6 tests)
python backend/test_m6_end_to_end.py

# 4. Final Judge Audit, Dynamic Coverage & Append-Only Security (7 tests)
python backend/test_m7_final_audit.py
```

### Frontend Production Build
```bash
cd frontend
npm run build
```
Compiles cleanly via Vite with 0 TypeScript errors and strict chunk isolation.

---

## 🛡️ Security Architecture

1. **SSRF Attack Vector Immunity**:
   - Hostname blacklisting (`localhost`, `metadata.google.internal`, `instance-data`).
   - Resolution-time IP validation rejecting loopback (`127.0.0.1`), private networks (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`), link-local (`169.254.169.254`), and multicast ranges.
2. **File Ingestion Security**:
   - Magic byte header inspection (`%PDF-`).
   - Maximum upload ceiling (25 MB) and timeout bounding (10s).
   - BeautifulSoup script/iframe stripping and sanitization.
3. **Cryptographic Integrity**:
   - Every uploaded document is hashed using SHA-256 to prevent duplicate processing and guarantee provenance.
4. **Append-Only Audit Trail**:
   - `resolution_audit_trail` is declared strictly `read_only_fields` in DRF serializers.
   - Any external attempt to overwrite, forge, or wipe audit history via client mutation is blocked.

---

## 📑 Complete API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Register new user and issue JWT access/refresh tokens |
| `POST` | `/api/auth/login/` | Authenticate user and return JWT tokens |
| `GET` | `/api/auth/me/` | Fetch authenticated user profile |
| `GET` | `/api/research/dashboard-stats/` | Fetch real database statistics and recent investigation activity |
| `GET/POST`| `/api/research/sessions/` | List investigations or create a new research session |
| `GET` | `/api/research/sessions/<id>/` | Retrieve complete investigation details |
| `POST` | `/api/research/sessions/<id>/sources/` | Ingest URLs, PDFs, or manual text with SSRF validation |
| `POST` | `/api/research/sessions/<id>/analyze/` | Execute AI analysis pipeline (decomposition, claims, gaps) |
| `GET` | `/api/research/sessions/<id>/dimensions/` | List decomposed dimensions and dynamic coverage scores |
| `GET` | `/api/research/sessions/<id>/claims/` | List extracted claims with exact verbatim evidence quotes |
| `GET` | `/api/research/sessions/<id>/findings/` | List detected gaps, contradictions, and temporal staleness |
| `GET` | `/api/research/sessions/<id>/evidence-graph/` | Graph payload for React Flow visual knowledge network |
| `POST` | `/api/research/findings/<id>/resolve/` | Adjudicate contradiction or gap with disposition & audit log |
| `POST` | `/api/research/findings/<id>/resolve-with-evidence/` | Submit primary evidence to resolve gap and upgrade coverage |
| `GET` | `/api/research/sessions/<id>/report/` | Generate complete 10-section intelligence dossier |

---

## 🎬 3-Minute Demonstration Script

* **0:00 – 0:30 (The Problem: Digital Dark Spot)**:
  "Hello judges. In high-stakes research, what you don't know will hurt you. Traditional LLMs summarize whatever text you paste into them—often smoothing over contradictions and hallucinating missing details. GapLens AI is built specifically to find the Digital Dark Spot: the gaps, conflicts, and stale assumptions lurking between sources."
* **0:30 – 1:15 (Investigation Setup & Decomposition)**:
  "Let's create a live investigation: 'National Merit Scholarship Eligibility & Compliance Verification'. We submit our core inquiry. GapLens immediately decomposes this question into 6 orthogonal dimensions: Eligibility, Financial Ceilings, Application Deadlines, Renewal Obligations, Required Documentation, and Disqualifying Exclusions."
* **1:15 – 2:00 (Multi-Source Ingestion & Analysis)**:
  "We ingest 3 real documents: the Central Scheme 2026 Notification, a Regional State Directorate Circular, and an Archival 2023 Student Advisory. We trigger AI Analysis. Look at the Observatory:
  1. Under Contradictions, GapLens spots an immediate quantitative clash: the Central Ministry caps family income at ₹8,00,000, while the State Directorate strictly caps it at ₹6,00,000.
  2. Under Temporal Staleness, GapLens warns that the 2023 Advisory permitting paper dossiers is superseded by the 2026 digital-only mandate.
  3. Under Information Gaps, GapLens highlights that none of our initial sources specify the continuing renewal attendance benchmarks."
* **2:00 – 2:40 (Verbatim Traceability & Evidence-Backed Gap Closure)**:
  "Notice that every claim has a verified character-level quote slice and discrete page number—zero hallucination ambiguity. Now let's test our signature feature: Gap Closure with Evidence. An auditor cannot simply click 'Dismiss'. We submit the primary Statutory Gazette Addendum. GapLens parses the new evidence, verifies that it directly answers the missing dimension, automatically promotes coverage from 0% to Covered, and logs an immutable entry in the append-only audit trail."
* **2:40 – 3:00 (Export & Dossier)**:
  "Finally, we open the Intelligence Dossier: a 10-section audit-ready intelligence report complete with SHA-256 provenance hashes and verification sign-offs. GapLens turns unstructured, conflicting documents into rigorous, actionable intelligence."

---

## ⚖️ Hackathon Compliance & Integrity Notice

- **Exclusivity**: Developed strictly inside `GapLensAI`.
- **Honest AI Labeling**: AI outputs are transparently badged (`Exact quotation verified`, `Supporting evidence available`, `Potential conflict detected`, `AI interpretation requires verification`).
- **No Fabricated Evidence**: All test fixtures and demo workflows use genuine deterministic string matching and real regulatory clauses.
