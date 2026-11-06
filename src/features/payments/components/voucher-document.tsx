"use client";

import type { Ref } from "react";
import {
  CancelledStamp,
  Footer,
  labelCase,
  Logo,
  Ltr,
  sheetClass,
  ShopLines,
  Typed,
  TypedLines,
  typeSize,
  Watermark,
} from "@/features/parchi/components/parchi-document";
import { isNonZero, parchiDay, parchiRs } from "@/features/parchi/parchi";
import { parchiWords } from "@/features/parchi/text";
import type {
  PaperSize,
  ParchiLanguage,
  ParchiShop,
} from "@/features/parchi/types";
import { cn } from "@/lib/utils";
import type { Payment } from "../types";
import { type VoucherWords, voucherWords } from "../voucher-words";

export interface VoucherDocumentProps {
  payment: Payment;
  shop: ParchiShop;
  lang: ParchiLanguage;
  paper: PaperSize;
  printedAt: Date;
  /** Marks the on-screen copy (`data-print-area`). */
  printArea?: boolean;
  ref?: Ref<HTMLElement>;
}

interface LayoutProps {
  payment: Payment;
  shop: ParchiShop;
  lang: ParchiLanguage;
  w: VoucherWords;
}

/**
 * The printed payment or receipt voucher, on the same papers and in the
 * same languages as the parchi (and with its header, footer and CANCELLED
 * watermark): voucher no, date, who was paid or paid, the amount, method
 * and reference, the bills it settled, the advance and two signature
 * lines. Every amount is the server's string, only formatted.
 */
export function VoucherDocument({
  payment,
  shop,
  lang,
  paper,
  printedAt,
  printArea = false,
  ref,
}: VoucherDocumentProps) {
  const w = voucherWords[lang];
  const roll = paper === "thermal80";
  const Layout = roll ? RollLayout : SheetLayout;
  return (
    <article
      ref={ref}
      lang={lang}
      dir={lang === "ur" ? "rtl" : "ltr"}
      data-parchi={paper}
      data-parchi-lang={lang}
      data-voucher={payment.direction}
      data-print-area={printArea || undefined}
      aria-label={`${w.title[payment.direction]} ${payment.voucherNo}`}
      className={cn(
        "bg-paper text-ink relative isolate overflow-hidden print:overflow-visible",
        sheetClass[paper],
        typeSize[paper][lang],
        lang === "ur"
          ? "font-urdu-mixed leading-[2]"
          : "font-sans leading-[1.45]",
      )}
    >
      {payment.status === "cancelled" ? (
        <Watermark
          text={parchiWords[lang].cancelled}
          paper={paper}
          lang={lang}
        />
      ) : null}
      <Layout payment={payment} shop={shop} lang={lang} w={w} />
      <Footer
        shop={shop}
        lang={lang}
        w={parchiWords[lang]}
        printedAt={printedAt}
        roll={roll}
      />
    </article>
  );
}

/** A4 and A5. */
function SheetLayout({ payment, shop, lang, w }: LayoutProps) {
  const cancelled = payment.status === "cancelled";
  const d = payment.direction;
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
          <ShopLines shop={shop} w={parchiWords[lang]} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[0.5em]">
          <p
            className={cn(
              "bg-ink text-paper rounded-[0.35em] px-[0.8em] text-[1.05em] font-bold",
              lang === "en" ? "py-[0.2em]" : "py-[0.1em] leading-[2.1]",
              labelCase(lang),
            )}
          >
            {w.title[d]}
          </p>
          <dl className="grid grid-cols-[auto_auto] gap-x-[1em] gap-y-[0.1em]">
            <dt className="text-ink-muted">{w.voucherNo}</dt>
            <dd className="text-end text-[1.1em] font-bold">
              <Ltr>{payment.voucherNo}</Ltr>
            </dd>
            <dt className="text-ink-muted">{w.date}</dt>
            <dd className="text-end font-semibold">
              {parchiDay(payment.paymentDate, lang)}
            </dd>
          </dl>
          {cancelled ? <CancelledStamp w={parchiWords[lang]} /> : null}
        </div>
      </header>

      <section
        data-parchi-keep
        className="border-ink-rule mt-[1.1em] flex flex-wrap items-baseline gap-x-[0.7em] rounded-[0.5em] border px-[1em] py-[0.55em]"
      >
        <span className={cn("text-ink-muted font-semibold", labelCase(lang))}>
          {w.party[d]} · {w.partyType[d]}
        </span>
        <Typed className="min-w-0 text-[1.3em] font-bold">
          {payment.trader.name}
        </Typed>
      </section>

      <section
        data-parchi-keep
        className="mt-[1em] flex flex-wrap items-stretch gap-[1em]"
      >
        <div className="bg-ink text-paper flex min-w-[45%] flex-1 flex-col justify-center rounded-[0.5em] px-[1em] py-[0.6em]">
          <span className={cn("text-[0.85em] opacity-80", labelCase(lang))}>
            {w.amount}
          </span>
          <span
            data-testid="voucher-amount"
            className="text-[1.9em] leading-[1.2] font-extrabold"
          >
            <Ltr>{parchiRs(payment.amount)}</Ltr>
          </span>
        </div>
        <dl className="border-ink-rule grid flex-1 grid-cols-[auto_1fr] content-center gap-x-[1em] gap-y-[0.2em] rounded-[0.5em] border px-[1em] py-[0.6em]">
          <dt className="text-ink-muted">{w.method}</dt>
          <dd className="text-end font-bold">{w.methods[payment.method]}</dd>
          {payment.reference ? (
            <>
              <dt className="text-ink-muted">{w.reference}</dt>
              <dd className="min-w-0 text-end font-semibold">
                <Typed>{payment.reference}</Typed>
              </dd>
            </>
          ) : null}
        </dl>
      </section>

      <Bills payment={payment} lang={lang} w={w} />

      <section
        data-parchi-keep
        className="mt-[1.2em] flex items-start gap-[2em]"
      >
        <div className="min-w-0 flex-1">
          <Notes payment={payment} w={w} />
        </div>
        <Sums payment={payment} w={w} className="w-[48%]" />
      </section>

      <Signatures payment={payment} w={w} />
    </>
  );
}

/** The bills it settled; on a cancelled voucher, struck through. */
function Bills({
  payment,
  lang,
  w,
}: {
  payment: Payment;
  lang: ParchiLanguage;
  w: VoucherWords;
}) {
  const c = w.columns;
  const cancelled = payment.status === "cancelled";
  const th = cn("py-[0.55em] font-semibold", labelCase(lang));
  const td = cn("py-[0.45em] align-top", lang === "ur" && "leading-[2.3]");
  return (
    <section className="mt-[1.2em]">
      <p className={cn("text-ink-muted font-semibold", labelCase(lang))}>
        {w.bills}
      </p>
      {payment.allocations.length === 0 ? (
        <p className="mt-[0.3em]">{w.noBills}</p>
      ) : (
        <table
          data-testid="voucher-bills"
          className={cn(
            "mt-[0.3em] w-full table-fixed border-collapse",
            cancelled && "text-ink-muted line-through",
          )}
        >
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[38%]" />
            <col className="w-[27%]" />
            <col className="w-[27%]" />
          </colgroup>
          <thead>
            <tr className="border-ink text-ink-muted border-b-[1.5px] text-[0.85em]">
              <th scope="col" className={cn(th, "pe-[0.5em] text-start")}>
                {c.no}
              </th>
              <th scope="col" className={cn(th, "pe-[0.5em] text-start")}>
                {c.billNo}
              </th>
              <th scope="col" className={cn(th, "px-[0.5em] text-start")}>
                {c.billDate}
              </th>
              <th scope="col" className={cn(th, "ps-[0.5em] text-end")}>
                {c.amount}
              </th>
            </tr>
          </thead>
          <tbody>
            {payment.allocations.map((a, i) => (
              <tr key={a.id} className="border-ink-rule border-b">
                <td className={cn(td, "text-ink-muted pe-[0.5em]")}>
                  <Ltr>{i + 1}</Ltr>
                </td>
                <td className={cn(td, "pe-[0.5em] font-semibold")}>
                  <Ltr>{a.billNo}</Ltr>
                </td>
                <td className={cn(td, "px-[0.5em]")}>
                  {parchiDay(a.billDate, lang)}
                </td>
                <td className={cn(td, "ps-[0.5em] text-end font-bold")}>
                  <Ltr>{parchiRs(a.amount)}</Ltr>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {cancelled && payment.allocations.length > 0 ? (
        <p className="text-ink-muted mt-[0.3em] text-[0.9em]">
          {w.cancelledBills}
        </p>
      ) : null}
    </section>
  );
}

function Sums({
  payment,
  w,
  className,
}: {
  payment: Payment;
  w: VoucherWords;
  className?: string;
}) {
  return (
    <dl
      data-testid="voucher-sums"
      data-parchi-keep
      className={cn("flex flex-col gap-[0.25em]", className)}
    >
      <div className="flex items-baseline justify-between gap-[1em]">
        <dt>{w.allocated}</dt>
        <dd>
          <Ltr>{parchiRs(payment.allocated)}</Ltr>
        </dd>
      </div>
      <div className="border-ink-rule flex items-baseline justify-between gap-[1em] border-t pt-[0.25em] font-bold">
        <dt>{w.advance}</dt>
        <dd>
          <Ltr>{parchiRs(payment.advance)}</Ltr>
        </dd>
      </div>
      <div className="bg-ink text-paper mt-[0.35em] flex items-baseline justify-between gap-[1em] rounded-[0.35em] px-[0.7em] py-[0.35em] text-[1.15em] font-extrabold">
        <dt>{w.amount}</dt>
        <dd>
          <Ltr>{parchiRs(payment.amount)}</Ltr>
        </dd>
      </div>
    </dl>
  );
}

function Notes({
  payment,
  w,
  className,
}: {
  payment: Payment;
  w: VoucherWords;
  className?: string;
}) {
  if (!payment.notes?.trim()) return null;
  return (
    <div className={className} data-parchi-keep>
      <p className="text-ink-muted font-semibold">{w.notes}</p>
      <p className="text-start">
        <TypedLines text={payment.notes} className="text-start" />
      </p>
    </div>
  );
}

/** Two lines to sign: the trader's and the shop's. */
function Signatures({
  payment,
  w,
  roll = false,
}: {
  payment: Payment;
  w: VoucherWords;
  roll?: boolean;
}) {
  return (
    <section
      data-parchi-keep
      className={cn(
        "grid gap-[2em]",
        roll ? "mt-[1.6em] grid-cols-1" : "mt-[3.2em] grid-cols-2",
      )}
    >
      {[w.signParty[payment.direction], w.signShop].map((label) => (
        <p
          key={label}
          className="border-ink text-ink-muted border-t pt-[0.3em] text-center text-[0.9em]"
        >
          {label}
        </p>
      ))}
    </section>
  );
}

function RollRule() {
  return <hr className="border-ink my-[0.5em] border-t border-dashed" />;
}

/** 80 mm roll: centred header, then everything full width. */
function RollLayout({ payment, shop, lang, w }: LayoutProps) {
  const cancelled = payment.status === "cancelled";
  const d = payment.direction;
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
        <ShopLines shop={shop} w={parchiWords[lang]} />
      </header>

      <RollRule />
      <p
        className={cn(
          "text-center text-[1.1em] font-extrabold",
          labelCase(lang),
        )}
      >
        {w.title[d]}
      </p>
      {cancelled ? (
        <div className="mt-[0.3em] text-center">
          <CancelledStamp w={parchiWords[lang]} className="text-[1.1em]" />
        </div>
      ) : null}

      <dl className="mt-[0.5em] grid grid-cols-[auto_1fr] gap-x-[0.8em] gap-y-[0.1em]">
        <dt className="text-ink-muted">{w.voucherNo}</dt>
        <dd className="text-end font-bold">
          <Ltr>{payment.voucherNo}</Ltr>
        </dd>
        <dt className="text-ink-muted">{w.date}</dt>
        <dd className="text-end">{parchiDay(payment.paymentDate, lang)}</dd>
        <dt className="text-ink-muted">{w.party[d]}</dt>
        <dd className="min-w-0 text-end font-bold">
          <Typed>{payment.trader.name}</Typed>
        </dd>
        <dt className="text-ink-muted">{w.method}</dt>
        <dd className="text-end">{w.methods[payment.method]}</dd>
        {payment.reference ? (
          <>
            <dt className="text-ink-muted">{w.reference}</dt>
            <dd className="min-w-0 text-end">
              <Typed>{payment.reference}</Typed>
            </dd>
          </>
        ) : null}
      </dl>

      <div className="bg-ink text-paper mt-[0.6em] flex items-baseline justify-between gap-[1em] rounded-[0.35em] px-[0.7em] py-[0.4em] font-extrabold">
        <span>{w.amount}</span>
        <span data-testid="voucher-amount" className="text-[1.3em]">
          <Ltr>{parchiRs(payment.amount)}</Ltr>
        </span>
      </div>

      <RollRule />
      <p className="text-ink-muted font-semibold">{w.bills}</p>
      {payment.allocations.length === 0 ? (
        <p>{w.noBills}</p>
      ) : (
        <ol
          data-testid="voucher-bills"
          className={cn(cancelled && "text-ink-muted line-through")}
        >
          {payment.allocations.map((a, i) => (
            <li
              key={a.id}
              data-parchi-keep
              className="border-ink flex items-start justify-between gap-[0.6em] border-b border-dashed py-[0.3em] last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block">
                  <Ltr>{i + 1}.</Ltr>{" "}
                  <Ltr className="font-bold">{a.billNo}</Ltr>
                </span>
                <bdi className="text-ink-muted block text-[0.9em] whitespace-nowrap">
                  {parchiDay(a.billDate, lang)}
                </bdi>
              </span>
              <Ltr className="font-bold">{parchiRs(a.amount)}</Ltr>
            </li>
          ))}
        </ol>
      )}
      {cancelled && payment.allocations.length > 0 ? (
        <p className="text-ink-muted text-[0.9em]">{w.cancelledBills}</p>
      ) : null}

      <RollRule />
      <dl className="flex flex-col gap-[0.2em]" data-testid="voucher-sums">
        <div className="flex items-baseline justify-between gap-[1em]">
          <dt>{w.allocated}</dt>
          <dd>
            <Ltr>{parchiRs(payment.allocated)}</Ltr>
          </dd>
        </div>
        <div
          className={cn(
            "flex items-baseline justify-between gap-[1em]",
            isNonZero(payment.advance) && "font-bold",
          )}
        >
          <dt>{w.advance}</dt>
          <dd>
            <Ltr>{parchiRs(payment.advance)}</Ltr>
          </dd>
        </div>
      </dl>
      <Notes payment={payment} w={w} className="mt-[0.6em]" />
      <Signatures payment={payment} w={w} roll />
    </>
  );
}
