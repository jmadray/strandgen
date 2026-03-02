#!/bin/bash

# Security scan script for Strandgen
# Checks for hardcoded secrets before deployment

set -e

echo "🔍 Running security scan for Strandgen..."

# Define patterns to search for
SECRETS_PATTERNS=(
    "sk-[a-zA-Z0-9]+"           # OpenAI API keys
    "eyJ[a-zA-Z0-9]+"           # JWT tokens  
    "ghp_[a-zA-Z0-9]+"          # GitHub personal access tokens
    "gho_[a-zA-Z0-9]+"          # GitHub OAuth tokens
    "ghs_[a-zA-Z0-9]+"          # GitHub app tokens
    "password.*[:=][\"'][^\"']+" # Hardcoded passwords
    "secret.*[:=][\"'][^\"']+"   # Hardcoded secrets
    "token.*[:=][\"'][^\"']+"    # Hardcoded tokens
    "api_key.*[:=][\"'][^\"']+"  # Hardcoded API keys
    "-----BEGIN.*PRIVATE.*KEY-----" # Private keys
)

# Files to scan (exclude node_modules and .git)
FILES_TO_SCAN=$(find . -type f \( -name "*.js" -o -name "*.json" -o -name "*.md" -o -name "*.html" -o -name "*.css" \) ! -path "./node_modules/*" ! -path "./.git/*")

VIOLATIONS_FOUND=0

# Check each pattern
for pattern in "${SECRETS_PATTERNS[@]}"; do
    echo "  Checking for pattern: $pattern"
    
    if echo "$FILES_TO_SCAN" | xargs grep -l -i -E "$pattern" 2>/dev/null; then
        echo "  ❌ Found potential secret: $pattern"
        echo "$FILES_TO_SCAN" | xargs grep -n -i -E "$pattern" 2>/dev/null
        VIOLATIONS_FOUND=1
    fi
done

# Check for .env files in git
if git ls-files | grep -E "\.env$" >/dev/null 2>&1; then
    echo "  ❌ Found .env file in git repository!"
    git ls-files | grep -E "\.env$"
    VIOLATIONS_FOUND=1
fi

# Check for missing .env.example if .env exists
if [ -f ".env" ] && [ ! -f ".env.example" ]; then
    echo "  ❌ Found .env but missing .env.example template"
    VIOLATIONS_FOUND=1
fi

# Summary
if [ $VIOLATIONS_FOUND -eq 0 ]; then
    echo "✅ Security scan passed! No secrets detected."
    exit 0
else
    echo "❌ Security scan failed! Please remove secrets before deploying."
    echo ""
    echo "Common fixes:"
    echo "  - Move secrets to .env file (gitignored)"
    echo "  - Use environment variables: process.env.SECRET_NAME"
    echo "  - Add .env to .gitignore if not already there"
    echo "  - Create .env.example with placeholder values"
    exit 1
fi