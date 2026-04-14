import { useCallback, useMemo } from "react";
import { UserRole } from "@/types/roles";
import { Permission } from "@/types/permissions";
import { rolePermissions } from "@/config/permissions";

/**
 * Returns permission helpers for the current user role
 */
export function usePermissions(userRole: UserRole) {
  const permissions = useMemo(
    () => rolePermissions[userRole] ?? [],
    [userRole],
  );

  const has = useCallback(
    (permission: Permission) => permissions.includes(permission),
    [permissions],
  );

  const hasAny = useCallback(
    (perms: Permission[]) => perms.some((p) => permissions.includes(p)),
    [permissions],
  );

  return {
    permissions,
    has,
    hasAny,
  };
}

/*  this hook helps -> 
    converts:
    admin → [permissions list]
    manager → [permissions list]
    staff → [permissions list]
    
    to: 

    has("inventory.delete")

*/
