import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Gate a route on authentication. While auth is bootstrapping (silent refresh),
 * render nothing-ish to avoid a flash of the sign-in redirect.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default ProtectedRoute;
