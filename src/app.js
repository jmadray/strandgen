const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('src/public'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/generate', (req, res) => {
    const { words } = req.body;
    
    console.log('🔍 DEBUG - Raw request body:', JSON.stringify(req.body));
    console.log('🔍 DEBUG - Words received:', JSON.stringify(words));
    
    if (!words || !words.trim()) {
        console.log('❌ DEBUG - No words provided');
        return res.status(400).json({ error: 'Please provide a list of words' });
    }
    
    // Parse words from input
    const wordList = words.split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0);
    
    console.log('🔍 DEBUG - Parsed word list:', JSON.stringify(wordList));
    
    if (wordList.length < 3) {
        console.log('❌ DEBUG - Not enough words:', wordList.length);
        return res.status(400).json({ error: 'Please provide at least 3 words' });
    }
    
    try {
        // Generate the puzzle
        const puzzle = generateStrandsPuzzle(wordList);
        res.json(puzzle);
    } catch (error) {
        console.error('Puzzle generation error:', error);
        res.status(500).json({ error: 'Failed to generate puzzle' });
    }
});

// Word search puzzle generation algorithm
function generateStrandsPuzzle(wordList) {
    // Sort words by length (longest first for better placement)
    const sortedWords = [...wordList].sort((a, b) => b.length - a.length);
    
    // Create 15x15 grid (better for word search)
    const gridSize = 15;
    const grid = Array(gridSize).fill().map(() => Array(gridSize).fill(''));
    
    // Place all words in the grid
    const placedWords = placeWordsInGrid(grid, sortedWords, gridSize);
    
    // Fill empty spaces with random letters
    fillEmptySpaces(grid);
    
    return {
        grid: grid,
        words: wordList,
        placedWords: placedWords,
        gridSize: gridSize
    };
}

function placeWordsInGrid(grid, words, gridSize) {
    const placed = [];
    
    // Define 8 directions for word search
    const directions = [
        [0, 1],   // Horizontal right
        [0, -1],  // Horizontal left  
        [1, 0],   // Vertical down
        [-1, 0],  // Vertical up
        [1, 1],   // Diagonal down-right
        [1, -1],  // Diagonal down-left
        [-1, 1],  // Diagonal up-right
        [-1, -1]  // Diagonal up-left
    ];
    
    // Try to place each word
    for (const word of words) {
        const wordUpper = word.toUpperCase();
        let wordPlaced = false;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops
        
        while (!wordPlaced && attempts < maxAttempts) {
            attempts++;
            
            // Random starting position
            const startRow = Math.floor(Math.random() * gridSize);
            const startCol = Math.floor(Math.random() * gridSize);
            
            // Random direction
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const [deltaRow, deltaCol] = direction;
            
            // Check if word fits in this direction from this position
            if (canPlaceWord(grid, wordUpper, startRow, startCol, deltaRow, deltaCol, gridSize)) {
                // Place the word
                const positions = placeWord(grid, wordUpper, startRow, startCol, deltaRow, deltaCol);
                placed.push({
                    word: word,
                    positions: positions,
                    direction: direction
                });
                wordPlaced = true;
            }
        }
        
        if (!wordPlaced) {
            console.log(`⚠️  Could not place word: ${word}`);
        }
    }
    
    return placed;
}

function canPlaceWord(grid, word, startRow, startCol, deltaRow, deltaCol, gridSize) {
    // Check if word fits within grid bounds
    const endRow = startRow + (word.length - 1) * deltaRow;
    const endCol = startCol + (word.length - 1) * deltaCol;
    
    if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) {
        return false;
    }
    
    // Check if word can be placed (empty cells or matching letters)
    for (let i = 0; i < word.length; i++) {
        const currentRow = startRow + i * deltaRow;
        const currentCol = startCol + i * deltaCol;
        const currentCell = grid[currentRow][currentCol];
        const wordLetter = word[i];
        
        // Cell must be empty OR contain the same letter (for overlapping words)
        if (currentCell !== '' && currentCell !== wordLetter) {
            return false;
        }
    }
    
    return true;
}

function placeWord(grid, word, startRow, startCol, deltaRow, deltaCol) {
    const positions = [];
    
    for (let i = 0; i < word.length; i++) {
        const currentRow = startRow + i * deltaRow;
        const currentCol = startCol + i * deltaCol;
        
        grid[currentRow][currentCol] = word[i];
        positions.push({ row: currentRow, col: currentCol });
    }
    
    return positions;
}



function fillEmptySpaces(grid) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            // Fill only empty cells
            if (grid[row][col] === '') {
                grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
            }
        }
    }
}

app.listen(PORT, () => {
    console.log(`🔧 Strandgen running on http://localhost:${PORT}`);
    console.log('Ready to generate bathroom puzzles! 🚽');
});

module.exports = app;