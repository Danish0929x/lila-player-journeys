# LILA BLACK — Player Journey Visualization

Level Designers had telemetry but no way to look at it. This turns those parquet files into something you can actually open and explore: player paths drawn on the real minimap, markers where people looted and died, a scrubber to replay a match, and heatmaps to find where traffic piles up.

**Live:** https://lila-player-journeys.onrender.com

It's on Render's free tier, which puts the service to sleep after 15 minutes of no traffic. If you're the first visitor in a while, give it about 30 seconds to wake up. After that it's instant.

## What you can do with it

Everything below is on one screen — no navigation, no menus to hunt through.

**Pick a match.** The sidebar lists every match, filtered by map and date. Each row shows the date and how many humans and bots were in it, so you can spot the interesting ones (a match with 15 bots plays very differently from a solo run). The list opens on AmbroseValley with the first match already loaded, so you see something useful immediately instead of an empty screen. Hit **Hide** in the top-left to collapse the sidebar and give the map the full window.

**Read the paths.** Every player in the match gets their own line. Humans are blue, bots are orange, and there's a legend on the left so you don't have to remember which is which. A green dot marks where someone dropped in, red marks where their journey ended.

**See what happened where.** Events sit on top of the paths as coloured markers: red squares for kills, red circles for deaths, cyan for storm deaths, yellow for loot pickups. Because they're drawn at the exact spot they occurred, you can see things like a player looting a building three times before walking into an ambush.

**Follow one player.** Click any path to highlight it in white and see whose it is. Useful when a busy match turns into spaghetti.

**Watch it unfold.** The bar along the bottom replays the match. Press play and the paths draw themselves in real order, so you can see who moved where and when, and the kill/death/loot counters tick up as events happen. Matches run 6–12 minutes, so there's a speed selector — 30x by default, which replays a full match in about 20 seconds. Drag the scrubber to jump to any moment.

**Find the hotspots.** The **Heatmap** button overlays intensity on the map, and you can switch it between traffic, kills and deaths. Traffic shows the routes everyone takes; kills and deaths show where fights actually resolve.

## How it's built

React with Vite on the front, Flask on the back, deployed as a single service.

Python was the obvious call for the backend — the data is parquet, and pyarrow reads it natively. The whole dataset is 89,104 rows across 1,243 files, which parses in under two seconds and sits in 16MB of memory, so it all loads into memory at startup and stays there. No database, nothing to configure.

The map is a `<canvas>` rather than SVG. A busy match is around a thousand position samples across sixteen players, and as DOM nodes that stutters badly once playback starts. On a canvas it's one cheap redraw per frame.

Flask serves the compiled React app as well as the API, which is why there's one URL and no CORS setup. There's more on the reasoning, and on the coordinate mapping, in [ARCHITECTURE.md](ARCHITECTURE.md).

## Running it locally

You'll need two terminals. Start the backend first — the frontend proxies to it.

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Wait for `Loaded 796 matches`, which takes a couple of seconds. Then in the second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL it prints (http://localhost:5173). Vite forwards `/api/*` to port 5000, so both halves work together.

## Environment variables

There are only two, and both have defaults that already work:

- **`DATA_DIR`** (default `../data`) — where the telemetry lives, meaning the `February_*` folders and `minimaps/`. You'd only change this to point somewhere else.
- **`PORT`** (default `5000`) — Render sets this automatically, so you can ignore it locally.

Nothing is secret, so there's no `.env` to create. It runs as-is after a clone.

## Deploying

`render.yaml` is in the repo, so on Render it's New → Blueprint → pick the repo → Apply. If you're setting it up somewhere else, these are the commands that matter:

```
Build:  pip install -r backend/requirements.txt && npm --prefix frontend ci && npm --prefix frontend run build
Start:  gunicorn --chdir backend --timeout 120 app:app
Env:    DATA_DIR=../data
```

The build compiles React into `frontend/dist` and Flask serves it from there, so the whole thing is one process on one port.

The telemetry is committed in `data/` (~17MB), which means there's no bucket or database to set up — clone and run. The minimaps got downscaled to 2048px on the way in; the originals were up to 9000×9000, and since they're rendered at 1024px that's invisible on screen but cuts image transfer from 23MB to 6.5MB.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/matches?map=&date=` | Match list with player counts |
| `GET /api/match/<id>` | Every player's journey — path plus events |
| `GET /api/timeline/<id>` | All match events in time order, plus duration |
| `GET /api/heatmap/<id>?type=traffic\|kills\|deaths` | 16×16 normalised intensity grid |
| `GET /api/maps` | Scale and origin config per map |
| `GET /api/minimap/<map>` | Minimap image |
| `GET /api/health` | Health check |

## Also in this repo

- [ARCHITECTURE.md](ARCHITECTURE.md) — why it's built this way, how data flows from parquet to pixels, the coordinate mapping in detail, and what I assumed where the data was ambiguous
- [INSIGHTS.md](INSIGHTS.md) — three things the data turned up about how LILA BLACK is actually being played
