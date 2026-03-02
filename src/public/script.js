// Global state
let currentPuzzle = null;
let currentSettings = {
    difficulty: 3,
    gridSize: 'auto',
    showAnswerKey: false
};

// DOM elements
const elements = {
    wordInput: null,
    wordCount: null,
    difficultySelect: null,
    gridSizeSelect: null,
    generateBtn: null,
    exampleBtn: null,
    downloadPdfBtn: null,
    printBtn: null,
    showAnswerKey: null,
    regenerateBtn: null,
    actionsPanel: null,
    loadingState: null,
    emptyState: null,
    errorState: null,
    puzzlePreview: null,
    puzzleTitle: null,
    puzzleStats: null,
    puzzleGrid: null,
    wordList: null,
    answerKey: null,
    answerKeyContent: null,
    errorMessage: null,
    retryBtn: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    bindEvents();
    updateWordCount();
    showEmptyState();
});

function initializeElements() {
    // Cache all DOM elements
    elements.wordInput = document.getElementById('wordInput');
    elements.wordCount = document.getElementById('wordCount');
    elements.difficultySelect = document.getElementById('difficultySelect');
    elements.gridSizeSelect = document.getElementById('gridSizeSelect');
    elements.generateBtn = document.getElementById('generateBtn');
    elements.exampleBtn = document.getElementById('exampleBtn');
    elements.downloadPdfBtn = document.getElementById('downloadPdfBtn');
    elements.printBtn = document.getElementById('printBtn');
    elements.showAnswerKey = document.getElementById('showAnswerKey');
    elements.regenerateBtn = document.getElementById('regenerateBtn');
    elements.actionsPanel = document.getElementById('actionsPanel');
    elements.loadingState = document.getElementById('loadingState');
    elements.emptyState = document.getElementById('emptyState');
    elements.errorState = document.getElementById('errorState');
    elements.puzzlePreview = document.getElementById('puzzlePreview');
    elements.puzzleTitle = document.getElementById('puzzleTitle');
    elements.puzzleStats = document.getElementById('puzzleStats');
    elements.puzzleGrid = document.getElementById('puzzleGrid');
    elements.wordList = document.getElementById('wordList');
    elements.answerKey = document.getElementById('answerKey');
    elements.answerKeyContent = document.getElementById('answerKeyContent');
    elements.errorMessage = document.getElementById('errorMessage');
    elements.retryBtn = document.getElementById('retryBtn');
}

function bindEvents() {
    // Word input events
    elements.wordInput.addEventListener('input', handleWordInputChange);
    elements.wordInput.addEventListener('keydown', handleKeyDown);
    
    // Settings events
    elements.difficultySelect.addEventListener('change', handleDifficultyChange);
    elements.gridSizeSelect.addEventListener('change', handleGridSizeChange);
    elements.showAnswerKey.addEventListener('change', handleAnswerKeyToggle);
    
    // Button events
    elements.generateBtn.addEventListener('click', generatePuzzle);
    elements.exampleBtn.addEventListener('click', loadExample);
    elements.downloadPdfBtn.addEventListener('click', downloadPdf);
    elements.printBtn.addEventListener('click', printPuzzle);
    elements.regenerateBtn.addEventListener('click', regeneratePuzzle);
    elements.retryBtn.addEventListener('click', generatePuzzle);
}

// Event Handlers
function handleWordInputChange() {
    updateWordCount();
    if (getWordList().length === 0 && currentPuzzle) {
        showEmptyState();
        hideActionsPanel();
    }
}

function handleKeyDown(event) {
    // Ctrl/Cmd + Enter to generate
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        generatePuzzle();
    }
}

function handleDifficultyChange() {
    currentSettings.difficulty = parseInt(elements.difficultySelect.value);
    if (currentPuzzle) {
        updatePuzzleStats();
    }
}

function handleGridSizeChange() {
    currentSettings.gridSize = elements.gridSizeSelect.value;
}

function handleAnswerKeyToggle() {
    currentSettings.showAnswerKey = elements.showAnswerKey.checked;
    if (currentPuzzle) {
        elements.answerKey.style.display = currentSettings.showAnswerKey ? 'block' : 'none';
    }
}

// Utility Functions
function getWordList() {
    return elements.wordInput.value
        .split('\n')
        .map(word => word.trim().replace(/\s+/g, ''))
        .filter(word => word.length > 0);
}

function updateWordCount() {
    const words = getWordList();
    const count = words.length;
    elements.wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
    
    // Enable/disable generate button
    elements.generateBtn.disabled = count < 3;
}

// State Management
function showLoadingState() {
    hideAllStates();
    elements.loadingState.style.display = 'flex';
    elements.generateBtn.disabled = true;
    elements.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
}

function showEmptyState() {
    hideAllStates();
    elements.emptyState.style.display = 'flex';
    hideActionsPanel();
}

function showErrorState(message) {
    hideAllStates();
    elements.errorState.style.display = 'flex';
    elements.errorMessage.textContent = message;
    hideActionsPanel();
}

function showPuzzleState() {
    hideAllStates();
    elements.puzzlePreview.style.display = 'flex';
    showActionsPanel();
}

function hideAllStates() {
    elements.loadingState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.puzzlePreview.style.display = 'none';
}

function showActionsPanel() {
    elements.actionsPanel.style.display = 'block';
}

function hideActionsPanel() {
    elements.actionsPanel.style.display = 'none';
}

function resetGenerateButton() {
    elements.generateBtn.disabled = getWordList().length < 3;
    elements.generateBtn.innerHTML = '<i class="fas fa-play"></i> Create Puzzle';
}

// Puzzle Generation
async function generatePuzzle() {
    const words = getWordList();
    
    if (words.length < 3) {
        showErrorState('Please enter at least 3 words to create a puzzle.');
        return;
    }
    
    showLoadingState();
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                words: words.join('\n'),
                level: currentSettings.difficulty,
                gridSize: currentSettings.gridSize
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        const puzzleData = await response.json();
        currentPuzzle = puzzleData;
        
        displayPuzzle(puzzleData);
        showPuzzleState();
        
    } catch (error) {
        console.error('Puzzle generation failed:', error);
        showErrorState(error.message || 'Failed to generate puzzle. Please try again.');
    } finally {
        resetGenerateButton();
    }
}

function displayPuzzle(puzzle) {
    // Update puzzle info
    updatePuzzleStats();
    
    // Render grid
    renderPuzzleGrid(puzzle.grid);
    
    // Render word list
    renderWordList(puzzle.words);
    
    // Render answer key
    renderAnswerKey(puzzle);
    
    // Set answer key visibility
    elements.answerKey.style.display = currentSettings.showAnswerKey ? 'block' : 'none';
}

function updatePuzzleStats() {
    if (!currentPuzzle) return;
    
    const difficultyNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
    const gridSize = currentPuzzle.gridSize || 15;
    const wordCount = currentPuzzle.words ? currentPuzzle.words.length : 0;
    const difficulty = difficultyNames[currentSettings.difficulty] || 'Hard';
    
    elements.puzzleStats.textContent = `${gridSize}×${gridSize} • ${wordCount} words • ${difficulty} difficulty`;
}

function renderPuzzleGrid(grid) {
    if (!grid || !grid.length) return;
    
    const gridSize = grid.length;
    elements.puzzleGrid.innerHTML = '';
    elements.puzzleGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    elements.puzzleGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = grid[row][col] || '';
            cell.dataset.row = row;
            cell.dataset.col = col;
            elements.puzzleGrid.appendChild(cell);
        }
    }
}

function renderWordList(words) {
    if (!words) return;
    
    elements.wordList.innerHTML = '';
    words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word.toUpperCase();
        elements.wordList.appendChild(li);
    });
}

function renderAnswerKey(puzzle) {
    if (!puzzle.answerKey || !puzzle.answerKey.length) {
        elements.answerKeyContent.textContent = 'Answer key not available for this puzzle.';
        return;
    }
    
    let keyHtml = '';
    puzzle.answerKey.forEach((answer, index) => {
        const word = answer.word || `Word ${index + 1}`;
        const coords = answer.start_coordinates;
        const direction = answer.direction;
        
        if (coords && direction) {
            keyHtml += `${word}: ${direction} @ (${coords[0]}, ${coords[1]})\n`;
        } else {
            keyHtml += `${word}: Located in grid\n`;
        }
    });
    
    elements.answerKeyContent.textContent = keyHtml || 'Answer coordinates not available.';
}

// Actions
function regeneratePuzzle() {
    if (elements.generateBtn.disabled) return;
    generatePuzzle();
}

function loadExample() {
    const bathroomWords = [
        'TOILET',
        'BATHROOM',
        'PLUNGER',
        'PAPER',
        'FLUSH',
        'SINK',
        'TOWEL',
        'SOAP',
        'MIRROR',
        'FAUCET',
        'SHOWER',
        'BATHTUB',
        'TOILET PAPER',
        'BATHROOM BREAK'
    ];
    
    elements.wordInput.value = bathroomWords.join('\n');
    updateWordCount();
    
    // Auto-focus generate button
    elements.generateBtn.focus();
}

async function downloadPdf() {
    if (!currentPuzzle) return;
    
    try {
        elements.downloadPdfBtn.disabled = true;
        elements.downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        
        const response = await fetch('/generate-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                puzzleData: currentPuzzle,
                showAnswerKey: currentSettings.showAnswerKey
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }
        
        // Download the PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'word-search-puzzle.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again or use the print option.');
    } finally {
        elements.downloadPdfBtn.disabled = false;
        elements.downloadPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF';
    }
}

function printPuzzle() {
    if (!currentPuzzle) return;
    
    // Temporarily hide answer key if not wanted for print
    const wasAnswerKeyVisible = elements.answerKey.style.display !== 'none';
    
    if (!currentSettings.showAnswerKey && wasAnswerKeyVisible) {
        elements.answerKey.style.display = 'none';
    }
    
    window.print();
    
    // Restore answer key visibility
    if (!currentSettings.showAnswerKey && wasAnswerKeyVisible) {
        elements.answerKey.style.display = 'block';
    }
}

// Initialize word count on page load
updateWordCount();