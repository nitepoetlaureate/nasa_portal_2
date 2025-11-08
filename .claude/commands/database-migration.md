# Database Migration Management

Create and manage PostgreSQL database migrations for the NASA System 7 Portal with rollback capabilities.

## Usage

```bash
/database-migration MigrationName [--create] [--up] [--down] [--seed]
```

## Options

- `--create` - Create a new migration file
- `--up` - Run pending migrations
- `--down` - Rollback last migration
- `--seed` - Seed database with sample NASA data

## Migration Features

- ✅ PostgreSQL migration scripts
- ✅ Rollback capabilities
- ✅ Database backup before migrations
- ✅ Migration status tracking
- ✅ Environment-specific configurations
- ✅ NASA data schema support

## NASA Data Tables

Common migrations include:
- Space missions and spacecraft data
- Astronomical objects and classifications
- Observation records and metadata
- User favorites and saved searches
- API request logs and analytics
- Caching tables for NASA API responses

## Generated Migration Structure

```sql
-- migrations/001_create_space_objects.sql
-- Up migration
CREATE TABLE space_objects (
    id SERIAL PRIMARY KEY,
    nasa_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    object_type VARCHAR(100) NOT NULL,
    discovery_date DATE,
    orbital_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_space_objects_type ON space_objects(object_type);
CREATE INDEX idx_space_objects_nasa_id ON space_objects(nasa_id);

-- Down migration
DROP TABLE IF EXISTS space_objects;
```

## Seeding Data

Sample NASA data for development:
- Planets and dwarf planets
- Notable asteroids and comets
- Space missions (past, present, planned)
- Famous astronauts and their achievements
- Historical space exploration milestones

## Safety Features

- Automatic database backup before migrations
- Transaction wrapping for atomic operations
- Rollback verification
- Migration dependency tracking
- Environment-specific migration files
- Dry-run mode for testing

## Performance Optimization

- Index creation for NASA data queries
- Partitioned tables for large datasets
- Materialized views for complex queries
- Connection pooling configuration
- Query performance monitoring