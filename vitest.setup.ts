import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";
import { matches, resetMedia } from "./src/test/media";

// jsdom has no ResizeObserver; Radix (checkbox, radio) and cmdk need one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// jsdom has no matchMedia; the sidebar reads it to switch to the drawer.
window.matchMedia ??= (query: string) =>
  ({
    get matches() {
      return matches(query);
    },
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

// jsdom has no scrollIntoView; cmdk scrolls the selected item into view.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// findBy*/waitFor default to 1s, too short on a busy CI runner.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  cleanup();
  resetMedia();
});
