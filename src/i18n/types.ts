import type {
  MessageKeys,
  Messages,
  NamespaceKeys,
  NestedKeyOf,
  useTranslations,
} from "next-intl";

/** Any message by its full key, e.g. `"panel.sections.traders.label"`. */
export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/** A message namespace, e.g. `"traders"` or `"traders.form"`. */
export type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

/**
 * What `useTranslations(ns)` / `getTranslations(ns)` return, for helpers
 * outside components (columns, schemas, Excel) that are handed `t`.
 */
export type Translator<NS extends Namespace> = ReturnType<
  typeof useTranslations<NS>
>;
