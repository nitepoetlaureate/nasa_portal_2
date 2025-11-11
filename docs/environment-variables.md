# Environment Variables

## Required Variables

### NASA API
- `NASA_API_KEY` - Get from https://api.nasa.gov/

### Database
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://user:password@localhost:5432/nasa_portal`

### Redis
- `REDIS_URL` - Redis connection string
  - Format: `redis://localhost:6379`

### Authentication
- `SESSION_SECRET` - Express session secret (min 32 chars)
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `JWT_EXPIRES_IN` - Token expiration (default: "7d")

### OAuth (Optional)
- `GITHUB_CLIENT_ID` - GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

## Development Variables

- `NODE_ENV` - Set to "development" for dev mode
- `PORT` - Server port (default: 3001)
- `CLIENT_PORT` - Client dev server port (default: 3000)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)

## Production Variables

- `NODE_ENV` - Set to "production"
- `TRUST_PROXY` - Set to "1" if behind reverse proxy
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

## Security Variables

- `BCRYPT_ROUNDS` - Bcrypt salt rounds (default: 12)
- `SESSION_MAX_AGE` - Session max age in ms (default: 86400000)
- `CSRF_SECRET` - CSRF token secret
- `SECURITY_HEADERS` - Enable security headers (default: true)

## Monitoring Variables

- `ENABLE_METRICS` - Enable Prometheus metrics (default: false)
- `METRICS_PORT` - Metrics endpoint port (default: 9090)
- `SENTRY_DSN` - Sentry error tracking DSN
- `LOGGLY_TOKEN` - Loggly logging token

## Example .env File

```bash
# NASA API
NASA_API_KEY=DEMO_KEY

# Database
DATABASE_URL=postgresql://nasa_user:secure_password@localhost:5432/nasa_portal

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
SESSION_SECRET=your-super-secure-session-secret-min-32-chars
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars

# Development
NODE_ENV=development
PORT=3001
CLIENT_PORT=3000
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique secrets for each environment
- Rotate secrets regularly
- Use environment-specific variable files (`.env.production`, `.env.staging`)
- Consider using a secrets manager for production
