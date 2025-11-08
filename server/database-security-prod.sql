-- NASA System 7 Portal - Production Database Security Configuration
-- This script sets up secure database access and permissions for production

-- ====================================================================
-- 1. DATABASE SECURITY SETUP
-- ====================================================================

-- Create secure application user with limited privileges
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_app_user') THEN
        CREATE ROLE nasa_app_user WITH LOGIN
        PASSWORD 'CHANGE_THIS_APP_PASSWORD_IN_PRODUCTION'
        NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

-- Create read-only user for reporting and analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_readonly_user') THEN
        CREATE ROLE nasa_readonly_user WITH LOGIN
        PASSWORD 'CHANGE_THIS_READONLY_PASSWORD_IN_PRODUCTION'
        NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

-- Create backup user with limited permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_backup_user') THEN
        CREATE ROLE nasa_backup_user WITH LOGIN
        PASSWORD 'CHANGE_THIS_BACKUP_PASSWORD_IN_PRODUCTION'
        NOSUPERUSER NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

-- ====================================================================
-- 2. SECURE SCHEMA CONFIGURATION
-- ====================================================================

-- Create secure schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS app_data AUTHORIZATION nasa_app_user;
CREATE SCHEMA IF NOT EXISTS app_cache AUTHORIZATION nasa_app_user;
CREATE SCHEMA IF NOT EXISTS app_logs AUTHORIZATION nasa_app_user;

-- Revoke public access to default schema
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA information_schema FROM PUBLIC;

-- Grant limited public access
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT USAGE ON SCHEMA information_schema TO PUBLIC;

-- ====================================================================
-- 3. TABLE SECURITY AND PERMISSIONS
-- ====================================================================

-- Enable Row Level Security for sensitive tables
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table (users can only see their own data)
DROP POLICY IF EXISTS users_own_data ON users;
CREATE POLICY users_own_data ON users
    FOR ALL TO nasa_app_user
    USING (id = current_setting('app.current_user_id')::uuid);

-- Create RLS policies for user_sessions
DROP POLICY IF EXISTS sessions_own_data ON user_sessions;
CREATE POLICY sessions_own_data ON user_sessions
    FOR ALL TO nasa_app_user
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Grant specific permissions to application user
GRANT CONNECT ON DATABASE nasa_system7_prod TO nasa_app_user;
GRANT USAGE ON SCHEMA public TO nasa_app_user;
GRANT USAGE ON SCHEMA app_data TO nasa_app_user;
GRANT USAGE ON SCHEMA app_cache TO nasa_app_user;
GRANT USAGE ON SCHEMA app_logs TO nasa_app_user;

-- Grant table permissions to application user
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        OR table_schema = 'app_data'
        OR table_schema = 'app_cache'
        OR table_schema = 'app_logs'
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO nasa_app_user',
                      tbl.table_schema, tbl.table_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO nasa_app_user',
                      tbl.table_schema, replace(tbl.table_name, 's', '') || '_id_seq');
    END LOOP;
END $$;

-- Grant read-only permissions to readonly user
GRANT CONNECT ON DATABASE nasa_system7_prod TO nasa_readonly_user;
GRANT USAGE ON SCHEMA public TO nasa_readonly_user;
GRANT USAGE ON SCHEMA app_data TO nasa_readonly_user;

DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        OR table_schema = 'app_data'
    LOOP
        EXECUTE format('GRANT SELECT ON TABLE %I.%I TO nasa_readonly_user',
                      tbl.table_schema, tbl.table_name);
    END LOOP;
END $$;

-- Grant backup permissions to backup user
GRANT CONNECT ON DATABASE nasa_system7_prod TO nasa_backup_user;
GRANT USAGE ON SCHEMA public TO nasa_backup_user;
GRANT USAGE ON SCHEMA app_data TO nasa_backup_user;

DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        OR table_schema = 'app_data'
    LOOP
        EXECUTE format('GRANT SELECT ON TABLE %I.%I TO nasa_backup_user',
                      tbl.table_schema, tbl.table_name);
    END LOOP;
END $$;

-- ====================================================================
-- 4. SECURITY AUDIT AND LOGGING
-- ====================================================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    user_id UUID,
    user_email VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID
);

-- Grant permissions on audit logs
GRANT SELECT, INSERT ON audit_logs TO nasa_app_user;
GRANT SELECT ON audit_logs TO nasa_readonly_user;
GRANT SELECT ON audit_logs TO nasa_backup_user;

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, operation, old_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, operation, old_values, new_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, operation, new_values, timestamp)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for sensitive tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_user_sessions_trigger ON user_sessions;
CREATE TRIGGER audit_user_sessions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ====================================================================
-- 5. CONNECTION SECURITY
-- ====================================================================

-- Create secure connection settings
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/var/lib/postgresql/server.crt';
ALTER SYSTEM SET ssl_key_file = '/var/lib/postgresql/server.key';
ALTER SYSTEM SET ssl_ca_file = '/var/lib/postgresql/root.crt';

-- Configure connection limits
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET max_user_connections = 50;

-- Set statement timeout for queries
ALTER SYSTEM SET statement_timeout = '300s';
ALTER SYSTEM SET lock_timeout = '30s';

-- ====================================================================
-- 6. INDEX AND PERFORMANCE SECURITY
-- ====================================================================

-- Create secure indexes
CREATE INDEX IF NOT EXISTS idx_users_email_secure ON users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs (table_name, operation);

-- ====================================================================
-- 7. VIEWS FOR SECURE DATA ACCESS
-- ====================================================================

-- Create read-only views for sensitive data
CREATE OR REPLACE VIEW user_profile_view AS
SELECT
    id,
    email,
    username,
    created_at,
    updated_at,
    last_login
FROM users
WHERE deleted_at IS NULL;

GRANT SELECT ON user_profile_view TO nasa_readonly_user;
GRANT SELECT ON user_profile_view TO nasa_app_user;

-- Create analytics view for NASA data
CREATE OR REPLACE VIEW nasa_data_analytics AS
SELECT
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as api_calls,
    endpoint,
    COUNT(DISTINCT user_id) as unique_users
FROM api_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), endpoint
ORDER BY date DESC;

GRANT SELECT ON nasa_data_analytics TO nasa_readonly_user;

-- ====================================================================
-- 8. SECURITY MONITORING FUNCTIONS
-- ====================================================================

-- Function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS TABLE(
    user_email VARCHAR(255),
    suspicious_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.email,
        COUNT(al.id) as suspicious_count,
        MAX(al.timestamp) as last_activity
    FROM audit_logs al
    JOIN users u ON u.id = al.user_id
    WHERE al.timestamp >= NOW() - INTERVAL '1 hour'
    GROUP BY u.email
    HAVING COUNT(al.id) > 100
    ORDER BY suspicious_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database security status
CREATE OR REPLACE FUNCTION get_database_security_status()
RETURNS JSONB AS $$
DECLARE
    status JSONB;
BEGIN
    SELECT jsonb_build_object(
        'rls_enabled', COUNT(*) FILTER (WHERE rowsecurity = true),
        'total_tables', COUNT(*),
        'secure_connections', current_setting('ssl')::boolean,
        'connection_count', COUNT(*) FROM pg_stat_activity
    ) INTO status
    FROM pg_tables
    WHERE schemaname IN ('public', 'app_data', 'app_cache', 'app_logs');

    RETURN status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION check_suspicious_activity() TO nasa_app_user;
GRANT EXECUTE ON FUNCTION get_database_security_status() TO nasa_app_user;

-- ====================================================================
-- 9. FINAL SECURITY CONFIGURATION
-- ====================================================================

-- Set user role permissions
ALTER ROLE nasa_app_user SET app.current_user_id = '';
ALTER ROLE nasa_app_user SET search_path = 'app_data, public';
ALTER ROLE nasa_readonly_user SET search_path = 'app_data, public';

-- Reload configuration
SELECT pg_reload_conf();

-- Log security configuration completion
INSERT INTO audit_logs (table_name, operation, user_email, timestamp)
VALUES ('database_security', 'SECURITY_CONFIGURED', 'system', NOW());

COMMIT;

-- ====================================================================
-- SECURITY CONFIGURATION COMPLETE
-- ====================================================================
-- Note: Remember to:
-- 1. Change all default passwords immediately
-- 2. Set up SSL certificates properly
-- 3. Configure firewall rules
-- 4. Set up regular security audits
-- 5. Monitor database logs for suspicious activity
-- ====================================================================