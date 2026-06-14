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
        {/* Publicly viewable so logged-out users see the form + an inline
            "Sign in with Google" prompt (SignInPrompt). Submitting still
            requires auth — the API rejects it and the submit button is
            disabled until the user signs in. */}
        <Route path="/request" element={<RequestResource />} />
        <Route path="/submit" element={<SubmitResource />} />
      </Routes>
    </div>
  );
};

const App = () => <AppContent />;

export default App;
