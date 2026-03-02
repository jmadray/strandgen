#!/usr/bin/env python3

import os
import json
import tempfile
import shutil
from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
from word_search_generator import WordSearch
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
PORT = int(os.getenv('PORT', 3000))

# Global variable to store current puzzle instance for PDF generation
current_puzzle_instance = None

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
        difficulty_level = data.get('level', 3)
        grid_size = data.get('gridSize', 'auto')
        
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
        
        # Create word search puzzle using the professional library
        # The library expects a string of words, not a list
        words_string = ', '.join(word_list)
        puzzle = WordSearch(words_string, level=difficulty_level)
        
        # Store puzzle for potential PDF generation
        global current_puzzle_instance
        current_puzzle_instance = puzzle
        
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
        
        # Extract answer key from the puzzle
        answer_key_info = []
        placed_words = []
        successfully_placed = word_list  # Start with all words
        
        try:
            # Try to get answer key from puzzle object
            if hasattr(puzzle, 'key'):
                answer_key_raw = puzzle.key
                print(f'🔍 DEBUG - Answer key type: {type(answer_key_raw)}')
                print(f'🔍 DEBUG - Answer key content: {answer_key_raw}')
                
                if isinstance(answer_key_raw, list):
                    # It's already a list of answer objects
                    for answer in answer_key_raw:
                        if isinstance(answer, dict):
                            answer_key_info.append(answer)
                        else:
                            print(f'🔍 DEBUG - Unexpected answer format: {answer}')
                elif isinstance(answer_key_raw, dict):
                    # It's a single answer object
                    answer_key_info.append(answer_key_raw)
                else:
                    print(f'🔍 DEBUG - Unexpected answer key format: {type(answer_key_raw)}')
            else:
                print('🔍 DEBUG - Puzzle has no key attribute')
                
            # Alternative: try to parse from string representation
            if not answer_key_info:
                print('🔍 DEBUG - Trying to extract from string representation')
                puzzle_str_lines = str(puzzle).split('\n')
                
                # Look for answer key in puzzle string
                answer_section = False
                for line in puzzle_str_lines:
                    if 'Answer Key:' in line:
                        answer_section = True
                        # Extract answer key line
                        answer_text = line.split('Answer Key:', 1)[-1].strip()
                        
                        # Parse individual answers (format: "WORD DIR @ (x, y)")
                        if answer_text:
                            answers = answer_text.split(', ')
                            for answer in answers:
                                try:
                                    # Parse format like "CAT NE @ (5, 14)"
                                    parts = answer.strip().split(' @ ')
                                    if len(parts) == 2:
                                        word_dir = parts[0].strip()
                                        coords_str = parts[1].strip()
                                        
                                        # Split word and direction
                                        word_dir_parts = word_dir.split()
                                        if len(word_dir_parts) >= 2:
                                            word = word_dir_parts[0]
                                            direction = word_dir_parts[1]
                                            
                                            # Parse coordinates (x, y)
                                            coords_clean = coords_str.strip('()')
                                            coord_parts = coords_clean.split(',')
                                            if len(coord_parts) == 2:
                                                x = int(coord_parts[0].strip())
                                                y = int(coord_parts[1].strip())
                                                
                                                answer_key_info.append({
                                                    'word': word,
                                                    'direction': direction,
                                                    'start_coordinates': [x, y]
                                                })
                                except (ValueError, IndexError) as parse_error:
                                    print(f'🔍 DEBUG - Failed to parse answer: {answer}, error: {parse_error}')
                                    continue
                        break
                        
        except Exception as key_error:
            print(f'❌ Answer key extraction error: {key_error}')
            
        skipped_words = []  # Most words should be placed with professional library
        
        return jsonify({
            'grid': grid,
            'words': successfully_placed,
            'placedWords': placed_words,
            'gridSize': grid_size,
            'skippedWords': skipped_words,
            'answerKey': answer_key_info,  # Include professional answer key
            'difficulty': difficulty_level
        })
        
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
        data = request.get_json()
        puzzle_data = data.get('puzzleData')
        show_answer_key = data.get('showAnswerKey', False)
        
        if not puzzle_data:
            return jsonify({'error': 'No puzzle data provided'}), 400
            
        # Check if we have the puzzle instance stored
        if 'current_puzzle_instance' not in globals():
            return jsonify({'error': 'Puzzle instance not available. Please regenerate the puzzle first.'}), 400
            
        puzzle = current_puzzle_instance
        
        # Generate PDF using the library's built-in functionality
        import io
        from flask import Response
        
        try:
            # Create temporary directory for PDF generation
            temp_dir = tempfile.mkdtemp()
            temp_path = os.path.join(temp_dir, 'puzzle.pdf')
            
            # Use the library's save method to generate PDF
            result_path = puzzle.save(path=temp_path)
            
            # Read the generated PDF file
            with open(temp_path, 'rb') as pdf_file:
                pdf_data = pdf_file.read()
            
            # Clean up temporary files
            shutil.rmtree(temp_dir)
            
            # Return PDF as response
            response = Response(
                pdf_data,
                mimetype='application/pdf',
                headers={
                    'Content-Disposition': 'attachment; filename=word-search-puzzle.pdf',
                    'Content-Length': str(len(pdf_data))
                }
            )
            return response
            
        except Exception as save_error:
            print(f'❌ PDF save error: {save_error}')
            # Clean up temp files if they exist
            try:
                if 'temp_dir' in locals() and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
            except:
                pass
            raise save_error
            
    except Exception as error:
        print(f'❌ PDF generation error: {error}')
        return jsonify({'error': f'Failed to generate PDF: {str(error)}'}), 500

if __name__ == '__main__':
    print(f'🔧 Strandgen (Python) running on http://localhost:{PORT}')
    print('Ready to generate bathroom puzzles! 🚽')
    app.run(host='0.0.0.0', port=PORT, debug=False)