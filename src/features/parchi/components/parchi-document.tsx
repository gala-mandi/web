"use client";

import { type ReactNode, type Ref, useState } from "react";
import { cn } from "@/lib/utils";
import {
  chargeSign,
  isNonZero,
  parchiChargeLabel,
  parchiDateTime,
  parchiDay,
  parchiRs,
  parchiSignedRs,
  parchiWeight,
} from "../parchi";
import { type ParchiWords, parchiWords } from "../text";
import type {
  PaperSize,
  ParchiBill,
  ParchiItem,
  ParchiLanguage,
  ParchiShop,
} from "../types";

/**
 * Sheet size on screen (the preview) and type size per paper. On A4 and A5
 * the printer's `@page` margins replace the screen padding; the thermal
 * roll has no page margins, so it keeps its own 4 mm (inside the 72 mm a
 * thermal head prints). Every size inside is in `em` of these.
 */
const sheetClass: Record<PaperSize, string> = {
  a4: "w-[210mm] min-h-[297mm] px-[12mm] pt-[12mm] pb-[16mm] print:w-auto print:min-h-0 print:p-0",
  a5: "w-[148mm] min-h-[210mm] px-[9mm] pt-[9mm] pb-[13mm] print:w-auto print:min-h-0 print:p-0",
  // Thermal heads print black only: muted text and rules print black too.
  thermal80:
    "w-[80mm] px-[4mm] pt-[5mm] pb-[7mm] [--ink-muted:var(--ink)] [--ink-rule:var(--ink)]",
};

const typeSize: Record<PaperSize, Record<ParchiLanguage, string>> = {
  a4: { en: "text-[12px]", ur: "text-[13px]" },
  a5: { en: "text-[10.5px]", ur: "text-[11.5px]" },
  thermal80: { en: "text-[11px]", ur: "text-[12px]" },
};

const watermarkSize: Record<PaperSize, string> = {
  a4: "text-[7em]",
  a5: "text-[6.5em]",
  thermal80: "text-[3.4em]",
};

export interface ParchiDocumentProps {
  bill: ParchiBill;
  shop: ParchiShop;
  lang: ParchiLanguage;
  paper: PaperSize;
  printedAt: Date;
  /** Extra attributes for the on-screen copy (e.g. `data-print-area`). */
  printArea?: boolean;
  ref?: Ref<HTMLElement>;
}

/**
 * The printed parchi of a purchase or sale: shop header and logo, bill no,
 * date, trader, items, the charges breakdown, net and the shop's footer.
 * A4 and A5 print the items as a table (headings repeat on every sheet, a
 * row is never split); the 80 mm roll stacks each item on two lines so
 * nothing runs off the paper. Urdu prints right to left in Nastaliq with
 * amounts, bill numbers and phone numbers kept left to right. A cancelled
 * bill carries a CANCELLED watermark on every sheet.
 */
export function ParchiDocument({
  bill,
  shop,
  lang,
  paper,
  printedAt,
  printArea = false,
  ref,
}: ParchiDocumentProps) {
  const w = parchiWords[lang];
  const cancelled = bill.status === "cancelled";
  const roll = paper === "thermal80";
  const Layout = roll ? RollLayout : SheetLayout;

  return (
    <article
      ref={ref}
      lang={lang}
      dir={lang === "ur" ? "rtl" : "ltr"}
      data-parchi={paper}
      data-parchi-lang={lang}
      data-print-area={printArea || undefined}
      aria-label={`${w.title[bill.kind]} ${bill.billNo}`}
      className={cn(
        "bg-paper text-ink relative isolate overflow-hidden print:overflow-visible",
        sheetClass[paper],
        typeSize[paper][lang],
        lang === "ur" ? "font-urdu leading-[1.95]" : "font-sans leading-[1.45]",
      )}
    >
      {cancelled ? (
        <Watermark text={w.cancelled} paper={paper} lang={lang} />
      ) : null}
      <Layout bill={bill} shop={shop} lang={lang} w={w} />
      <Footer shop={shop} lang={lang} w={w} printedAt={printedAt} roll={roll} />
    </article>
  );
}

interface LayoutProps {
  bill: ParchiBill;
  shop: ParchiShop;
  lang: ParchiLanguage;
  w: ParchiWords;
}

/** Bill text that must not be split or reordered by the Urdu layout. */
function Ltr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("tabular-nums", className)}>
      {children}
    </span>
  );
}

/** A name typed by the shop (any script): its own direction, wraps anywhere. */
function Typed({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <bdi dir="auto" className={cn("[overflow-wrap:anywhere]", className)}>
      {children}
    </bdi>
  );
}

/** Small caps-style labels in English; Urdu letters must not be spaced. */
function labelCase(lang: ParchiLanguage) {
  return lang === "en" ? "uppercase tracking-[0.06em]" : undefined;
}

function Logo({ shop, className }: { shop: ParchiShop; className?: string }) {
  // A logo that fails to load is left out instead of printing a broken image.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!shop.logoUrl || failedUrl === shop.logoUrl) return null;
  return (
    // The shop's uploaded logo, any host and size (as in `ShopLogo`).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shop.logoUrl}
      alt=""
      data-testid="parchi-logo"
      className={cn("shrink-0 object-contain", className)}
      onError={() => setFailedUrl(shop.logoUrl)}
    />
  );
}

function ShopLines({ shop, w }: { shop: ParchiShop; w: ParchiWords }) {
  return (
    <>
      {shop.address ? (
        <p className="text-ink-muted">
          <Typed>{shop.address}</Typed>
        </p>
      ) : null}
      {shop.phone ? (
        <p className="text-ink-muted">
          {w.phone}: <Ltr>{shop.phone}</Ltr>
        </p>
      ) : null}
    </>
  );
}

function Watermark({
  text,
  paper,
  lang,
}: {
  text: string;
  paper: PaperSize;
  lang: ParchiLanguage;
}) {
  return (
    <div
      aria-hidden
      data-testid="parchi-watermark"
      // Fixed when printing: repeated on every sheet.
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center print:fixed"
    >
      <span
        className={cn(
          "text-destructive/25 -rotate-[28deg] rounded-[0.12em] border-[0.07em] border-current px-[0.3em] font-black leading-[1.15] whitespace-nowrap",
          watermarkSize[paper],
          lang === "en" && "tracking-[0.08em]",
        )}
      >
        {text}
      </span>
    </div>
  );
}

function CancelledStamp({
  w,
  className,
}: {
  w: ParchiWords;
  className?: string;
}) {
  return (
    <p
      data-testid="parchi-cancelled"
      className={cn(
        "text-destructive border-destructive inline-block rounded-[0.3em] border-[1.5px] px-[0.6em] font-extrabold",
        className,
      )}
    >
      {w.cancelled}
    </p>
  );
}

/** A4 and A5: header with the bill box, the item table, sums beside notes. */
function SheetLayout({ bill, shop, lang, w }: LayoutProps) {
  const c = w.columns;
  const cancelled = bill.status === "cancelled";
  const th = cn("py-[0.55em] font-semibold", labelCase(lang));
  const td = "py-[0.6em] align-top";

  return (
    <>
      <header className="border-ink flex items-start gap-[1.2em] border-b-2 pb-[1em]">
        <Logo shop={shop} className="size-[5.2em] rounded-[0.5em]" />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[1.9em] leading-[1.25] font-extrabold",
              lang === "en" && "font-heading",
            )}
            data-testid="parchi-shop"
          >
            <Typed>{shop.name}</Typed>
          </p>
          <ShopLines shop={shop} w={w} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[0.5em]">
          <p
            className={cn(
              "bg-ink text-paper rounded-[0.35em] px-[0.8em] py-[0.2em] text-[1.05em] font-bold",
              labelCase(lang),
            )}
          >
            {w.title[bill.kind]}
          </p>
          <dl className="grid grid-cols-[auto_auto] gap-x-[1em] gap-y-[0.1em]">
            <dt className="text-ink-muted">{w.billNo}</dt>
            <dd className="text-end text-[1.1em] font-bold">
              <Ltr>{bill.billNo}</Ltr>
            </dd>
            <dt className="text-ink-muted">{w.date}</dt>
            <dd className="text-end font-semibold">
              {parchiDay(bill.date, lang)}
            </dd>
          </dl>
          {cancelled ? <CancelledStamp w={w} /> : null}
        </div>
      </header>

      <section
        data-parchi-keep
        className="border-ink-rule mt-[1.1em] flex flex-wrap items-baseline gap-x-[0.7em] rounded-[0.5em] border px-[1em] py-[0.55em]"
      >
        <span className={cn("text-ink-muted font-semibold", labelCase(lang))}>
          {w.party[bill.kind]}
        </span>
        <Typed className="min-w-0 text-[1.3em] font-bold">
          {bill.partyName}
        </Typed>
      </section>

      <table className="mt-[1.1em] w-full border-collapse">
        <thead>
          <tr className="border-ink text-ink-muted border-b-[1.5px] text-[0.85em]">
            <th
              scope="col"
              className={cn(th, "w-[2.6em] pe-[0.6em] text-start")}
            >
              {c.no}
            </th>
            <th scope="col" className={cn(th, "pe-[0.6em] text-start")}>
              {c.commodity}
            </th>
            <th scope="col" className={cn(th, "px-[0.6em] text-end")}>
              {c.bags}
            </th>
            <th scope="col" className={cn(th, "px-[0.6em] text-end")}>
              {c.weight}
            </th>
            <th scope="col" className={cn(th, "px-[0.6em] text-end")}>
              {c.rate}
            </th>
            <th scope="col" className={cn(th, "ps-[0.6em] text-end")}>
              {c.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, i) => (
            <SheetRow
              key={item.id}
              item={item}
              n={i + 1}
              shop={shop}
              lang={lang}
              w={w}
              td={td}
            />
          ))}
        </tbody>
      </table>

      <section
        data-parchi-keep
        className="mt-[1.2em] flex items-start gap-[2em]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-ink-muted">{w.itemCount(bill.items.length)}</p>
          <Notes bill={bill} w={w} />
        </div>
        <Sums bill={bill} lang={lang} w={w} className="w-[48%]" />
      </section>
    </>
  );
}

function SheetRow({
  item,
  n,
  shop,
  lang,
  w,
  td,
}: {
  item: ParchiItem;
  n: number;
  shop: ParchiShop;
  lang: ParchiLanguage;
  w: ParchiWords;
  td: string;
}) {
  const weight = parchiWeight(item.weightKg, shop.maundKg, lang);
  return (
    <tr className="border-ink-rule border-b">
      <td className={cn(td, "text-ink-muted pe-[0.6em]")}>
        <Ltr>{n}</Ltr>
      </td>
      <td className={cn(td, "pe-[0.6em] font-semibold")}>
        <Typed>{item.commodityName}</Typed>
      </td>
      <td className={cn(td, "px-[0.6em] text-end")}>
        <Ltr>{item.bags ?? "—"}</Ltr>
      </td>
      <td className={cn(td, "px-[0.6em] text-end whitespace-nowrap")}>
        <span className="block font-semibold">{weight.maund}</span>
        <span className="text-ink-muted block text-[0.85em]">{weight.kg}</span>
      </td>
      <td className={cn(td, "px-[0.6em] text-end whitespace-nowrap")}>
        <Ltr className="block">{parchiRs(item.rate)}</Ltr>
        <span className="text-ink-muted block text-[0.85em]">
          {w.perUnit[item.rateUnit]}
        </span>
      </td>
      <td className={cn(td, "ps-[0.6em] text-end font-bold whitespace-nowrap")}>
        <Ltr>{parchiRs(item.amount)}</Ltr>
      </td>
    </tr>
  );
}

/** 80 mm roll: everything centred or full width, each item on two lines. */
function RollLayout({ bill, shop, lang, w }: LayoutProps) {
  const cancelled = bill.status === "cancelled";
  return (
    <>
      <header className="flex flex-col items-center gap-[0.15em] text-center">
        <Logo shop={shop} className="mb-[0.3em] size-[4.6em] grayscale" />
        <p
          className={cn(
            "text-[1.55em] leading-[1.25] font-extrabold",
            lang === "en" && "font-heading",
          )}
          data-testid="parchi-shop"
        >
          <Typed>{shop.name}</Typed>
        </p>
        <ShopLines shop={shop} w={w} />
      </header>

      <RollRule />
      <p
        className={cn(
          "text-center text-[1.1em] font-extrabold",
          labelCase(lang),
        )}
      >
        {w.title[bill.kind]}
      </p>
      {cancelled ? (
        <div className="mt-[0.3em] text-center">
          <CancelledStamp w={w} className="text-[1.1em]" />
        </div>
      ) : null}

      <dl className="mt-[0.5em] grid grid-cols-[auto_1fr] gap-x-[0.8em] gap-y-[0.1em]">
        <dt className="text-ink-muted">{w.billNo}</dt>
        <dd className="text-end font-bold">
          <Ltr>{bill.billNo}</Ltr>
        </dd>
        <dt className="text-ink-muted">{w.date}</dt>
        <dd className="text-end">{parchiDay(bill.date, lang)}</dd>
        <dt className="text-ink-muted">{w.party[bill.kind]}</dt>
        <dd className="min-w-0 text-end font-bold">
          <Typed>{bill.partyName}</Typed>
        </dd>
      </dl>

      <RollRule />
      <ol>
        {bill.items.map((item, i) => {
          const weight = parchiWeight(item.weightKg, shop.maundKg, lang);
          return (
            <li
              key={item.id}
              data-parchi-keep
              className="border-ink border-b border-dashed py-[0.4em] last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-[0.6em]">
                <span className="min-w-0 font-bold">
                  <Ltr>{i + 1}.</Ltr> <Typed>{item.commodityName}</Typed>
                </span>
                {item.bags !== null ? (
                  <span className="shrink-0">
                    <Ltr>{item.bags}</Ltr> {w.columns.bags}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-[0.6em]">
                <span className="min-w-0">
                  {weight.maund}{" "}
                  <span className="text-ink-muted">({weight.kg})</span>
                  {" · "}
                  <Ltr>{parchiRs(item.rate)}</Ltr> {w.perUnit[item.rateUnit]}
                </span>
                <Ltr className="ms-auto font-bold whitespace-nowrap">
                  {parchiRs(item.amount)}
                </Ltr>
              </div>
            </li>
          );
        })}
      </ol>

      <RollRule />
      <Sums bill={bill} lang={lang} w={w} />
      <Notes bill={bill} w={w} className="mt-[0.6em]" />
    </>
  );
}

function RollRule() {
  return <hr className="border-ink my-[0.5em] border-t border-dashed" />;
}

function Notes({
  bill,
  w,
  className,
}: {
  bill: ParchiBill;
  w: ParchiWords;
  className?: string;
}) {
  if (!bill.notes?.trim()) return null;
  return (
    <div className={cn("mt-[0.5em]", className)} data-parchi-keep>
      <p className="text-ink-muted font-semibold">{w.notes}</p>
      <p dir="auto" className="whitespace-pre-line [overflow-wrap:anywhere]">
        {bill.notes.trim()}
      </p>
    </div>
  );
}

/** Gross, each charge, the total, rounding, net and what was paid now. */
function Sums({
  bill,
  lang,
  w,
  className,
}: {
  bill: ParchiBill;
  lang: ParchiLanguage;
  w: ParchiWords;
  className?: string;
}) {
  const sign = chargeSign(bill.kind);
  return (
    <dl
      data-testid="parchi-sums"
      data-parchi-keep
      className={cn("flex flex-col gap-[0.25em]", className)}
    >
      <SumLine label={w.gross} value={parchiRs(bill.grossAmount)} strong />
      {bill.charges.map((charge) => (
        <SumLine
          key={`${charge.type}|${charge.basis}|${charge.value}`}
          label={parchiChargeLabel(charge, lang)}
          value={`${sign}${parchiRs(charge.amount)}`}
          muted
        />
      ))}
      <SumLine
        label={w.totalCharges[bill.kind]}
        value={`${sign}${parchiRs(bill.totalCharges)}`}
        className="border-ink-rule border-t pt-[0.25em]"
      />
      <SumLine label={w.rounding} value={parchiSignedRs(bill.rounding)} muted />
      <div className="bg-ink text-paper mt-[0.35em] flex items-baseline justify-between gap-[1em] rounded-[0.35em] px-[0.7em] py-[0.35em] text-[1.2em] font-extrabold">
        <dt>{w.net[bill.kind]}</dt>
        <dd data-testid="parchi-net">
          <Ltr className="whitespace-nowrap">{parchiRs(bill.netAmount)}</Ltr>
        </dd>
      </div>
      {isNonZero(bill.settledAmount) ? (
        <SumLine
          label={w.settled[bill.kind]}
          value={parchiRs(bill.settledAmount)}
          className="pt-[0.2em]"
        />
      ) : null}
    </dl>
  );
}

function SumLine({
  label,
  value,
  strong,
  muted,
  className,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-[1em]",
        strong && "font-bold",
        muted && "text-ink-muted",
        className,
      )}
    >
      <dt className="min-w-0">{label}</dt>
      <dd>
        <Ltr className="whitespace-nowrap">{value}</Ltr>
      </dd>
    </div>
  );
}

function Footer({
  shop,
  lang,
  w,
  printedAt,
  roll,
}: {
  shop: ParchiShop;
  lang: ParchiLanguage;
  w: ParchiWords;
  printedAt: Date;
  roll: boolean;
}) {
  return (
    <footer
      data-parchi-keep
      className={cn(
        "text-center",
        roll
          ? "border-ink mt-[0.8em] border-t border-dashed pt-[0.6em]"
          : "border-ink-rule mt-[2em] border-t pt-[0.9em]",
      )}
    >
      {shop.footer?.trim() ? (
        <p
          dir="auto"
          data-testid="parchi-footer"
          className="font-semibold whitespace-pre-line [overflow-wrap:anywhere]"
        >
          {shop.footer.trim()}
        </p>
      ) : null}
      <p className="text-ink-muted mt-[0.3em] text-[0.85em]">
        {w.printedOn}: {parchiDateTime(printedAt, lang)}
      </p>
    </footer>
  );
}
