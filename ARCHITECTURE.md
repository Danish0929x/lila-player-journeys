# Architecture

## What I built with, and why

A **Flask API + React/Canvas frontend**, deployed as a single Render service.

The parquet files pushed the backend to Python — pyarrow reads them natively, and pandas made the aggregation work cheap. The whole dataset is 89,104 rows across 1,243 files, which loads in **1.9s** and occupies **16MB** of RAM. That number decided the architecture: everything is parsed once at startup into an in-memory dict keyed by `match_id`. No database, no precompute step, no caching layer — they would all be machinery for a dataset that fits comfortably in RAM.

The frontend draws to a **Canvas** rather than SVG. A busy match is ~1,000 position samples across 16 players; as DOM nodes that stutters, on a canvas it is one cheap redraw per frame of playback.

Flask serves the built React bundle itself, so there is **one URL and no CORS** — an evaluator opens a link and the tool works.

## Data flow

```
data/February_*/{user_id}_{match_id}.nakama-0   (1,243 parquet files, one per player per match)
      │
      │  startup: pyarrow → pandas, decode event bytes → str,
      │  classify bot vs human from user_id, group files by match_id
      ▼
match_data_cache[match_id] = concat(all that match's player frames)
      │
      │  per request: world (x,z) → minimap pixels, ts → match-relative ms
      ▼
JSON  /api/match  ·  /api/timeline  ·  /api/heatmap
      │
      ▼
React state → Canvas: minimap image, then heatmap grid, then one path + markers per player
```

Playback is pure frontend. `/api/match` returns every event with a timestamp; the timeline holds a `playbackTime` in App state, and MapViewer filters each player's events to `timestamp <= playbackTime` before drawing. Scrubbing costs no network round-trips.

## Coordinate mapping

Each map has a `scale` and an `origin` that place the world onto a 1024×1024 minimap. The `y` column is elevation and is **not** used for 2D plotting — the ground plane is `(x, z)`.

```
u = (x - origin_x) / scale          # → 0..1
v = (z - origin_z) / scale
pixel_x = u * 1024
pixel_y = (1 - v) * 1024            # flipped: world +z goes up, image +y goes down
```

| Map | Scale | Origin X | Origin Z |
|---|---|---|---|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

The `1 - v` flip is the part that silently produces a plausible-but-wrong picture if you miss it — paths mirror vertically and still look like paths.

**I verified the mapping rather than assuming it.** Projecting all 89,104 rows through the transform put **every single one inside u,v ∈ [0,1]** — zero out-of-bounds on all three maps. A wrong scale or origin would have thrown points outside the image. Because nothing lands outside, the renderer needs no clamping.

The canvas renders at a fixed 1024×1024 and CSS scales it to a square box, so the aspect ratio is locked and event coordinates never need rescaling. Click hit-testing converts CSS pixels back into canvas space via `canvas.width / rect.width`.

## Assumptions and what the data actually did

**`ts` is epoch seconds stored in a millisecond column.** The schema says `timestamp[ms]` and the README says milliseconds, but the stored integers decode to `1970-01-21` — nonsense. Read as *seconds*, `1770754537` is February 2026, exactly when this data was captured. Reading them as seconds also makes match durations land at a realistic 6–8 minutes; reading them as milliseconds made a match 0.4 seconds long. I treat the raw integer as seconds and expose **match-relative** time (subtract the match's first event), so the timeline runs `0:00 → 8:42` instead of showing absolute epoch values.

**One file is one player, not one match.** `{user_id}_{match_id}` means a 16-player match is 16 files. They have to be concatenated on `match_id`, otherwise a match renders as a single lonely player and its kill/loot counts read zero.

**Bot detection is numeric vs UUID `user_id`**, per the README. `Position`/`BotPosition` corroborate it, and the two never disagreed in the data.

**The `event` column is bytes** and needs `.decode('utf-8')`; comparing it raw silently matches nothing.

**`KilledByStorm` is attributed to the player who died.** Kill-type events carry only one position, so the heatmap shows where the death happened, not where a shot came from.

**February 14 is a partial day** (37 matches vs 284 on Feb 10). It is left in and labelled, but it should not be read as a day-over-day drop.

## Trade-offs

| Decision | Alternative | Why this way |
|---|---|---|
| Load everything into RAM at startup | Database / lazy per-file reads | 16MB and 1.9s. A DB would be infrastructure with no payoff at this size. |
| Single Flask service serving the SPA | Vercel frontend + separate API | One URL, no CORS, one thing to deploy and keep alive. |
| Canvas | SVG / DOM markers | Thousands of points per match; SVG stutters during playback. |
| Playback filters client-side | Stream frames from the server | Scrubbing is instant; the match payload is small enough to hold. |
| Commit the 17MB dataset | External object storage | Makes the repo self-contained and the deploy reproducible with no credentials. |
| Heatmap is per-match, 16×16 | Aggregate across all matches | Ships the required feature; per-match is sparse, so cross-match aggregation is the clear next step (see INSIGHTS). |
| Downscale minimaps to 2048px | Ship originals | Rendered at 1024px, so it is visually free and saves 16MB of transfer. |

## Known limitations

- Heatmaps cover one match at a time; the level-design questions in INSIGHTS.md really want them aggregated across a whole map.
- Filters are map and date. Filtering by outcome (died to storm, high-kill matches) would target investigation better.
- Startup rescans the parquet on every boot. Fine at 1.9s; if the dataset grew 100×, this becomes a precompute step.
