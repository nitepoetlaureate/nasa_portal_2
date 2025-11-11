# NASA System 7 Portal 🚀

A nostalgic web application that brings NASA's vast collection of space data to life through an authentic Apple System 7 interface.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, D3.js
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Testing**: Jest, Vitest, Cypress, Testing Library
- **Infrastructure**: Docker, Docker Compose, Python scripts
- **Type Safety**: TypeScript (with JSDoc fallbacks)

## Quick Start

### Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- PostgreSQL 13+
- Redis 6+
- Python 3.8+ (for infrastructure scripts)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd nasa-system7-portal
   npm run install-all
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your NASA API key and database credentials
   ```

3. **Start the database services:**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Initialize the database:**
   ```bash
   cd server && npm run db:init
   ```

5. **Run the application:**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Available Scripts

### Root
- `npm run install-all` - Install all dependencies
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build frontend for production
- `npm run start` - Start production server

### Server
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking
- `npm run db:init` - Initialize database
- `npm run security:audit` - Run security audit

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run Cypress E2E tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

### Required
- `NASA_API_KEY` - NASA API key from https://api.nasa.gov
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SESSION_SECRET` - Express session secret key
- `JWT_SECRET` - JWT signing secret

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `CLIENT_PORT` - Client dev server port (default: 3000)
- `LOG_LEVEL` - Winston log level

See `.env.example` for full list of available variables.

## API Documentation

See [docs/api/README.md](docs/api/README.md) for detailed API documentation.

## Testing

### Run All Tests
```bash
# Server tests
cd server && npm test

# Client tests  
cd client && npm test

# E2E tests
cd client && npm run test:e2e
```

### Coverage Goals
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Docker Development

### Build and run with Docker:
```bash
# Development
docker-compose -f docker-compose.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Security

This application implements multiple security layers:

- Helmet.js for HTTP security headers
- Express rate limiting
- Input validation and sanitization
- JWT authentication
- Session management
- CORS configuration
- Environment variable validation

Run security audit:
```bash
cd server && npm run security:audit
cd client && npm audit
```

## Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Make your changes and add tests
3. Run linting: `npm run lint`
4. Run tests: `npm test`
5. Commit with conventional commits: `feat: add amazing feature`
6. Push and create a Pull Request

This project uses:
- Conventional Commits
- ESLint for code quality
- Prettier for formatting
- Husky for pre-commit hooks

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Join our Discord community

---

Made with ❤️ by the NASA System 7 Portal Team
