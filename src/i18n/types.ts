import type {
  Messages,
  NamespaceKeys,
  NestedKeyOf,
  useTranslations,
} from "next-intl";

/** A message namespace, e.g. `"traders"` or `"traders.form"`. */
export type Namespace = NamespaceKeys<Messages, NestedKeyOf<Messages>>;

/**
 * What `useTranslations(ns)` / `getTranslations(ns)` return, for helpers
 * outside components (columns, schemas, Excel) that are handed `t`.
 */
export type Translator<NS extends Namespace> = ReturnType<
  typeof useTranslations<NS>
>;
