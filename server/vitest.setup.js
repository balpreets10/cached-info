// Test-only environment. Loaded before any test module imports config, so the
// app and JWT utils have the secrets they need without a real .env.
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-do-not-use-in-prod';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL_DAYS = '30';
process.env.CLIENT_ORIGIN = 'http://localhost:3000';
