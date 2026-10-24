# Hisab-Kitab AI

Voice-first vernacular bill splitter. Upload a receipt, then split it by speaking Hindi, Hinglish, Gujarati, or English.

> *Bol ke bill baanto — Powered by Sarvam AI*

**Live demo:** http://161.118.188.165:8000

Try **Load Demo Bill**, then a chip like:

`Chai aur Maggi Rahul ke khate mein daal do`

## What it does

1. Scan a restaurant / canteen / cafe receipt (Sarvam Document AI OCR), or load a hostel canteen demo bill.
2. Speak or type a split command. Saaras transcribes it; Sarvam-105B decides *who pays for which item*.
3. Deterministic Python math applies tax proportionally. The model never calculates rupees.
4. Bulbul speaks a Devanagari confirmation back.

Example commands:

- `Chai aur Maggi Rahul ke khate mein daal do`
- `Paneer Paratha Aman aur Priya mein barabar baant do`
- `Baaki sab Rahul, Aman aur Priya mein equal split kar do`
- `Sab kuch reset kar do`

## Architecture

Service → Agent → Router. No database. Session state lives in memory.

```text
hisab-kitab/
├── backend/
│   ├── main.py                 # FastAPI routes + static UI
│   ├── config.py
│   ├── models/schemas.py
│   ├── state/session_store.py  # in-memory sessions
│   ├── services/sarvam_service.py
│   └── agents/
│       ├── prompts.py
│       ├── tools.py            # deterministic split math
│       └── split_agent.py
└── frontend/                   # Vite + React + Tailwind
```

**Sarvam APIs used (SDK only — `sarvamai` / `AsyncSarvamAI`):**

| Capability | Model / API |
|---|---|
| Receipt OCR | Document AI `doc_ai.extract` |
| Speech-to-text | `saaras:v4` (fallback `saaras:v3`) |
| Split agent | `sarvam-105b-conversations` |
| Text-to-speech | `bulbul:v4-flash` (fallback `bulbul:v3`) |

## Local setup

### 1. API key

Get a key from the [Sarvam dashboard](https://dashboard.sarvam.ai), then:

```bash
cp backend/.env.example backend/.env
```

Set:

```bash
SARVAM_API_KEY=your_key_here
```

Never commit `.env`.

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend (dev)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to the backend.

For production, build the UI and serve it from FastAPI:

```bash
cd frontend && npm run build
cd ../backend && .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/bill/demo` | Load hostel canteen demo bill |
| `POST` | `/api/bill/upload` | OCR a receipt image / PDF |
| `GET` | `/api/bill/{session_id}` | Current split state |
| `POST` | `/api/bill/{session_id}/voice` | STT + agent + TTS |
| `POST` | `/api/bill/{session_id}/text` | Typed / chip command + TTS |

## Guardrails

- The LLM only picks **item → people**. `agents/tools.py` owns all rupee and GST math.
- Hallucinated `item_id`s are ignored.
- `split_remaining` never overwrites items that already have owners.
- Ambiguous names (e.g. two kinds of Maggi) return `clarify` instead of guessing.

## License

Hackathon MVP. Sarvam API usage is subject to your Sarvam plan.
