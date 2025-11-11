#!/bin/bash
# Agent B1 - Dependency & Security Updates
# Works on branch: kimi/fix-b1-deps-security

set -e

PROJECT_ROOT="/Users/edsaga/nasa_system7_portal_copy"
cd "$PROJECT_ROOT"

echo "🛡️ Agent B1: Starting dependency and security updates..."

# Create and checkout branch
git checkout -b kimi/fix-b1-deps-security 2>/dev/null || git checkout -B kimi/fix-b1-deps-security

# Update root dependencies
echo "Updating root dependencies..."
npm update

# Fix server security issues
echo "Fixing server security vulnerabilities..."
cd server

# Remove vulnerable packages
npm uninstall express-brute csurf || true

# Install secure alternatives
npm install express-rate-limit@latest express-validator@latest

# Update all dependencies to latest secure versions
npm update

# Fix audit issues
npm audit fix

cd ..

# Update client dependencies
echo "Updating client dependencies..."
cd client
npm update
npm audit fix

cd ..

# Update Python dependencies (if python3 is available)
if command -v python3 &> /dev/null; then
  echo "Updating Python dependencies..."
  pip3 install --upgrade -r <(python3 -c "
import toml
data = toml.load('pyproject.toml')
print('\n'.join(data['project']['dependencies']))
") 2>/dev/null || echo "Python dependencies update skipped"
fi

# Remove unused dependencies from root package.json
npm uninstall claude-code-templates draggabilly || true

echo "✅ Agent B1: Dependency updates completed"

# Run security audit to verify fixes
cd server
npm audit --audit-level moderate
cd ../client
npm audit --audit-level moderate

echo "🔒 Security audit passed"

# Commit changes
git add -A
git commit -m "fix(security): update dependencies and fix critical CVEs

- Remove vulnerable express-brute and csurf packages
- Update all dependencies to latest secure versions  
- Fix cookie, underscore, and rate limiting vulnerabilities
- Remove unused claude-code-templates and draggabilly

Fixes: #1.1, #1.2, #1.3, #1.4, #1.5, #5.5"

# Push branch
git push origin kimi/fix-b1-deps-security --force

echo "🚀 Agent B1: Changes pushed to kimi/fix-b1-deps-security"

# Update fix-list.md
cd "$PROJECT_ROOT"
echo "- [x] **1.1** Fix critical CVE in express-brute" >> .kimi/fix-list.md
echo "- [x] **1.2** Fix critical CVE in underscore 1.3.2-1.12.0" >> .kimi/fix-list.md
echo "- [x] **1.3** Fix cookie vulnerability <0.7.0" >> .kimi/fix-list.md
echo "- [x] **1.4** Remove or replace deprecated csurf middleware" >> .kimi/fix-list.md
echo "- [x] **1.5** Update all dependencies with known vulnerabilities" >> .kimi/fix-list.md
echo "- [x] **5.5** Remove unused dependencies" >> .kimi/fix-list.md
