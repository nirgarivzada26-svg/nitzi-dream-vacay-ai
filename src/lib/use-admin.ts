import { queryOptions, useQuery } from "@tanstack/react-query";
import { adminMe } from "./admin.functions";
import type { AdminMe, AdminPermission } from "./admin-types";

export const adminMeQueryOptions = queryOptions({
  queryKey: ["admin", "me"],
  queryFn: () => adminMe() as Promise<AdminMe>,
  staleTime: 60_000,
  retry: false,
});

export function useAdminMe() {
  return useQuery(adminMeQueryOptions);
}

export function can(me: AdminMe | undefined, permission: AdminPermission): boolean {
  return Boolean(me?.permissions.includes(permission));
}
