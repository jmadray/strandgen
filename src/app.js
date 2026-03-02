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
    
    // Place words in grid
    const placedWords = placeWordsInGrid(grid, [spangram, ...regularWords]);
    
    // Fill empty spaces with random letters (but preserve placed words)
    fillEmptySpaces(grid, placedWords);
    
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
    
    // Place spangram first (longest word)
    const spangram = words[0];
    if (spangram.length <= cols) {
        const startCol = Math.floor((cols - spangram.length) / 2);
        const row = Math.floor(rows / 2);
        
        const positions = [];
        for (let i = 0; i < spangram.length; i++) {
            grid[row][startCol + i] = spangram[i].toUpperCase();
            positions.push({ row, col: startCol + i });
        }
        
        placed.push({
            word: spangram,
            positions: positions
        });
    }
    
    // Place other words
    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const placement = findWordPlacement(grid, word);
        if (placement) {
            // Place the word
            placement.positions.forEach((pos, letterIndex) => {
                grid[pos.row][pos.col] = word[letterIndex].toUpperCase();
            });
            
            placed.push({
                word: word,
                positions: placement.positions
            });
        }
    }
    
    return placed;
}

function findWordPlacement(grid, word) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Try horizontal placement first
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= cols - word.length; col++) {
            if (canPlaceHorizontally(grid, word, row, col)) {
                const positions = [];
                for (let i = 0; i < word.length; i++) {
                    positions.push({ row: row, col: col + i });
                }
                return { positions };
            }
        }
    }
    
    // Try vertical placement
    for (let row = 0; row <= rows - word.length; row++) {
        for (let col = 0; col < cols; col++) {
            if (canPlaceVertically(grid, word, row, col)) {
                const positions = [];
                for (let i = 0; i < word.length; i++) {
                    positions.push({ row: row + i, col: col });
                }
                return { positions };
            }
        }
    }
    
    return null; // Couldn't place word
}

function canPlaceHorizontally(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        const currentCell = grid[row][col + i];
        // Allow placement in empty cells only for now (simpler algorithm)
        if (currentCell !== '') {
            return false;
        }
    }
    return true;
}

function canPlaceVertically(grid, word, row, col) {
    for (let i = 0; i < word.length; i++) {
        const currentCell = grid[row + i][col];
        // Allow placement in empty cells only for now (simpler algorithm)
        if (currentCell !== '') {
            return false;
        }
    }
    return true;
}



function fillEmptySpaces(grid, placedWords) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Create a map of placed positions
    const placedPositions = new Set();
    placedWords.forEach(word => {
        word.positions.forEach(pos => {
            placedPositions.add(`${pos.row},${pos.col}`);
        });
    });
    
    for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
            const posKey = `${row},${col}`;
            
            // Only fill if position is empty AND not already placed by a word
            if (grid[row][col] === '' && !placedPositions.has(posKey)) {
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