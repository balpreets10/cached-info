import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/api/queryKeys';
import {
  listResources,
  getResource,
  searchResources,
  submitResource,
  listSavedResources,
  saveResource,
  unsaveResource,
  listMySubmissions,
} from '../resourcesApi';

/** Approved resources, filterable + paginated. Pass { universityId, type, ... }. */
export function useResources(params = {}) {
  return useQuery({
    queryKey: queryKeys.resources(params),
    queryFn: () => listResources(params),
  });
}

export function useResource(id) {
  return useQuery({
    queryKey: queryKeys.resource(id),
    queryFn: () => getResource(id),
    enabled: Boolean(id),
  });
}

/** Trigram search. Debounce `q` at the call site; disabled when empty. */
export function useSearchResources(q, limit = 5) {
  return useQuery({
    queryKey: queryKeys.search(q, limit),
    queryFn: () => searchResources(q, limit),
    enabled: Boolean(q && q.trim()),
  });
}

export function useMySubmissions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.mySubmissions(),
    queryFn: listMySubmissions,
    enabled,
  });
}

export function useSubmitResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitResource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mySubmissions() });
    },
  });
}

// --- Saved resources --------------------------------------------------------

export function useSavedResources(enabled = true) {
  return useQuery({
    queryKey: queryKeys.savedResources(),
    queryFn: listSavedResources,
    enabled,
  });
}

export function useSaveResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.savedResources() }),
  });
}

export function useUnsaveResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: unsaveResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.savedResources() }),
  });
}
