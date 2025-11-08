#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate secure secrets for NASA System 7 Portal
 * This script creates cryptographically secure secrets for production use
 */

// Generate secure random string
const generateSecureString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure JWT secret (base64 encoded)
const generateJWTSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('base64');
};

// Generate secure database password
const generateDatabasePassword = (length = 24) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
};

// Generate secure Redis password
const generateRedisPassword = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure session secret
const generateSessionSecret = (length = 48) => {
  return crypto.randomBytes(length).toString('hex');
};

// Main function to generate all secrets
const generateAllSecrets = () => {
  const secrets = {
    // Database Configuration
    DB_NAME: 'nasa_system7',
    DB_USER: 'nasa_user',
    DB_PASSWORD: generateDatabasePassword(),
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: '5432',

    // Redis Configuration
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: '6379',
    REDIS_PASSWORD: generateRedisPassword(),

    // Application Configuration
    NODE_ENV: 'production',
    PORT: '3001',
    JWT_SECRET: generateJWTSecret(),
    JWT_REFRESH_SECRET: generateJWTSecret(),
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    SESSION_SECRET: generateSessionSecret(),
    SESSION_TIMEOUT: '86400000',

    // Multi-Factor Authentication
    REQUIRE_MFA: 'false',

    // NASA API Configuration
    NASA_API_KEY: process.env.NASA_API_KEY || 'DEMO_KEY',
    NASA_API_URL: 'https://api.nasa.gov',

    // JPL API Configuration
    JPL_API_KEY: process.env.JPL_API_KEY || generateSecureString(24),
    JPL_API_URL: 'https://ssd-api.jpl.nasa.gov',

    // Security Configuration
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'https://nasa-system7.example.com',
    ENABLE_CORS: 'false',
    ENABLE_SWAGGER: 'false',
    ENABLE_METRICS: 'true',
    TRUST_PROXY: 'true',

    // Rate Limiting Configuration
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    MAX_CONNECTIONS: '200',

    // Performance Configuration
    NODE_OPTIONS: '--max_old_space_size=1024',
    UV_THREADPOOL_SIZE: '8',

    // Monitoring Configuration
    GRAFANA_PASSWORD: generateDatabasePassword(),
    PROMETHEUS_RETENTION: '30d',
    PROMETHEUS_STORAGE_SIZE: '10GB',

    // Logging Configuration
    LOG_LEVEL: 'info',
    LOG_FORMAT: 'json',
    LOG_MAX_SIZE: '100m',
    LOG_MAX_FILES: '5',

    // SSL/TLS Configuration (for production)
    SSL_CERT_PATH: '/etc/ssl/certs/nasa-system7.crt',
    SSL_KEY_PATH: '/etc/ssl/certs/nasa-system7.key',
    SSL_CA_PATH: '/etc/ssl/certs/nasa-system7-ca.crt',

    // Backup Configuration
    BACKUP_RETENTION_DAYS: '7',
    AUTO_BACKUP_ENABLED: 'true',
    BACKUP_SCHEDULE: '0 2 * * *',

    // Email Configuration (for alerts)
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: process.env.SMTP_USER || 'noreply@nasa-system7.example.com',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || generateDatabasePassword(),
    ALERT_EMAIL: process.env.ALERT_EMAIL || 'admin@nasa-system7.example.com'
  };

  return secrets;
};

// Create .env file with generated secrets
const createEnvFile = (secrets, filename = '.env') => {
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const header = `# NASA System 7 Portal - Secure Environment Configuration
# Generated on: ${new Date().toISOString()}
# ⚠️  WARNING: This file contains sensitive information - keep it secure!
# 🔒 SECURITY: Do not commit this file to version control

`;

  const footer = `

# ===== Additional Configuration Notes =====
#
# 1. Database Security:
#    - Use strong, unique passwords
#    - Enable SSL/TLS connections
#    - Restrict database user permissions
#
# 2. Redis Security:
#    - Enable Redis authentication
#    - Use Redis TLS in production
#    - Restrict Redis network access
#
# 3. JWT Secrets:
#    - Use different secrets for JWT and refresh tokens
#    - Rotate secrets regularly
#    - Store secrets securely (e.g., AWS Secrets Manager)
#
# 4. NASA API Keys:
#    - Register for official NASA API keys at https://api.nasa.gov
#    - Do not use DEMO_KEY in production
#    - Monitor API usage and rate limits
#
# 5. Security Headers:
#    - Ensure HTTPS is enabled in production
#    - Configure proper CORS origins
#    - Enable HSTS for secure connections
#
# 6. Monitoring:
#    - Set up proper alerting for security events
#    - Monitor rate limiting and blocked requests
#    - Log security events for audit trails
#

`;

  const fullContent = header + envContent + footer;

  try {
    fs.writeFileSync(filename, fullContent, 'utf8');
    console.log(`✅ Secure environment configuration created: ${filename}`);
    console.log(`🔒 Contains ${Object.keys(secrets).length} secure configuration values`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${filename}:`, error.message);
    return false;
  }
};

// Create secure production environment configuration
const createSecureConfigs = () => {
  console.log('🔐 Generating secure secrets for NASA System 7 Portal...\n');

  const secrets = generateAllSecrets();

  // Create main .env file
  const success = createEnvFile(secrets, '.env');

  if (success) {
    console.log('\n🚀 Security configuration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review the generated .env file');
    console.log('2. Update NASA_API_KEY with your official NASA API key');
    console.log('3. Update SMTP configuration for email alerts');
    console.log('4. Configure proper CORS_ORIGIN for your domain');
    console.log('5. Store secrets securely (AWS Secrets Manager, Azure Key Vault, etc.)');
    console.log('6. Ensure .env is added to .gitignore');
    console.log('\n⚠️  SECURITY REMINDERS:');
    console.log('- Never commit .env to version control');
    console.log('- Use environment-specific configurations');
    console.log('- Rotate secrets regularly');
    console.log('- Monitor for security events');
  }

  return success;
};

// Run if called directly
if (require.main === module) {
  createSecureConfigs();
}

module.exports = {
  generateSecureString,
  generateJWTSecret,
  generateDatabasePassword,
  generateRedisPassword,
  generateSessionSecret,
  generateAllSecrets,
  createEnvFile,
  createSecureConfigs
};