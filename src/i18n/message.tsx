"use client";

import {
  type MessageKeys,
  type Messages,
  type NestedKeyOf,
  useTranslations,
} from "next-intl";

export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/**
 * One message by its full key, for text handed over from outside React
 * (e.g. a toast raised by the Axios interceptor): it renders inside the
 * provider, so it follows the interface language.
 */
export function Message({ id }: { id: MessageKey }) {
  // Only messages without arguments are handed over this way.
  const t = useTranslations() as unknown as (key: MessageKey) => string;
  return <>{t(id)}</>;
}
