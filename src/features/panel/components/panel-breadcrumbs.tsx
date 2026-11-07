"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { User } from "@/features/auth/types";
import { breadcrumbsFor } from "../breadcrumbs";

export function PanelBreadcrumbs({
  user,
  className,
}: {
  user: Pick<User, "permissions"> | null;
  className?: string;
}) {
  const t = useTranslations("panel");
  const crumbs = breadcrumbsFor(usePathname(), user, t);

  return (
    <Breadcrumb aria-label={t("breadcrumbLabel")} className={className}>
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((crumb, i) => (
          <Fragment key={`${i}-${crumb.label}`}>
            {i > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem className="min-w-0">
              {crumb.href ? (
                <BreadcrumbLink asChild>
                  <Link
                    href={crumb.href}
                    className="focus-visible:ring-ring/50 rounded-sm whitespace-nowrap outline-none focus-visible:ring-3"
                  >
                    <bdi dir="auto">{crumb.label}</bdi>
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate font-semibold">
                  <bdi dir="auto">{crumb.label}</bdi>
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
