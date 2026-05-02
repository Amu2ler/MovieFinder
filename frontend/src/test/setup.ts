import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  // restoreAllMocks resets spies; clearAllMocks resets vi.fn() call history.
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
