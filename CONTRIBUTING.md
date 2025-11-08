# Contributing to NASA System 7 Portal

Welcome to the NASA System 7 Portal! We're excited that you want to contribute to this nostalgic NASA data visualization platform. This guide will help you get started and ensure your contributions align with our project standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** version 14.0 or higher
- **npm** version 6.0 or higher
- **PostgreSQL** version 12.0 or higher
- **Redis** (optional, for caching)
- **Git** for version control

### Initial Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/nasa-system7-portal.git
   cd nasa-system7-portal
   ```

2. **Install Dependencies**
   ```bash
   # Install all dependencies (root, client, server)
   npm run install-all
   ```

3. **Set Up Environment Variables**
   ```bash
   # Copy environment templates
   cp client/.env.example client/.env
   cp server/.env.example server/.env

   # Edit the files with your configuration
   # See docs/ENVIRONMENT_VARIABLES.md for details
   ```

4. **Initialize Database**
   ```bash
   cd server
   npm run db:init
   ```

5. **Start Development Servers**
   ```bash
   # Start both client and server
   npm run dev

   # Or start individually
   # Terminal 1: Backend
   cd server && npm start

   # Terminal 2: Frontend
   cd client && npm start
   ```

## Development Workflow

### Branch Strategy

We use a simplified Git flow with the following branches:

- **main**: Stable production code
- **develop**: Integration branch for features
- **feature/feature-name**: Feature development
- **hotfix/issue-name**: Critical bug fixes

### Creating a Feature Branch

```bash
# Ensure you're on the latest main branch
git checkout main
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name

# Start development
```

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

#### Commit Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting changes (no logic)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks, dependency updates

#### Examples
```bash
# New feature
git commit -m "feat(apod): enhance APOD viewer with zoom functionality"

# Bug fix
git commit -m "fix(api): resolve NASA API rate limiting issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Tests
git commit -m "test(components): add unit tests for System7 Window component"
```

### Development Commands

```bash
# Install dependencies
npm run install-all

# Development servers
npm run dev                  # Start both client and server
npm run client              # Start frontend only (Vite)
npm run server              # Start backend only

# Testing
npm test                    # Run all tests
cd client && npm test       # Frontend tests (Vitest)
cd client && npm run test:e2e  # Cypress E2E tests
cd server && npm test       # Backend tests (Jest)

# Code quality
npm run lint                # Lint all packages
npm run lint:fix            # Auto-fix linting issues

# Database
cd server && npm run db:init     # Initialize database
cd server && npm run db:migrate  # Run migrations
cd server && npm run db:seed     # Seed with sample data

# Build
npm run build               # Build frontend for production
cd client && npm run analyze # Analyze bundle size
```

## Code Standards

### Frontend (React + Vite)

#### File Organization
```
src/
├── components/
│   ├── system7/           # System 7 themed components
│   ├── apps/              # NASA data applications
│   └── common/            # Shared components
├── contexts/              # React context providers
├── hooks/                 # Custom React hooks
├── services/              # API service functions
├── utils/                 # Utility functions
├── assets/                # Static assets
└── test/                  # Test utilities and setup
```

#### Naming Conventions
- **Components**: PascalCase (`UserProfile.js`, `APODViewer.jsx`)
- **Files**: kebab-case with appropriate extensions (`.jsx`, `.js`, `.mjs`)
- **Functions**: camelCase (`fetchNASAData()`, `calculateOrbit()`)
- **Constants**: UPPER_SNAKE_CASE (`NASA_API_BASE_URL`, `DEFAULT_CACHE_TTL`)

#### React Best Practices
```jsx
// Good: Functional component with hooks
const APODViewer = ({ date }) => {
  const { data, loading, error } = useAPOD(date);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="apod-viewer">
      <APODImage src={data.url} alt={data.title} />
      <APODDetails data={data} />
    </div>
  );
};

// Good: Custom hook for API data
const useAPOD = (date) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAPOD(date)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [date]);

  return { data, loading, error };
};
```

#### Vite Configuration
- Use path aliases for clean imports (`@components`, `@hooks`, etc.)
- Configure environment variables with `REACT_APP_` prefix
- Enable source maps for development builds

### Backend (Node.js + Express)

#### File Organization
```
server/
├── routes/                 # API route handlers
├── middleware/             # Express middleware
├── services/               # Business logic
├── config/                 # Configuration files
├── models/                 # Database models
├── scripts/                # Utility scripts
└── test/                   # Test files
```

#### API Route Structure
```javascript
// Good: Modular route structure
// routes/apodEnhanced.js
const express = require('express');
const router = express.Router();
const { cacheMiddleware } = require('../middleware/cache');
const { validateAPODRequest } = require('../middleware/validation');
const apodService = require('../services/apodService');

// Route with middleware
router.get('/',
  validateAPODRequest,
  cacheMiddleware('apod'),
  async (req, res, next) => {
    try {
      const data = await apodService.getAPOD(req.query);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

#### Error Handling
```javascript
// Good: Centralized error handling
class APIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// Usage in routes
try {
  const data = await apodService.getAPOD(date);
  res.json(data);
} catch (error) {
  if (error.isOperational) {
    res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  } else {
    next(error);
  }
}
```

### Database

#### Query Patterns
```javascript
// Good: Use parameterized queries
const getSavedItems = async (type, limit = 10) => {
  const query = `
    SELECT id, title, url, created_at
    FROM saved_items
    WHERE type = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;

  const result = await db.query(query, [type, limit]);
  return result.rows;
};

// Good: Use transactions for multiple operations
const saveItemWithSearch = async (item, searchTerm) => {
  return db.transaction(async (client) => {
    // Save item
    await client.query(
      'INSERT INTO saved_items (id, type, title) VALUES ($1, $2, $3)',
      [item.id, item.type, item.title]
    );

    // Log search
    await client.query(
      'INSERT INTO saved_searches (query_string) VALUES ($1)',
      [searchTerm]
    );
  });
};
```

## Testing Guidelines

### Frontend Testing (Vitest)

#### Unit Tests
```javascript
// src/components/__tests__/APODViewer.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import APODViewer from '../APODViewer';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Good: Test component behavior
describe('APODViewer', () => {
  it('displays loading state initially', () => {
    const queryClient = createTestQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <APODViewer date="2024-01-15" />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays APOD data when loaded', async () => {
    const mockAPOD = {
      title: 'Test APOD',
      url: 'https://example.com/image.jpg',
      explanation: 'Test explanation'
    };

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['apod', '2024-01-15'], mockAPOD);

    render(
      <QueryClientProvider client={queryClient}>
        <APODViewer date="2024-01-15" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test APOD')).toBeInTheDocument();
    });
  });
});
```

#### Integration Tests
```javascript
// src/services/__tests__/nasaApi.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAPOD } from '../nasaApi';

// Mock fetch
global.fetch = vi.fn();

describe('NASA API Service', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('fetches APOD data successfully', async () => {
    const mockResponse = {
      title: 'Hubble Image',
      url: 'https://apod.nasa.gov/image.jpg'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await fetchAPOD('2024-01-15');

    expect(fetch).toHaveBeenCalledWith(
      '/api/nasa/planetary/apod?date=2024-01-15'
    );
    expect(result).toEqual(mockResponse);
  });
});
```

### End-to-End Testing (Cypress)

```javascript
// cypress/e2e/apod-viewer.cy.js
describe('APOD Viewer', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.findByText('Astronomy Picture of the Day').click();
  });

  it('displays APOD information', () => {
    cy.findByTestId('apod-title').should('be.visible');
    cy.findByTestId('apod-image').should('be.visible');
    cy.findByTestId('apod-explanation').should('be.visible');
  });

  it('can save APOD to favorites', () => {
    cy.findByTestId('save-apod-button').click();
    cy.findByText('Saved to favorites').should('be.visible');

    // Verify it appears in saved items
    cy.findByText('My Favorites').click();
    cy.findByText('Hubble Image').should('be.visible');
  });
});
```

### Backend Testing (Jest)

```javascript
// server/routes/__tests__/apiProxy.test.js
const request = require('supertest');
const app = require('../../server');

describe('NASA API Proxy', () => {
  it('proxies APOD requests correctly', async () => {
    const response = await request(app)
      .get('/api/nasa/planetary/apod')
      .query({ date: '2024-01-15' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('url');
  });

  it('handles missing API key gracefully', async () => {
    // Mock environment without API key
    delete process.env.NASA_API_KEY;

    const response = await request(app)
      .get('/api/nasa/planetary/apod');

    expect(response.status).toBe(200); // Should use DEMO_KEY
    expect(response.body).toHaveProperty('fallback', false);
  });
});
```

### Test Coverage Requirements

- **Frontend**: Minimum 80% line coverage
- **Backend**: Minimum 80% line coverage
- **Critical Paths**: 100% coverage for API routes and core components
- **E2E Tests**: Coverage for all major user workflows

### Running Tests

```bash
# Frontend unit tests
cd client
npm test                    # Run tests once
npm run test:watch         # Run in watch mode
npm run test:coverage      # Generate coverage report

# Frontend E2E tests
npm run test:e2e          # Run Cypress tests
npm run test:e2e:open     # Open Cypress UI

# Backend tests
cd server
npm test                  # Run all server tests
npm run test:coverage     # Generate coverage report
npm run test:integration  # Run integration tests only
```

## Documentation

### Code Documentation

#### JSDoc Comments
```javascript
/**
 * Fetches Astronomy Picture of the Day data from NASA API
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} options - Additional options
 * @param {boolean} options.hd - Return high-resolution image
 * @returns {Promise<Object>} APOD data object
 * @throws {APIError} When NASA API request fails
 * @example
 * // Get today's APOD
 * const apod = await fetchAPOD();
 *
 * // Get specific date with HD image
 * const hdApod = await fetchAPOD('2024-01-15', { hd: true });
 */
const fetchAPOD = async (date, options = {}) => {
  // Implementation
};
```

#### React Component Documentation
```jsx
/**
 * System7 Window Component
 *
 * A retro-styled window component that mimics Apple System 7 window chrome.
 * Supports dragging, resizing, and standard window controls.
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.title - Window title text
 * @param {React.ReactNode} props.children - Window content
 * @param {boolean} props.closable - Show close button
 * @param {Function} props.onClose - Close button callback
 * @param {Object} props.initialPosition - Initial window position
 * @param {number} props.initialPosition.x - X coordinate
 * @param {number} props.initialPosition.y - Y coordinate
 *
 * @example
 * <System7Window
 *   title="APOD Viewer"
 *   closable={true}
 *   onClose={handleClose}
 *   initialPosition={{ x: 100, y: 100 }}
 * >
 *   <APODContent />
 * </System7Window>
 */
const System7Window = ({
  title,
  children,
  closable = true,
  onClose,
  initialPosition = { x: 0, y: 0 }
}) => {
  // Component implementation
};
```

### Documentation Updates

When contributing, please update relevant documentation:

1. **README.md**: Update if adding new features or changing setup
2. **API.md**: Update when modifying API endpoints
3. **DATABASE_SCHEMA.md**: Update when changing database structure
4. **ENVIRONMENT_VARIABLES.md**: Update when adding new configuration options

### Inline Comments

```javascript
// Good: Explain complex business logic
// Calculate asteroid risk based on orbital parameters and close approach data
// Uses NASA's Sentry risk assessment algorithm with custom thresholds
const calculateAsteroidRisk = (asteroidData) => {
  const {
    close_approach_data,
    estimated_diameter,
    is_potentially_hazardous_asteroid
  } = asteroidData;

  // Base risk score from minimum orbit intersection distance (MOID)
  const moidRisk = calculateMOIDRisk(close_approach_data);

  // Adjust for asteroid size (larger asteroids pose greater risk)
  const sizeRisk = calculateSizeRisk(estimated_diameter);

  // Apply hazard status multiplier
  const hazardMultiplier = is_potentially_hazardous_asteroid ? 2.0 : 1.0;

  return Math.min(10, (moidRisk + sizeRisk) * hazardMultiplier);
};
```

## Pull Request Process

### Before Submitting

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Write Code**
   - Follow all code standards
   - Add appropriate tests
   - Update documentation

3. **Test Your Changes**
   ```bash
   # Run full test suite
   npm test

   # Check code quality
   npm run lint

   # Test build process
   npm run build
   ```

4. **Commit Your Changes**
   ```bash
   # Stage your changes
   git add .

   # Commit with conventional message
   git commit -m "feat(component): add new APOD viewer with zoom functionality"
   ```

5. **Push Branch**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Template

```markdown
## Description
Brief description of changes and their purpose.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Coverage requirements met

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Environment variables documented (if applicable)
- [ ] Database schema documented (if applicable)

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Context
Any other context about the pull request.
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and code quality checks
2. **Code Review**: At least one maintainer must review the PR
3. **Testing**: PR must pass all automated tests
4. **Approval**: Maintainer approval required for merge
5. **Merge**: Squash and merge to main branch

## Issue Reporting

### Bug Reports

Use the following template for bug reports:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Actual Behavior**
A clear and concise description of what actually happened.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.0]
- Browser: [e.g. Chrome, Firefox]
- Node.js version: [e.g. 16.14.0]
- App version: [e.g. 1.2.0]

**Additional Context**
Add any other context about the problem here.
```

### Feature Requests

```markdown
**Feature Description**
A clear and concise description of the feature you want to add.

**Use Case**
Why would this feature be useful? What problem does it solve?

**Proposed Solution**
How do you envision this feature working?

**Alternatives Considered**
What other approaches did you consider?

**Additional Context**
Any other context, screenshots, or examples about the feature request.
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:

- Be respectful and considerate
- Use inclusive language
- Focus on constructive feedback
- Help others learn and grow
- Welcome newcomers and be patient

### Getting Help

If you need help or have questions:

1. **Check Documentation**: Review existing docs and README
2. **Search Issues**: Look for similar issues or PRs
3. **Create Discussion**: Start a GitHub Discussion for questions
4. **Join Community**: Participate in discussions and code reviews

### Recognition

Contributors are recognized for their valuable contributions:

- **Contributors List**: All contributors are listed in README.md
- **Release Notes**: Major contributors are mentioned in release notes
- **Community Spotlight**: Outstanding contributors featured in community updates

## Release Process

### Version Management

We use [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.2.0)
- **Patch**: Bug fixes (1.1.1)

### Release Checklist

1. **Code Review**: All changes reviewed and approved
2. **Testing**: Full test suite passes
3. **Documentation**: Updated and accurate
4. **Changelog**: Updated with all changes
5. **Version Bump**: Update version numbers in package.json files
6. **Tag Release**: Create git tag with version number
7. **Deploy**: Deploy to production environment

## Getting Help

### Resources

- **Project Documentation**: Check `/docs` directory
- **NASA API Documentation**: [https://api.nasa.gov](https://api.nasa.gov)
- **React Documentation**: [https://react.dev](https://react.dev)
- **Vite Documentation**: [https://vitejs.dev](https://vitejs.dev)
- **PostgreSQL Documentation**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)

### Contact

- **GitHub Issues**: Report bugs and request features
- **GitHub Discussions**: Ask questions and share ideas
- **Email**: nasa-system7-portal@example.com

---

Thank you for contributing to the NASA System 7 Portal! Your contributions help make space data accessible and engaging for everyone.

**Remember**: The goal of this project is to make NASA's amazing data accessible through a nostalgic, user-friendly interface. Every contribution helps advance this mission! 🚀