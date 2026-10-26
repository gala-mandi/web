import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom has no ResizeObserver; Radix (checkbox, radio) needs one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// findBy*/waitFor default to 1s, too short on a busy CI runner.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
});
