# Database Schema Documentation

## Overview

The NASA System 7 Portal uses PostgreSQL as its primary database with an optimized schema designed for storing NASA space data, user preferences, and application metrics. The database is designed for high performance, scalability, and efficient querying of astronomical data.

## Architecture

### Database Management
- **Connection Pooling**: Efficient connection management with pool size configuration
- **Fallback Mode**: Graceful degradation when database is unavailable
- **Migration System**: Automated schema versioning and updates
- **Backup Strategy**: Regular backups with point-in-time recovery options

### Performance Features
- **Indexing Strategy**: Optimized indexes for common query patterns
- **Partitioning**: Time-based partitioning for large datasets
- **JSONB Storage**: Efficient storage of NASA API responses
- **Full-Text Search**: Built-in PostgreSQL full-text search capabilities

## Tables

### 1. saved_items

Stores user-saved NASA content including APOD images, asteroid data, and resource bookmarks.

```sql
CREATE TABLE saved_items (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    category VARCHAR(100),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Columns
- **id** (VARCHAR(255), Primary Key): Unique identifier combining content type and NASA ID
- **type** (VARCHAR(50), Not Null): Content type (apod, neo, mars, resource, etc.)
- **title** (TEXT, Not Null): Item title from NASA API
- **url** (TEXT, Nullable): Direct URL to NASA resource
- **category** (VARCHAR(100), Nullable): NASA data category classification
- **description** (TEXT, Nullable): Detailed description or explanation
- **metadata** (JSONB, Nullable): Full NASA API response and additional data
- **created_at** (TIMESTAMP WITH TIME ZONE): When item was saved
- **updated_at** (TIMESTAMP WITH TIME ZONE): Last modification timestamp

#### Indexes
```sql
CREATE INDEX idx_saved_items_type ON saved_items(type);
CREATE INDEX idx_saved_items_category ON saved_items(category);
CREATE INDEX idx_saved_items_created_at ON saved_items(created_at);
CREATE INDEX idx_saved_items_title_gin ON saved_items USING gin(to_tsvector('english', title));
```

#### Example Data
```json
{
  "id": "apod_2024-01-15",
  "type": "apod",
  "title": "Hubble Views Grand Design Spiral Galaxy M81",
  "url": "https://apod.nasa.gov/apod/image/2408/M81_Hubble_3000.jpg",
  "category": "galaxy",
  "description": "The sharpest view ever taken of the large grand-design spiral galaxy M81...",
  "metadata": {
    "hdurl": "https://apod.nasa.gov/apod/image/2408/M81_Hubble_6000.jpg",
    "media_type": "image",
    "date": "2024-01-15",
    "copyright": "NASA, ESA, J. Dalcanton",
    "service_version": "v1",
    "nasa_api_response": { ... }
  }
}
```

### 2. saved_searches

Tracks user search queries for analytics and improved recommendations.

```sql
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    query_string TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'general',
    result_count INTEGER DEFAULT 0,
    search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);
```

#### Columns
- **id** (SERIAL, Primary Key): Auto-incrementing search identifier
- **query_string** (TEXT, Not Null): Search query text
- **search_type** (VARCHAR(50), Default: 'general'): Type of search (neo, apod, general)
- **result_count** (INTEGER, Default: 0): Number of results returned
- **search_time** (TIMESTAMP WITH TIME ZONE): When search was performed
- **user_agent** (TEXT, Nullable): Browser user agent string
- **ip_address** (INET, Nullable): User IP address (for analytics)

#### Indexes
```sql
CREATE INDEX idx_saved_searches_search_time ON saved_searches(search_time);
CREATE INDEX idx_saved_searches_search_type ON saved_searches(search_type);
CREATE INDEX idx_saved_searches_query_gin ON saved_searches USING gin(to_tsvector('english', query_string));
```

#### Example Data
```json
{
  "id": 12345,
  "query_string": "mars rover curiosity",
  "search_type": "mars",
  "result_count": 15,
  "search_time": "2024-01-15T14:30:00Z",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "ip_address": "192.168.1.100"
}
```

### 3. api_cache

Intelligent caching system for NASA API responses to improve performance and reduce rate limiting.

```sql
CREATE TABLE api_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 0
);
```

#### Columns
- **cache_key** (VARCHAR(255), Primary Key): Unique cache key (endpoint + parameters)
- **cache_data** (JSONB, Not Null): Cached NASA API response data
- **expires_at** (TIMESTAMP WITH TIME ZONE, Not Null): Cache expiration time
- **created_at** (TIMESTAMP WITH TIME ZONE): When cache entry was created
- **hit_count** (INTEGER, Default: 0): Number of times cache was accessed

#### Indexes
```sql
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_cache_created_at ON api_cache(created_at);
CREATE INDEX idx_api_cache_hit_count ON api_cache(hit_count DESC);
```

#### Example Data
```json
{
  "cache_key": "nasa_apod_2024-01-15_hd",
  "cache_data": {
    "title": "Hubble Views Grand Design Spiral Galaxy M81",
    "explanation": "The sharpest view ever taken...",
    "url": "https://apod.nasa.gov/apod/image/2408/M81_Hubble_3000.jpg",
    "hdurl": "https://apod.nasa.gov/apod/image/2408/M81_Hubble_6000.jpg",
    "media_type": "image",
    "date": "2024-01-15",
    "copyright": "NASA, ESA, J. Dalcanton",
    "service_version": "v1"
  },
  "expires_at": "2024-01-15T15:00:00Z",
  "created_at": "2024-01-15T14:00:00Z",
  "hit_count": 127
}
```

### 4. user_sessions

Session management for user preferences and authentication (future enhancement).

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### Columns
- **session_id** (VARCHAR(255), Primary Key): Unique session identifier
- **session_data** (JSONB, Nullable): Session preferences and state data
- **created_at** (TIMESTAMP WITH TIME ZONE): Session creation time
- **updated_at** (TIMESTAMP WITH TIME ZONE): Last activity timestamp
- **expires_at** (TIMESTAMP WITH TIME ZONE, Not Null): Session expiration

#### Indexes
```sql
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at);
```

#### Example Data
```json
{
  "session_id": "sess_abc123def456",
  "session_data": {
    "theme": "system7",
    "animations_enabled": true,
    "sounds_enabled": false,
    "language": "en",
    "last_apod_viewed": "2024-01-15",
    "saved_categories": ["galaxy", "mars", "asteroid"]
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "expires_at": "2024-01-22T10:00:00Z"
}
```

## Database Functions and Triggers

### Automatic Timestamp Updates

#### update_updated_at_column Function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

#### Triggers for Automatic Updates
```sql
-- Saved items timestamp trigger
CREATE TRIGGER update_saved_items_updated_at
    BEFORE UPDATE ON saved_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User sessions timestamp trigger
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Indexing Strategy

### Primary Indexes
All tables have primary key indexes created automatically by PostgreSQL.

### Secondary Indexes

#### Search Optimization
- **Full-Text Search**: GIN indexes on title and query columns
- **Date Range**: B-tree indexes on timestamp columns
- **Category Filtering**: Indexes on type and category columns

#### Performance Indexes
- **Cache Performance**: Composite indexes on expiration and hit count
- **Query Optimization**: Covering indexes for common query patterns

### Index Analysis
```sql
-- Analyze index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Analyze unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

## Data Types and Storage

### JSONB for NASA API Data
- **Storage**: Binary JSON format for efficiency
- **Indexing**: GIN indexes for fast JSON queries
- **Validation**: Schema validation for consistent data structure

### Full-Text Search
- **Language**: English text search configuration
- **Stemming**: Automatic word stemming and normalization
- **Ranking**: Relevance ranking for search results

### Time Zone Handling
- **Storage**: All timestamps stored in UTC
- **Display**: Converted to user's local time zone
- **Indexing**: Time zone aware indexing for date queries

## Query Patterns and Optimization

### Common Queries

#### 1. Recent Saved Items by Type
```sql
SELECT
    id,
    title,
    created_at,
    metadata->>'url' as url
FROM saved_items
WHERE type = 'apod'
ORDER BY created_at DESC
LIMIT 10;
```

#### 2. Search Analytics
```sql
SELECT
    search_type,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results
FROM saved_searches
WHERE search_time > NOW() - INTERVAL '7 days'
GROUP BY search_type
ORDER BY search_count DESC;
```

#### 3. Popular Saved Items
```sql
SELECT
    type,
    category,
    COUNT(*) as save_count
FROM saved_items
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type, category
ORDER BY save_count DESC;
```

#### 4. Cache Performance
```sql
SELECT
    COUNT(*) as total_entries,
    AVG(hit_count) as avg_hits,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries
FROM api_cache;
```

### Query Optimization

#### 1. Partitioning for Large Tables
```sql
-- Partition saved_searches by month
CREATE TABLE saved_searches_y2024m01 PARTITION OF saved_searches
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### 2. Materialized Views for Analytics
```sql
CREATE MATERIALIZED VIEW daily_search_stats AS
SELECT
    DATE(search_time) as search_date,
    search_type,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results
FROM saved_searches
GROUP BY DATE(search_time), search_type;
```

## Data Migration and Seeding

### Database Initialization Script
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create optimized schema
DROP TABLE IF EXISTS saved_items, saved_searches, api_cache, user_sessions CASCADE;

-- Create tables with optimized structure
-- (See CREATE TABLE statements above)

-- Create indexes
-- (See CREATE INDEX statements above)

-- Create functions and triggers
-- (See function and trigger definitions above)
```

### Sample Data Seeding
```sql
-- Sample APOD entries
INSERT INTO saved_items (id, type, title, url, category, description, metadata) VALUES
('apod_sample_1', 'apod', 'Pillars of Creation', 'https://apod.nasa.gov/apod/image/2408/pillars.jpg', 'nebula', 'Star-forming region in the Eagle Nebula', '{"media_type": "image", "date": "2024-01-10"}'),
('apod_sample_2', 'apod', 'Mars Curiosity Selfie', 'https://apod.nasa.gov/apod/image/2408/mars_selfie.jpg', 'mars', 'Curiosity rover takes self-portrait', '{"media_type": "image", "date": "2024-01-12"}');

-- Sample search entries
INSERT INTO saved_searches (query_string, search_type, result_count) VALUES
('andromeda galaxy', 'general', 8),
('mars rover photos', 'mars', 24),
('near earth asteroids', 'neo', 156),
('hubble images', 'general', 42);
```

## Performance Monitoring

### Database Statistics
```sql
-- Table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Query Performance
```sql
-- Slow queries (requires pg_stat_statements extension)
SELECT
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Backup and Recovery

### Backup Strategy
```bash
# Full database backup
pg_dump -h localhost -U postgres -d nasa_system7 -f backup_$(date +%Y%m%d).sql

# Schema-only backup
pg_dump -h localhost -U postgres -d nasa_system7 -s -f schema_$(date +%Y%m%d).sql

# Data-only backup
pg_dump -h localhost -U postgres -d nasa_system7 -a -f data_$(date +%Y%m%d).sql
```

### Recovery Process
```bash
# Restore from backup
psql -h localhost -U postgres -d nasa_system7 -f backup_20240115.sql

# Point-in-time recovery (if using WAL)
pg_basebackup -h localhost -D /backup/base -U postgres -v -P
```

## Scaling Considerations

### Read Replicas
- **Analytics Queries**: Offload to read replicas
- **Geographic Distribution**: Replicas for different regions
- **Load Distribution**: Balance read traffic across replicas

### Partitioning Strategy
- **Time-based Partitioning**: For tables with large time-series data
- **Hash Partitioning**: For distributing data across multiple disks
- **Range Partitioning**: For efficient range queries

### Connection Pooling
```javascript
// Example connection pool configuration
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Security Considerations

### Data Encryption
- **Encryption at Rest**: PostgreSQL transparent data encryption (TDE)
- **Encryption in Transit**: SSL/TLS for all database connections
- **Column Encryption**: Sensitive data encryption using pgcrypto

### Access Control
```sql
-- Read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE nasa_system7 TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;

-- Application user with limited privileges
CREATE USER app_user WITH PASSWORD 'app_password';
GRANT CONNECT ON DATABASE nasa_system7 TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON saved_items TO app_user;
GRANT SELECT, INSERT ON saved_searches TO app_user;
```

### Audit Logging
```sql
-- Enable statement logging
ALTER SYSTEM SET log_statement = 'mod';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

## Troubleshooting

### Common Issues

#### 1. Slow Queries
```sql
-- Identify slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 5;

-- Analyze query execution plan
EXPLAIN ANALYZE SELECT * FROM saved_items WHERE type = 'apod';
```

#### 2. High Memory Usage
```sql
-- Check table and index sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### 3. Connection Issues
```sql
-- Check active connections
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Check connection pool status
SELECT * FROM pg_stat_activity WHERE datname = 'nasa_system7';
```

## Future Enhancements

### Planned Schema Extensions

#### 1. User Authentication
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);
```

#### 2. Enhanced Metadata
```sql
CREATE TABLE nasa_metadata (
    id VARCHAR(255) PRIMARY KEY,
    source_system VARCHAR(50) NOT NULL,
    retrieval_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_data JSONB NOT NULL,
    processed_data JSONB,
    status VARCHAR(20) DEFAULT 'pending'
);
```

#### 3. Analytics and Metrics
```sql
CREATE TABLE usage_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC NOT NULL,
    dimensions JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Advanced Features
- **Full-text search with ranking**
- **Geospatial queries for Earth observation data**
- **Time-series optimization for historical data**
- **Graph database integration for relationship queries**

---

**Last Updated**: January 15, 2024
**Version**: 1.2.0
**Compatibility**: PostgreSQL 12+