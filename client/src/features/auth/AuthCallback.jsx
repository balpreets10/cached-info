import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Lands here after Google OAuth. Express redirected the browser to
 * /auth/callback#access_token=<JWT>. We pull the token out of the URL fragment
 * (fragments are never sent to the server, keeping the token out of logs),
 * hand it to AuthContext.login(), then bounce to the home page.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (!accessToken) {
      setError('No access token returned from sign-in.');
      return;
    }

    (async () => {
      try {
        await login(accessToken);
        // Strip the token from the URL and go home.
        navigate('/', { replace: true });
      } catch {
        setError('Sign-in failed. Please try again.');
      }
    })();
  }, [login, navigate]);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p>{error}</p>
        <button onClick={() => navigate('/signin', { replace: true })}>
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p>Signing you in…</p>
    </div>
  );
};

export default AuthCallback;
