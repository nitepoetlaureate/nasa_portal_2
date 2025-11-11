# NASA System 7 Portal - Kimi Fix List

> Prioritized by Risk × Impact. "1" = breaks prod, "N" = nice-to-have.

## Critical Security Issues
- [ ] **1.1** Fix critical CVE in express-brute (Rate Limiting Bypass - GHSA-984p-xq9m-4rjw)
- [ ] **1.2** Fix critical CVE in underscore 1.3.2-1.12.0 
- [ ] **1.3** Fix cookie vulnerability <0.7.0 (GHSA-pxg6-pf52-xh8x)
- [ ] **1.4** Remove or replace deprecated csurf middleware
- [ ] **1.5** Update all dependencies with known vulnerabilities

## Tooling & Configuration
- [ ] **2.1** Fix ESLint configuration in server (missing config file)
- [ ] **2.2** Fix ESLint configuration in client (react-app config not found)
- [ ] **2.3** Standardize on single test runner (choose between Jest/Vitest)
- [ ] **2.4** Add Prettier configuration for code formatting consistency
- [ ] **2.5** Add lint-staged and husky for pre-commit hooks

## Type Safety & Code Quality
- [ ] **3.1** Add TypeScript configuration (tsconfig.json)
- [ ] **3.2** Migrate core files to TypeScript (start with API clients)
- [ ] **3.3** Add JSDoc types to remaining JavaScript files
- [ ] **3.4** Enable strict mode in ESLint configurations
- [ ] **3.5** Add prop-types or TypeScript interfaces for React components

## Testing & Coverage
- [ ] **4.1** Fix Redis connection errors in server tests
- [ ] **4.2** Create comprehensive test suite for NASA API endpoints
- [ ] **4.3** Add unit tests for React components (target 80% coverage)
- [ ] **4.4** Add integration tests for authentication flow
- [ ] **4.5** Add E2E tests for critical user journeys
- [ ] **4.6** Set up coverage reporting and CI gates

## Dependencies & Maintenance
- [ ] **5.1** Update React 18.2.0 → latest 18.x
- [ ] **5.2** Update Vite and related build tools
- [ ] **5.3** Update all @testing-library packages
- [ ] **5.4** Audit and update Python dependencies in pyproject.toml
- [ ] **5.5** Remove unused dependencies (claude-code-templates, draggabilly)

## Documentation
- [ ] **6.1** Update README with current setup instructions
- [ ] **6.2** Add API documentation for backend endpoints
- [ ] **6.3** Create component documentation for React components
- [ ] **6.4** Add environment variable documentation
- [ ] **6.5** Create testing guide for new developers

## Nice-to-Have Improvements
- [ ] **7.1** Add bundle size monitoring and optimization
- [ ] **7.2** Implement performance budgets in CI
- [ ] **7.3** Add lighthouse CI for performance regression detection
- [ ] **7.4** Set up dependency update automation (Dependabot/ Renovate)
- [ ] **7.5** Add mutation testing for critical paths- [x] **1.1** Fix critical CVE in express-brute
- [x] **1.2** Fix critical CVE in underscore 1.3.2-1.12.0
- [x] **1.3** Fix cookie vulnerability <0.7.0
- [x] **1.4** Remove or replace deprecated csurf middleware
- [x] **1.5** Update all dependencies with known vulnerabilities
- [x] **5.5** Remove unused dependencies
