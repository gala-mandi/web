"use client";

import { useEffect } from "react";

/**
 * While `when` is true, warns before the page is left: the browser's own
 * prompt on reload, tab close or typing another address, and `message` on a
 * click on a link to another page of the panel (sidebar, breadcrumbs, …).
 */
export function useUnsavedChangesWarning(when: boolean, message: string) {
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers still need returnValue set to show the prompt.
      event.returnValue = "";
    };

    // Capture phase: runs before the link's own (Next.js router) handler.
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      // Another site is a full page load: `beforeunload` asks instead.
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [when, message]);
}
