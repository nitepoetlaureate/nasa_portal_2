const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { cache } = require('../middleware/cache');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.tokenBlacklist = new Set();
    this.refreshTokens = new Map();
    this.mfaSessions = new Map();
    this.oauthProviders = new Map();

    this.initializeOAuthProviders();
  }

  initializeOAuthProviders() {
    // Google OAuth configuration
    this.oauthProviders.set('google', {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL}/auth/google/callback`,
      scope: ['profile', 'email']
    });

    // GitHub OAuth configuration
    this.oauthProviders.set('github', {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.BASE_URL}/auth/github/callback`,
      scope: ['user:email']
    });

    // NASA SSO configuration (placeholder for actual NASA SSO integration)
    this.oauthProviders.set('nasa', {
      clientId: process.env.NASA_CLIENT_ID,
      clientSecret: process.env.NASA_CLIENT_SECRET,
      redirectUri: process.env.NASA_REDIRECT_URI || `${process.env.BASE_URL}/auth/nasa/callback`,
      scope: ['profile', 'data_access']
    });
  }

  // JWT Token Management
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      mfaVerified: user.mfaVerified || false,
      type: 'access'
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'nasa-system7-portal',
      audience: 'nasa-system7-users'
    });
  }

  generateRefreshToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      type: 'refresh',
      sessionId: crypto.randomUUID()
    };

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });

    // Store refresh token in memory and Redis
    this.refreshTokens.set(payload.sessionId, {
      userId: user.id,
      email: user.email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    cache.set(`refresh_token:${payload.sessionId}`, {
      userId: user.id,
      email: user.email
    }, 7 * 24 * 60 * 60); // 7 days

    return refreshToken;
  }

  async verifyAccessToken(token) {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret);

      // Check if refresh token exists in our store
      const storedToken = this.refreshTokens.get(decoded.sessionId);
      if (!storedToken) {
        throw new Error('Refresh token not found');
      }

      if (storedToken.expiresAt < new Date()) {
        this.refreshTokens.delete(decoded.sessionId);
        await cache.del(`refresh_token:${decoded.sessionId}`);
        throw new Error('Refresh token expired');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);

      // Get user data (in production, this would be from database)
      const user = {
        id: decoded.id,
        email: decoded.email,
        role: 'user', // Would be fetched from database
        mfaVerified: false
      };

      // Generate new access token
      const newAccessToken = this.generateAccessToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: refreshToken,
        expiresIn: 15 * 60 // 15 minutes
      };
    } catch (error) {
      throw new Error('Failed to refresh access token');
    }
  }

  async revokeToken(token) {
    try {
      // Add token to blacklist
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const blacklistKey = `blacklist:${token}`;
        await cache.set(blacklistKey, true, decoded.exp - Math.floor(Date.now() / 1000));
        this.tokenBlacklist.add(token);
      }

      return true;
    } catch (error) {
      console.error('Error revoking token:', error.message);
      return false;
    }
  }

  async revokeAllUserTokens(userId) {
    try {
      // Revoke all refresh tokens for user
      for (const [sessionId, tokenData] of this.refreshTokens) {
        if (tokenData.userId === userId) {
          this.refreshTokens.delete(sessionId);
          await cache.del(`refresh_token:${sessionId}`);
        }
      }

      // Add user to revocation list
      await cache.set(`user_revoked:${userId}`, true, 7 * 24 * 60 * 60); // 7 days
      return true;
    } catch (error) {
      console.error('Error revoking user tokens:', error.message);
      return false;
    }
  }

  async isTokenBlacklisted(token) {
    try {
      // Check memory blacklist
      if (this.tokenBlacklist.has(token)) {
        return true;
      }

      // Check Redis blacklist
      const blacklistKey = `blacklist:${token}`;
      const isBlacklisted = await cache.get(blacklistKey);
      return !!isBlacklisted;
    } catch (error) {
      return false;
    }
  }

  // Multi-Factor Authentication (MFA)
  generateMFASecret(user) {
    const secret = speakeasy.generateSecret({
      name: `NASA System 7 Portal (${user.email})`,
      issuer: 'NASA System 7 Portal',
      length: 32
    });

    // Store temporary secret
    const tempSecretKey = `mfa_temp:${user.id}`;
    cache.set(tempSecretKey, secret.base32, 600); // 10 minutes

    return {
      secret: secret.base32,
      qrCodeUrl: speakeasy.otpauthURL({
        secret: secret.base32,
        label: `NASA System 7 Portal (${user.email})`,
        issuer: 'NASA System 7 Portal'
      })
    };
  }

  verifyMFAToken(userId, token) {
    try {
      // Get stored secret
      const tempSecretKey = `mfa_temp:${userId}`;
      const userSecretKey = `mfa_user:${userId}`;

      return cache.get(tempSecretKey).then(tempSecret => {
        if (tempSecret) {
          // Verify with temporary secret (setup phase)
          const verified = speakeasy.totp.verify({
            secret: tempSecret,
            encoding: 'base32',
            token: token,
            window: 2
          });

          if (verified) {
            // Move to permanent storage
            cache.set(userSecretKey, tempSecret, 365 * 24 * 60 * 60); // 1 year
            cache.del(tempSecretKey);
          }

          return verified;
        } else {
          // Verify with permanent secret
          return cache.get(userSecretKey).then(secret => {
            if (!secret) {
              throw new Error('MFA not set up for user');
            }

            return speakeasy.totp.verify({
              secret: secret,
              encoding: 'base32',
              token: token,
              window: 2
            });
          });
        }
      });
    } catch (error) {
      console.error('MFA verification error:', error.message);
      return false;
    }
  }

  async createMFASession(userId, mfaToken) {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    this.mfaSessions.set(sessionId, {
      userId,
      mfaToken,
      createdAt: new Date(),
      expiresAt
    });

    await cache.set(`mfa_session:${sessionId}`, {
      userId,
      expiresAt: expiresAt.toISOString()
    }, 600); // 10 minutes

    return sessionId;
  }

  async verifyMFASession(sessionId, mfaToken) {
    try {
      const session = this.mfaSessions.get(sessionId);
      if (!session || session.expiresAt < new Date()) {
        this.mfaSessions.delete(sessionId);
        await cache.del(`mfa_session:${sessionId}`);
        return false;
      }

      const isValid = this.verifyMFAToken(session.userId, mfaToken);

      if (isValid) {
        this.mfaSessions.delete(sessionId);
        await cache.del(`mfa_session:${sessionId}`);

        // Mark MFA as verified for this user session
        await cache.set(`mfa_verified:${session.userId}`, true, 15 * 60); // 15 minutes
      }

      return isValid;
    } catch (error) {
      console.error('MFA session verification error:', error.message);
      return false;
    }
  }

  // OAuth Provider Management
  getOAuthAuthorizationUrl(provider, state) {
    const providerConfig = this.oauthProviders.get(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const urls = {
      google: 'https://accounts.google.com/o/oauth2/v2/auth',
      github: 'https://github.com/login/oauth/authorize',
      nasa: process.env.NASA_OAUTH_AUTH_URL || 'https://auth.nasa.gov/oauth2/authorize'
    };

    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      scope: providerConfig.scope.join(' '),
      response_type: 'code',
      state: state
    });

    return `${urls[provider]}?${params.toString()}`;
  }

  async exchangeOAuthCode(provider, code) {
    const providerConfig = this.oauthProviders.get(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    try {
      const axios = require('axios');

      const tokenUrls = {
        google: 'https://oauth2.googleapis.com/token',
        github: 'https://github.com/login/oauth/access_token',
        nasa: process.env.NASA_OAUTH_TOKEN_URL || 'https://auth.nasa.gov/oauth2/token'
      };

      const response = await axios.post(tokenUrls[provider], {
        client_id: providerConfig.clientId,
        client_secret: providerConfig.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: providerConfig.redirectUri
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`OAuth token exchange error for ${provider}:`, error.message);
      throw new Error('Failed to exchange authorization code');
    }
  }

  async getOAuthUserProfile(provider, accessToken) {
    try {
      const axios = require('axios');

      const profileUrls = {
        google: 'https://www.googleapis.com/oauth2/v2/userinfo',
        github: 'https://api.github.com/user',
        nasa: process.env.NASA_OAUTH_PROFILE_URL || 'https://api.nasa.gov/user/profile'
      };

      const response = await axios.get(profileUrls[provider], {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      // Normalize user profile data
      const profileData = response.data;
      return this.normalizeOAuthProfile(provider, profileData);
    } catch (error) {
      console.error(`OAuth profile fetch error for ${provider}:`, error.message);
      throw new Error('Failed to fetch user profile');
    }
  }

  normalizeOAuthProfile(provider, profileData) {
    const normalized = {
      provider,
      providerId: null,
      email: null,
      name: null,
      avatar: null,
      verified: false
    };

    switch (provider) {
      case 'google':
        normalized.providerId = profileData.id;
        normalized.email = profileData.email;
        normalized.name = profileData.name;
        normalized.avatar = profileData.picture;
        normalized.verified = profileData.verified_email;
        break;

      case 'github':
        normalized.providerId = profileData.id.toString();
        normalized.email = profileData.email;
        normalized.name = profileData.name || profileData.login;
        normalized.avatar = profileData.avatar_url;
        break;

      case 'nasa':
        normalized.providerId = profileData.userId;
        normalized.email = profileData.email;
        normalized.name = profileData.displayName;
        normalized.avatar = profileData.profilePicture;
        normalized.verified = profileData.verified;
        break;

      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    return normalized;
  }

  async createOrUpdateOAuthUser(profile) {
    // In production, this would interact with your database
    // For now, we'll create a user object

    const user = {
      id: `oauth_${profile.provider}_${profile.providerId}`,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      role: 'user',
      verified: profile.verified,
      provider: profile.provider,
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // Store user in cache (in production, this would be in database)
    await cache.set(`user:${user.id}`, user, 24 * 60 * 60); // 24 hours

    return user;
  }

  // Session Management
  async createSession(user, mfaVerified = false) {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      sessionId,
      userId: user.id,
      email: user.email,
      role: user.role,
      mfaVerified,
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    await cache.set(`session:${sessionId}`, sessionData, 24 * 60 * 60);
    await cache.set(`user_session:${user.id}`, sessionId, 24 * 60 * 60);

    return sessionId;
  }

  async validateSession(sessionId) {
    try {
      const sessionData = await cache.get(`session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      if (new Date(sessionData.expiresAt) < new Date()) {
        await cache.del(`session:${sessionId}`);
        return null;
      }

      // Update last activity
      sessionData.lastActivity = new Date();
      await cache.set(`session:${sessionId}`, sessionData, 24 * 60 * 60);

      return sessionData;
    } catch (error) {
      console.error('Session validation error:', error.message);
      return null;
    }
  }

  async destroySession(sessionId) {
    try {
      const sessionData = await cache.get(`session:${sessionId}`);
      if (sessionData) {
        await cache.del(`session:${sessionId}`);
        await cache.del(`user_session:${sessionData.userId}`);
      }
      return true;
    } catch (error) {
      console.error('Session destruction error:', error.message);
      return false;
    }
  }

  // Rate Limiting
  async checkRateLimit(identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const key = `rate_limit:${identifier}`;
    const attempts = await cache.get(key) || 0;

    if (attempts >= maxAttempts) {
      const ttl = await cache.client.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000)
      };
    }

    const newAttempts = attempts + 1;
    await cache.set(key, newAttempts, Math.ceil(windowMs / 1000));

    return {
      allowed: true,
      remaining: maxAttempts - newAttempts,
      resetTime: Date.now() + windowMs
    };
  }

  // Utility Methods
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async hashPassword(password) {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(password, 12);
  }

  async verifyPassword(password, hash) {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(password, hash);
  }

  // Health Check
  async getHealthStatus() {
    return {
      jwtValid: !!this.jwtSecret,
      refreshValid: !!this.jwtRefreshSecret,
      activeSessions: this.mfaSessions.size,
      activeRefreshTokens: this.refreshTokens.size,
      blacklistedTokens: this.tokenBlacklist.size,
      oauthProviders: Array.from(this.oauthProviders.keys()),
      cacheConnected: cache.isConnected
    };
  }
}

module.exports = AuthService;