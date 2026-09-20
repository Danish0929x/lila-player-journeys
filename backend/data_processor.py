import os
import json
import pyarrow.parquet as pq
import pandas as pd
from pathlib import Path
from collections import defaultdict
from datetime import datetime

class DataProcessor:
    def __init__(self, data_dir):
        # Resolve data_dir to absolute path
        if not os.path.isabs(data_dir):
            data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), data_dir))

        self.data_dir = data_dir
        self.minimap_dir = os.path.join(data_dir, 'minimaps')

        # Map configuration: scale and origin for coordinate conversion
        self.map_config = {
            'AmbroseValley': {
                'scale': 900,
                'origin_x': -370,
                'origin_z': -473,
                'minimap': 'AmbroseValley_Minimap.png'
            },
            'GrandRift': {
                'scale': 581,
                'origin_x': -290,
                'origin_z': -290,
                'minimap': 'GrandRift_Minimap.png'
            },
            'Lockdown': {
                'scale': 1000,
                'origin_x': -500,
                'origin_z': -500,
                'minimap': 'Lockdown_Minimap.jpg'
            }
        }

        # Cache for loaded data
        self.matches_cache = None
        self.match_data_cache = {}

        # Load all data
        self._load_all_data()

    def _load_all_data(self):
        """Load and index all parquet files"""
        print("Loading all parquet files...")
        self.matches_cache = defaultdict(lambda: {
            'match_id': None,
            'map_id': None,
            'date': None,
            'human_players': set(),
            'bot_players': set(),
            'events': []
        })

        frames_by_match = defaultdict(list)

        # Iterate through all date folders
        for date_folder in sorted(os.listdir(self.data_dir)):
            if not date_folder.startswith('February_'):
                continue

            folder_path = os.path.join(self.data_dir, date_folder)
            if not os.path.isdir(folder_path):
                continue

            date_str = date_folder.replace('_', '-')  # Convert "February_10" to "February-10"

            for filename in os.listdir(folder_path):
                if not filename.endswith('.nakama-0'):
                    continue

                filepath = os.path.join(folder_path, filename)
                try:
                    # Parse filename: {user_id}_{match_id}.nakama-0
                    parts = filename.replace('.nakama-0', '').rsplit('_', 1)
                    if len(parts) != 2:
                        continue

                    user_id, match_id_raw = parts
                    match_id = f"{match_id_raw}.nakama-0"

                    # Read parquet file
                    table = pq.read_table(filepath)
                    df = table.to_pandas()

                    # Decode event column from bytes to string
                    df['event'] = df['event'].apply(
                        lambda x: x.decode('utf-8') if isinstance(x, bytes) else x
                    )

                    # Add to cache
                    if not df.empty:
                        map_id = df['map_id'].iloc[0]
                        self.matches_cache[match_id]['match_id'] = match_id
                        self.matches_cache[match_id]['map_id'] = map_id
                        self.matches_cache[match_id]['date'] = date_str

                        # Classify as human or bot
                        if self._is_bot(user_id):
                            self.matches_cache[match_id]['bot_players'].add(user_id)
                        else:
                            self.matches_cache[match_id]['human_players'].add(user_id)

                        # One file = one player, so a match spans many files
                        df['user_id_internal'] = user_id
                        frames_by_match[match_id].append(df)

                except Exception as e:
                    print(f"Error loading {filename}: {e}")
                    continue

        for match_id, frames in frames_by_match.items():
            self.match_data_cache[match_id] = pd.concat(frames, ignore_index=True)

        print(f"Loaded {len(self.matches_cache)} matches")

    def _is_bot(self, user_id):
        """Check if user_id is a bot (numeric) or human (UUID)"""
        try:
            int(user_id)
            return True
        except ValueError:
            return False

    def _world_to_minimap(self, x, z, map_id):
        """Convert world coordinates to minimap pixel coordinates"""
        if map_id not in self.map_config:
            return None

        config = self.map_config[map_id]
        scale = config['scale']
        origin_x = config['origin_x']
        origin_z = config['origin_z']

        # Convert world coords to UV (0-1 range)
        u = (x - origin_x) / scale
        v = (z - origin_z) / scale

        # Convert UV to pixel coords (1024x1024 image)
        pixel_x = u * 1024
        pixel_y = (1 - v) * 1024  # Y is flipped

        return {'x': pixel_x, 'y': pixel_y}

    def get_map_configs(self):
        """Return map configuration"""
        result = {}
        for map_name, config in self.map_config.items():
            result[map_name] = {
                'scale': config['scale'],
                'origin_x': config['origin_x'],
                'origin_z': config['origin_z'],
                'minimap_url': f'/api/minimap/{map_name}'
            }
        return result

    def get_matches(self, map_filter=None, date_filter=None):
        """Get list of matches with optional filtering"""
        matches = []
        for match_id, data in self.matches_cache.items():
            if map_filter and data['map_id'] != map_filter:
                continue
            if date_filter and data['date'] != date_filter:
                continue

            matches.append({
                'match_id': match_id,
                'map_id': data['map_id'],
                'date': data['date'],
                'human_players': len(data['human_players']),
                'bot_players': len(data['bot_players']),
                'total_players': len(data['human_players']) + len(data['bot_players'])
            })

        return sorted(matches, key=lambda x: x['date'], reverse=True)

    def _relative_ms(self, df):
        """
        Match-relative elapsed milliseconds for every row, as an int Series.

        The parquet column is typed timestamp[ms], but the stored integers are
        really epoch *seconds* (e.g. 1770754537 -> Feb 2026, when this data was
        captured). Read as ms they decode to a bogus 1970-01-21. So the raw
        integer is a seconds count: differences are seconds, and x1000 -> ms.
        """
        raw_seconds = df['ts'].astype('int64')  # datetime64[ms] -> underlying int
        return (raw_seconds - raw_seconds.min()) * 1000

    def get_match_data(self, match_id):
        """Get detailed data for a specific match"""
        if match_id not in self.match_data_cache:
            return None

        df = self.match_data_cache[match_id]
        rel_ms = self._relative_ms(df)

        # Group events by player
        players = defaultdict(list)
        for (_, row), ts in zip(df.iterrows(), rel_ms):
            user_id = row['user_id_internal']
            event_data = {
                'timestamp': int(ts),
                'event': row['event'],
                'position': self._world_to_minimap(row['x'], row['z'], row['map_id']),
                'elevation': float(row['y'])
            }
            players[user_id].append(event_data)

        # Convert to list format
        player_list = []
        for user_id, events in players.items():
            player_list.append({
                'user_id': user_id,
                'is_bot': self._is_bot(user_id),
                'events': sorted(events, key=lambda x: x['timestamp']),
                'map_id': df['map_id'].iloc[0]
            })

        return {
            'match_id': match_id,
            'players': player_list,
            'map_id': df['map_id'].iloc[0]
        }

    def get_timeline(self, match_id):
        """Get timeline events for playback"""
        if match_id not in self.match_data_cache:
            return None

        df = self.match_data_cache[match_id]
        # Same t=0 reference as get_match_data so filtering and scrubbing agree
        rel_ms = self._relative_ms(df)

        # Get all events sorted by timestamp
        events = []
        for (_, row), ts in zip(df.iterrows(), rel_ms):
            event = {
                'timestamp': int(ts),
                'user_id': row['user_id_internal'],
                'event_type': row['event'],
                'position': self._world_to_minimap(row['x'], row['z'], row['map_id']),
                'is_bot': self._is_bot(row['user_id_internal'])
            }
            events.append(event)

        return {
            'match_id': match_id,
            'events': sorted(events, key=lambda x: x['timestamp']),
            'duration': max([e['timestamp'] for e in events]) if events else 0
        }

    def get_heatmap(self, match_id, event_type='traffic'):
        """Generate heatmap data for a match"""
        if match_id not in self.match_data_cache:
            return None

        df = self.match_data_cache[match_id]
        map_id = df['map_id'].iloc[0]

        # Filter events based on type
        if event_type == 'kills':
            df_filtered = df[df['event'].isin(['Kill', 'BotKill'])]
        elif event_type == 'deaths':
            df_filtered = df[df['event'].isin(['Killed', 'BotKilled', 'KilledByStorm'])]
        else:  # traffic (all position events)
            df_filtered = df[df['event'].isin(['Position', 'BotPosition'])]

        # Create grid cells (16x16 grid on 1024x1024 minimap)
        grid_size = 64  # 1024 / 16
        heatmap = defaultdict(int)

        for _, row in df_filtered.iterrows():
            pixel_pos = self._world_to_minimap(row['x'], row['z'], map_id)
            if pixel_pos:
                grid_x = int(pixel_pos['x'] // grid_size)
                grid_y = int(pixel_pos['y'] // grid_size)
                heatmap[(grid_x, grid_y)] += 1

        # Normalize to 0-1
        max_count = max(heatmap.values()) if heatmap else 1
        heatmap_normalized = {
            f"{x},{y}": count / max_count for (x, y), count in heatmap.items()
        }

        return {
            'match_id': match_id,
            'event_type': event_type,
            'grid_size': grid_size,
            'heatmap': heatmap_normalized
        }
