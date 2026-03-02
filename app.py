#!/usr/bin/env python3

import os
import json
import tempfile
import shutil
import random
import string
from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
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

def create_simple_word_search(words, size=15):
    """Create a simple word search grid without using the library that causes Direction serialization issues"""
    
    # Create empty grid filled with random letters
    grid = []
    for i in range(size):
        row = []
        for j in range(size):
            row.append(random.choice(string.ascii_uppercase))
        grid.append(row)
    
    # Place words in the grid (simple horizontal placement for now)
    placed_words = []
    for word in words[:10]:  # Limit to 10 words to fit in grid
        word = word.upper()
        if len(word) > size - 2:  # Skip words too long
            continue
            
        # Try to place word horizontally
        for attempt in range(50):  # Try up to 50 times
            row = random.randint(0, size - 1)
            start_col = random.randint(0, size - len(word))
            
            # Check if we can place the word
            can_place = True
            for i, letter in enumerate(word):
                if grid[row][start_col + i] != letter and grid[row][start_col + i] in [l.upper() for l in words]:
                    # Don't overwrite other placed words
                    can_place = False
                    break
            
            if can_place:
                # Place the word
                for i, letter in enumerate(word):
                    grid[row][start_col + i] = letter
                placed_words.append(word)
                break
    
    return grid, placed_words

@app.route('/generate', methods=['POST'])
def generate_puzzle():
    try:
        data = request.get_json()
        words_input = data.get('words', '')
        difficulty_level = data.get('level', 3)
        grid_size_param = data.get('gridSize', 'auto')
        
        print(f'🔍 DEBUG - Raw request body: {json.dumps(data)}')
        print(f'🔍 DEBUG - Words received: {json.dumps(words_input)}')
        print(f'🔍 DEBUG - Difficulty level: {difficulty_level}')
        
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
        
        # Determine grid size based on words
        max_word_length = max(len(word) for word in word_list)
        if grid_size_param == 'auto':
            grid_size = max(15, min(20, max_word_length + 5))
        else:
            grid_size = int(grid_size_param) if grid_size_param.isdigit() else 15
        
        # Create the word search using our simple algorithm
        grid, placed_words = create_simple_word_search(word_list, grid_size)
        
        print(f'🔍 DEBUG - Successfully generated {grid_size}x{grid_size} puzzle with {len(placed_words)} words')
        
        # Build response - all basic Python types, no objects that could cause serialization issues
        response_data = {
            'grid': grid,
            'words': placed_words,
            'placedWords': placed_words,
            'gridSize': grid_size,
            'skippedWords': [word for word in word_list if word.upper() not in placed_words],
            'answerKey': [],  # Disabled for now
            'difficulty': difficulty_level
        }
        
        return jsonify(response_data)
        
    except Exception as error:
        import traceback
        error_details = traceback.format_exc()
        print(f'❌ Puzzle generation error: {error}')
        print(f'❌ Full traceback: {error_details}')
        return jsonify({'error': f'Failed to generate puzzle: {str(error)}'}), 500

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    """Generate and return a PDF of the word search puzzle"""
    try:
        return jsonify({'error': 'PDF generation temporarily disabled - use print function instead'}), 501
            
    except Exception as error:
        print(f'❌ PDF generation error: {error}')
        return jsonify({'error': f'Failed to generate PDF: {str(error)}'}), 500

if __name__ == '__main__':
    print(f'🔧 Strandgen (Python) running on http://localhost:{PORT}')
    print('Ready to generate bathroom puzzles! 🚽')
    app.run(host='0.0.0.0', port=PORT, debug=False)