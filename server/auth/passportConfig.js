const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { cache } = require('../middleware/cache');

// JWT Strategy for API authentication
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  issuer: 'nasa-system7-portal',
  audience: 'nasa-system7-users'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    // Check if token is blacklisted
    const isBlacklisted = await cache.get(`blacklist:${payload.jti}`);
    if (isBlacklisted) {
      return done(null, false, { message: 'Token has been revoked' });
    }

    // Get user from cache or database
    let user = await cache.get(`user:${payload.id}`);

    if (!user) {
      return done(null, false, { message: 'User not found' });
    }

    // Update last activity
    user.lastActivity = new Date();
    await cache.set(`user:${user.id}`, user, 24 * 60 * 60);

    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || `${process.env.BASE_URL}/auth/google/callback`,
    scope: ['profile', 'email'],
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Normalize Google profile data
      const user = {
        id: `google_${profile.id}`,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value,
        provider: 'google',
        providerId: profile.id,
        verified: profile.emails[0].verified,
        role: 'user',
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Store user in cache
      await cache.set(`user:${user.id}`, user, 24 * 60 * 60);
      await cache.set(`user_by_email:${user.email}`, user, 24 * 60 * 60);

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_REDIRECT_URI || `${process.env.BASE_URL}/auth/github/callback`,
    scope: ['user:email'],
    passReqToCallback: true
  }, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Get user email from GitHub API
      const axios = require('axios');
      const emailResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'NASA-System-7-Portal'
        }
      });

      const primaryEmail = emailResponse.data.find(email => email.primary && email.verified);

      if (!primaryEmail) {
        return done(new Error('No verified primary email found'), null);
      }

      // Normalize GitHub profile data
      const user = {
        id: `github_${profile.id}`,
        email: primaryEmail.email,
        name: profile.displayName || profile.username,
        avatar: profile.photos[0].value,
        provider: 'github',
        providerId: profile.id,
        verified: primaryEmail.verified,
        role: 'user',
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Store user in cache
      await cache.set(`user:${user.id}`, user, 24 * 60 * 60);
      await cache.set(`user_by_email:${user.email}`, user, 24 * 60 * 60);

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// NASA SSO Strategy (placeholder - would need actual NASA SSO implementation)
if (process.env.NASA_CLIENT_ID && process.env.NASA_CLIENT_SECRET) {
  passport.use('nasa', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.NASA_CLIENT_SECRET,
    issuer: process.env.NASA_SSO_ISSUER || 'https://sso.nasa.gov',
    audience: 'nasa-system7-portal'
  }, async (payload, done) => {
    try {
      // Verify NASA SSO token
      const user = {
        id: `nasa_${payload.sub}`,
        email: payload.email,
        name: payload.name,
        role: payload['nasa:role'] || 'user',
        provider: 'nasa',
        providerId: payload.sub,
        verified: true,
        badges: payload['nasa:badges'] || [],
        createdAt: new Date(),
        lastLogin: new Date()
      };

      // Store user in cache
      await cache.set(`user:${user.id}`, user, 24 * 60 * 60);
      await cache.set(`user_by_email:${user.email}`, user, 24 * 60 * 60);

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize/deserialize user for sessions
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await cache.get(`user:${id}`);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: info?.message || 'Please provide valid authentication'
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

// Middleware to check if user has required role
const hasRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    const userRole = req.user.role || 'user';
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    if (!requiredRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This resource requires one of the following roles: ${requiredRoles.join(', ')}`
      });
    }

    next();
  };
};

// Middleware to check if user has MFA enabled/verified
const requireMFA = (verified = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    if (verified && !req.user.mfaVerified) {
      return res.status(403).json({
        error: 'MFA required',
        message: 'Multi-factor authentication is required for this resource'
      });
    }

    if (!req.user.mfaEnabled) {
      return res.status(403).json({
        error: 'MFA not enabled',
        message: 'Please enable multi-factor authentication for your account'
      });
    }

    next();
  };
};

// OAuth authentication routes setup
const setupOAuthRoutes = (app) => {
  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID) {
    app.get('/auth/google',
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false
      })
    );

    app.get('/auth/google/callback',
      passport.authenticate('google', {
        session: false,
        failureRedirect: '/login?error=google_failed'
      }),
      (req, res) => {
        // Generate JWT token for OAuth user
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=google`;
        res.redirect(redirectUrl);
      }
    );
  }

  // GitHub OAuth routes
  if (process.env.GITHUB_CLIENT_ID) {
    app.get('/auth/github',
      passport.authenticate('github', {
        scope: ['user:email'],
        session: false
      })
    );

    app.get('/auth/github/callback',
      passport.authenticate('github', {
        session: false,
        failureRedirect: '/login?error=github_failed'
      }),
      (req, res) => {
        // Generate JWT token for OAuth user
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
          {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}&provider=github`;
        res.redirect(redirectUrl);
      }
    );
  }
};

module.exports = {
  passport,
  isAuthenticated,
  hasRole,
  requireMFA,
  setupOAuthRoutes
};