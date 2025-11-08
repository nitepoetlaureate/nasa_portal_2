-- NASA System 7 Portal Database Initialization
-- This script creates the initial database schema for the NASA data portal

-- Create database if it doesn't exist (PostgreSQL specific)
-- Note: This line should be run with superuser privileges
-- CREATE DATABASE IF NOT EXISTS nasa_system7_portal;

-- Connect to the database (uncomment if running as standalone script)
-- \c nasa_system7_portal;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing tables if they exist (for development/reset)
DROP TABLE IF EXISTS api_cache CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS saved_items CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS space_objects CASCADE;

-- Create space_objects table for NASA celestial data
CREATE TABLE space_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nasa_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    object_type VARCHAR(100) NOT NULL,
    classification VARCHAR(100),
    discovery_date DATE,
    orbital_parameters JSONB,
    physical_characteristics JSONB,
    observation_data JSONB,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for space_objects
CREATE INDEX idx_space_objects_nasa_id ON space_objects(nasa_id);
CREATE INDEX idx_space_objects_type ON space_objects(object_type);
CREATE INDEX idx_space_objects_name_gin ON space_objects USING gin(to_tsvector('english', name));
CREATE INDEX idx_space_objects_last_updated ON space_objects(last_updated);

-- Create saved_items table for user favorites
CREATE TABLE saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    item_id VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    thumbnail_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for saved_items
CREATE INDEX idx_saved_items_session_id ON saved_items(session_id);
CREATE INDEX idx_saved_items_item_id ON saved_items(item_id);
CREATE INDEX idx_saved_items_item_type ON saved_items(item_type);
CREATE INDEX idx_saved_items_created_at ON saved_items(created_at);

-- Create saved_searches table for search history
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    query_string TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'general',
    result_count INTEGER DEFAULT 0,
    search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET,
    filters JSONB
);

-- Create indexes for saved_searches
CREATE INDEX idx_saved_searches_session_id ON saved_searches(session_id);
CREATE INDEX idx_saved_searches_search_time ON saved_searches(search_time);
CREATE INDEX idx_saved_searches_search_type ON saved_searches(search_type);

-- Create api_cache table for NASA API response caching
CREATE TABLE api_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    api_endpoint VARCHAR(255) NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 0,
    last_hit TIMESTAMP WITH TIME ZONE
);

-- Create indexes for api_cache
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_cache_api_endpoint ON api_cache(api_endpoint);
CREATE INDEX idx_api_cache_created_at ON api_cache(created_at);
CREATE INDEX idx_api_cache_hit_count ON api_cache(hit_count DESC);

-- Create user_sessions table for session management
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for user_sessions
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_updated_at ON user_sessions(updated_at);

-- Create audit_log table for security and monitoring
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit_log
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_log_session_id ON audit_log(session_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_resource_type ON audit_log(resource_type);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for development (optional)
INSERT INTO space_objects (nasa_id, name, object_type, classification, discovery_date, orbital_parameters, physical_characteristics) VALUES
('EARTH', 'Earth', 'Planet', 'Terrestrial', '0001-01-01',
 '{"semi_major_axis": 149597870.7, "eccentricity": 0.0167, "inclination": 0.0, "period": 365.25}',
 '{"mass": 5.972e24, "radius": 6371, "density": 5.513, "albedo": 0.367}'),
('MOON', 'Moon', 'Satellite', 'Natural Satellite', '0001-01-01',
 '{"semi_major_axis": 384400, "eccentricity": 0.0549, "inclination": 5.145, "period": 27.32}',
 '{"mass": 7.342e22, "radius": 1737.4, "density": 3.344, "albedo": 0.136}'),
('MARS', 'Mars', 'Planet', 'Terrestrial', '0001-01-01',
 '{"semi_major_axis": 227939200, "eccentricity": 0.0934, "inclination": 1.85, "period": 687.0}',
 '{"mass": 6.417e23, "radius": 3389.5, "density": 3.933, "albedo": 0.250}'),
('JUPITER', 'Jupiter', 'Planet', 'Gas Giant', '0001-01-01',
 '{"semi_major_axis": 778299000, "eccentricity": 0.0489, "inclination": 1.303, "period": 4332.59}',
 '{"mass": 1.898e27, "radius": 69911, "density": 1.326, "albedo": 0.520}'),
('VENUS', 'Venus', 'Planet', 'Terrestrial', '0001-01-01',
 '{"semi_major_axis": 108208000, "eccentricity": 0.0068, "inclination": 3.39, "period": 224.70}',
 '{"mass": 4.867e24, "radius": 6051.8, "density": 5.243, "albedo": 0.750}')
ON CONFLICT (nasa_id) DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nasa_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nasa_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO nasa_user;

-- Add helpful comments
COMMENT ON DATABASE nasa_system7_portal IS 'NASA System 7 Portal Database - Space exploration data and user interactions';

-- Report successful completion
DO $$
BEGIN
    RAISE NOTICE ' NASA System 7 Portal database initialization completed successfully';
    RAISE NOTICE '=Ê Sample space object data inserted for development';
END $$;