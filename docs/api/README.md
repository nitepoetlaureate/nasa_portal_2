# API Documentation

## Overview

The NASA System 7 Portal backend provides a secure proxy to NASA APIs with additional features like caching, rate limiting, and user authentication.

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "status": 400
}
```

## Rate Limiting

API requests are limited to:
- 100 requests per 15 minutes per IP
- 1000 requests per hour per authenticated user

## Endpoints

### NASA APIs

#### Astronomy Picture of the Day
- **Endpoint**: `GET /nasa/apod`
- **Auth**: Optional
- **Cache**: 1 hour

#### Near Earth Object Web Service
- **Endpoint**: `GET /nasa/neows`
- **Auth**: Required
- **Cache**: 24 hours

#### Mars Rover Photos
- **Endpoint**: `GET /nasa/mars-rover`
- **Auth**: Required
- **Cache**: 12 hours

### User Management

#### Get Current User
- **Endpoint**: `GET /user/profile`
- **Auth**: Required

#### Update User Preferences
- **Endpoint**: `PUT /user/preferences`
- **Auth**: Required

## WebSocket Events

Real-time updates are available via WebSocket at `/socket.io/`

### Events

#### `nasa:apod:update`
New APOD available

#### `user:session:expired`
User session has expired

## Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get APOD
try {
  const response = await api.get('/nasa/apod');
  console.log(response.data);
} catch (error) {
  console.error(error.response.data);
}
```

### cURL

```bash
# Get APOD
curl -X GET http://localhost:3001/api/nasa/apod \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Testing

Use the provided Postman collection in `/docs/api/postman-collection.json`

## Support

For API support, please open an issue on GitHub.
