import { useMemo } from 'react';
import { useGetUserRolesQuery } from '../services/dashboardApi';
import type { TenantMembership } from '../types';

export interface RbacInfo {
  memberships: TenantMembership[];
  /** True if user has owner or admin role in any tenant (or no memberships exist — backward compat) */
  canEdit: boolean;
  /** True if user has operator, admin, or owner role in any tenant (or no memberships exist) */
  canOperate: boolean;
  /** True while the roles query is still loading */
  loading: boolean;
}

const EDIT_ROLES = new Set<string>(['owner', 'admin']);
const OPERATE_ROLES = new Set<string>(['owner', 'admin', 'operator']);

export const useRbac = (): RbacInfo => {
  const { data, isLoading } = useGetUserRolesQuery();

  return useMemo(() => {
    const memberships = data?.data ?? [];
    // Backward compat: if no memberships exist, grant full access
    if (memberships.length === 0) {
      return { memberships, canEdit: true, canOperate: true, loading: isLoading };
    }
    const canEdit = memberships.some((m) => EDIT_ROLES.has(m.role));
    const canOperate = memberships.some((m) => OPERATE_ROLES.has(m.role));
    return { memberships, canEdit, canOperate, loading: isLoading };
  }, [data, isLoading]);
};
