import { TOKEN_KEY, clearToken, getToken, saveToken } from "./token";

describe("token helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves and reads token from localStorage", () => {
    saveToken("abc.123");

    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc.123");
    expect(getToken()).toBe("abc.123");
  });

  it("clears token from localStorage", () => {
    localStorage.setItem(TOKEN_KEY, "persisted-token");

    clearToken();

    expect(getToken()).toBeNull();
  });
});
