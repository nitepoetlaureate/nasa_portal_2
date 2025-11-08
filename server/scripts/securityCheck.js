#!/usr/bin/env node

/**
 * NASA System 7 Portal - Security Validation Script
 * Validates security configuration and identifies potential vulnerabilities
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passes = [];
  }

  addIssue(severity, message, details = '') {
    const issue = { severity, message, details };
    if (severity === 'HIGH') {
      this.issues.push(issue);
    } else if (severity === 'MEDIUM') {
      this.warnings.push(issue);
    } else {
      this.passes.push(issue);
    }
  }

  checkEnvironmentVariables() {
    console.log('🔍 Checking environment variables...');

    // Check for required security variables
    const requiredVars = [
      'NASA_API_KEY',
      'JWT_SECRET',
      'SESSION_SECRET',
      'DB_PASSWORD',
      'REDIS_PASSWORD'
    ];

    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        this.addIssue('HIGH', `Missing required environment variable: ${varName}`, 'Set this variable in your .env file');
      } else if (value.includes('your_') || value.includes('CHANGE_THIS') || value.includes('DEMO_KEY' && varName !== 'NASA_API_KEY')) {
        this.addIssue('HIGH', `Using default placeholder value for ${varName}`, 'Replace with a secure, unique value');
      } else if (varName.includes('SECRET') && value.length < 32) {
        this.addIssue('HIGH', `Secret too short: ${varName}`, 'Secrets should be at least 32 characters long');
      } else if (varName.includes('PASSWORD') && value.length < 16) {
        this.addIssue('HIGH', `Password too short: ${varName}`, 'Passwords should be at least 16 characters long');
      } else {
        this.addIssue('LOW', `✅ Environment variable properly configured: ${varName}`);
      }
    });
  }

  checkFilePermissions() {
    console.log('🔍 Checking file permissions...');

    const sensitiveFiles = [
      '.env',
      'config/database-security.sql',
      'scripts/generate-secrets.js'
    ];

    sensitiveFiles.forEach(filePath => {
      try {
        const stats = fs.statSync(filePath);
        const mode = stats.mode;

        // Check if file is readable by others (world-readable)
        if (mode & 0o004) {
          this.addIssue('HIGH', `File is world-readable: ${filePath}`, 'Run: chmod 600 ' + filePath);
        } else {
          this.addIssue('LOW', `✅ File permissions are secure: ${filePath}`);
        }
      } catch (error) {
        // File doesn't exist or can't check
        this.addIssue('MEDIUM', `Cannot check file permissions: ${filePath}`);
      }
    });
  }

  checkDependencies() {
    console.log('🔍 Checking for security vulnerabilities in dependencies...');

    try {
      const { execSync } = require('child_process');
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditOutput);

      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          if (vuln.severity === 'high' || vuln.severity === 'critical') {
            this.addIssue('HIGH', `Security vulnerability in ${pkg}@${vuln.version}: ${vuln.title}`, 'Run: npm audit fix');
          } else if (vuln.severity === 'moderate') {
            this.addIssue('MEDIUM', `Security vulnerability in ${pkg}@${vuln.version}: ${vuln.title}`, 'Run: npm audit fix');
          }
        });
      }

      if (audit.metadata && audit.metadata.vulnerabilities && Object.keys(audit.metadata.vulnerabilities).length === 0) {
        this.addIssue('LOW', '✅ No security vulnerabilities found in dependencies');
      }
    } catch (error) {
      this.addIssue('MEDIUM', 'Cannot perform security audit on dependencies', 'Ensure npm is available and package.json is valid');
    }
  }

  checkSecurityHeaders() {
    console.log('🔍 Checking security header configuration...');

    const securityFiles = [
      'middleware/security.js',
      'middleware/security-enhanced.js',
      'server.js'
    ];

    let foundHelmet = false;
    let foundCSP = false;
    let foundRateLimiting = false;

    securityFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('helmet')) {
          foundHelmet = true;
        }
        if (content.includes('contentSecurityPolicy') || content.includes('CSP')) {
          foundCSP = true;
        }
        if (content.includes('rateLimit') || content.includes('express-rate-limit')) {
          foundRateLimiting = true;
        }
      } catch (error) {
        // File doesn't exist
      }
    });

    if (!foundHelmet) {
      this.addIssue('HIGH', 'Helmet.js security middleware not found', 'Install and configure helmet.js for security headers');
    } else {
      this.addIssue('LOW', '✅ Helmet.js security middleware found');
    }

    if (!foundCSP) {
      this.addIssue('MEDIUM', 'Content Security Policy (CSP) not configured', 'Configure CSP to prevent XSS attacks');
    } else {
      this.addIssue('LOW', '✅ Content Security Policy found');
    }

    if (!foundRateLimiting) {
      this.addIssue('HIGH', 'Rate limiting not configured', 'Configure rate limiting to prevent DoS attacks');
    } else {
      this.addIssue('LOW', '✅ Rate limiting found');
    }
  }

  checkDatabaseSecurity() {
    console.log('🔍 Checking database security configuration...');

    const dbFiles = [
      'config/database-security.sql',
      'config/database.js',
      'db.js'
    ];

    let foundSSLConfig = false;
    let foundSecurePassword = false;
    let foundConnectionLimiting = false;

    dbFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('ssl=') || content.includes('SSL')) {
          foundSSLConfig = true;
        }
        if (content.includes('password') && content.includes('CHANGE_THIS') === false) {
          foundSecurePassword = true;
        }
        if (content.includes('max_connections') || content.includes('connection_limit')) {
          foundConnectionLimiting = true;
        }
      } catch (error) {
        // File doesn't exist
      }
    });

    if (!foundSSLConfig) {
      this.addIssue('MEDIUM', 'Database SSL/TLS not configured', 'Enable SSL for database connections');
    } else {
      this.addIssue('LOW', '✅ Database SSL/TLS configuration found');
    }

    if (!foundConnectionLimiting) {
      this.addIssue('MEDIUM', 'Database connection limiting not configured', 'Set max connections to prevent overload');
    } else {
      this.addIssue('LOW', '✅ Database connection limiting found');
    }
  }

  checkCSRFProtection() {
    console.log('🔍 Checking CSRF protection...');

    try {
      const serverContent = fs.readFileSync('server.js', 'utf8');

      if (serverContent.includes('csrf') || serverContent.includes('CSRF')) {
        this.addIssue('LOW', '✅ CSRF protection implemented');
      } else {
        this.addIssue('HIGH', 'CSRF protection not implemented', 'Implement CSRF tokens for state-changing operations');
      }
    } catch (error) {
      this.addIssue('MEDIUM', 'Cannot check CSRF protection');
    }
  }

  checkInputValidation() {
    console.log('🔍 Checking input validation...');

    const validationFiles = [
      'middleware/security.js',
      'middleware/security-enhanced.js'
    ];

    let foundValidation = false;
    let foundSanitization = false;

    validationFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('express-validator') || content.includes('validator')) {
          foundValidation = true;
        }
        if (content.includes('sanitize') || content.includes('escape')) {
          foundSanitization = true;
        }
      } catch (error) {
        // File doesn't exist
      }
    });

    if (!foundValidation) {
      this.addIssue('HIGH', 'Input validation not implemented', 'Use express-validator for API input validation');
    } else {
      this.addIssue('LOW', '✅ Input validation implemented');
    }

    if (!foundSanitization) {
      this.addIssue('HIGH', 'Input sanitization not implemented', 'Sanitize user inputs to prevent XSS attacks');
    } else {
      this.addIssue('LOW', '✅ Input sanitization implemented');
    }
  }

  checkEnvironmentSpecificSettings() {
    console.log('🔍 Checking environment-specific settings...');

    const nodeEnv = process.env.NODE_ENV;

    if (nodeEnv === 'production') {
      if (process.env.DEBUG) {
        this.addIssue('HIGH', 'Debug mode enabled in production', 'Disable DEBUG in production environment');
      }

      if (process.env.ENABLE_ERROR_STACK_TRACES === 'true') {
        this.addIssue('MEDIUM', 'Error stack traces enabled in production', 'Disable detailed error messages in production');
      }

      if (process.env.ENABLE_CORS === 'true' && process.env.CORS_ORIGIN === '*') {
        this.addIssue('HIGH', 'CORS allows all origins in production', 'Restrict CORS to specific domains in production');
      }

      this.addIssue('LOW', '✅ Production environment detected');
    } else {
      this.addIssue('MEDIUM', 'Not running in production mode', 'Ensure production configuration when deploying');
    }
  }

  runAllChecks() {
    console.log('🚀 NASA System 7 Portal - Security Validation');
    console.log('=' .repeat(50));

    this.checkEnvironmentVariables();
    this.checkFilePermissions();
    this.checkDependencies();
    this.checkSecurityHeaders();
    this.checkCSRFProtection();
    this.checkInputValidation();
    this.checkDatabaseSecurity();
    this.checkEnvironmentSpecificSettings();

    console.log('\n📊 Security Scan Results:');
    console.log('=' .repeat(50));

    if (this.issues.length > 0) {
      console.log('\n🔴 HIGH SEVERITY ISSUES:');
      this.issues.forEach(issue => {
        console.log(`  ❌ ${issue.message}`);
        if (issue.details) {
          console.log(`     💡 ${issue.details}`);
        }
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n🟡 MEDIUM SEVERITY WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning.message}`);
        if (warning.details) {
          console.log(`     💡 ${warning.details}`);
        }
      });
    }

    console.log('\n🟢 SECURITY CHECKS PASSED:');
    this.passes.forEach(pass => {
      console.log(`  ${pass.message}`);
    });

    // Calculate security score
    const totalChecks = this.issues.length + this.warnings.length + this.passes.length;
    const securityScore = Math.round((this.passes.length / totalChecks) * 100);

    console.log('\n📈 Security Score:', securityScore + '/100');

    if (this.issues.length === 0) {
      console.log('\n✅ No critical security issues found!');
      console.log('🎉 Your application is ready for production deployment.');
    } else {
      console.log('\n⚠️  Security issues found that must be addressed before deployment.');
      console.log('🔧 Please fix all HIGH severity issues before deploying to production.');
    }

    console.log('\n📋 Recommendations:');
    console.log('1. Replace all placeholder secrets with secure values');
    console.log('2. Enable SSL/TLS for all connections');
    console.log('3. Implement comprehensive input validation');
    console.log('4. Set up security monitoring and alerting');
    console.log('5. Regularly update dependencies and run security audits');

    return {
      score: securityScore,
      issues: this.issues.length,
      warnings: this.warnings.length,
      passes: this.passes.length,
      ready: this.issues.length === 0
    };
  }
}

// Run security checks if called directly
if (require.main === module) {
  const checker = new SecurityChecker();
  const results = checker.runAllChecks();

  // Exit with appropriate code
  process.exit(results.ready ? 0 : 1);
}

module.exports = SecurityChecker;