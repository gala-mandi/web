"use client";

import { useTranslations } from "next-intl";
import { ShopLogo } from "@/features/panel/components/shop-logo";
import { sampleBillNumber, type SettingsValues } from "../schemas";

type PreviewValues = Pick<
  SettingsValues,
  | "name"
  | "displayName"
  | "address"
  | "city"
  | "phone"
  | "billPrefix"
  | "parchiFooter"
>;

/** The top and bottom of a parchi, drawn from the values being edited. */
export function ParchiPreview({
  values,
  logoUrl,
}: {
  values: PreviewValues;
  logoUrl: string | null;
}) {
  const t = useTranslations("settings");
  const title = values.displayName.trim() || values.name.trim();
  const place = [values.address.trim(), values.city.trim()]
    .filter(Boolean)
    .join(", ");

  return (
    <section
      aria-labelledby="parchi-preview-title"
      className="rounded-card bg-card flex flex-col gap-3 border p-5"
    >
      <div>
        <h2
          id="parchi-preview-title"
          className="font-heading text-base font-bold"
        >
          {t("preview.title")}
        </h2>
        <p className="text-muted-foreground text-xs">
          {t("preview.description")}
        </p>
      </div>
      <div
        data-testid="parchi-preview"
        className="flex flex-col gap-3 rounded-lg border border-dashed bg-background p-4 text-foreground"
      >
        <div className="flex items-center gap-3 border-b pb-3">
          <ShopLogo name={title || "?"} logoUrl={logoUrl} className="size-12" />
          <div className="min-w-0 flex-1 text-center">
            <p
              className="font-heading truncate text-lg font-extrabold"
              data-testid="preview-title"
            >
              {title}
            </p>
            {place ? (
              <p className="text-xs" data-testid="preview-address">
                {place}
              </p>
            ) : null}
            {values.phone.trim() ? (
              <p className="text-xs" dir="auto" data-testid="preview-phone">
                {t("preview.phone")}: {values.phone.trim()}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span>
            {t("preview.bill")}{" "}
            <span
              dir="auto"
              className="font-semibold"
              data-testid="preview-bill"
            >
              {sampleBillNumber(values.billPrefix)}
            </span>
          </span>
          <span>
            {t("preview.date")} {t("preview.sampleDate")}
          </span>
        </div>
        <div className="flex flex-col gap-1.5" aria-hidden>
          <div className="h-2 rounded bg-muted" />
          <div className="h-2 w-4/5 rounded bg-muted" />
          <div className="h-2 w-3/5 rounded bg-muted" />
        </div>
        {values.parchiFooter.trim() ? (
          <p
            className="border-t pt-3 text-center text-xs whitespace-pre-line"
            data-testid="preview-footer"
          >
            {values.parchiFooter.trim()}
          </p>
        ) : null}
      </div>
    </section>
  );
}
