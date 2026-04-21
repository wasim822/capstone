import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { usersApi } from "@/services/api/users/users.api";
import { clearSession } from "@/auth/session";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/api/users/users.api", () => ({
  usersApi: {
    getCurrent: jest.fn(),
  },
}));

jest.mock("@/auth/session", () => ({
  clearSession: jest.fn(),
}));

function makeToken(payload: Record<string, unknown>) {
  return `header.${btoa(JSON.stringify(payload))}.sig`;
}

describe("AuthProvider", () => {
  let ctx: ReturnType<typeof useAuth> | null = null;
  const push = jest.fn();

  function Probe() {
    ctx = useAuth();
    return null;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    ctx = null;
    (useRouter as jest.Mock).mockReturnValue({ push });
    (usersApi.getCurrent as jest.Mock).mockResolvedValue({
      Id: "u-2",
      FirstName: "Jane",
      LastName: "Doe",
      Email: "jane@demo.com",
      Username: "jdoe",
      IsActive: true,
      Role: { RoleName: "manager" },
    });
  });

  it("login stores token and exposes enriched user", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(ctx?.loading).toBe(false);
    });

    const token = makeToken({ userId: "u-1", username: "demo", roleName: "staff" });

    await act(async () => {
      await ctx?.login(token);
    });

    expect(localStorage.getItem("wms_token")).toBe(token);
    expect(ctx?.user?.id).toBe("u-2");
    expect(ctx?.user?.name).toBe("Jane Doe");
    expect(ctx?.role).toBe("manager");
    expect(ctx?.backendRoleName).toBe("Manager");
  });

  it("maps superadmin token role to admin and SuperAdmin", async () => {
    (usersApi.getCurrent as jest.Mock).mockRejectedValueOnce(new Error("offline"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(ctx?.loading).toBe(false);
    });

    const token = makeToken({ userId: "u-3", username: "boss", roleName: "superadmin" });

    await act(async () => {
      await ctx?.login(token);
    });

    expect(ctx?.role).toBe("admin");
    expect(ctx?.backendRoleName).toBe("SuperAdmin");
  });

  it("clears invalid stored token during initialization", async () => {
    localStorage.setItem("wms_token", "bad.token");

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(ctx?.loading).toBe(false);
    });

    expect(localStorage.getItem("wms_token")).toBeNull();
    expect(ctx?.user).toBeNull();
  });

  it("logout clears session and redirects", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(ctx?.loading).toBe(false);
    });

    const token = makeToken({ userId: "u-1", username: "demo", roleName: "staff" });

    await act(async () => {
      await ctx?.login(token);
    });

    act(() => {
      ctx?.logout();
    });

    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("throws when useAuth is used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {
      return;
    });

    expect(() => render(<Probe />)).toThrow("useAuth must be inside AuthProvider");

    spy.mockRestore();
  });
});
