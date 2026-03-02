#!/usr/bin/env python3

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from word_search_generator import WordSearch
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 3000))

@app.route('/')
def index():
    return send_from_directory('src/public', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('src/public', filename)

@app.route('/generate', methods=['POST'])
def generate_puzzle():
    try:
        data = request.get_json()
        words_input = data.get('words', '')
        
        print(f'🔍 DEBUG - Raw request body: {json.dumps(data)}')
        print(f'🔍 DEBUG - Words received: {json.dumps(words_input)}')
        
        if not words_input or not words_input.strip():
            return jsonify({'error': 'Please provide a list of words'}), 400
        
        # Parse words from input - remove spaces from multi-word entries
        word_list = [
            word.strip().replace(' ', '') 
            for word in words_input.split('\n') 
            if word.strip()
        ]
        
        print(f'🔍 DEBUG - Parsed word list: {json.dumps(word_list)}')
        
        if len(word_list) < 3:
            return jsonify({'error': 'Please provide at least 3 words'}), 400
        
        # Create word search puzzle using the professional library
        puzzle = WordSearch(word_list)
        
        # Set difficulty level (3 = all 8 directions)
        puzzle.level = 3
        
        # Get the puzzle data
        puzzle_data = puzzle.puzzle
        grid_size = len(puzzle_data)
        
        # Convert puzzle grid to our expected format
        grid = []
        for row in puzzle_data:
            grid.append([cell.upper() for cell in row])
        
        # Get successfully placed words from the puzzle
        placed_words = []
        answer_key = puzzle.key
        
        for word_info in answer_key:
            word = word_info['word']
            start_coords = word_info['start_coordinates']  # (x, y) 1-based
            direction = word_info['direction']
            
            # Convert to our format with positions
            positions = []
            word_len = len(word)
            
            # Convert direction to deltas (the library uses different direction system)
            direction_deltas = {
                'E': (0, 1),   # East
                'SE': (1, 1),  # Southeast  
                'S': (1, 0),   # South
                'SW': (1, -1), # Southwest
                'W': (0, -1),  # West
                'NW': (-1, -1), # Northwest
                'N': (-1, 0),  # North
                'NE': (-1, 1)  # Northeast
            }
            
            if direction in direction_deltas:
                delta_row, delta_col = direction_deltas[direction]
                # Convert from 1-based to 0-based coordinates
                start_row = start_coords[1] - 1  # y coordinate
                start_col = start_coords[0] - 1  # x coordinate
                
                for i in range(word_len):
                    row = start_row + (i * delta_row)
                    col = start_col + (i * delta_col)
                    positions.append({'row': row, 'col': col})
                
                placed_words.append({
                    'word': word,
                    'positions': positions,
                    'direction': direction
                })
        
        # Only return words that were successfully placed
        successfully_placed = [word_info['word'] for word_info in answer_key]
        skipped_words = [word for word in word_list if word.upper() not in [w.upper() for w in successfully_placed]]
        
        return jsonify({
            'grid': grid,
            'words': successfully_placed,
            'placedWords': placed_words,
            'gridSize': grid_size,
            'skippedWords': skipped_words,
            'answerKey': answer_key  # Include professional answer key
        })
        
    except Exception as error:
        print(f'❌ Puzzle generation error: {error}')
        return jsonify({'error': 'Failed to generate puzzle'}), 500

if __name__ == '__main__':
    print(f'🔧 Strandgen (Python) running on http://localhost:{PORT}')
    print('Ready to generate bathroom puzzles! 🚽')
    app.run(host='0.0.0.0', port=PORT, debug=False)