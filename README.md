# LILA BLACK — Player Journey Visualization

A browser tool for Level Designers to see how players actually move through LILA BLACK maps: journey paths on the real minimap, kill/death/loot/storm markers, match playback, and heatmaps.

**Live:** https://lila-player-journeys.onrender.com

> Hosted on Render's free tier, which sleeps after 15 minutes idle — the first request may take ~30s to wake the service. Subsequent loads are immediate.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev loop, no framework overhead for a single-view tool |
| Rendering | HTML5 Canvas | Thousands of path points per match; SVG/DOM nodes would stall |
| Backend | Flask (Python) | Parquet lives in the Python ecosystem (pyarrow/pandas) |
| Data | pyarrow + pandas | Reads the `.nakama-0` parquet files directly |
| Hosting | Single Render web service | Flask serves both the API and the built React app — one URL, no CORS |

## Running locally

Two terminals. Backend first.

**Backend** (http://localhost:5000)
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Wait for `Loaded 796 matches` (~2s).

**Frontend** (http://localhost:5173)
```bash
cd frontend
npm install
npm run dev
```
Vite proxies `/api/*` to port 5000, so open the Vite URL.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATA_DIR` | `../data` | Path to the telemetry folder (the `February_*` dirs + `minimaps/`) |
| `PORT` | `5000` | Server port. Render sets this automatically. |

Only `DATA_DIR` matters for local use, and the default is already correct.

## Deploying

The repo deploys as **one service**: the build compiles React to `frontend/dist`, and Flask serves those static files alongside the API.

On Render, `render.yaml` is picked up automatically — connect the repo and deploy. The equivalent manual settings:

- **Build:** `pip install -r backend/requirements.txt && npm --prefix frontend ci && npm --prefix frontend run build`
- **Start:** `gunicorn --chdir backend --timeout 120 app:app`
- **Env:** `DATA_DIR=../data`

The telemetry lives in `data/` and is committed to the repo (~17MB), so there is no external storage or database to configure. Minimaps were downscaled to 2048px (from up to 9000×9000) — they render at 1024px, so this costs nothing visually and cuts image payload from 23MB to 6.5MB.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/matches?map=&date=` | Match list with player counts |
| `GET /api/match/<id>` | Every player's journey (path + events) |
| `GET /api/timeline/<id>` | All match events ordered by time, plus duration |
| `GET /api/heatmap/<id>?type=traffic\|kills\|deaths` | 16×16 normalised intensity grid |
| `GET /api/maps` | Scale/origin config per map |
| `GET /api/minimap/<map>` | Minimap image |
| `GET /api/health` | Health check |

## Docs

- [ARCHITECTURE.md](ARCHITECTURE.md) — design decisions, data flow, coordinate mapping, trade-offs
- [INSIGHTS.md](INSIGHTS.md) — three things the data revealed about the game
