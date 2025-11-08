-- NASA System 7 Portal - Database Security Hardening Script
-- This script implements security best practices for PostgreSQL

-- ==============================
-- SECURITY CONFIGURATION
-- ==============================

-- Enable SSL/TLS for all connections
-- Uncomment for production environments
-- ALTER SYSTEM SET ssl = 'on';
-- ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
-- ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';
-- SELECT pg_reload_conf();

-- Set strong encryption for password storage
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Configure connection limits
ALTER SYSTEM SET max_connections = '100';
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';

-- ==============================
-- USER SECURITY
-- ==============================

-- Create application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_app_user') THEN
        CREATE USER nasa_app_user
        WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD_2024!'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOINHERIT
        NOREPLICATION
        CONNECTION LIMIT 20;
    END IF;
END
$$;

-- Create readonly user for reporting
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_readonly_user') THEN
        CREATE USER nasa_readonly_user
        WITH PASSWORD 'CHANGE_ME_READONLY_PASSWORD_2024!'
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOINHERIT
        NOREPLICATION
        CONNECTION LIMIT 10;
    END IF;
END
$$;

-- Create admin user for migrations (not for application use)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_admin_user') THEN
        CREATE USER nasa_admin_user
        WITH PASSWORD 'CHANGE_ME_ADMIN_PASSWORD_2024!'
        SUPERUSER
        CREATEDB
        CREATEROLE
        NOINHERIT
        NOREPLICATION
        CONNECTION LIMIT 5;
    END IF;
END
$$;

-- ==============================
-- DATABASE AND SCHEMA SETUP
-- ==============================

-- Create secure database
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nasa_system7_secure') THEN
        CREATE DATABASE nasa_system7_secure
        WITH OWNER = nasa_admin_user
        ENCODING = 'UTF8'
        LC_COLLATE = 'en_US.utf8'
        LC_CTYPE = 'en_US.utf8'
        TABLESPACE = pg_default
        CONNECTION LIMIT = 50;
    END IF;
END
$$;

-- Connect to the database and revoke public permissions
\c nasa_system7_secure;

-- REVOKE ALL privileges on schema public from PUBLIC;
REVOKE ALL ON DATABASE nasa_system7_secure FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Grant only necessary permissions to application user
GRANT USAGE ON SCHEMA public TO nasa_app_user;
GRANT CREATE ON SCHEMA public TO nasa_app_user;
GRANT TEMPORARY ON DATABASE nasa_system7_secure TO nasa_app_user;

-- Grant read permissions to readonly user
GRANT USAGE ON SCHEMA public TO nasa_readonly_user;
GRANT TEMPORARY ON DATABASE nasa_system7_secure TO nasa_readonly_user;

-- ==============================
-- SECURE TABLE CREATION
-- ==============================

-- Enable row-level security
ALTER DATABASE nasa_system7_secure SET row_security = 'on';

-- Create audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_name TEXT,
    session_id TEXT,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- Grant permissions on audit log
GRANT SELECT ON security_audit_log TO nasa_readonly_user;
GRANT INSERT ON security_audit_log TO nasa_app_user;
GRANT UPDATE ON security_audit_log TO nasa_app_user;

-- Create secure version of saved_items table
DROP TABLE IF EXISTS saved_items CASCADE;
CREATE TABLE saved_items (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('apod', 'neo', 'resource', 'dataset')),
    title TEXT NOT NULL,
    url TEXT,
    category VARCHAR(100),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT, -- User who created the record
    ip_address INET, -- IP address of creator
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    checksum VARCHAR(64) -- SHA-256 hash for integrity
);

-- Create indexes for performance and security
CREATE INDEX idx_saved_items_type ON saved_items(type);
CREATE INDEX idx_saved_items_category ON saved_items(category);
CREATE INDEX idx_saved_items_created_at ON saved_items(created_at);
CREATE INDEX idx_saved_items_created_by ON saved_items(created_by);
CREATE INDEX idx_saved_items_is_public ON saved_items(is_public);
CREATE INDEX idx_saved_items_title_gin ON saved_items USING gin(to_tsvector('english', title));
CREATE UNIQUE INDEX idx_saved_items_checksum ON saved_items(checksum) WHERE checksum IS NOT NULL;

-- Create secure version of saved_searches table
DROP TABLE IF EXISTS saved_searches CASCADE;
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    query_string TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'general' CHECK (search_type IN ('general', 'advanced', 'filtered')),
    result_count INTEGER DEFAULT 0 CHECK (result_count >= 0),
    search_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET,
    session_id TEXT,
    user_id TEXT,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT TRUE
);

-- Create indexes for searches
CREATE INDEX idx_saved_searches_search_time ON saved_searches(search_time);
CREATE INDEX idx_saved_searches_search_type ON saved_searches(search_type);
CREATE INDEX idx_saved_searches_ip_address ON saved_searches(ip_address);
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);

-- Create secure version of api_cache table
DROP TABLE IF EXISTS api_cache CASCADE;
CREATE TABLE api_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 0 CHECK (hit_count >= 0),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_log JSONB DEFAULT '[]'
);

-- Create indexes for cache
CREATE INDEX idx_api_cache_expires_at ON api_cache(expires_at);
CREATE INDEX idx_api_cache_last_accessed ON api_cache(last_accessed);

-- Create secure version of user_sessions table
DROP TABLE IF EXISTS user_sessions CASCADE;
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    session_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id TEXT,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);

-- ==============================
-- SECURITY FUNCTIONS AND TRIGGERS
-- ==============================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to log changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO security_audit_log (
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        user_name,
        session_id
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        current_user,
        current_setting('application_name', true)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to generate checksum for data integrity
CREATE OR REPLACE FUNCTION generate_checksum()
RETURNS TRIGGER AS $$
BEGIN
    NEW.checksum = encode(sha256(
        NEW.id ||
        COALESCE(NEW.type, '') ||
        COALESCE(NEW.title, '') ||
        COALESCE(NEW.url, '') ||
        COALESCE(NEW.description, '') ||
        COALESCE(NEW.created_at::text, '')
    ), 'hex');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- TRIGGERS FOR SECURITY
-- ==============================

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_saved_items_updated_at
    BEFORE UPDATE ON saved_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for audit logging
CREATE TRIGGER audit_saved_items
    AFTER INSERT OR UPDATE OR DELETE ON saved_items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_sessions
    AFTER INSERT OR UPDATE OR DELETE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Trigger for data integrity
CREATE TRIGGER generate_saved_items_checksum
    BEFORE INSERT OR UPDATE ON saved_items
    FOR EACH ROW EXECUTE FUNCTION generate_checksum();

-- ==============================
-- VIEWS FOR SECURITY
-- ==============================

-- Create secure view for public data only
CREATE OR REPLACE VIEW public_saved_items AS
SELECT id, type, title, url, category, description, metadata, created_at, updated_at
FROM saved_items
WHERE is_public = TRUE
AND expires_at > CURRENT_TIMESTAMP;

GRANT SELECT ON public_saved_items TO nasa_readonly_user;
GRANT SELECT ON public_saved_items TO nasa_app_user;

-- Create view for user's own data only
CREATE OR REPLACE VIEW user_saved_items AS
SELECT id, type, title, url, category, description, metadata, created_at, updated_at
FROM saved_items
WHERE created_by = current_user;

-- ==============================
-- ROW LEVEL SECURITY
-- ==============================

-- Enable Row Level Security on sensitive tables
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY user_saved_items_policy ON saved_items
    FOR ALL TO nasa_app_user
    USING (created_by = current_user OR is_public = TRUE)
    WITH CHECK (created_by = current_user OR is_public = TRUE);

CREATE POLICY user_sessions_policy ON user_sessions
    FOR ALL TO nasa_app_user
    USING (user_id = current_user OR session_id = current_setting('application_name', true))
    WITH CHECK (user_id = current_user);

CREATE POLICY user_searches_policy ON saved_searches
    FOR ALL TO nasa_app_user
    USING (user_id = current_user)
    WITH CHECK (user_id = current_user);

-- ==============================
-- GRANT PERMISSIONS
-- ==============================

-- Grant specific permissions to application user
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_items TO nasa_app_user;
GRANT SELECT, INSERT ON saved_searches TO nasa_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_cache TO nasa_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO nasa_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nasa_app_user;

-- Grant read-only permissions to readonly user
GRANT SELECT ON saved_items TO nasa_readonly_user;
GRANT SELECT ON saved_searches TO nasa_readonly_user;
GRANT SELECT ON api_cache TO nasa_readonly_user;
GRANT SELECT ON user_sessions TO nasa_readonly_user;
GRANT SELECT ON security_audit_log TO nasa_readonly_user;

-- Grant all permissions to admin user (for migrations only)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO nasa_admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO nasa_admin_user;

-- ==============================
-- SECURITY MAINTENANCE
-- ==============================

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions
    WHERE expires_at < CURRENT_TIMESTAMP
    OR (last_activity < CURRENT_TIMESTAMP - INTERVAL '24 hours' AND is_active = FALSE);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    INSERT INTO security_audit_log (action, table_name, record_id)
    VALUES ('CLEANUP', 'user_sessions', deleted_count::text);

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired cache
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM api_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    INSERT INTO security_audit_log (action, table_name, record_id)
    VALUES ('CLEANUP', 'api_cache', deleted_count::text);

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==============================
-- SECURITY MONITORING QUERIES
-- ==============================

-- Monitor failed login attempts
-- SELECT * FROM security_audit_log WHERE action LIKE '%LOGIN%' AND success = FALSE ORDER BY event_timestamp DESC;

-- Monitor suspicious activity
-- SELECT ip_address, COUNT(*) as request_count
-- FROM saved_searches
-- WHERE search_time > CURRENT_TIMESTAMP - INTERVAL '1 hour'
-- GROUP BY ip_address
-- HAVING COUNT(*) > 100;

-- Monitor data integrity violations
-- SELECT * FROM saved_items WHERE checksum IS NULL;

-- Monitor session activity
-- SELECT user_id, ip_address, COUNT(*) as active_sessions
-- FROM user_sessions
-- WHERE is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
-- GROUP BY user_id, ip_address
-- HAVING COUNT(*) > 5;

COMMIT;

-- ==============================
-- FINAL SECURITY NOTES
-- ==============================

-- 1. Change all default passwords immediately
-- 2. Enable SSL/TLS for all database connections
-- 3. Implement regular backup and restore testing
-- 4. Set up monitoring for security events
-- 5. Review and rotate credentials regularly
-- 6. Implement network-level firewall rules
-- 7. Enable PostgreSQL audit logging
-- 8. Regular security updates and patches