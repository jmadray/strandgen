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
        puzzle = WordSearch(word_list, level=3)
        
        # Get the puzzle data - try different attributes based on version
        try:
            puzzle_data = puzzle.puzzle
        except AttributeError:
            try:
                puzzle_data = puzzle.grid
            except AttributeError:
                puzzle_data = str(puzzle).split('\n')[3:-5]  # Extract from string representation
                puzzle_data = [list(row.replace(' ', '')) for row in puzzle_data if row and not row.startswith('-')]
        
        grid_size = len(puzzle_data) if puzzle_data else 15
        
        # Convert puzzle grid to our expected format
        grid = []
        if isinstance(puzzle_data[0], str):
            # If it's string format, convert to list of lists
            for row in puzzle_data:
                grid.append(list(row.upper().replace(' ', '')))
        else:
            # Already in list format
            for row in puzzle_data:
                grid.append([str(cell).upper() for cell in row])
        
        # Get successfully placed words from the puzzle
        placed_words = []
        try:
            answer_key = puzzle.key
            successfully_placed = [word_info['word'].upper() for word_info in answer_key]
            
            for word_info in answer_key:
                word = word_info['word'].upper()
                try:
                    start_coords = word_info['start_coordinates']  # (x, y) 1-based
                    direction = word_info['direction']
                    
                    # Convert to our format with positions
                    positions = []
                    word_len = len(word)
                    
                    # Convert direction to deltas
                    direction_deltas = {
                        'E': (0, 1), 'SE': (1, 1), 'S': (1, 0), 'SW': (1, -1),
                        'W': (0, -1), 'NW': (-1, -1), 'N': (-1, 0), 'NE': (-1, 1)
                    }
                    
                    if direction in direction_deltas:
                        delta_row, delta_col = direction_deltas[direction]
                        start_row = start_coords[1] - 1
                        start_col = start_coords[0] - 1
                        
                        for i in range(word_len):
                            row = start_row + (i * delta_row)
                            col = start_col + (i * delta_col)
                            positions.append({'row': row, 'col': col})
                        
                        placed_words.append({
                            'word': word,
                            'positions': positions,
                            'direction': direction
                        })
                except (KeyError, TypeError):
                    # Fallback if coordinate data is missing
                    placed_words.append({
                        'word': word,
                        'positions': [],
                        'direction': 'unknown'
                    })
                    
        except AttributeError:
            # Fallback if no key attribute - just return the words we tried to place
            successfully_placed = word_list
        
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
        import traceback
        error_details = traceback.format_exc()
        print(f'❌ Puzzle generation error: {error}')
        print(f'❌ Full traceback: {error_details}')
        return jsonify({'error': f'Failed to generate puzzle: {str(error)}'}), 500

if __name__ == '__main__':
    print(f'🔧 Strandgen (Python) running on http://localhost:{PORT}')
    print('Ready to generate bathroom puzzles! 🚽')
    app.run(host='0.0.0.0', port=PORT, debug=False)