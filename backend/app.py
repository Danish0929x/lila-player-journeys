import os
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from data_processor import DataProcessor
from dotenv import load_dotenv

load_dotenv()

# In production Flask also serves the built React app from frontend/dist
DIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
)

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')
CORS(app)

# Initialize data processor
data_dir = os.getenv('DATA_DIR', '../data')
processor = DataProcessor(data_dir)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/matches', methods=['GET'])
def get_matches():
    """Get list of all matches with metadata"""
    map_filter = request.args.get('map')
    date_filter = request.args.get('date')

    matches = processor.get_matches(map_filter=map_filter, date_filter=date_filter)
    return jsonify(matches)

@app.route('/api/match/<match_id>', methods=['GET'])
def get_match(match_id):
    """Get detailed data for a specific match"""
    match_data = processor.get_match_data(match_id)
    if match_data:
        return jsonify(match_data)
    return jsonify({'error': 'Match not found'}), 404

@app.route('/api/heatmap/<match_id>', methods=['GET'])
def get_heatmap(match_id):
    """Get heatmap data (kills, deaths, traffic) for a match"""
    event_type = request.args.get('type', 'traffic')  # traffic, kills, deaths
    heatmap_data = processor.get_heatmap(match_id, event_type)
    if heatmap_data:
        return jsonify(heatmap_data)
    return jsonify({'error': 'Heatmap not found'}), 404

@app.route('/api/maps', methods=['GET'])
def get_maps():
    """Get list of available maps and their config"""
    maps = processor.get_map_configs()
    return jsonify(maps)

@app.route('/api/minimap/<map_name>', methods=['GET'])
def get_minimap(map_name):
    """Serve minimap image"""
    minimap_files = {
        'AmbroseValley': 'AmbroseValley_Minimap.png',
        'GrandRift': 'GrandRift_Minimap.png',
        'Lockdown': 'Lockdown_Minimap.jpg'
    }

    if map_name not in minimap_files:
        return {'error': 'Map not found'}, 404

    minimap_path = os.path.join(processor.minimap_dir, minimap_files[map_name])
    if not os.path.exists(minimap_path):
        return {'error': 'Minimap file not found'}, 404

    return send_file(minimap_path, mimetype='image/png' if map_name != 'Lockdown' else 'image/jpeg')

@app.route('/api/timeline/<match_id>', methods=['GET'])
def get_timeline(match_id):
    """Get timeline events for playback"""
    timeline = processor.get_timeline(match_id)
    if timeline:
        return jsonify(timeline)
    return jsonify({'error': 'Timeline not found'}), 404

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """Serve the built React app; unknown paths fall back to index.html"""
    if path and os.path.exists(os.path.join(DIST_DIR, path)):
        return send_from_directory(DIST_DIR, path)
    index = os.path.join(DIST_DIR, 'index.html')
    if not os.path.exists(index):
        return jsonify({'error': 'Frontend not built. Run: npm run build'}), 404
    return send_from_directory(DIST_DIR, 'index.html')


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
