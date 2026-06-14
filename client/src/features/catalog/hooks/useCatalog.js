import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../shared/api/queryKeys';
import { fetchUniversitiesTree, listCatalog } from '../catalogApi';

/** Universities with nested domains — powers browse filters + autocomplete. */
export function useUniversitiesTree() {
  return useQuery({
    queryKey: queryKeys.universitiesTree(),
    queryFn: fetchUniversitiesTree,
  });
}

/**
 * Generic catalog list. entity is a URL segment:
 * 'universities' | 'domains' | 'subjects' | 'skill-categories' | 'skills' |
 * 'exam-categories' | 'exams'. Optionally scoped by parentId.
 */
export function useCatalog(entity, parentId, options = {}) {
  return useQuery({
    queryKey: queryKeys.catalog(entity, parentId),
    queryFn: () => listCatalog(entity, parentId),
    enabled: Boolean(entity) && (options.enabled ?? true),
  });
}
