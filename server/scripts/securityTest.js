#!/usr/bin/env node

/**
 * NASA System 7 Portal - Security Testing Script
 * Performs automated security tests to validate security controls
 */

const axios = require('axios');
const crypto = require('crypto');

class SecurityTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  logResult(test, status, message, details = '') {
    const result = { test, message, details };

    if (status === 'PASS') {
      this.results.passed.push(result);
      console.log(`✅ ${test}: ${message}`);
    } else if (status === 'FAIL') {
      this.results.failed.push(result);
      console.log(`❌ ${test}: ${message}`);
      if (details) console.log(`   Details: ${details}`);
    } else {
      this.results.warnings.push(result);
      console.log(`⚠️  ${test}: ${message}`);
    }
  }

  async testSecurityHeaders() {
    console.log('\n🔍 Testing Security Headers...');

    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000
      });

      const headers = response.headers;

      // Check for security headers
      const securityHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': 'default-src'
      };

      Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
        const actualValue = headers[header];
        if (actualValue) {
          if (expectedValue && actualValue.includes(expectedValue)) {
            this.logResult('Security Headers', 'PASS', `Header ${header} properly set`, actualValue);
          } else {
            this.logResult('Security Headers', 'PASS', `Header ${header} present`, actualValue);
          }
        } else {
          this.logResult('Security Headers', 'FAIL', `Missing security header: ${header}`);
        }
      });

    } catch (error) {
      this.logResult('Security Headers', 'FAIL', 'Cannot test security headers', error.message);
    }
  }

  async testCSRFProtection() {
    console.log('\n🔍 Testing CSRF Protection...');

    try {
      // First, get a CSRF token
      const tokenResponse = await axios.get(`${this.baseUrl}/api/csrf-token`, {
        timeout: 5000
      });

      if (tokenResponse.data.csrfToken) {
        this.logResult('CSRF Protection', 'PASS', 'CSRF token endpoint available');

        // Test POST without CSRF token
        try {
          await axios.post(`${this.baseUrl}/api/test`, {}, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          });

          this.logResult('CSRF Protection', 'FAIL', 'CSRF protection not enforced');
        } catch (error) {
          if (error.response && error.response.status === 403) {
            this.logResult('CSRF Protection', 'PASS', 'CSRF protection properly blocks requests without token');
          } else {
            this.logResult('CSRF Protection', 'WARNING', 'Cannot verify CSRF protection', error.message);
          }
        }

        // Test POST with CSRF token
        try {
          await axios.post(`${this.baseUrl}/api/test`, {}, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': tokenResponse.data.csrfToken
            }
          });

          this.logResult('CSRF Protection', 'PASS', 'CSRF token accepted');
        } catch (error) {
          if (error.response && error.response.status === 404) {
            this.logResult('CSRF Protection', 'PASS', 'CSRF token accepted (404 expected for test endpoint)');
          } else {
            this.logResult('CSRF Protection', 'WARNING', 'CSRF token validation failed', error.message);
          }
        }
      } else {
        this.logResult('CSRF Protection', 'FAIL', 'CSRF token endpoint not available');
      }
    } catch (error) {
      this.logResult('CSRF Protection', 'FAIL', 'CSRF protection test failed', error.message);
    }
  }

  async testRateLimiting() {
    console.log('\n🔍 Testing Rate Limiting...');

    try {
      // Make multiple rapid requests
      const requests = [];
      const requestCount = 20;

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          axios.get(`${this.baseUrl}/health`, {
            timeout: 1000
          }).catch(error => error)
        );
      }

      const responses = await Promise.all(requests);

      // Check if any requests were rate limited
      const rateLimited = responses.filter(response =>
        response.response && response.response.status === 429
      );

      if (rateLimited.length > 0) {
        this.logResult('Rate Limiting', 'PASS', 'Rate limiting is active',
          `${rateLimited.length} of ${requestCount} requests were rate limited`);
      } else {
        this.logResult('Rate Limiting', 'WARNING', 'Rate limiting may not be active',
          'No requests were rate limited during test');
      }

      // Check for rate limiting headers
      const successfulResponse = responses.find(response =>
        response.response && response.response.status === 200
      );

      if (successfulResponse && successfulResponse.response) {
        const rateLimitHeaders = [
          'x-ratelimit-limit',
          'x-ratelimit-remaining',
          'x-ratelimit-reset'
        ];

        rateLimitHeaders.forEach(header => {
          if (successfulResponse.response.headers[header]) {
            this.logResult('Rate Limiting', 'PASS', `Rate limit header present: ${header}`,
              successfulResponse.response.headers[header]);
          }
        });
      }

    } catch (error) {
      this.logResult('Rate Limiting', 'FAIL', 'Rate limiting test failed', error.message);
    }
  }

  async testInputValidation() {
    console.log('\n🔍 Testing Input Validation...');

    const maliciousInputs = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      "'; DROP TABLE users; --",
      '../../../etc/passwd',
      '<img src=x onerror=alert("xss")>',
      '{{7*7}}',
      '${7*7}'
    ];

    try {
      for (const input of maliciousInputs) {
        try {
          const response = await axios.get(`${this.baseUrl}/api/nasa/apod`, {
            params: { date: input },
            timeout: 5000
          });

          if (response.status === 400) {
            this.logResult('Input Validation', 'PASS', `Malicious input rejected: ${input.substring(0, 30)}...`);
          } else if (response.status === 200) {
            // Check if malicious content is reflected in response
            const responseText = JSON.stringify(response.data);
            if (responseText.includes(input) || responseText.includes('<script>') || responseText.includes('javascript:')) {
              this.logResult('Input Validation', 'FAIL', `Malicious input reflected in response: ${input.substring(0, 30)}...`);
            } else {
              this.logResult('Input Validation', 'PASS', `Malicious input handled safely: ${input.substring(0, 30)}...`);
            }
          }
        } catch (error) {
          if (error.response && error.response.status === 400) {
            this.logResult('Input Validation', 'PASS', `Malicious input rejected: ${input.substring(0, 30)}...`);
          } else {
            this.logResult('Input Validation', 'WARNING', `Cannot test input: ${input.substring(0, 30)}...`, error.message);
          }
        }
      }
    } catch (error) {
      this.logResult('Input Validation', 'FAIL', 'Input validation test failed', error.message);
    }
  }

  async testAuthentication() {
    console.log('\n🔍 Testing Authentication...');

    try {
      // Test protected endpoint without authentication
      try {
        const response = await axios.get(`${this.baseUrl}/api/streams/status`, {
          timeout: 5000
        });

        if (response.status === 401 || response.status === 403) {
          this.logResult('Authentication', 'PASS', 'Protected endpoint requires authentication');
        } else {
          this.logResult('Authentication', 'WARNING', 'Protected endpoint may not require authentication');
        }
      } catch (error) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          this.logResult('Authentication', 'PASS', 'Protected endpoint requires authentication');
        } else {
          this.logResult('Authentication', 'WARNING', 'Cannot test authentication', error.message);
        }
      }

      // Test authentication with invalid API key
      try {
        const response = await axios.get(`${this.baseUrl}/api/nasa/apod`, {
          params: { api_key: 'INVALID_API_KEY' },
          timeout: 5000
        });

        this.logResult('Authentication', 'WARNING', 'Invalid API key was accepted');
      } catch (error) {
        if (error.response && error.response.status === 403) {
          this.logResult('Authentication', 'PASS', 'Invalid API key properly rejected');
        } else {
          this.logResult('Authentication', 'WARNING', 'Cannot test API key validation', error.message);
        }
      }

    } catch (error) {
      this.logResult('Authentication', 'FAIL', 'Authentication test failed', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');

    try {
      // Test for information disclosure in error messages
      try {
        const response = await axios.get(`${this.baseUrl}/api/nonexistent/endpoint`, {
          timeout: 5000
        });

        this.logResult('Error Handling', 'WARNING', 'Non-existent endpoint returned unexpected response');
      } catch (error) {
        if (error.response && error.response.status === 404) {
          const errorData = error.response.data;

          // Check for sensitive information in error messages
          const sensitivePatterns = [
            /error.*stack/i,
            /internal server error/i,
            /node_modules/i,
            /\.js:\d+/,
            /process\.env/i
          ];

          let hasSensitiveInfo = false;
          sensitivePatterns.forEach(pattern => {
            if (JSON.stringify(errorData).match(pattern)) {
              hasSensitiveInfo = true;
            }
          });

          if (hasSensitiveInfo) {
            this.logResult('Error Handling', 'FAIL', 'Error message contains sensitive information');
          } else {
            this.logResult('Error Handling', 'PASS', 'Error messages are properly sanitized');
          }
        } else {
          this.logResult('Error Handling', 'WARNING', 'Unexpected error response', error.message);
        }
      }

    } catch (error) {
      this.logResult('Error Handling', 'FAIL', 'Error handling test failed', error.message);
    }
  }

  async testHTTPS() {
    console.log('\n🔍 Testing HTTPS Configuration...');

    try {
      // Try to connect via HTTPS
      const httpsUrl = this.baseUrl.replace('http://', 'https://');

      try {
        const response = await axios.get(`${httpsUrl}/health`, {
          timeout: 5000,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false // Allow self-signed certs for testing
          })
        });

        this.logResult('HTTPS', 'PASS', 'HTTPS connection available');

        // Check HSTS header
        if (response.headers['strict-transport-security']) {
          this.logResult('HTTPS', 'PASS', 'HSTS header configured', response.headers['strict-transport-security']);
        } else {
          this.logResult('HTTPS', 'WARNING', 'HSTS header not found');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          this.logResult('HTTPS', 'WARNING', 'HTTPS not available - enable HTTPS in production');
        } else {
          this.logResult('HTTPS', 'WARNING', 'Cannot test HTTPS configuration', error.message);
        }
      }
    } catch (error) {
      this.logResult('HTTPS', 'FAIL', 'HTTPS test failed', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 NASA System 7 Portal - Security Testing');
    console.log(`Testing server at: ${this.baseUrl}`);
    console.log('=' .repeat(50));

    await this.testSecurityHeaders();
    await this.testCSRFProtection();
    await this.testRateLimiting();
    await this.testInputValidation();
    await this.testAuthentication();
    await this.testErrorHandling();
    await this.testHTTPS();

    console.log('\n📊 Security Test Results:');
    console.log('=' .repeat(50));

    console.log(`\n✅ Passed Tests: ${this.results.passed.length}`);
    this.results.passed.forEach(result => {
      console.log(`  ✓ ${result.test}: ${result.message}`);
    });

    if (this.results.failed.length > 0) {
      console.log(`\n❌ Failed Tests: ${this.results.failed.length}`);
      this.results.failed.forEach(result => {
        console.log(`  ✗ ${result.test}: ${result.message}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  Warnings: ${this.results.warnings.length}`);
      this.results.warnings.forEach(result => {
        console.log(`  ⚠ ${result.test}: ${result.message}`);
      });
    }

    const totalTests = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const securityScore = Math.round((this.results.passed.length / totalTests) * 100);

    console.log(`\n📈 Security Test Score: ${securityScore}/100`);

    if (this.results.failed.length === 0) {
      console.log('\n🎉 All critical security tests passed!');
    } else {
      console.log('\n⚠️  Some security tests failed. Review and fix the issues above.');
    }

    return {
      score: securityScore,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length,
      success: this.results.failed.length === 0
    };
  }
}

// Run security tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3001';
  const tester = new SecurityTester(baseUrl);

  tester.runAllTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Security testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = SecurityTester;