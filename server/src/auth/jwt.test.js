import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from './jwt.js';
import ApiError from '../utils/ApiError.js';

describe('jwt util', () => {
  const user = { id: 'user-1', email: 'a@b.com' };

  it('signs and verifies an access token with claims', () => {
    const token = signAccessToken(user, {
      roles: ['student'],
      permissions: ['resource:save'],
    });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.email).toBe('a@b.com');
    expect(payload.roles).toEqual(['student']);
    expect(payload.permissions).toContain('resource:save');
  });

  it('rejects a tampered token with ApiError(401)', () => {
    const token = signAccessToken(user);
    expect(() => verifyAccessToken(`${token}tampered`)).toThrowError(ApiError);
    try {
      verifyAccessToken('not-a-jwt');
    } catch (err) {
      expect(err.statusCode).toBe(401);
    }
  });

  it('generates a unique opaque refresh token and a stable hash', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a).toHaveLength(96); // 48 bytes hex
    expect(hashRefreshToken(a)).toBe(hashRefreshToken(a));
    expect(hashRefreshToken(a)).not.toBe(hashRefreshToken(b));
  });
});
