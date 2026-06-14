import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client. Server state (resources, catalog, saved items,
 * admin queues) lives here instead of the old fetch-everything DataContext.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Catalog/resource data changes rarely; avoid refetch storms.
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default queryClient;
