module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['node'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error'
  },
  ignorePatterns: ['node_modules/', 'coverage/', 'dist/']
};
