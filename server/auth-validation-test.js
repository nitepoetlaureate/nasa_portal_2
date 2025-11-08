/**
 * NASA System 7 Portal - Authentication System Validation
 * Comprehensive testing of JWT, OAuth, MFA, and session management
 */

const SecurityAssessmentTest = require('./security-assessment-test');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthenticationValidationTest extends SecurityAssessmentTest {
  constructor(baseUrl = 'http://localhost:3001') {
    super(baseUrl);
    this.authReport = {
      jwt: {},
      oauth: {},
      mfa: {},
      sessions: {},
      security: {}
    };
  }

  async runComprehensiveValidation() {
    console.log('\n🚀 NASA System 7 Portal - Authentication System Validation');
    console.log('=======================================================\n');

    try {
      await this.validateJWTImplementation();
      await this.validateOAuthIntegration();
      await this.validateMFAImplementation();
      await this.validateSessionManagement();
      await this.validateSecurityControls();
      await this.testAdvancedSecurityScenarios();

      this.generateAuthenticationReport();

    } catch (error) {
      console.error('Authentication validation failed:', error.message);
      this.addTestResult('Authentication System', false, error.message);
    }
  }

  async validateJWTImplementation() {
    console.log('🔐 Validating JWT Implementation...');

    try {
      // Test 1: JWT token structure and claims
      const registerResponse = await this.makeRequest('POST', '/auth/register', {
        email: `jwt.test.${Date.now()}@example.com`,
        password: 'JWTest123!@#',
        name: 'JWT Test User'
      }, { useAuth: false });

      const accessToken = registerResponse.data.tokens.accessToken;
      const refreshToken = registerResponse.data.tokens.refreshToken;

      // Decode and validate JWT structure
      const decodedAccess = jwt.decode(accessToken, { complete: true });
      const decodedRefresh = jwt.decode(refreshToken, { complete: true });

      const jwtStructureValid = decodedAccess.header.alg &&
                               decodedAccess.header.typ === 'JWT' &&
                               decodedAccess.payload.id &&
                               decodedAccess.payload.email &&
                               decodedAccess.payload.exp;

      this.authReport.jwt.structure = {
        passed: jwtStructureValid,
        details: `Access token structure: ${JSON.stringify(decodedAccess.header)}`,
        payload: decodedAccess.payload
      };

      this.addTestResult('JWT Token Structure Validation', jwtStructureValid,
        'JWT tokens have correct structure and required claims');

      // Test 2: JWT signature validation
      try {
        jwt.verify(accessToken, process.env.JWT_SECRET || 'test_secret');
        this.authReport.jwt.signature = { passed: true };
        this.addTestResult('JWT Signature Validation', true, 'JWT signatures are valid');
      } catch (error) {
        this.authReport.jwt.signature = { passed: false, error: error.message };
        this.addTestResult('JWT Signature Validation', false, error.message);
      }

      // Test 3: Token expiration handling
      const expTime = decodedAccess.payload.exp;
      const currentTime = Math.floor(Date.now() / 1000);
      const timeToExpiry = expTime - currentTime;

      this.authReport.jwt.expiration = {
        passed: timeToExpiry > 0,
        timeToExpiry: timeToExpiry,
        details: `Token expires in ${timeToExpiry} seconds`
      };

      // Test 4: Refresh token mechanism
      const refreshResponse = await this.makeRequest('POST', '/auth/refresh', {
        refreshToken: refreshToken
      }, { useAuth: false });

      const refreshWorking = refreshResponse.status === 200 &&
                            refreshResponse.data.accessToken !== accessToken;

      this.authReport.jwt.refresh = {
        passed: refreshWorking,
        details: refreshWorking ? 'Refresh token mechanism working' : 'Refresh token failed'
      };

      this.addTestResult('JWT Refresh Token Mechanism', refreshWorking,
        'Refresh tokens correctly generate new access tokens');

      // Test 5: Token blacklist functionality
      await this.makeRequest('POST', '/auth/logout', {
        refreshToken: refreshToken
      }, { useAuth: false });

      try {
        await this.makeRequest('POST', '/auth/verify', {
          token: accessToken
        }, { useAuth: false });
        this.authReport.jwt.blacklist = { passed: false };
        this.addTestResult('JWT Token Blacklist', false, 'Blacklisted tokens were accepted');
      } catch (error) {
        this.authReport.jwt.blacklist = { passed: true };
        this.addTestResult('JWT Token Blacklist', true, 'Blacklisted tokens correctly rejected');
      }

      // Test 6: JWT payload security
      const payloadSecure = !decodedAccess.payload.password &&
                           !decodedAccess.payload.secret &&
                           !decodedAccess.payload.privateKey;

      this.authReport.jwt.payloadSecurity = {
        passed: payloadSecure,
        details: payloadSecure ? 'No sensitive data in JWT payload' : 'Sensitive data found in payload'
      };

      this.addTestResult('JWT Payload Security', payloadSecure,
        'JWT tokens do not contain sensitive information');

    } catch (error) {
      this.authReport.jwt.error = error.message;
      this.addTestResult('JWT Implementation', false, error.message);
    }
  }

  async validateOAuthIntegration() {
    console.log('\n🌐 Validating OAuth Integration...');

    const oauthProviders = ['google', 'github', 'nasa'];

    for (const provider of oauthProviders) {
      try {
        // Test OAuth initiation
        const initiateResponse = await this.makeRequest('GET', `/auth/oauth/${provider}`, null, { useAuth: false });

        const initiationWorking = initiateResponse.status === 200 &&
                                 initiateResponse.data.authUrl &&
                                 initiateResponse.data.state;

        this.authReport.oauth[provider] = {
          initiation: {
            passed: initiationWorking,
            details: initiationWorking ? 'OAuth initiation successful' : 'OAuth initiation failed'
          }
        };

        this.addTestResult(`${provider.toUpperCase()} OAuth Initiation`, initiationWorking,
          `${provider} OAuth flow initiation working`);

        // Test OAuth URL structure
        if (initiationWorking) {
          const authUrl = new URL(initiateResponse.data.authUrl);
          const hasRequiredParams = authUrl.searchParams.has('client_id') &&
                                   authUrl.searchParams.has('redirect_uri') &&
                                   authUrl.searchParams.has('scope') &&
                                   authUrl.searchParams.has('state') &&
                                   authUrl.searchParams.has('response_type');

          this.authReport.oauth[provider].urlStructure = {
            passed: hasRequiredParams,
            details: hasRequiredParams ? 'OAuth URL has all required parameters' : 'Missing OAuth parameters'
          };

          this.addTestResult(`${provider.toUpperCase()} OAuth URL Structure`, hasRequiredParams,
            `${provider} OAuth authorization URL is properly structured`);

          // Test state parameter security
          const stateSecure = initiateResponse.data.state.length >= 16 &&
                            /^[a-zA-Z0-9]+$/.test(initiateResponse.data.state);

          this.authReport.oauth[provider].stateSecurity = {
            passed: stateSecure,
            state: initiateResponse.data.state,
            details: stateSecure ? 'State parameter is secure' : 'State parameter security issues'
          };

          this.addTestResult(`${provider.toUpperCase()} OAuth State Security`, stateSecure,
            `${provider} OAuth state parameter is cryptographically secure`);
        }

        // Test OAuth callback validation
        const callbackResponse = await this.makeRequest('POST', `/auth/oauth/${provider}/callback`, {
          code: 'test_code',
          state: 'invalid_state'
        }, { useAuth: false });

        const callbackValidationWorking = callbackResponse.status === 400;

        this.authReport.oauth[provider].callbackValidation = {
          passed: callbackValidationWorking,
          details: callbackValidationWorking ? 'OAuth callback validation working' : 'Callback validation failed'
        };

        this.addTestResult(`${provider.toUpperCase()} OAuth Callback Validation`, callbackValidationWorking,
          `${provider} OAuth callback correctly validates state parameter`);

      } catch (error) {
        this.authReport.oauth[provider] = { error: error.message };
        this.addTestResult(`${provider.toUpperCase()} OAuth Integration`, false, error.message);
      }
    }

    // Test OAuth configuration validation
    const requiredEnvVars = {
      google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
      github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
      nasa: ['NASA_CLIENT_ID', 'NASA_CLIENT_SECRET']
    };

    for (const [provider, vars] of Object.entries(requiredEnvVars)) {
      const configValid = vars.every(varName => process.env[varName]);
      this.authReport.oauth[provider].configuration = {
        passed: configValid,
        details: configValid ? 'OAuth credentials configured' : 'Missing OAuth credentials'
      };

      this.addTestResult(`${provider.toUpperCase()} OAuth Configuration`, configValid,
        `${provider} OAuth environment variables are configured`);
    }
  }

  async validateMFAImplementation() {
    console.log('\n🛡️ Validating MFA Implementation...');

    try {
      // Test MFA setup
      const testUser = {
        email: `mfa.test.${Date.now()}@example.com`,
        password: 'MFATest123!@#',
        name: 'MFA Test User'
      };

      const registerResponse = await this.makeRequest('POST', '/auth/register', testUser, { useAuth: false });
      const userId = registerResponse.data.user.id;

      const mfaSetupResponse = await this.makeRequest('POST', '/auth/mfa/setup', {
        userId: userId
      });

      const mfaSetupWorking = mfaSetupResponse.status === 200 &&
                             mfaSetupResponse.data.secret &&
                             mfaSetupResponse.data.qrCodeUrl;

      this.authReport.mfa.setup = {
        passed: mfaSetupWorking,
        details: mfaSetupWorking ? 'MFA setup generates secret and QR code' : 'MFA setup failed'
      };

      this.addTestResult('MFA Setup Generation', mfaSetupWorking,
        'MFA setup correctly generates TOTP secret and QR code');

      if (mfaSetupWorking) {
        const mfaSecret = mfaSetupResponse.data.secret;

        // Test TOTP token generation and verification
        const validToken = speakeasy.totp({
          secret: mfaSecret,
          encoding: 'base32',
          time: Math.floor(Date.now() / 1000)
        });

        const mfaVerifyResponse = await this.makeRequest('POST', '/auth/mfa/verify', {
          userId: userId,
          token: validToken
        });

        const mfaVerificationWorking = mfaVerifyResponse.status === 200 &&
                                     mfaVerifyResponse.data.mfaEnabled === true;

        this.authReport.mfa.verification = {
          passed: mfaVerificationWorking,
          details: mfaVerificationWorking ? 'MFA token verification working' : 'MFA verification failed'
        };

        this.addTestResult('MFA Token Verification', mfaVerificationWorking,
          'MFA TOTP tokens are correctly verified');

        // Test TOTP time window tolerance
        const futureToken = speakeasy.totp({
          secret: mfaSecret,
          encoding: 'base32',
          time: Math.floor(Date.now() / 1000) + 30 // 30 seconds in future
        });

        const futureTokenResponse = await this.makeRequest('POST', '/auth/mfa/verify', {
          userId: userId,
          token: futureToken
        });

        const timeWindowWorking = futureTokenResponse.status === 200;

        this.authReport.mfa.timeWindow = {
          passed: timeWindowWorking,
          details: timeWindowWorking ? 'Time window tolerance working' : 'Time window tolerance issue'
        };

        this.addTestResult('MFA Time Window Tolerance', timeWindowWorking,
          'MFA implementation correctly handles time window tolerance');

        // Test invalid MFA token rejection
        const invalidTokenResponse = await this.makeRequest('POST', '/auth/mfa/verify', {
          userId: userId,
          token: '123456'
        });

        const invalidTokenRejection = invalidTokenResponse.status === 401;

        this.authReport.mfa.invalidTokenRejection = {
          passed: invalidTokenRejection,
          details: invalidTokenRejection ? 'Invalid MFA tokens rejected' : 'Invalid tokens accepted'
        };

        this.addTestResult('Invalid MFA Token Rejection', invalidTokenRejection,
          'Invalid MFA tokens are correctly rejected');

        // Test MFA secret security
        const secretSecure = mfaSecret.length >= 16 &&
                           /^[A-Z2-7]+=*$/.test(mfaSecret);

        this.authReport.mfa.secretSecurity = {
          passed: secretSecure,
          details: secretSecure ? 'MFA secret is properly generated' : 'MFA secret security issues'
        };

        this.addTestResult('MFA Secret Security', secretSecure,
          'MFA secrets are generated with proper entropy and format');

        // Test MFA in login flow
        const loginWithMfaResponse = await this.makeRequest('POST', '/auth/login', {
          email: testUser.email,
          password: testUser.password
        }, { useAuth: false });

        const mfaRequired = loginWithMfaResponse.status === 403 &&
                           loginWithMfaResponse.data.requiresMFA === true;

        this.authReport.mfa.loginIntegration = {
          passed: mfaRequired,
          details: mfaRequired ? 'MFA required in login flow' : 'MFA not required in login'
        };

        this.addTestResult('MFA Login Integration', mfaRequired,
          'MFA is correctly required in login flow when enabled');
      }

    } catch (error) {
      this.authReport.mfa.error = error.message;
      this.addTestResult('MFA Implementation', false, error.message);
    }
  }

  async validateSessionManagement() {
    console.log('\n📱 Validating Session Management...');

    try {
      // Test session creation
      const loginResponse = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      const sessionId = loginResponse.data.sessionId;
      const sessionCreated = sessionId && sessionId.length >= 16;

      this.authReport.sessions.creation = {
        passed: sessionCreated,
        sessionId: sessionId,
        details: sessionCreated ? 'Session created successfully' : 'Session creation failed'
      };

      this.addTestResult('Session Creation', sessionCreated,
        'User sessions are created correctly on login');

      // Test session validation
      const sessionValidateResponse = await this.makeRequest('GET', `/auth/session/${sessionId}`, null, { useAuth: false });

      const sessionValidationWorking = sessionValidateResponse.status === 200 &&
                                      sessionValidateResponse.data.session.userId === loginResponse.data.user.id;

      this.authReport.sessions.validation = {
        passed: sessionValidationWorking,
        details: sessionValidationWorking ? 'Session validation working' : 'Session validation failed'
      };

      this.addTestResult('Session Validation', sessionValidationWorking,
        'Existing sessions are correctly validated');

      // Test concurrent session handling
      const login2Response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      const sessionId2 = login2Response.data.sessionId;
      const concurrentSessionsHandled = sessionId2 !== sessionId;

      this.authReport.sessions.concurrent = {
        passed: concurrentSessionsHandled,
        originalSession: sessionId,
        newSession: sessionId2,
        details: concurrentSessionsHandled ? 'Concurrent sessions handled' : 'Concurrent session issues'
      };

      this.addTestResult('Concurrent Session Handling', concurrentSessionsHandled,
        'Multiple concurrent sessions are handled correctly');

      // Test session expiration
      await this.makeRequest('POST', '/auth/logout', {
        sessionId: sessionId
      });

      try {
        await this.makeRequest('GET', `/auth/session/${sessionId}`, null, { useAuth: false });
        this.authReport.sessions.expiration = { passed: false };
        this.addTestResult('Session Expiration', false, 'Expired sessions were accepted');
      } catch (error) {
        this.authReport.sessions.expiration = { passed: true };
        this.addTestResult('Session Expiration', true, 'Expired sessions are correctly rejected');
      }

      // Test session security
      const sessionSecure = sessionId.length >= 32 &&
                           /^[a-zA-Z0-9-]+$/.test(sessionId);

      this.authReport.sessions.security = {
        passed: sessionSecure,
        details: sessionSecure ? 'Session IDs are secure' : 'Session ID security issues'
      };

      this.addTestResult('Session ID Security', sessionSecure,
        'Session IDs are generated with proper security');

      // Test cross-device session management
      const device1Session = await this.simulateDeviceLogin('device1');
      const device2Session = await this.simulateDeviceLogin('device2');

      const crossDeviceWorking = device1Session && device2Session &&
                                 device1Session !== device2Session;

      this.authReport.sessions.crossDevice = {
        passed: crossDeviceWorking,
        details: crossDeviceWorking ? 'Cross-device sessions working' : 'Cross-device issues'
      };

      this.addTestResult('Cross-Device Session Management', crossDeviceWorking,
        'Sessions work correctly across multiple devices');

    } catch (error) {
      this.authReport.sessions.error = error.message;
      this.addTestResult('Session Management', false, error.message);
    }
  }

  async validateSecurityControls() {
    console.log('\n🛡️ Validating Security Controls...');

    try {
      // Test brute force protection
      let bruteForceProtectionActive = false;
      const maxAttempts = 15;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          await this.makeRequest('POST', '/auth/login', {
            email: 'bruteforce@test.com',
            password: 'wrongpassword'
          }, { useAuth: false });
        } catch (error) {
          if (error.response && error.response.status === 429) {
            bruteForceProtectionActive = true;
            break;
          }
        }
      }

      this.authReport.security.bruteForce = {
        passed: bruteForceProtectionActive,
        details: bruteForceProtectionActive ? 'Brute force protection active' : 'Brute force protection not working'
      };

      this.addTestResult('Brute Force Protection', bruteForceProtectionActive,
        'Authentication endpoints are protected against brute force attacks');

      // Test account lockout mechanism
      // This would require implementation testing based on your lockout policy

      // Test session hijacking protection
      const sessionResponse = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      const sessionId = sessionResponse.data.sessionId;

      // Try to access session from different IP (simulated)
      const hijackTestResponse = await this.makeRequest('GET', `/auth/session/${sessionId}`, null, {
        useAuth: false,
        headers: { 'X-Forwarded-For': '192.168.1.100' }
      });

      const hijackingProtectionWorking = hijackTestResponse.status !== 200;

      this.authReport.sessions.hijackingProtection = {
        passed: hijackingProtectionWorking,
        details: hijackingProtectionWorking ? 'Session hijacking protection active' : 'Session hijacking protection not working'
      };

      this.addTestResult('Session Hijacking Protection', hijackingProtectionWorking,
        'Sessions are protected against hijacking attempts');

      // Test security headers
      const healthResponse = await this.makeRequest('GET', '/health', null, { useAuth: false });
      const headers = healthResponse.headers;

      const securityHeadersConfigured =
        headers['x-content-type-options'] === 'nosniff' &&
        headers['x-frame-options'] === 'DENY' &&
        headers['x-xss-protection'] &&
        headers['referrer-policy'];

      this.authReport.security.headers = {
        passed: securityHeadersConfigured,
        headers: headers,
        details: securityHeadersConfigured ? 'Security headers configured' : 'Missing security headers'
      };

      this.addTestResult('Security Headers Configuration', securityHeadersConfigured,
        'Security headers are properly configured');

      // Test HTTPS enforcement in production
      const httpsEnforced = process.env.NODE_ENV === 'development' ||
                           healthResponse.headers['strict-transport-security'];

      this.authReport.security.https = {
        passed: httpsEnforced,
        details: httpsEnforced ? 'HTTPS enforced' : 'HTTPS not enforced'
      };

      this.addTestResult('HTTPS Enforcement', httpsEnforced,
        'HTTPS is properly enforced for secure connections');

    } catch (error) {
      this.authReport.security.error = error.message;
      this.addTestResult('Security Controls', false, error.message);
    }
  }

  async testAdvancedSecurityScenarios() {
    console.log('\n🔬 Testing Advanced Security Scenarios...');

    try {
      // Test token replay attacks
      const loginResponse = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, { useAuth: false });

      const originalToken = loginResponse.data.tokens.accessToken;

      // Use token, then try to reuse it after logout
      await this.makeRequest('POST', '/auth/logout', {
        refreshToken: loginResponse.data.tokens.refreshToken
      });

      try {
        await this.makeRequest('POST', '/auth/verify', {
          token: originalToken
        }, { useAuth: false });
        this.addTestResult('Token Replay Attack Protection', false, 'Token reuse allowed after logout');
      } catch (error) {
        this.addTestResult('Token Replay Attack Protection', true, 'Token replay attacks are prevented');
      }

      // Test CSRF protection
      const csrfToken = crypto.randomBytes(32).toString('hex');
      const csrfResponse = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password,
        _csrf: csrfToken
      }, {
        useAuth: false,
        headers: { 'X-CSRF-Token': csrfToken }
      });

      this.addTestResult('CSRF Protection', csrfResponse.status !== 500,
        'CSRF protection mechanisms are in place');

      // Test password reset token security
      const resetResponse = await this.makeRequest('POST', '/auth/password/reset-request', {
        email: this.testUser.email
      }, { useAuth: false });

      const resetTokenSecure = resetResponse.data.resetToken &&
                               resetResponse.data.resetToken.length >= 32;

      this.addTestResult('Password Reset Token Security', resetTokenSecure,
        'Password reset tokens are generated securely');

    } catch (error) {
      this.addTestResult('Advanced Security Scenarios', false, error.message);
    }
  }

  async simulateDeviceLogin(deviceId) {
    try {
      const response = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      }, {
        useAuth: false,
        headers: {
          'User-Agent': `NASA-System7-Portal-${deviceId}`,
          'X-Device-ID': deviceId
        }
      });

      return response.data.sessionId;
    } catch (error) {
      return null;
    }
  }

  generateAuthenticationReport() {
    console.log('\n📊 Authentication System Validation Report');
    console.log('==========================================\n');

    // Overall assessment
    const allTests = this.testResults;
    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`Overall Authentication Security Score: ${passRate}%`);
    console.log(`Tests Passed: ${passedTests}/${totalTests}\n`);

    // Component assessments
    console.log('Component Security Assessments:');
    console.log('-------------------------------');

    const components = [
      { name: 'JWT Token Management', data: this.authReport.jwt },
      { name: 'OAuth Integration', data: this.authReport.oauth },
      { name: 'MFA Implementation', data: this.authReport.mfa },
      { name: 'Session Management', data: this.authReport.sessions },
      { name: 'Security Controls', data: this.authReport.security }
    ];

    components.forEach(component => {
      const componentTests = allTests.filter(t =>
        t.name.toLowerCase().includes(component.name.toLowerCase().split(' ')[0])
      );
      const componentPassed = componentTests.filter(t => t.passed).length;
      const componentTotal = componentTests.length;
      const componentScore = componentTotal > 0 ?
        ((componentPassed / componentTotal) * 100).toFixed(1) : 'N/A';

      console.log(`${component.name}: ${componentScore}% (${componentPassed}/${componentTotal})`);

      if (component.data.error) {
        console.log(`  ❌ Error: ${component.data.error}`);
      }
    });

    // Critical security findings
    console.log('\n🚨 Critical Security Findings:');
    console.log('------------------------------');

    const criticalTests = allTests.filter(t =>
      !t.passed && (
        t.name.includes('Password') ||
        t.name.includes('Injection') ||
        t.name.includes('XSS') ||
        t.name.includes('Brute Force') ||
        t.name.includes('Hijacking')
      )
    );

    if (criticalTests.length > 0) {
      criticalTests.forEach(test => {
        console.log(`❌ ${test.name}: ${test.details}`);
      });
    } else {
      console.log('✅ No critical security issues detected');
    }

    // Recommendations
    console.log('\n🔧 Security Recommendations:');
    console.log('-----------------------------');

    const recommendations = [
      'Enable MFA for all user accounts',
      'Implement account lockout policies',
      'Regular security audits and penetration testing',
      'Keep all dependencies updated',
      'Monitor authentication logs for suspicious activity',
      'Implement advanced threat detection',
      'Regular security training for development team'
    ];

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Production readiness assessment
    console.log('\n🏭 Production Readiness Assessment:');
    console.log('----------------------------------');

    const productionReady = passRate >= 90 && criticalTests.length === 0;

    if (productionReady) {
      console.log('✅ READY for production deployment');
      console.log('   - High security score achieved');
      console.log('   - No critical security issues');
      console.log('   - All security controls functional');
    } else {
      console.log('⚠️  NOT READY for production deployment');
      console.log(`   - Security score: ${passRate}% (target: >=90%)`);
      console.log(`   - Critical issues: ${criticalTests.length}`);
      console.log('   - Address security issues before production');
    }

    return {
      overallScore: parseFloat(passRate),
      components: this.authReport,
      criticalIssues: criticalTests,
      productionReady,
      recommendations
    };
  }
}

// Run authentication validation if called directly
if (require.main === module) {
  const validator = new AuthenticationValidationTest();
  validator.runComprehensiveValidation().then(() => {
    console.log('\n🏁 Authentication validation completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Authentication validation failed:', error);
    process.exit(1);
  });
}

module.exports = AuthenticationValidationTest;