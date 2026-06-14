import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * Gate a route on a specific capability (e.g. PERMISSIONS.CATALOG_MANAGE),
 * replacing the old `userProfile.role === 'admin'` string check. The server is
 * still the real authority — this just hides UI the user can't use.
 *
 * Pass `permission` (a capability string) and optional `fallback` UI to render
 * when the user is authenticated but lacks the permission.
 */
const RequirePermission = ({ permission, children, fallback = null }) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
};

export default RequirePermission;
