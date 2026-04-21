import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the latest value only after the delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      {
        initialProps: { value: "a", delayMs: 200 },
      },
    );

    rerender({ value: "ab", delayMs: 200 });

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });
});
