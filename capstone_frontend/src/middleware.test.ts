jest.mock("next/server", () => ({
  NextResponse: {
    redirect: (url: URL) => ({
      status: 307,
      headers: {
        get: (key: string) => (key.toLowerCase() === "location" ? url.toString() : null),
      },
    }),
    next: () => ({
      status: 200,
      headers: {
        get: (key: string) =>
          key.toLowerCase() === "x-middleware-next" ? "1" : null,
      },
    }),
  },
}));

import { middleware } from "./middleware";

function createRequest(pathname: string, token?: string) {
  return {
    url: `http://localhost${pathname}`,
    nextUrl: { pathname },
    cookies: {
      get: () => (token ? { value: token } : undefined),
    },
  } as any;
}

describe("middleware", () => {
  it("redirects unauthenticated protected routes", () => {
    const req = createRequest("/dashboard");

    const response = middleware(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("allows protected routes when token exists", () => {
    const req = createRequest("/dashboard/reports", "token-123");

    const response = middleware(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows public routes without token", () => {
    const req = createRequest("/login");

    const response = middleware(req);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("protects nested ai-insights route without token", () => {
    const req = createRequest("/ai-insights/daily");

    const response = middleware(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });
});
