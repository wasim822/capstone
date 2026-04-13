import { UserRole } from "@/types/roles";
import { Permission } from "@/types/permissions";
import { rolePermissions } from "@/config/permissions";

/**
 * Returns permission helpers for the current user role
 */
export function usePermissions(userRole: UserRole) {
  const permissions = rolePermissions[userRole] ?? [];

  function has(permission: Permission) {
    return permissions.includes(permission);
  }

  function hasAny(perms: Permission[]) {
    return perms.some((p) => permissions.includes(p));
  }

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
