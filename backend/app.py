import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from data_processor import DataProcessor
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize data processor
data_dir = os.getenv('DATA_DIR', '../lila/player_data')
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

@app.route('/api/timeline/<match_id>', methods=['GET'])
def get_timeline(match_id):
    """Get timeline events for playback"""
    timeline = processor.get_timeline(match_id)
    if timeline:
        return jsonify(timeline)
    return jsonify({'error': 'Timeline not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
