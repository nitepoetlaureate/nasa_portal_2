-- Analytics Database Schema for NASA System 7 Portal
-- Implements GDPR/CCPA compliant user behavior tracking

-- Analytics consent management table
CREATE TABLE IF NOT EXISTS analytics_consent (
    id SERIAL PRIMARY KEY,
    consent_id VARCHAR(255) UNIQUE NOT NULL,
    user_identifier VARCHAR(255), -- Hashed user identifier for privacy
    consent_version VARCHAR(50) NOT NULL DEFAULT '1.0',
    consent_granted BOOLEAN NOT NULL,
    consent_data JSONB NOT NULL DEFAULT '{}', -- What user consented to
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE
);

-- User behavior events table (anonymized and consented)
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    consent_id VARCHAR(255) REFERENCES analytics_consent(consent_id),
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100) NOT NULL,
    event_action VARCHAR(255) NOT NULL,
    event_label TEXT,
    event_value NUMERIC,
    page_url TEXT,
    page_title TEXT,
    referrer_url TEXT,
    user_agent TEXT,
    screen_resolution VARCHAR(20),
    viewport_size VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    geo_country VARCHAR(2),
    geo_region VARCHAR(50),
    device_type VARCHAR(50),
    browser_name VARCHAR(100),
    browser_version VARCHAR(50),
    os_name VARCHAR(100),
    os_version VARCHAR(50)
);

-- Page view analytics (subset of events for performance)
CREATE TABLE IF NOT EXISTS page_views (
    id BIGSERIAL PRIMARY KEY,
    view_id VARCHAR(255) UNIQUE NOT NULL,
    consent_id VARCHAR(255) REFERENCES analytics_consent(consent_id),
    session_id VARCHAR(255),
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer_url TEXT,
    entry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    exit_timestamp TIMESTAMP WITH TIME ZONE,
    time_on_page_seconds INTEGER,
    bounce BOOLEAN DEFAULT TRUE,
    scroll_depth_percent INTEGER,
    interactions_count INTEGER DEFAULT 0,
    viewport_size VARCHAR(20),
    device_type VARCHAR(50)
);

-- NASA API usage analytics
CREATE TABLE IF NOT EXISTS nasa_api_usage (
    id BIGSERIAL PRIMARY KEY,
    usage_id VARCHAR(255) UNIQUE NOT NULL,
    consent_id VARCHAR(255) REFERENCES analytics_consent(consent_id),
    session_id VARCHAR(255),
    api_endpoint VARCHAR(255) NOT NULL,
    api_method VARCHAR(10) NOT NULL,
    request_params JSONB,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    response_size_bytes INTEGER,
    cache_hit BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    ip_address INET
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_id VARCHAR(255) UNIQUE NOT NULL,
    session_id VARCHAR(255),
    metric_type VARCHAR(100) NOT NULL, -- 'page_load', 'component_render', 'api_call', etc.
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50), -- 'ms', 'bytes', 'count', etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    page_url TEXT,
    component_name VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

-- User journey funnels
CREATE TABLE IF NOT EXISTS user_journeys (
    id BIGSERIAL PRIMARY KEY,
    journey_id VARCHAR(255) UNIQUE NOT NULL,
    consent_id VARCHAR(255) REFERENCES analytics_consent(consent_id),
    session_id VARCHAR(255),
    funnel_name VARCHAR(100) NOT NULL,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_status VARCHAR(50) NOT NULL, -- 'started', 'completed', 'skipped', 'abandoned'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_to_step_seconds INTEGER,
    total_time_seconds INTEGER,
    completion_rate NUMERIC(5,2),
    metadata JSONB DEFAULT '{}'
);

-- A/B testing analytics
CREATE TABLE IF NOT EXISTS ab_test_analytics (
    id BIGSERIAL PRIMARY KEY,
    test_id VARCHAR(255) UNIQUE NOT NULL,
    consent_id VARCHAR(255) REFERENCES analytics_consent(consent_id),
    session_id VARCHAR(255),
    experiment_name VARCHAR(255) NOT NULL,
    variation_name VARCHAR(255) NOT NULL,
    conversion_event VARCHAR(255),
    conversion_value NUMERIC,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Privacy and data retention management
CREATE TABLE IF NOT EXISTS data_retention (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    retention_days INTEGER NOT NULL,
    policy_type VARCHAR(100) NOT NULL, -- 'auto_delete', 'anonymize', 'archive'
    last_run TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_consent_consent_id ON analytics_consent(consent_id);
CREATE INDEX IF NOT EXISTS idx_analytics_consent_user_identifier ON analytics_consent(user_identifier);
CREATE INDEX IF NOT EXISTS idx_analytics_consent_created_at ON analytics_consent(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_consent_id ON analytics_events(consent_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_category ON analytics_events(event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_url ON analytics_events(page_url);

CREATE INDEX IF NOT EXISTS idx_page_views_consent_id ON page_views(consent_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_entry_timestamp ON page_views(entry_timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_page_url ON page_views(page_url);

CREATE INDEX IF NOT EXISTS idx_nasa_api_usage_consent_id ON nasa_api_usage(consent_id);
CREATE INDEX IF NOT EXISTS idx_nasa_api_usage_timestamp ON nasa_api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_nasa_api_usage_api_endpoint ON nasa_api_usage(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_nasa_api_usage_response_status ON nasa_api_usage(response_status);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);

CREATE INDEX IF NOT EXISTS idx_user_journeys_consent_id ON user_journeys(consent_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_session_id ON user_journeys(session_id);
CREATE INDEX IF NOT EXISTS idx_user_journeys_funnel_name ON user_journeys(funnel_name);
CREATE INDEX IF NOT EXISTS idx_user_journeys_timestamp ON user_journeys(timestamp);

CREATE INDEX IF NOT EXISTS idx_ab_test_analytics_consent_id ON ab_test_analytics(consent_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_analytics_experiment_name ON ab_test_analytics(experiment_name);
CREATE INDEX IF NOT EXISTS idx_ab_test_analytics_timestamp ON ab_test_analytics(timestamp);

-- Create partitioned tables for large datasets (PostgreSQL 10+)
CREATE TABLE IF NOT EXISTS analytics_events_partitioned (
    LIKE analytics_events INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions for the current year
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := 'analytics_events_' || TO_CHAR(start_date, 'YYYY_MM');

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF analytics_events_partitioned
                        FOR VALUES FROM (%L) TO (%L)',
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analytics_consent_updated_at
    BEFORE UPDATE ON analytics_consent
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for active consent events (privacy filter)
CREATE OR REPLACE VIEW active_analytics_events AS
SELECT ae.*
FROM analytics_events ae
JOIN analytics_consent ac ON ae.consent_id = ac.consent_id
WHERE ac.consent_granted = TRUE
  AND (ac.expires_at IS NULL OR ac.expires_at > CURRENT_TIMESTAMP)
  AND ac.withdrawn_at IS NULL;

-- Create view for dashboard analytics
CREATE OR REPLACE VIEW dashboard_analytics AS
SELECT
    DATE_TRUNC('day', ae.timestamp) as event_date,
    ae.event_type,
    ae.event_category,
    COUNT(*) as event_count,
    AVG(ae.duration_ms) as avg_duration_ms,
    COUNT(DISTINCT ae.session_id) as unique_sessions,
    COUNT(DISTINCT ae.consent_id) as unique_users
FROM active_analytics_events ae
WHERE ae.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', ae.timestamp), ae.event_type, ae.event_category
ORDER BY event_date DESC;

-- Function to generate user identifier hash (privacy compliant)
CREATE OR REPLACE FUNCTION generate_user_identifier(
    ip_address INET,
    user_agent TEXT
) RETURNS TEXT AS $$
BEGIN
    RETURN ENCODE(SHA256(ip_address::TEXT || user_agent || COALESCE(salt, 'default_salt')), 'hex');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default data retention policies
INSERT INTO data_retention (table_name, retention_days, policy_type) VALUES
('analytics_events', 365, 'auto_delete'),
('page_views', 365, 'auto_delete'),
('nasa_api_usage', 365, 'auto_delete'),
('performance_metrics', 90, 'auto_delete'),
('user_journeys', 365, 'auto_delete'),
('ab_test_analytics', 180, 'auto_delete'),
('analytics_consent', 730, 'anonymize')
ON CONFLICT DO NOTHING;

-- Create function for automatic data cleanup
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    policy RECORD;
BEGIN
    FOR policy IN
        SELECT * FROM data_retention
        WHERE is_active = TRUE
        AND (last_run IS NULL OR last_run < CURRENT_DATE - INTERVAL '1 day')
    LOOP
        EXECUTE format('DELETE FROM %I WHERE timestamp < CURRENT_DATE - INTERVAL ''%s days''',
                      policy.table_name, policy.retention_days);

        GET DIAGNOSTICS deleted_count = ROW_COUNT;

        UPDATE data_retention
        SET last_run = CURRENT_TIMESTAMP
        WHERE table_name = policy.table_name;

        RAISE NOTICE 'Cleaned up % rows from %', deleted_count, policy.table_name;
    END LOOP;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled cleanup function (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analytics', '0 2 * * *', 'SELECT cleanup_old_analytics_data();');

COMMENT ON TABLE analytics_consent IS 'GDPR/CCPA compliant consent management';
COMMENT ON TABLE analytics_events IS 'User behavior events with consent tracking';
COMMENT ON TABLE page_views IS 'Page-specific analytics subset';
COMMENT ON TABLE nasa_api_usage IS 'NASA API performance and usage tracking';
COMMENT ON TABLE performance_metrics IS 'Application performance monitoring';
COMMENT ON TABLE user_journeys IS 'User funnel and journey analysis';
COMMENT ON TABLE ab_test_analytics IS 'A/B testing and experiment tracking';
COMMENT ON TABLE data_retention IS 'Automated data retention policies';