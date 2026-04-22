import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"],
  },
  entity: {
    list: (entityName, args = {}) => ["entity", entityName, "list", args],
    filter: (entityName, filters = {}, options = {}) => [
      "entity",
      entityName,
      "filter",
      filters,
      options,
    ],
    detail: (entityName, id) => ["entity", entityName, "detail", id],
  },
  patients: {
    list: (params = {}) => ["patients", "list", params],
    detail: (id) => ["patients", "detail", id],
    policies: (patientId) => ["patients", patientId, "policies"],
  },
  custom: (...parts) => parts,
};

export function useAuthUserQuery({
  enabled = true,
  redirectOnError = true,
  withDefaultRole = null,
  ...options
} = {}) {
  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const authUser = await api.auth.me();
      return withDefaultRole && !authUser.role ? { ...authUser, role: withDefaultRole } : authUser;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
    ...options,
  });

  useEffect(() => {
    if (query.isError && redirectOnError) {
      api.auth.redirectToLogin();
    }
  }, [query.isError, redirectOnError]);

  return query;
}

export function useEntityListQuery(entityName, listArgs = null, limit = null, options = {}) {
  const { enabled = true, ...queryOptions } = options;
  return useQuery({
    queryKey: queryKeys.entity.list(entityName, { listArgs, limit }),
    queryFn: () => api.entities[entityName].list(listArgs, limit),
    enabled,
    ...queryOptions,
  });
}

export function useEntityFilterQuery(entityName, filters = {}, options = {}) {
  const { sortBy = null, limit = null, enabled = true, ...queryOptions } = options;
  return useQuery({
    queryKey: queryKeys.entity.filter(entityName, filters, { sortBy, limit }),
    queryFn: () => api.entities[entityName].filter(filters, sortBy, limit),
    enabled,
    ...queryOptions,
  });
}

export function useEntityDetailQuery(entityName, id, options = {}) {
  return useQuery({
    queryKey: queryKeys.entity.detail(entityName, id),
    queryFn: () => api.entities[entityName].get(id),
    enabled: Boolean(id),
    ...options,
  });
}
