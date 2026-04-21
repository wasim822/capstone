import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";

describe("usePermissions", () => {
  it("returns admin permissions and allows expected checks", () => {
    const { result } = renderHook(() => usePermissions("admin"));

    expect(result.current.permissions).toContain("inventory.delete");
    expect(result.current.has("users.edit")).toBe(true);
    expect(result.current.has("tasks.view.own")).toBe(false);
  });

  it("hasAny returns true when one permission matches", () => {
    const { result } = renderHook(() => usePermissions("staff"));

    expect(
      result.current.hasAny(["users.delete", "tasks.view.own", "users.edit"]),
    ).toBe(true);
    expect(result.current.hasAny(["users.delete", "users.edit"])).toBe(false);
  });
});
