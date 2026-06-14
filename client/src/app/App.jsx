import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

// Pages / features
import HomePage from '../features/resources/HomePage';
import Resources from '../features/resources/Resources';
import SubmitResource from '../features/resources/SubmitResource';
import RequestResource from '../features/resources/RequestResource';
import OurStory from '../features/about/OurStory';
import SignIn from '../features/auth/components/SignIn';
import AuthCallback from '../features/auth/AuthCallback';
import ModernAdminDashboard from '../features/admin/components/ModernAdminDashboard';

// Auth gates
import ProtectedRoute from '../features/auth/ProtectedRoute';
import RequirePermission from '../features/auth/RequirePermission';
import { PERMISSIONS } from '../shared/lib/permissions';

// Shared UI
import Header from '../shared/components/Header';

/**
 * Application shell + routing. Server state now lives in React Query (per-page
 * hooks), so there's no global data-loading gate here anymore — each page shows
 * its own loading/error state.
 */
const AppContent = () => {
  const location = useLocation();
  const isDashboardRoute = location.pathname === '/admin-dashboard';

  // Dashboard renders full-screen without the marketing header.
  if (isDashboardRoute) {
    return (
      <div className="dashboard-app">
        <Routes>
          <Route
            path="/admin-dashboard"
            element={
              <RequirePermission permission={PERMISSIONS.CATALOG_MANAGE}>
                <ModernAdminDashboard />
              </RequirePermission>
            }
          />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/our-story" element={<OurStory />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/request"
          element={
            <ProtectedRoute>
              <RequestResource />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute>
              <SubmitResource />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

const App = () => <AppContent />;

export default App;
