# Strandgen - Bathroom Word Search Generator 🚽

A web application that generates printable word search puzzles using professional-grade algorithms. Perfect for bathroom reading when you forget your phone!

## Features

- **Professional Algorithm**: Uses `word-search-generator` Python library
- **Input**: Paste a list of themed words (multi-word entries supported)
- **Dynamic Grid Size**: Automatically sizes grid based on word lengths  
- **8 Directions**: Words hidden horizontally, vertically, and diagonally
- **Difficulty Levels**: Professional puzzle generation with optimal placement
- **Answer Keys**: Complete solution coordinates included
- **Smart Overlapping**: Words intelligently share letters
- **Output**: Clean printable puzzle with word list
- **Theme**: Perfect for bathroom-themed words (or any theme!)

## How It Works

1. Enter your themed words (one per line, spaces automatically removed)
2. Professional algorithm creates optimally-sized grid 
3. Words placed in all 8 directions with intelligent overlap
4. Print and enjoy your high-quality word search!

## Technology

- **Backend**: Python + Flask + word-search-generator library
- **Frontend**: Vanilla HTML/CSS/JavaScript  
- **Deployment**: Docker + Traefik on jamlife.solutions

## Development

### Setup

```bash
pip install -r requirements.txt
python app.py
```

### Deploy

```bash
./deploy.sh
```

## Use Case

One-page bathroom games for when you forget your phone. Because everyone needs entertainment during those private moments! 😄

---
*Built by Ratchet 🔧 for Candice's bathroom entertainment needs*