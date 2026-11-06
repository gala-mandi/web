/**
 * `@testing-library/react` for the unit tests (aliased in
 * `vitest.config.mts`): the same API, but `render` and `renderHook` wrap
 * everything in the next-intl provider like the root layout does, around
 * any `wrapper` a test passes. Cleanup runs in `vitest.setup.ts`.
 */
import {
  render as pureRender,
  renderHook as pureRenderHook,
  type RenderHookOptions,
  type RenderOptions,
} from "@testing-library/react/pure";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { IntlProviders } from "./intl";

export * from "@testing-library/react/pure";

function withIntl(
  Wrapper?: ComponentType<{ children: ReactNode }>,
): ComponentType<{ children: ReactNode }> {
  return function IntlWrapper({ children }: { children: ReactNode }) {
    return (
      <IntlProviders>
        {Wrapper ? <Wrapper>{children}</Wrapper> : children}
      </IntlProviders>
    );
  };
}

export function render(ui: ReactElement, options: RenderOptions = {}) {
  return pureRender(ui, {
    ...options,
    wrapper: withIntl(
      options.wrapper as ComponentType<{ children: ReactNode }> | undefined,
    ),
  });
}

export function renderHook<Result, Props>(
  callback: (props: Props) => Result,
  options: RenderHookOptions<Props> = {},
) {
  return pureRenderHook(callback, {
    ...options,
    wrapper: withIntl(
      options.wrapper as ComponentType<{ children: ReactNode }> | undefined,
    ),
  });
}
