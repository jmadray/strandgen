#!/bin/bash

# Strandgen deployment script
# Follows secure development workflow

set -e

echo "🚀 Starting Strandgen deployment..."

# 1. Security scan first
echo "🔍 Running security scan..."
./scripts/security-scan.sh

# 2. Create GitHub repo if it doesn't exist
echo "📦 Setting up GitHub repository..."

# Check if we have a remote origin
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "  Creating GitHub repository..."
    
    # Get GitHub token
    if [ -f ~/.config/gh/token ]; then
        export GH_TOKEN=$(cat ~/.config/gh/token)
    else
        echo "❌ GitHub token not found at ~/.config/gh/token"
        echo "Please set up GitHub CLI authentication first."
        exit 1
    fi
    
    # Create repo via GitHub API
    curl -s -H "Authorization: token $GH_TOKEN" \
         -d '{"name":"strandgen","description":"Bathroom Strands Generator - Create printable NYT-style word puzzles","private":false}' \
         https://api.github.com/user/repos
    
    # Add remote origin
    git remote add origin https://github.com/jmadray/strandgen.git
fi

# 3. Commit and push changes
echo "📤 Committing and pushing to GitHub..."

# Add all files
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "  No changes to commit"
else
    # Commit with timestamp
    git commit -m "Deploy strandgen $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Push to GitHub
    git push -u origin master
fi

# 4. Deploy to jamlife server
echo "🌐 Deploying to jamlife server..."

# Create deployment directory on jamlife
ssh ratchet@100.67.147.121 "mkdir -p /opt/strandgen"

# Copy project files to server (excluding node_modules)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' \
    ./ ratchet@100.67.147.121:/opt/strandgen/

# Copy environment file separately
if [ -f ".env" ]; then
    echo "  Copying environment file..."
    scp .env ratchet@100.67.147.121:/opt/strandgen/.env
fi

# Create Docker Compose file for production
echo "🐳 Setting up Docker deployment..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  strandgen:
    build: .
    container_name: strandgen
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.strandgen.rule=Host(\`strandgen.jamlife.solutions\`)"
      - "traefik.http.routers.strandgen.entrypoints=websecure"
      - "traefik.http.routers.strandgen.tls.certresolver=letsencrypt"
      - "traefik.http.services.strandgen.loadbalancer.server.port=3000"
    networks:
      - saltbox
      
networks:
  saltbox:
    external: true
EOF

# Copy Docker Compose file to server
scp docker-compose.prod.yml ratchet@100.67.147.121:/opt/strandgen/docker-compose.yml

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
EOF

# Copy Dockerfile to server
scp Dockerfile ratchet@100.67.147.121:/opt/strandgen/

# Deploy on server
echo "  Building and starting containers..."
ssh ratchet@100.67.147.121 "
    cd /opt/strandgen &&
    npm install &&
    docker compose down || true &&
    docker compose up -d --build
"

echo "✅ Deployment complete!"
echo ""
echo "🌐 Strandgen is now available at: https://strandgen.jamlife.solutions"
echo "🚽 Ready to generate bathroom puzzles!"