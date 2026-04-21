import { render, waitFor } from "@testing-library/react";
import Home from "./page";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Home page", () => {
  it("redirects to /login on mount", async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });

    render(<Home />);

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/login");
    });
  });
});
