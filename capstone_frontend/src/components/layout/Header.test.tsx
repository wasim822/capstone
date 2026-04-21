import { fireEvent, render, screen } from "@testing-library/react";
import Header from "./Header";

jest.mock("./ColorSchemeToggle", () => ({
  __esModule: true,
  default: () => <div data-testid="color-scheme-toggle" />,
}));

describe("Header", () => {
  it("calls onMenuClick when menu button is pressed", () => {
    const onMenuClick = jest.fn();
    render(<Header onMenuClick={onMenuClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });

  it("shows app title by default", () => {
    render(<Header onMenuClick={jest.fn()} />);

    expect(screen.getByText("WareTrack")).toBeInTheDocument();
  });

  it("hides app title when showAppTitle is false", () => {
    render(<Header onMenuClick={jest.fn()} showAppTitle={false} />);

    expect(screen.queryByText("WareTrack")).not.toBeInTheDocument();
    expect(screen.getByTestId("color-scheme-toggle")).toBeInTheDocument();
  });
});
