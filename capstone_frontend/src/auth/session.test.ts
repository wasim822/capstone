import { clearSession } from "./session";
import { clearToken } from "./token";
import { clearAuthCookie } from "@/lib/authCookies";

jest.mock("./token", () => ({
  clearToken: jest.fn(),
}));

jest.mock("@/lib/authCookies", () => ({
  clearAuthCookie: jest.fn(),
}));

describe("clearSession", () => {
  it("clears token and auth cookie", () => {
    clearSession();

    expect(clearToken).toHaveBeenCalledTimes(1);
    expect(clearAuthCookie).toHaveBeenCalledTimes(1);
  });
});
