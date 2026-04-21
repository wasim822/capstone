import { http } from "./http";
import { getToken } from "@/auth/token";
import { clearSession } from "@/auth/session";

jest.mock("@/auth/token", () => ({
  getToken: jest.fn(),
}));

jest.mock("@/auth/session", () => ({
  clearSession: jest.fn(),
}));

describe("http client", () => {
  const mockResponse = (status: number, body: unknown) => ({
    status,
    ok: status >= 200 && status < 300,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("adds auth and json headers for standard requests", async () => {
    (getToken as jest.Mock).mockReturnValue("token-123");
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { Success: true, Message: null, Data: { ok: 1 } }),
    );

    const data = await http.data<{ ok: number }>("/health", { method: "GET" });

    expect(data).toEqual({ ok: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("does not force content-type header for FormData", async () => {
    (getToken as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(200, { Success: true, Message: null, Data: { ok: true } }),
    );

    const form = new FormData();
    form.append("file", new Blob(["abc"]), "a.txt");

    await http.data<{ ok: boolean }>("/upload", {
      method: "POST",
      body: form,
    });

    const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];

    const headers = options.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("clears session and throws on 401", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
      return;
    });
    (getToken as jest.Mock).mockReturnValue("token-123");
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(401, ""));

    await expect(http.data("/protected")).rejects.toThrow("Session expired");
    expect(clearSession).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it("throws backend message for failed API shape", async () => {
    (getToken as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(
      mockResponse(400, { Success: false, Message: "Bad request", Data: null }),
    );

    await expect(http.data("/bad")).rejects.toThrow("Bad request");
  });

  it("throws for unexpected successful response shape", async () => {
    (getToken as jest.Mock).mockReturnValue(null);
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse(200, { foo: "bar" }));

    await expect(http.data("/wrong-shape")).rejects.toThrow(
      "Unexpected server response shape",
    );
  });
});
