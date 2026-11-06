import { notFound } from "next/navigation";
import { pageMetadata } from "@/i18n/metadata";

export const generateMetadata = pageMetadata("panel.notFound.metaTitle");

/**
 * Any URL no other route matches lands here, so `(panel)/not-found.tsx`
 * renders inside the panel layout (a root `not-found` would render without
 * the sidebar and header).
 */
export default function UnknownPage() {
  notFound();
}
