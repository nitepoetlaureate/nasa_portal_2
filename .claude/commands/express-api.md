# Express API Development

Create and optimize Express.js API endpoints for NASA data services with security and performance best practices.

## Usage

```bash
/express-api EndpointName [--method=GET|POST|PUT|DELETE] [--auth] [--cache] [--validate]
```

## Options

- `--method` - HTTP method (default: GET)
- `--auth` - Add authentication middleware
- `--cache` - Add caching middleware
- `--validate` - Add request validation with express-validator

## Generated Features

- ✅ Express router setup
- ✅ Input validation and sanitization
- ✅ Error handling middleware
- ✅ Rate limiting protection
- ✅ CORS configuration
- ✅ Security headers (helmet)
- ✅ API documentation with JSDoc
- ✅ Unit tests with Jest and Supertest
- ✅ Performance monitoring hooks

## NASA API Integration

Endpoints will include:
- NASA API key validation
- JPL Horizons system integration
- APOD (Astronomy Picture of Day) data fetching
- Near-Earth Object Web Service (NeoWs) integration
- Space weather data processing
- Astronomical data caching strategies

## Security Features

- JWT token authentication (if --auth)
- Request rate limiting
- Input sanitization against injection
- SQL injection prevention for PostgreSQL
- XSS protection headers
- HTTPS enforcement in production

## Performance Optimizations

- Redis caching for frequently accessed data
- Database connection pooling
- Compression middleware
- Response compression
- Background job processing for heavy requests
- Circuit breaker pattern for external APIs

## Example Generated Endpoint

```javascript
/**
 * @api {get} /api/nasa/apod Get Astronomy Picture of the Day
 * @apiName GetAPOD
 * @apiGroup NASA
 * @apiDescription Fetches NASA's Astronomy Picture of the Day with metadata
 * @apiSuccess {Object} data APOD data with image, title, and explanation
 */
router.get('/apod',
  authMiddleware,           // if --auth
  rateLimitMiddleware,      // always included
  cacheMiddleware('1h'),    // if --cache
  validateAPODRequest,      // if --validate
  async (req, res, next) => {
    try {
      const apodData = await nasaService.getAPOD(req.query.date);
      res.json({ success: true, data: apodData });
    } catch (error) {
      next(error);
    }
  }
);
```