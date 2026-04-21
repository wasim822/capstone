import { COOKIE_NAME, clearAuthCookie, setAuthCookie } from "./authCookies";

describe("authCookies", () => {
  beforeEach(() => {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`;
  });

  it("sets auth cookie", () => {
    setAuthCookie("jwt-token");

    expect(document.cookie).toContain(`${COOKIE_NAME}=jwt-token`);
  });

  it("clears auth cookie", () => {
    setAuthCookie("jwt-token");
    clearAuthCookie();

    expect(document.cookie).not.toContain(`${COOKIE_NAME}=jwt-token`);
  });
});
