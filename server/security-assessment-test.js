/**
 * NASA System 7 Portal - Security Assessment Test Suite
 * Comprehensive security validation for authentication and authorization system
 */

const axios = require('axios');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

class SecurityAssessmentTest {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionId = null;
    this.testUser = {
      email: `security.test.${Date.now()}@example.com`,
      password: 'SecurePass123!@#',
      name: 'Security Test User'
    };
  }

  async runAllTests() {
    console.log('\n🔒 NASA System 7 Portal - Security Assessment Suite');
    console.log('====================================================\n');

    try {
      // 1. JWT Token Management Tests
      await this.testJWTTokenLifecycle();

      // 2. Authentication Flow Tests
      await this.testAuthenticationFlows();

      // 3. MFA Implementation Tests
      await this.testMFAImplementation();

      // 4. OAuth Integration Tests
      await this.testOAuthIntegration();

      // 5. Session Management Tests
      await this.testSessionManagement();

      // 6. Security Controls Tests
      await this.testSecurityControls();

      // 7. Input Validation Tests
      await this.testInputValidation();

      // 8. Rate Limiting Tests
      await this.testRateLimiting();

      // 9. Token Security Tests
      await this.testTokenSecurity();

      // 10. Performance Tests
      await this.testAuthenticationPerformance();

      // Generate comprehensive report
      this.generateSecurityReport();

    } catch (error) {
      console.error('Security assessment failed:', error.message);
      this.addTestResult('Overall Assessment', false, error.message);
    }
  }

  async testJWTTokenLifecycle() {
    console.log('🔐 Testing JWT Token Lifecycle Management...');

    try {
      // Test token generation
      const registerResponse = await this.makeRequest('POST', '/auth/register', this.testUser);
      this.accessToken = registerResponse.data.tokens.accessToken;
      this.refreshToken = registerResponse.data.tokens.refreshToken;
      this.sessionId = registerResponse.data.sessionId;

      this.addTestResult('Token Generation',
        registerResponse.status === 201 &&
        registerResponse.data.tokens.accessToken &&
        registerResponse.data.tokens.refreshToken,
        'Tokens generated successfully on registration'
      );

      // Test token validation
      const verifyResponse = await this.makeRequest('POST', '/auth/verify', {
        token: this.accessToken
      }, { useAuth: false });

      this.addTestResult('Token Validation',
        verifyResponse.status === 200 &&
        verifyResponse.data.user.email === this.testUser.email,
        'Access token validated successfully'
      );

      // Test token expiration handling
      const expiredToken = this.generateExpiredJWT();
      const expiredResponse = await this.makeRequest('POST', '/auth/verify', {
        token: expiredToken
      }, { useAuth: false });

      this.addTestResult('Token Expiration Handling',
        expiredResponse.status === 401,
        'Expired tokens correctly rejected'
      );

      // Test token refresh
      const refreshResponse = await this.makeRequest('POST', '/auth/refresh', {
        refreshToken: this.refreshToken
      }, { useAuth: false });

      this.addTestResult('Token Refresh',
        refreshResponse.status === 200 &&
        refreshResponse.data.accessToken !== this.accessToken,
        'Access token refreshed successfully'
      );

      // Test token revocation
      const logoutResponse = await this.makeRequest('POST', '/auth/logout', {
        refreshToken: this.refreshToken,
        sessionId: this.sessionId
      });

      this.addTestResult('Token Revocation',
        logoutResponse.status === 200,
        'Tokens revoked successfully on logout'
      );

      // Test blacklisted token rejection
      const blacklistedResponse = await this.makeRequest('POST', '/auth/verify', {
        token: this.accessToken
      }, { useAuth: false });

      this.addTestResult('Blacklisted Token Rejection',
        blacklistedResponse.status === 401,
        'Blacklisted tokens correctly rejected'
      );

    } catch (error) {
      this.addTestResult('JWT Token Lifecycle', false, error.message);
    }
  }

  async testAuthenticationFlows() {
    console.log('\n🔑 Testing Authentication Flows...');

    try {
      // Test user registration
      const newUser = {
        email: `flow.test.${Date.now()}@example.com`,
        password: 'FlowTest123!@#',
        name: 'Flow Test User'
      };

      const registerResponse = await this.makeRequest('POST', '/auth/register', newUser, { useAuth: false });
      this.addTestResult('User Registration',
        registerResponse.status === 201 &&
        registerResponse.data.user.email === newUser.email,
        'User registration flow working correctly'
      );

      // Test user login
      const loginResponse = await this.makeRequest('POST', '/auth/login', {
        email: newUser.email,
        password: newUser.password
      }, { useAuth: false });

      this.addTestResult('User Login',
        loginResponse.status === 200 &&
        loginResponse.data.user.email === newUser.email,
        'User login flow working correctly'
      );

      // Test invalid credentials
      const invalidLoginResponse = await this.makeRequest('POST', '/auth/login', {
        email: newUser.email,
        password: 'wrongpassword'
      }, { useAuth: false });

      this.addTestResult('Invalid Credentials Rejection',
        invalidLoginResponse.status === 401,
        'Invalid credentials correctly rejected'
      );

      // Test password reset request
      const resetRequestResponse = await this.makeRequest('POST', '/auth/password/reset-request', {
        email: newUser.email
      }, { useAuth: false });

      this.addTestResult('Password Reset Request',
        resetRequestResponse.status === 200,
        'Password reset request flow working'
      );

      // Test session validation
      const sessionId = loginResponse.data.sessionId;
      const sessionResponse = await this.makeRequest('GET', `/auth/session/${sessionId}`, null, { useAuth: false });

      this.addTestResult('Session Validation',
        sessionResponse.status === 200 &&
        sessionResponse.data.session.userId === loginResponse.data.user.id,
        'Session validation working correctly'
      );

    } catch (error) {
      this.addTestResult('Authentication Flows', false, error.message);
    }
  }

  async testMFAImplementation() {
    console.log('\n🛡️ Testing MFA Implementation...');

    try {
      // Setup MFA for user
      const mfaSetupResponse = await this.makeRequest('POST', '/auth/mfa/setup', {
        userId: this.testUser.id || 'test_user_id'
      });

      this.addTestResult('MFA Setup',
        mfaSetupResponse.status === 200 &&
        mfaSetupResponse.data.secret &&
        mfaSetupResponse.data.qrCodeUrl,
        'MFA setup generates secret and QR code'
      );

      // Test TOTP token generation and verification
      if (mfaSetupResponse.data.secret) {
        const totpToken = speakeasy.totp({
          secret: mfaSetupResponse.data.secret,
          encoding: 'base32'
        });

        const mfaVerifyResponse = await this.makeRequest('POST', '/auth/mfa/verify', {
          userId: this.testUser.id || 'test_user_id',
          token: totpToken
        });

        this.addTestResult('MFA Token Verification',
          mfaVerifyResponse.status === 200 &&
          mfaVerifyResponse.data.mfaEnabled === true,
          'MFA TOTP tokens verified correctly'
        );

        // Test invalid MFA token
        const invalidMfaResponse = await this.makeRequest('POST', '/auth/mfa/verify', {
          userId: this.testUser.id || 'test_user_id',
          token: '123456'
        });

        this.addTestResult('Invalid MFA Token Rejection',
          invalidMfaResponse.status === 401,
          'Invalid MFA tokens correctly rejected'
        );
      }

    } catch (error) {
      this.addTestResult('MFA Implementation', false, error.message);
    }
  }

  async testOAuthIntegration() {
    console.log('\n🌐 Testing OAuth Integration...');

    try {
      // Test Google OAuth initiation
      const googleOAuthResponse = await this.makeRequest('GET', '/auth/oauth/google', null, { useAuth: false });

      this.addTestResult('Google OAuth Initiation',
        googleOAuthResponse.status === 200 &&
        googleOAuthResponse.data.authUrl &&
        googleOAuthResponse.data.state,
        'Google OAuth flow initiated correctly'
      );

      // Test GitHub OAuth initiation
      const githubOAuthResponse = await this.makeRequest('GET', '/auth/oauth/github', null, { useAuth: false });

      this.addTestResult('GitHub OAuth Initiation',
        githubOAuthResponse.status === 200 &&
        githubOAuthResponse.data.authUrl &&
        githubOAuthResponse.data.state,
        'GitHub OAuth flow initiated correctly'
      );

      // Test NASA OAuth initiation
      const nasaOAuthResponse = await this.makeRequest('GET', '/auth/oauth/nasa', null, { useAuth: false });

      this.addTestResult('NASA OAuth Initiation',
        nasaOAuthResponse.status === 200,
        'NASA OAuth flow initiated correctly'
      );

      // Test OAuth callback with invalid state
      const invalidStateResponse = await this.makeRequest('POST', '/auth/oauth/google/callback', {
        code: 'test_code',
        state: 'invalid_state'
      }, { useAuth: false });

      this.addTestResult('OAuth State Validation',
        invalidStateResponse.status === 400,
        'OAuth state parameter validation working'
      );

    } catch (error) {
      this.addTestResult('OAuth Integration', false, error.message);
    }
  }

  async testSessionManagement() {
    console.log('\n📱 Testing Session Management...');

    try {
      // Create new session
      const loginResponse = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      const sessionId = loginResponse.data.sessionId;

      // Test concurrent sessions
      const login2Response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      this.addTestResult('Concurrent Session Handling',
        login2Response.status === 200 &&
        login2Response.data.sessionId !== sessionId,
        'Concurrent sessions handled correctly'
      );

      // Test session expiration
      // Simulate session expiration by waiting
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test session destruction
      const logoutResponse = await this.makeRequest('POST', '/auth/logout', {
        sessionId: sessionId
      });

      this.addTestResult('Session Destruction',
        logoutResponse.status === 200,
        'Session destruction working correctly'
      );

      // Test invalid session rejection
      const invalidSessionResponse = await this.makeRequest('GET', `/auth/session/${sessionId}`, null, { useAuth: false });

      this.addTestResult('Invalid Session Rejection',
        invalidSessionResponse.status === 401,
        'Invalid sessions correctly rejected'
      );

    } catch (error) {
      this.addTestResult('Session Management', false, error.message);
    }
  }

  async testSecurityControls() {
    console.log('\n🛡️ Testing Security Controls...');

    try {
      // Test rate limiting
      let rateLimitHit = false;
      for (let i = 0; i < 10; i++) {
        try {
          await this.makeRequest('POST', '/auth/login', {
            email: 'ratelimit@test.com',
            password: 'test'
          }, { useAuth: false });
        } catch (error) {
          if (error.response && error.response.status === 429) {
            rateLimitHit = true;
            break;
          }
        }
      }

      this.addTestResult('Rate Limiting',
        rateLimitHit,
        'Rate limiting prevents brute force attacks'
      );

      // Test security headers
      const response = await this.makeRequest('GET', '/health', null, { useAuth: false });
      const headers = response.headers;

      this.addTestResult('Security Headers',
        headers['x-content-type-options'] === 'nosniff' &&
        headers['x-frame-options'] === 'DENY' &&
        headers['x-xss-protection'],
        'Security headers properly configured'
      );

      // Test CORS configuration
      const corsResponse = await this.makeRequest('OPTIONS', '/auth/login', null, {
        useAuth: false,
        headers: { 'Origin': 'http://localhost:3000' }
      });

      this.addTestResult('CORS Configuration',
        corsResponse.headers['access-control-allow-origin'],
        'CORS properly configured'
      );

    } catch (error) {
      this.addTestResult('Security Controls', false, error.message);
    }
  }

  async testInputValidation() {
    console.log('\n✅ Testing Input Validation...');

    try {
      // Test invalid email format
      const invalidEmailResponse = await this.makeRequest('POST', '/auth/register', {
        email: 'invalid-email',
        password: 'ValidPass123!@#',
        name: 'Test User'
      }, { useAuth: false });

      this.addTestResult('Email Validation',
        invalidEmailResponse.status === 400,
        'Invalid email formats are rejected'
      );

      // Test weak password
      const weakPasswordResponse = await this.makeRequest('POST', '/auth/register', {
        email: 'weak@test.com',
        password: 'weak',
        name: 'Test User'
      }, { useAuth: false });

      this.addTestResult('Password Strength Validation',
        weakPasswordResponse.status === 400,
        'Weak passwords are rejected'
      );

      // Test SQL injection attempt
      const sqlInjectionResponse = await this.makeRequest('POST', '/auth/login', {
        email: "'; DROP TABLE users; --",
        password: 'test'
      }, { useAuth: false });

      this.addTestResult('SQL Injection Protection',
        sqlInjectionResponse.status !== 200,
        'SQL injection attempts are blocked'
      );

      // Test XSS attempt
      const xssResponse = await this.makeRequest('POST', '/auth/register', {
        email: 'xss@test.com',
        password: 'XssPass123!@#',
        name: '<script>alert("xss")</script>'
      }, { useAuth: false });

      this.addTestResult('XSS Protection',
        xssResponse.status === 400 || !xssResponse.data.user.name.includes('<script>'),
        'XSS attempts are sanitized'
      );

    } catch (error) {
      this.addTestResult('Input Validation', false, error.message);
    }
  }

  async testRateLimiting() {
    console.log('\n⏱️ Testing Rate Limiting...');

    try {
      let rateLimitExceeded = false;
      let requestCount = 0;

      // Test authentication endpoint rate limiting
      while (!rateLimitExceeded && requestCount < 20) {
        try {
          await this.makeRequest('POST', '/auth/register', {
            email: `ratelimit${requestCount}@test.com`,
            password: 'RateLimit123!@#',
            name: 'Rate Limit Test'
          }, { useAuth: false });
          requestCount++;
        } catch (error) {
          if (error.response && error.response.status === 429) {
            rateLimitExceeded = true;
            this.addTestResult('Registration Rate Limiting',
              true,
              `Rate limiting engaged after ${requestCount} requests`
            );
            break;
          }
        }
      }

      if (!rateLimitExceeded) {
        this.addTestResult('Registration Rate Limiting', false, 'Rate limiting not engaged');
      }

      // Test API endpoint rate limiting
      let apiRateLimitExceeded = false;
      let apiRequestCount = 0;

      while (!apiRateLimitExceeded && apiRequestCount < 150) {
        try {
          await this.makeRequest('GET', '/api/nasa/apod', null, { useAuth: false });
          apiRequestCount++;
        } catch (error) {
          if (error.response && error.response.status === 429) {
            apiRateLimitExceeded = true;
            this.addTestResult('API Rate Limiting',
              true,
              `API rate limiting engaged after ${apiRequestCount} requests`
            );
            break;
          }
        }
      }

      if (!apiRateLimitExceeded) {
        this.addTestResult('API Rate Limiting', false, 'API rate limiting not engaged');
      }

    } catch (error) {
      this.addTestResult('Rate Limiting', false, error.message);
    }
  }

  async testTokenSecurity() {
    console.log('\n🔐 Testing Token Security...');

    try {
      // Test JWT token structure
      const tokenParts = this.accessToken.split('.');
      this.addTestResult('JWT Token Structure',
        tokenParts.length === 3,
        'JWT tokens have correct structure (header.payload.signature)'
      );

      // Test token tampering
      const tamperedToken = this.accessToken.slice(0, -10) + 'tampered';
      try {
        await this.makeRequest('POST', '/auth/verify', {
          token: tamperedToken
        }, { useAuth: false });
        this.addTestResult('Token Tampering Detection', false, 'Tampered tokens were accepted');
      } catch (error) {
        this.addTestResult('Token Tampering Detection',
          error.response && error.response.status === 401,
          'Tampered tokens are correctly rejected'
        );
      }

      // Test token expiration
      const shortLivedToken = this.generateShortLivedJWT();
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for expiration

      try {
        await this.makeRequest('POST', '/auth/verify', {
          token: shortLivedToken
        }, { useAuth: false });
        this.addTestResult('Token Expiration Enforcement', false, 'Expired tokens were accepted');
      } catch (error) {
        this.addTestResult('Token Expiration Enforcement',
          error.response && error.response.status === 401,
          'Expired tokens are correctly rejected'
        );
      }

      // Test refresh token rotation
      const refreshResponse = await this.makeRequest('POST', '/auth/refresh', {
        refreshToken: this.refreshToken
      }, { useAuth: false });

      this.addTestResult('Refresh Token Security',
        refreshResponse.status === 200,
        'Refresh token mechanism working correctly'
      );

    } catch (error) {
      this.addTestResult('Token Security', false, error.message);
    }
  }

  async testAuthenticationPerformance() {
    console.log('\n⚡ Testing Authentication Performance...');

    try {
      // Test login response time
      const loginStart = Date.now();
      await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });
      const loginTime = Date.now() - loginStart;

      this.addTestResult('Login Performance',
        loginTime < 200,
        `Login response time: ${loginTime}ms (target: <200ms)`
      );

      // Test token validation performance
      const validateStart = Date.now();
      await this.makeRequest('POST', '/auth/verify', {
        token: this.accessToken
      }, { useAuth: false });
      const validateTime = Date.now() - validateStart;

      this.addTestResult('Token Validation Performance',
        validateTime < 50,
        `Token validation time: ${validateTime}ms (target: <50ms)`
      );

      // Test concurrent authentication requests
      const concurrentStart = Date.now();
      const concurrentPromises = [];

      for (let i = 0; i < 10; i++) {
        concurrentPromises.push(
          this.makeRequest('POST', '/auth/login', {
            email: this.testUser.email,
            password: this.testUser.password
          }, { useAuth: false })
        );
      }

      await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStart;

      this.addTestResult('Concurrent Authentication Performance',
        concurrentTime < 1000,
        `10 concurrent requests completed in ${concurrentTime}ms (target: <1000ms)`
      );

    } catch (error) {
      this.addTestResult('Authentication Performance', false, error.message);
    }
  }

  // Utility methods
  async makeRequest(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      ...options
    };

    if (data) {
      config.data = data;
    }

    if (options.useAuth !== false && this.accessToken) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${this.accessToken}`
      };
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  generateExpiredJWT() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 'test', email: 'test@test.com', type: 'access' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '-1h' }
    );
  }

  generateShortLivedJWT() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: 'test', email: 'test@test.com', type: 'access' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1s' }
    );
  }

  addTestResult(testName, passed, details = '') {
    this.testResults.push({
      name: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });

    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${testName}`);
    if (details) {
      console.log(`     ${details}`);
    }
  }

  generateSecurityReport() {
    console.log('\n📊 Security Assessment Report');
    console.log('============================\n');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Pass Rate: ${passRate}%\n`);

    // Categorized results
    const categories = {
      'JWT Token Management': [],
      'Authentication Flows': [],
      'MFA Implementation': [],
      'OAuth Integration': [],
      'Session Management': [],
      'Security Controls': [],
      'Input Validation': [],
      'Rate Limiting': [],
      'Token Security': [],
      'Performance': []
    };

    this.testResults.forEach(result => {
      for (const [category, tests] of Object.entries(categories)) {
        if (result.name.toLowerCase().includes(category.toLowerCase().split(' ')[0])) {
          tests.push(result);
          break;
        }
      }
    });

    // Category breakdown
    console.log('Category Breakdown:');
    console.log('-------------------');
    for (const [category, tests] of Object.entries(categories)) {
      if (tests.length > 0) {
        const passed = tests.filter(t => t.passed).length;
        const total = tests.length;
        const rate = ((passed / total) * 100).toFixed(1);
        console.log(`${category}: ${passed}/${total} (${rate}%)`);

        // Show failed tests
        const failed = tests.filter(t => !t.passed);
        failed.forEach(test => {
          console.log(`  ❌ ${test.name}: ${test.details}`);
        });
      }
    }

    // Security recommendations
    console.log('\n🔧 Security Recommendations:');
    console.log('---------------------------');

    const criticalIssues = this.testResults.filter(r => !r.passed &&
      (r.name.includes('Password') || r.name.includes('Injection') || r.name.includes('XSS')));

    if (criticalIssues.length > 0) {
      console.log('🚨 CRITICAL ISSUES FOUND:');
      criticalIssues.forEach(issue => {
        console.log(`  - ${issue.name}: ${issue.details}`);
      });
    }

    if (failedTests > 0) {
      console.log('\nRecommended Actions:');
      console.log('1. Review and fix failed security tests');
      console.log('2. Implement additional security monitoring');
      console.log('3. Consider penetration testing');
      console.log('4. Regular security audits and updates');
    } else {
      console.log('✅ All security tests passed! System appears secure.');
      console.log('Recommendations:');
      console.log('1. Continue regular security monitoring');
      console.log('2. Schedule periodic security assessments');
      console.log('3. Keep dependencies updated');
    }

    // Performance summary
    const perfTests = categories['Performance'];
    if (perfTests.length > 0) {
      console.log('\n⚡ Performance Summary:');
      console.log('----------------------');
      perfTests.forEach(test => {
        console.log(`${test.name}: ${test.details}`);
      });
    }

    return {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        passRate: parseFloat(passRate)
      },
      categories,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter(r => !r.passed);

    failedTests.forEach(test => {
      switch (test.name) {
        case 'Password Strength Validation':
          recommendations.push('Implement stronger password requirements');
          break;
        case 'SQL Injection Protection':
          recommendations.push('Review database query sanitization');
          break;
        case 'XSS Protection':
          recommendations.push('Enhance input sanitization and output encoding');
          break;
        case 'Rate Limiting':
          recommendations.push('Configure stricter rate limiting');
          break;
        case 'Security Headers':
          recommendations.push('Ensure all security headers are properly configured');
          break;
        case 'MFA Implementation':
          recommendations.push('Complete MFA implementation and testing');
          break;
        case 'OAuth Integration':
          recommendations.push('Review OAuth provider configurations');
          break;
        default:
          recommendations.push(`Address issues with ${test.name}`);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

// Run the security assessment if called directly
if (require.main === module) {
  const assessment = new SecurityAssessmentTest();
  assessment.runAllTests().then(() => {
    console.log('\n🏁 Security assessment completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Security assessment failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityAssessmentTest;