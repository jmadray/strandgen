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
    
    if (!words || !words.trim()) {
        return res.status(400).json({ error: 'Please provide a list of words' });
    }
    
    // Parse words from input
    const wordList = words.split('\n')
        .map(word => word.trim())
        .filter(word => word.length > 0);
    
    if (wordList.length < 3) {
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

// Strands puzzle generation algorithm
function generateStrandsPuzzle(wordList) {
    // Find the spangram (longest word)
    const spangram = wordList.reduce((longest, word) => 
        word.length > longest.length ? word : longest
    );
    
    // Remove spangram from regular words
    const regularWords = wordList.filter(word => word !== spangram);
    
    // Create 6x8 grid (standard Strands size)
    const grid = Array(6).fill().map(() => Array(8).fill(''));
    
    // Place spangram first (this is where the real algorithm magic happens)
    const placedWords = placeWordsInGrid(grid, [spangram, ...regularWords]);
    
    // Fill empty spaces with random letters
    fillEmptySpaces(grid);
    
    return {
        grid: grid,
        words: wordList,
        spangram: spangram,
        placedWords: placedWords
    };
}

function placeWordsInGrid(grid, words) {
    const placed = [];
    const rows = grid.length;
    const cols = grid[0].length;
    
    // For MVP: Simple placement algorithm
    // Place spangram horizontally in middle row
    const spangram = words[0];
    if (spangram.length <= cols) {
        const startCol = Math.floor((cols - spangram.length) / 2);
        const row = Math.floor(rows / 2);
        
        for (let i = 0; i < spangram.length; i++) {
            grid[row][startCol + i] = spangram[i].toUpperCase();
        }
        
        placed.push({
            word: spangram,
            positions: Array.from({ length: spangram.length }, (_, i) => ({ row, col: startCol + i }))
        });
    }
    
    // Place other words (simplified for MVP)
    for (let i = 1; i < words.length && i <= 4; i++) {
        const word = words[i];
        if (tryPlaceWord(grid, word, placed)) {
            // Word was placed successfully
        }
    }
    
    return placed;
}

function tryPlaceWord(grid, word, alreadyPlaced) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Try horizontal placement
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= cols - word.length; col++) {
            if (canPlaceHorizontally(grid, word, row, col)) {
                placeWordHorizontally(grid, word, row, col);
                return true;
            }
        }
    }
    
    // Try vertical placement
    for (let row = 0; row <= rows - word.length; row++) {
        for (let col = 0; col < cols; col++) {
            if (canPlaceVertically(grid, word, row, col)) {
                placeWordVertically(grid, word, row, col);
                return true;
            }
        }
    }
    
    return false;
}

function canPlaceHorizontally(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        const currentCell = grid[row][col + i];
        if (currentCell !== '' && currentCell !== word[i].toUpperCase()) {
            return false;
        }
    }
    return true;
}

function canPlaceVertically(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        const currentCell = grid[row + i][col];
        if (currentCell !== '' && currentCell !== word[i].toUpperCase()) {
            return false;
        }
    }
    return true;
}

function placeWordHorizontally(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        grid[row][col + i] = word[i].toUpperCase();
    }
}

function placeWordVertically(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        grid[row + i][col] = word[i].toUpperCase();
    }
}

function fillEmptySpaces(grid) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
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