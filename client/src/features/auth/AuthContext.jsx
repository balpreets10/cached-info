import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient, { setAuthFailureHandler } from '../../shared/api/client';
import {
  setAccessToken,
  clearAccessToken,
  getAccessToken,
} from '../../shared/api/tokenStore';
import { googleAuthUrl, fetchMe, logout as apiLogout } from './authApi';

/**
 * Thin auth context backed by the Express API (Supabase is gone).
 *
 * Session model:
 *   - access token  → kept in memory (shared/api/tokenStore), attached as Bearer
 *   - refresh token → httpOnly cookie, invisible to JS, rotated on /auth/refresh
 *
 * On mount we try POST /auth/refresh: if a valid refresh cookie exists we get a
 * fresh access token and hydrate the user via GET /auth/me. Login is a full-page
 * redirect to GET /api/auth/google; the OAuth callback lands the browser on
 * /auth/callback#access_token=… which AuthCallback parses and feeds to login().
 */
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const bootstrapped = useRef(false);

  // Hydrate user/roles/permissions from GET /auth/me (token already set).
  const hydrate = useCallback(async () => {
    const me = await fetchMe();
    setUser(me.user);
    setRoles(me.roles || []);
    setPermissions(me.permissions || []);
    return me;
  }, []);

  // Clear all auth state (used on logout + unrecoverable refresh failure).
  const reset = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setRoles([]);
    setPermissions([]);
    queryClient.clear();
  }, [queryClient]);

  /**
   * Finish the OAuth handshake: store the access token from the URL fragment,
   * then hydrate. Called by AuthCallback.
   */
  const login = useCallback(
    async (accessToken) => {
      setAccessToken(accessToken);
      await hydrate();
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Even if the server call fails, drop local state.
    } finally {
      reset();
    }
  }, [reset]);

  // Start Google OAuth (full-page navigation, not XHR).
  const signInWithGoogle = useCallback(() => {
    window.location.assign(googleAuthUrl());
  }, []);

  // On app load: attempt a silent refresh, then hydrate if it worked.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // When the axios layer exhausts a refresh, wipe state.
    setAuthFailureHandler(() => reset());

    let mounted = true;
    (async () => {
      try {
        // If a token is already present (e.g. just logged in), skip the refresh.
        if (!getAccessToken()) {
          const res = await apiClient.post('/auth/refresh');
          const token = res.data?.data?.accessToken;
          if (!token) throw new Error('no token');
          setAccessToken(token);
        }
        if (mounted) await hydrate();
      } catch {
        if (mounted) reset();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [hydrate, reset]);

  // --- Derived helpers --------------------------------------------------------
  const isAuthenticated = Boolean(user);
  const hasPermission = useCallback(
    (perm) => permissions.includes(perm),
    [permissions],
  );
  const hasRole = useCallback((role) => roles.includes(role), [roles]);

  const value = {
    user,
    roles,
    permissions,
    loading,
    isAuthenticated,
    hasPermission,
    hasRole,
    login,
    signInWithGoogle,
    signOut,
    refreshUser: hydrate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
