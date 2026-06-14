import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import queryClient from '../shared/api/queryClient';
import { AuthProvider } from '../features/auth/AuthContext';

/**
 * Composes the app-wide providers. Order matters:
 *   Router → QueryClient → Auth
 * AuthProvider uses React Query (queryClient.clear() on logout) and needs the
 * router for redirects, so it sits innermost.
 */
const AppProviders = ({ children }) => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default AppProviders;
