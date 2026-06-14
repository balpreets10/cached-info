import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/api/queryKeys';
import {
  listPendingResources,
  setResourceApproval,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  listUsers,
  setUserRoles,
  listAllRequests,
  updateRequestStatus,
} from '../adminApi';

// --- Pending resource queue + approval --------------------------------------

export function usePendingResources(params = {}) {
  return useQuery({
    queryKey: queryKeys.pendingResources(params),
    queryFn: () => listPendingResources(params),
  });
}

export function useSetResourceApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isApproved }) => setResourceApproval(id, isApproved),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'resources', 'pending'] });
      qc.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

// --- Resource CRUD ----------------------------------------------------------

export function useAdminCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminCreateResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  });
}

export function useAdminUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => adminUpdateResource(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  });
}

export function useAdminDeleteResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDeleteResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resources'] }),
  });
}

// --- Catalog CRUD -----------------------------------------------------------

export function useCreateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entity, body }) => createCatalogItem(entity, body),
    onSuccess: (_data, { entity }) =>
      qc.invalidateQueries({ queryKey: ['catalog', entity] }),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entity, id, body }) => updateCatalogItem(entity, id, body),
    onSuccess: (_data, { entity }) =>
      qc.invalidateQueries({ queryKey: ['catalog', entity] }),
  });
}

export function useDeleteCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entity, id }) => deleteCatalogItem(entity, id),
    onSuccess: (_data, { entity }) =>
      qc.invalidateQueries({ queryKey: ['catalog', entity] }),
  });
}

// --- Users + roles ----------------------------------------------------------

export function useAdminUsers() {
  return useQuery({ queryKey: queryKeys.adminUsers(), queryFn: listUsers });
}

export function useSetUserRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roles }) => setUserRoles(userId, roles),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.adminUsers() }),
  });
}

// --- Request triage ---------------------------------------------------------

export function useAdminRequests(status) {
  return useQuery({
    queryKey: queryKeys.adminRequests(status),
    queryFn: () => listAllRequests(status),
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => updateRequestStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'requests'] }),
  });
}
