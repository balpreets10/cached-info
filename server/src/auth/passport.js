import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '../config.js';
import authService from '../services/auth.service.js';

/**
 * Backend-driven Google OAuth via Passport. We run stateless (session: false):
 * Passport only performs the OAuth handshake, then hands us a Google profile.
 * The verify callback find-or-creates our own user; the route handler issues
 * our own JWT + refresh cookie. Passport never manages a login session.
 */
// Only register the strategy when credentials are configured. This keeps the
// app importable in tests/CI (where Google creds are absent) without the
// strategy constructor throwing "OAuth2Strategy requires a clientID".
if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateFromGoogle({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            fullName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          });
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
} else if (config.env !== 'test') {
  console.warn('[auth] Google OAuth not configured (GOOGLE_CLIENT_ID/SECRET missing).');
}

export default passport;
