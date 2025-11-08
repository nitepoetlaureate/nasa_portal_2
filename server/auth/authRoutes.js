const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const AuthService = require('./authService');

const router = express.Router();
const authService = new AuthService();

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

// Input validation middleware
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User Registration
router.post('/register',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check rate limit
      const rateLimitResult = await authService.checkRateLimit(`register:${email}`);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        });
      }

      // Check if user already exists (in production, this would be a database check)
      const existingUserKey = `user_exists:${email}`;
      const existingUser = await authService.cache.get(existingUserKey);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await authService.hashPassword(password);

      // Create user (in production, this would be saved to database)
      const user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        name,
        password: hashedPassword,
        role: 'user',
        verified: false,
        mfaEnabled: false,
        createdAt: new Date(),
        lastLogin: null
      };

      // Store user in cache (temporary - in production, use database)
      await authService.cache.set(`user:${user.id}`, user, 24 * 60 * 60);
      await authService.cache.set(existingUserKey, true, 24 * 60 * 60);

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Create session
      const sessionId = await authService.createSession(user);

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          verified: user.verified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60 // 15 minutes
        },
        sessionId
      });
    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({
        error: 'Registration failed',
        message: 'An error occurred during registration'
      });
    }
  }
);

// User Login
router.post('/login',
  loginLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .notEmpty()
      .withMessage('Password required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { email, password, mfaToken } = req.body;

      // Check rate limit
      const rateLimitResult = await authService.checkRateLimit(`login:${email}`);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        });
      }

      // Find user (in production, this would be a database query)
      // For now, we'll use a simplified approach
      const userKey = `user_by_email:${email}`;
      let user = await authService.cache.get(userKey);

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Verify password
      const isPasswordValid = await authService.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }

      // Check MFA if enabled
      if (user.mfaEnabled && !mfaToken) {
        return res.status(403).json({
          error: 'MFA required',
          message: 'Multi-factor authentication token required',
          requiresMFA: true
        });
      }

      if (user.mfaEnabled && mfaToken) {
        const mfaValid = await authService.verifyMFAToken(user.id, mfaToken);
        if (!mfaValid) {
          return res.status(401).json({
            error: 'Invalid MFA token',
            message: 'Multi-factor authentication token is invalid'
          });
        }
        user.mfaVerified = true;
      }

      // Update last login
      user.lastLogin = new Date();
      await authService.cache.set(`user:${user.id}`, user, 24 * 60 * 60);

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Create session
      const sessionId = await authService.createSession(user, user.mfaVerified);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mfaEnabled: user.mfaEnabled,
          mfaVerified: user.mfaVerified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60
        },
        sessionId
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({
        error: 'Login failed',
        message: 'An error occurred during login'
      });
    }
  }
);

// Refresh Access Token
router.post('/refresh',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('Refresh token required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshAccessToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        ...result
      });
    } catch (error) {
      console.error('Token refresh error:', error.message);
      res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }
  }
);

// Logout
router.post('/logout',
  [
    body('refreshToken')
      .optional()
      .notEmpty()
      .withMessage('Invalid refresh token'),
    body('sessionId')
      .optional()
      .notEmpty()
      .withMessage('Invalid session ID')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { refreshToken, sessionId } = req.body;

      // Get token from Authorization header if not in body
      const token = req.headers.authorization?.split(' ')[1] || refreshToken;

      if (token) {
        await authService.revokeToken(token);
      }

      if (sessionId) {
        await authService.destroySession(sessionId);
      }

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error.message);
      res.status(500).json({
        error: 'Logout failed',
        message: 'An error occurred during logout'
      });
    }
  }
);

// MFA Setup
router.post('/mfa/setup',
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { userId } = req.body;

      // Get user
      const user = await authService.cache.get(`user:${userId}`);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Generate MFA secret
      const mfaSecret = authService.generateMFASecret(user);

      res.json({
        message: 'MFA setup initiated',
        secret: mfaSecret.secret,
        qrCodeUrl: mfaSecret.qrCodeUrl,
        backupCodes: [] // Generate backup codes in production
      });
    } catch (error) {
      console.error('MFA setup error:', error.message);
      res.status(500).json({
        error: 'MFA setup failed',
        message: 'An error occurred during MFA setup'
      });
    }
  }
);

// MFA Verification
router.post('/mfa/verify',
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID required'),
    body('token')
      .notEmpty()
      .isLength({ min: 6, max: 6 })
      .withMessage('MFA token must be 6 digits')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { userId, token } = req.body;

      const isValid = await authService.verifyMFAToken(userId, token);

      if (!isValid) {
        return res.status(401).json({
          error: 'Invalid MFA token',
          message: 'The provided MFA token is invalid'
        });
      }

      // Enable MFA for user
      const user = await authService.cache.get(`user:${userId}`);
      if (user) {
        user.mfaEnabled = true;
        await authService.cache.set(`user:${userId}`, user, 24 * 60 * 60);
      }

      res.json({
        message: 'MFA verification successful',
        mfaEnabled: true
      });
    } catch (error) {
      console.error('MFA verification error:', error.message);
      res.status(500).json({
        error: 'MFA verification failed',
        message: 'An error occurred during MFA verification'
      });
    }
  }
);

// OAuth Login Initiation
router.get('/oauth/:provider',
  async (req, res) => {
    try {
      const { provider } = req.params;
      const state = authService.generateSecureToken();

      // Store state in cache for verification
      await authService.cache.set(`oauth_state:${state}`, {
        provider,
        createdAt: new Date()
      }, 600); // 10 minutes

      const authUrl = authService.getOAuthAuthorizationUrl(provider, state);

      res.json({
        message: 'OAuth authorization URL generated',
        authUrl,
        state
      });
    } catch (error) {
      console.error('OAuth initiation error:', error.message);
      res.status(400).json({
        error: 'OAuth initiation failed',
        message: error.message
      });
    }
  }
);

// OAuth Callback
router.post('/oauth/:provider/callback',
  [
    body('code')
      .notEmpty()
      .withMessage('Authorization code required'),
    body('state')
      .notEmpty()
      .withMessage('State parameter required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { provider } = req.params;
      const { code, state } = req.body;

      // Verify state
      const storedState = await authService.cache.get(`oauth_state:${state}`);
      if (!storedState || storedState.provider !== provider) {
        return res.status(400).json({
          error: 'Invalid state parameter',
          message: 'OAuth state verification failed'
        });
      }

      // Exchange code for access token
      const tokenData = await authService.exchangeOAuthCode(provider, code);

      // Get user profile
      const profile = await authService.getOAuthUserProfile(provider, tokenData.access_token);

      // Create or update user
      const user = await authService.createOrUpdateOAuthUser(profile);

      // Generate tokens
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Create session
      const sessionId = await authService.createSession(user);

      // Clean up state
      await authService.cache.del(`oauth_state:${state}`);

      res.json({
        message: 'OAuth login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider,
          verified: user.verified
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 15 * 60
        },
        sessionId
      });
    } catch (error) {
      console.error('OAuth callback error:', error.message);
      res.status(400).json({
        error: 'OAuth callback failed',
        message: error.message
      });
    }
  }
);

// Session Validation
router.get('/session/:sessionId',
  async (req, res) => {
    try {
      const { sessionId } = req.params;

      const sessionData = await authService.validateSession(sessionId);

      if (!sessionData) {
        return res.status(401).json({
          error: 'Invalid session',
          message: 'Session not found or expired'
        });
      }

      res.json({
        message: 'Session valid',
        session: sessionData
      });
    } catch (error) {
      console.error('Session validation error:', error.message);
      res.status(500).json({
        error: 'Session validation failed',
        message: 'An error occurred during session validation'
      });
    }
  }
);

// Token Verification
router.post('/verify',
  [
    body('token')
      .notEmpty()
      .withMessage('Token required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { token } = req.body;

      const decoded = await authService.verifyAccessToken(token);

      res.json({
        message: 'Token valid',
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          mfaVerified: decoded.mfaVerified
        },
        exp: decoded.exp,
        iat: decoded.iat
      });
    } catch (error) {
      console.error('Token verification error:', error.message);
      res.status(401).json({
        error: 'Token verification failed',
        message: error.message
      });
    }
  }
);

// Password Reset Request
router.post('/password/reset-request',
  authLimiter,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { email } = req.body;

      // Check rate limit
      const rateLimitResult = await authService.checkRateLimit(`password_reset:${email}`, 3, 60 * 60 * 1000); // 3 attempts per hour
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        });
      }

      // Generate reset token
      const resetToken = authService.generateSecureToken();
      const resetTokenKey = `password_reset:${resetToken}`;

      // Store reset token with expiration (1 hour)
      await authService.cache.set(resetTokenKey, {
        email,
        createdAt: new Date()
      }, 3600);

      // In production, send email with reset link
      console.log(`Password reset link for ${email}: ${process.env.BASE_URL}/reset-password?token=${resetToken}`);

      res.json({
        message: 'Password reset instructions sent',
        // In production, don't return the token
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      });
    } catch (error) {
      console.error('Password reset request error:', error.message);
      res.status(500).json({
        error: 'Password reset request failed',
        message: 'An error occurred while processing your request'
      });
    }
  }
);

// Password Reset Confirmation
router.post('/password/reset-confirm',
  [
    body('token')
      .notEmpty()
      .withMessage('Reset token required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number, and special character')
  ],
  validateInput,
  async (req, res) => {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const resetTokenKey = `password_reset:${token}`;
      const resetData = await authService.cache.get(resetTokenKey);

      if (!resetData) {
        return res.status(400).json({
          error: 'Invalid or expired reset token',
          message: 'Please request a new password reset'
        });
      }

      // Find user and update password
      const userKey = `user_by_email:${resetData.email}`;
      const user = await authService.cache.get(userKey);

      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }

      // Hash new password
      const hashedPassword = await authService.hashPassword(password);
      user.password = hashedPassword;

      // Save updated user
      await authService.cache.set(`user:${user.id}`, user, 24 * 60 * 60);
      await authService.cache.set(userKey, user, 24 * 60 * 60);

      // Revoke all existing tokens for this user
      await authService.revokeAllUserTokens(user.id);

      // Clean up reset token
      await authService.cache.del(resetTokenKey);

      res.json({
        message: 'Password reset successful',
        instruction: 'Please login with your new password'
      });
    } catch (error) {
      console.error('Password reset confirmation error:', error.message);
      res.status(500).json({
        error: 'Password reset failed',
        message: 'An error occurred while resetting your password'
      });
    }
  }
);

// Health Check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await authService.getHealthStatus();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      ...healthStatus
    });
  } catch (error) {
    console.error('Auth health check error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Auth service health check failed'
    });
  }
});

module.exports = router;