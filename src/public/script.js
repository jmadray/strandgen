// Global variables
let currentPuzzle = null;

// Generate puzzle function
async function generatePuzzle() {
    const wordInput = document.getElementById('wordInput');
    const generateBtn = document.getElementById('generateBtn');
    const outputSection = document.getElementById('output-section');
    const errorSection = document.getElementById('error-section');
    
    const words = wordInput.value.trim();
    
    if (!words) {
        showError('Please enter some words!');
        return;
    }
    
    // Disable button and show loading state
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    
    // Hide previous results
    outputSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words: words })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate puzzle');
        }
        
        currentPuzzle = data;
        displayPuzzle(data);
        
    } catch (error) {
        console.error('Error generating puzzle:', error);
        showError(error.message || 'Failed to generate puzzle. Please try again.');
    } finally {
        // Re-enable button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Puzzle';
    }
}

// Display puzzle function
function displayPuzzle(puzzle) {
    const outputSection = document.getElementById('output-section');
    const puzzleGrid = document.getElementById('puzzle-grid');
    const wordList = document.getElementById('word-list');
    const spangramElement = document.getElementById('spangram');
    
    // Clear previous content
    puzzleGrid.innerHTML = '';
    wordList.innerHTML = '';
    
    // Set spangram info
    spangramElement.textContent = puzzle.spangram.toUpperCase();
    
    // Create grid
    puzzle.grid.forEach(row => {
        row.forEach(letter => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.textContent = letter;
            puzzleGrid.appendChild(cell);
        });
    });
    
    // Create word list
    puzzle.words.forEach(word => {
        const li = document.createElement('li');
        li.textContent = word.toUpperCase();
        
        if (word === puzzle.spangram) {
            li.className = 'spangram';
            li.textContent += ' (SPANGRAM)';
        }
        
        wordList.appendChild(li);
    });
    
    // Show output section
    outputSection.style.display = 'block';
    
    // Scroll to results
    outputSection.scrollIntoView({ behavior: 'smooth' });
}

// Show error function
function showError(message) {
    const errorSection = document.getElementById('error-section');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    
    // Hide error after 5 seconds
    setTimeout(() => {
        errorSection.style.display = 'none';
    }, 5000);
}

// Generate another puzzle
function generateAnother() {
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'none';
    
    // Scroll back to input
    document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    
    // Focus on input
    document.getElementById('wordInput').focus();
}

// Handle Enter key in textarea
document.addEventListener('DOMContentLoaded', function() {
    const wordInput = document.getElementById('wordInput');
    
    // Add some sample words as placeholder
    wordInput.placeholder = `Enter your themed words (one per line)
Example bathroom theme:
TOILET
PAPER
FLUSH
PLUNGER
BATHROOM
SINK
TOWEL
SOAP`;

    // Handle Ctrl/Cmd + Enter to generate
    wordInput.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            generatePuzzle();
        }
    });
    
    // Auto-focus the input
    wordInput.focus();
});

// Add some fun bathroom-themed example words
function loadExampleWords() {
    const exampleWords = [
        'TOILET',
        'BATHROOM',
        'PLUNGER', 
        'PAPER',
        'FLUSH',
        'SINK',
        'TOWEL',
        'SOAP',
        'MIRROR',
        'FAUCET'
    ];
    
    document.getElementById('wordInput').value = exampleWords.join('\n');
}

// Add example button functionality
document.addEventListener('DOMContentLoaded', function() {
    const inputSection = document.querySelector('.input-section');
    
    // Add example button
    const exampleBtn = document.createElement('button');
    exampleBtn.textContent = '🚽 Load Bathroom Theme Example';
    exampleBtn.style.marginLeft = '10px';
    exampleBtn.style.background = '#95a5a6';
    exampleBtn.style.color = 'white';
    exampleBtn.style.border = 'none';
    exampleBtn.style.padding = '10px 20px';
    exampleBtn.style.borderRadius = '5px';
    exampleBtn.style.cursor = 'pointer';
    exampleBtn.onclick = loadExampleWords;
    
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.parentNode.insertBefore(exampleBtn, generateBtn.nextSibling);
});