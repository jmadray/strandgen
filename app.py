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
        # The library expects a string of words, not a list
        words_string = ', '.join(word_list)
        puzzle = WordSearch(words_string, level=3)
        
        # Debug: print what we get from the puzzle object
        print(f'🔍 DEBUG - Puzzle object type: {type(puzzle)}')
        print(f'🔍 DEBUG - Puzzle dir: {[attr for attr in dir(puzzle) if not attr.startswith("_")]}')
        
        # Get the puzzle as a string and parse it
        puzzle_str = str(puzzle)
        lines = puzzle_str.split('\n')
        
        # Find the grid section (after the header, before "Find these words")
        grid_lines = []
        in_grid = False
        for line in lines:
            if line.strip() and not line.startswith('-') and not line.startswith('WORD SEARCH'):
                if not in_grid and len(line.replace(' ', '').replace('-', '')) > 0:
                    if not line.startswith('Find these words'):
                        in_grid = True
                if in_grid:
                    if line.startswith('Find these words'):
                        break
                    # Parse grid row
                    letters = line.strip().split()
                    if letters and all(len(letter) == 1 for letter in letters):
                        grid_lines.append([letter.upper() for letter in letters])
        
        grid = grid_lines
        grid_size = len(grid) if grid else 15
        
        # Extract successfully placed words from the output string
        placed_words = []
        successfully_placed = word_list  # Assume all words were placed for now
        
        # Look for answer key in the string
        answer_key_info = []
        for line in lines:
            if 'Answer Key:' in line:
                # Extract answer information (simplified for now)
                break
        
        skipped_words = []  # Assume no words skipped for now
        
        return jsonify({
            'grid': grid,
            'words': successfully_placed,
            'placedWords': placed_words,
            'gridSize': grid_size,
            'skippedWords': skipped_words,
            'answerKey': answer_key_info  # Include professional answer key
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