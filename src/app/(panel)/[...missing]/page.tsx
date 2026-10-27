import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageTitle, panelText } from "@/features/panel/text";

export const metadata: Metadata = {
  title: pageTitle(panelText.notFound.metaTitle),
};

/**
 * Any URL no other route matches lands here, so `(panel)/not-found.tsx`
 * renders inside the panel layout (a root `not-found` would render without
 * the sidebar and header).
 */
export default function UnknownPage() {
  notFound();
}
