#!/bin/bash
# Agent B2 - Lint / Formatter Alignment
# Works on branch: kimi/fix-b2-lint-format

set -e

PROJECT_ROOT="/Users/edsaga/nasa_system7_portal_copy"
cd "$PROJECT_ROOT"

echo "🎨 Agent B2: Starting lint and formatter alignment..."

# Create and checkout branch
git checkout main
git checkout -b kimi/fix-b2-lint-format 2>/dev/null || git checkout -B kimi/fix-b2-lint-format

# Install ESLint configs
echo "Installing ESLint configurations..."

# Server ESLint setup
cd server
npm install --save-dev @eslint/js eslint-plugin-node eslint-plugin-security

# Create ESLint config
cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    '@eslint/js/recommended',
    'plugin:node/recommended',
    'plugin:security/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['node', 'security'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'warn'
  },
  ignorePatterns: ['node_modules/', 'coverage/', 'dist/']
};
