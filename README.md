# LILA BLACK - Player Journey Visualization Tool

A web-based visualization tool for exploring player behavior and movement patterns in LILA BLACK extraction shooter matches.

## Tech Stack

- **Frontend**: React 18 + Vite + Canvas API
- **Backend**: Flask (Python)
- **Data Processing**: PyArrow + Pandas
- **Styling**: CSS3 with CSS variables (dark theme)

## Project Structure

```
lila-visualization/
├── backend/           # Flask API server
│   ├── app.py        # Main Flask application
│   ├── data_processor.py  # Parquet parsing & data handling
│   ├── requirements.txt   # Python dependencies
│   └── .env          # Environment variables
├── frontend/         # React SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapViewer.jsx      # Canvas-based map visualization
│   │   │   ├── MatchFilter.jsx    # Filtering interface
│   │   │   └── Timeline.jsx       # Playback controls
│   │   ├── App.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── lila/player_data/  # Telemetry data (not in repo)
    ├── February_10/
    ├── February_11/
    ├── February_12/
    ├── February_13/
    ├── February_14/
    └── minimaps/
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create a Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Ensure `.env` is configured:
```
DATA_DIR=../lila/player_data
FLASK_ENV=development
FLASK_DEBUG=1
```

5. Run the Flask server:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will start on `http://localhost:5173` and proxy API calls to `http://localhost:5000`

## Features

### Core Features
- ✅ **Match Browser**: Filter and browse matches by map and date
- ✅ **Player Visualization**: Display player paths as lines on minimap with distinct colors for humans/bots
- ✅ **Event Markers**: Show kills, deaths, loot pickups, and storm deaths as distinct markers
- ✅ **Heatmaps**: Visualize traffic concentration, kill zones, and death zones
- ✅ **Timeline Playback**: Scrub through match events with play/pause controls
- ✅ **Player Selection**: Click on player paths to highlight and get more details

### Coordinate System
- World coordinates (x, z) are converted to minimap pixels using provided scale and origin values
- Y coordinate represents elevation (not used for 2D minimap plotting)
- Minimap images are 1024x1024 pixels

### Event Types
- **Movement**: Position (humans), BotPosition (bots)
- **Combat**: Kill, Killed, BotKill, BotKilled
- **Environment**: KilledByStorm
- **Items**: Loot

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/matches?map=<map>&date=<date>` - List matches with optional filters
- `GET /api/match/<match_id>` - Get detailed match data with all player journeys
- `GET /api/maps` - Get map configurations (scale, origin, minimap URLs)
- `GET /api/timeline/<match_id>` - Get ordered events for playback
- `GET /api/heatmap/<match_id>?type=<traffic|kills|deaths>` - Get heatmap data

## Environment Variables

### Backend
- `DATA_DIR` - Path to the player_data directory (default: `../lila/player_data`)
- `FLASK_ENV` - Set to `development` or `production`
- `FLASK_DEBUG` - Set to 1 for debug mode

## Known Limitations & Assumptions

1. **Minimap paths are relative** - The tool assumes `lila/player_data/minimaps/` exists relative to the backend
2. **Heatmap grid size** - 64x64 pixels (16x16 grid on 1024x1024 minimap) for performance
3. **Timestamp interpretation** - The `ts` column represents time within the match (in milliseconds), not wall-clock time
4. **File format** - Parquet files have no `.parquet` extension but are valid parquet files
5. **Bot detection** - Bots are identified by numeric user_id; humans have UUID user_ids

## Building for Production

### Backend
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend
```bash
npm run build
# Build output in dist/
```

Deploy the `frontend/dist/` folder to a static hosting service (Vercel, Netlify, etc.)

## Performance Notes

- The backend loads all parquet files on startup (takes ~30 seconds)
- Data is cached in memory for fast API responses
- Frontend uses Canvas API for efficient minimap rendering
- Heatmap computation is done server-side

## Future Improvements

- Stream data loading instead of loading all files at startup
- Add more sophisticated filtering (player name, kill count, etc.)
- Export player paths as CSV/GeoJSON
- Real-time match tracking
- 3D elevation visualization
