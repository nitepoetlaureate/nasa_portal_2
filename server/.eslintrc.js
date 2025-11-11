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
