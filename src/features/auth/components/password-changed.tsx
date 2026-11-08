import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { OtherLanguage, SubLine } from "./auth-ui";

interface PasswordChangedProps {
  revokedSessions: number;
  /** true after change-password (this device stays signed in). */
  otherDevices: boolean;
  href: string;
  label: string;
  /** The same label in the other language, after a dot (as in the designs). */
  labelSubline: string;
}

/** 2.4 Password changed. */
export function PasswordChanged({
  revokedSessions,
  otherDevices,
  href,
  label,
  labelSubline,
}: PasswordChangedProps) {
  const t = useTranslations("auth");
  return (
    <div className="bg-card rounded-card shadow-card flex w-full max-w-[420px] flex-col overflow-hidden">
      <div className="relative h-[150px] bg-brand-from">
        <Image
          src="/images/wheat-field.webp"
          alt={t("passwordChanged.imageAlt")}
          fill
          sizes="420px"
          className="object-cover object-[center_70%]"
        />
        <div className="to-card/95 absolute inset-0 bg-linear-to-b from-transparent from-40%" />
      </div>
      <div className="relative -mt-10 flex flex-col items-center gap-4 px-6 pb-8 text-center sm:px-9">
        <div className="bg-success border-card flex size-[76px] items-center justify-center rounded-full border-[6px] shadow-[0_10px_24px_-8px_rgb(4_120_87/0.6)]">
          <Check
            aria-hidden
            className="size-[34px] text-white"
            strokeWidth={2.6}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-heading text-[26px] font-extrabold tracking-tight">
            {t("passwordChanged.title")}
          </h2>
          <p
            role="status"
            className="text-muted-foreground text-[15px]/relaxed"
          >
            {t("passwordChanged.ready")}
            {revokedSessions > 0
              ? ` ${t("passwordChanged.signedOut", { n: revokedSessions, other: otherDevices ? "yes" : "no" })}`
              : ""}
          </p>
          <SubLine>{t("passwordChanged.subline")}</SubLine>
        </div>
        <Link
          href={href}
          className={cn(
            "rounded-button from-primary to-primary-to text-primary-foreground shadow-button flex min-h-[52px] w-full flex-wrap items-center justify-center gap-x-2.5 bg-linear-90 px-4 py-2 text-center text-base font-bold hover:opacity-95",
            "focus-visible:ring-ring/15 focus-visible:ring-4 focus-visible:outline-none",
          )}
        >
          {label}
          <span aria-hidden>·</span>
          <OtherLanguage className="text-[15px] font-semibold">
            {labelSubline}
          </OtherLanguage>
        </Link>
      </div>
    </div>
  );
}
