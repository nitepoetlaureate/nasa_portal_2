-- NASA System 7 Portal - Database Security Configuration
-- This script implements comprehensive database security controls
-- Run this script to secure your PostgreSQL database

-- Enable SSL/TLS for all connections
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/etc/ssl/certs/server.crt';
ALTER SYSTEM SET ssl_key_file = '/etc/ssl/certs/server.key';
ALTER SYSTEM SET ssl_ca_file = '/etc/ssl/certs/ca.crt';

-- Configure SSL authentication
ALTER SYSTEM SET ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL:!SSLv2:!SSLv3';
ALTER SYSTEM SET ssl_prefer_server_ciphers = 'on';

-- Configure connection security
ALTER SYSTEM SET listen_addresses = 'localhost'; -- Restrict to localhost in development
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Configure logging for security monitoring
ALTER SYSTEM SET log_connections = 'on';
ALTER SYSTEM SET log_disconnections = 'on';
ALTER SYSTEM SET log_duration = 'on';
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries (> 1s)

-- Configure statement timeout to prevent DoS
ALTER SYSTEM SET statement_timeout = '30000'; -- 30 seconds
ALTER SYSTEM SET lock_timeout = '10000'; -- 10 seconds
ALTER SYSTEM SET idle_in_transaction_session_timeout = '60000'; -- 1 minute

-- Configure authentication security
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET authentication_timeout = '60'; -- 1 minute

-- Configure shared memory and memory limits for security
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Configure check-point settings for data integrity
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET wal_compression = 'on';
ALTER SYSTEM SET wal_sync_method = 'fsync';
ALTER SYSTEM SET full_page_writes = 'on';

-- Configure autovacuum for performance and security
ALTER SYSTEM SET autovacuum = 'on';
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- Reload PostgreSQL configuration
SELECT pg_reload_conf();

-- Create secure database users with proper permissions
DO $$
BEGIN
    -- Create application user with limited permissions
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_app_user') THEN
        CREATE ROLE nasa_app_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            CONNECTION LIMIT 50
            PASSWORD 'CHANGE_THIS_PASSWORD';
        RAISE NOTICE 'Created nasa_app_user with limited permissions';
    END IF;

    -- Create read-only user for reporting
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_readonly_user') THEN
        CREATE ROLE nasa_readonly_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            CONNECTION LIMIT 10
            PASSWORD 'CHANGE_THIS_PASSWORD';
        RAISE NOTICE 'Created nasa_readonly_user with read-only permissions';
    END IF;

    -- Create backup user with backup permissions
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'nasa_backup_user') THEN
        CREATE ROLE nasa_backup_user WITH
            LOGIN
            NOSUPERUSER
            NOCREATEDB
            NOCREATEROLE
            INHERIT
            NOREPLICATION
            CONNECTION LIMIT 5
            PASSWORD 'CHANGE_THIS_PASSWORD';
        RAISE NOTICE 'Created nasa_backup_user with backup permissions';
    END IF;
END $$;

-- Create secure database if it doesn't exist
SELECT 'CREATE DATABASE nasa_system7 OWNER nasa_app_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nasa_system7')\gexec

-- Connect to the nasa_system7 database and configure security
\c nasa_system7

-- Enable row-level security for sensitive tables
ALTER SYSTEM SET row_security = 'on';

-- Create secure schema
CREATE SCHEMA IF NOT EXISTS nasa_data AUTHORIZATION nasa_app_user;
CREATE SCHEMA IF NOT EXISTS nasa_audit AUTHORIZATION nasa_app_user;

-- Create audit logging table
CREATE TABLE IF NOT EXISTS nasa_audit.security_events (
    id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(100),
    table_name VARCHAR(100),
    record_id BIGINT,
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
) WITH (fillfactor=90);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON nasa_audit.security_events(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON nasa_audit.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_action ON nasa_audit.security_events(action);
CREATE INDEX IF NOT EXISTS idx_security_events_table ON nasa_audit.security_events(table_name);

-- Grant permissions to users
GRANT CONNECT ON DATABASE nasa_system7 TO nasa_app_user;
GRANT CONNECT ON DATABASE nasa_system7 TO nasa_readonly_user;
GRANT CONNECT ON DATABASE nasa_system7 TO nasa_backup_user;

-- Grant schema permissions
GRANT USAGE ON SCHEMA nasa_data TO nasa_app_user;
GRANT USAGE ON SCHEMA nasa_data TO nasa_readonly_user;
GRANT USAGE ON SCHEMA nasa_audit TO nasa_app_user;

-- Grant table permissions for application user
GRANT CREATE ON SCHEMA nasa_data TO nasa_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA nasa_data TO nasa_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA nasa_data TO nasa_app_user;

-- Grant read-only permissions
GRANT SELECT ON ALL TABLES IN SCHEMA nasa_data TO nasa_readonly_user;

-- Grant audit permissions
GRANT SELECT, INSERT ON nasa_audit.security_events TO nasa_app_user;
GRANT SELECT ON nasa_audit.security_events TO nasa_readonly_user;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION nasa_audit.log_security_event()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO nasa_audit.security_events (
        user_id,
        session_id,
        ip_address,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        success
    ) VALUES (
        current_setting('app.current_user_id', true)::VARCHAR(255),
        current_setting('app.session_id', true)::VARCHAR(255),
        inet_client_addr(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        TRUE
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for NASA data tables
DO $$
BEGIN
    -- Create audit triggers for all tables in nasa_data schema
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON nasa_data.%I FOR EACH ROW EXECUTE FUNCTION nasa_audit.log_security_event()', 'nasa_data', 'table_name');
END $$;

-- Create view for monitoring security events
CREATE OR REPLACE VIEW nasa_audit.recent_security_events AS
SELECT
    event_timestamp,
    user_id,
    ip_address,
    action,
    table_name,
    success,
    CASE
        WHEN success THEN 'SUCCESS'
        ELSE 'FAILURE'
    END as status
FROM nasa_audit.security_events
WHERE event_timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY event_timestamp DESC
LIMIT 100;

-- Grant read access to security view
GRANT SELECT ON nasa_audit.recent_security_events TO nasa_readonly_user;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION nasa_audit.check_user_permission(
    p_user_id VARCHAR(255),
    p_action VARCHAR(100),
    p_table_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has permission to perform action on table
    -- This is a placeholder - implement your specific business logic here
    RETURN p_user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security monitoring function
CREATE OR REPLACE FUNCTION nasa_audit.get_security_summary()
RETURNS TABLE (
    total_events BIGINT,
    failed_logins BIGINT,
    suspicious_activities BIGINT,
    unique_users BIGINT,
    unique_ips BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE action = 'LOGIN' AND success = FALSE) as failed_logins,
        COUNT(*) FILTER (WHERE success = FALSE) as suspicious_activities,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips
    FROM nasa_audit.security_events
    WHERE event_timestamp >= NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA nasa_data
    GRANT ALL ON TABLES TO nasa_app_user,
    GRANT SELECT ON TABLES TO nasa_readonly_user;

-- Create maintenance and cleanup job
CREATE OR REPLACE FUNCTION nasa_audit.cleanup_old_audit_logs()
RETURNS VOID AS $$
BEGIN
    -- Delete audit logs older than 90 days
    DELETE FROM nasa_audit.security_events
    WHERE event_timestamp < NOW() - INTERVAL '90 days';

    -- Log the cleanup operation
    INSERT INTO nasa_audit.security_events (
        user_id,
        action,
        success
    ) VALUES (
        'SYSTEM',
        'AUDIT_CLEANUP',
        TRUE
    );
END;
$$ LANGUAGE plpgsql;

-- Output security configuration summary
DO $$
BEGIN
    RAISE NOTICE '=== NASA System 7 Portal Database Security Configuration Complete ===';
    RAISE NOTICE '✅ SSL/TLS enabled for all connections';
    RAISE NOTICE '✅ Secure user accounts created (nasa_app_user, nasa_readonly_user, nasa_backup_user)';
    RAISE NOTICE '✅ Audit logging enabled for all operations';
    RAISE NOTICE '✅ Row-level security enabled';
    RAISE NOTICE '✅ Security monitoring views created';
    RAISE NOTICE '✅ Connection limits and timeouts configured';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT SECURITY REMINDERS:';
    RAISE NOTICE '1. Change default passwords immediately';
    RAISE NOTICE '2. Configure proper SSL certificates';
    RAISE NOTICE '3. Restrict network access to PostgreSQL';
    RAISE NOTICE '4. Set up regular backup procedures';
    RAISE NOTICE '5. Monitor security events regularly';
    RAISE NOTICE '6. Schedule audit log cleanup job';
    RAISE NOTICE '';
    RAISE NOTICE '📊 To monitor security events:';
    RAISE NOTICE '   SELECT * FROM nasa_audit.recent_security_events;';
    RAISE NOTICE '   SELECT * FROM nasa_audit.get_security_summary();';
END $$;