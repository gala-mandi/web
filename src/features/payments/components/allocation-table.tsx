"use client";

import { CircleCheck, Eraser, Hand, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate, formatRs } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  allocationTotals,
  isAboveZero,
  leftAfter,
  type OutstandingBill,
  totalOutstanding,
} from "../allocation";
import { paymentText } from "../text";

const t = paymentText.bills;
const c = t.columns;

export interface AllocationTableProps {
  bills: readonly OutstandingBill[];
  /** The amount being paid or received, as typed. */
  amount: string;
  /** What each bill takes (same order as `bills`). */
  shares: readonly string[];
  /** True once the split was changed by hand. */
  manual: boolean;
  /** Error per bill id (typed share, or the server's). */
  errors: Partial<Record<string, string>>;
  onShareChange: (billId: string, value: string) => void;
  /** Back to the oldest-first split. */
  onAuto: () => void;
  /** Every bill to 0: the whole amount is an advance. */
  onClear: () => void;
  /** The trader has older bills than the ones listed. */
  more?: boolean;
  /** For the inputs' ids. */
  idPrefix?: string;
}

/** The input id of a bill's share. */
export const shareInputId = (idPrefix: string, billId: string) =>
  `${idPrefix}-share-${billId}`;

/**
 * The trader's outstanding bills, oldest first, with what the amount
 * settles on each. The split follows the amount (oldest first) until a
 * row is typed in; then each bill keeps its typed amount (manual override)
 * until "Auto-allocate oldest first" is pressed again.
 */
export function AllocationTable({
  bills,
  amount,
  shares,
  manual,
  errors,
  onShareChange,
  onAuto,
  onClear,
  more = false,
  idPrefix = "payment",
}: AllocationTableProps) {
  const totals = allocationTotals(amount, shares);
  const anyShare = shares.some((share) => isAboveZero(share));

  return (
    <div className="flex flex-col gap-3">
      <div
        data-testid="allocation-mode"
        data-mode={manual ? "manual" : "auto"}
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold",
            manual
              ? "bg-warning-soft text-warning"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {manual ? (
            <Hand aria-hidden className="size-3.5" />
          ) : (
            <Sparkles aria-hidden className="size-3.5" />
          )}
          {manual ? t.manual : t.auto}
        </p>
        <p className="text-muted-foreground text-xs">
          {manual ? t.manualHint : t.autoHint}
        </p>
        <div className="ms-auto flex flex-wrap gap-2">
          {manual ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onAuto}
            >
              <Sparkles aria-hidden />
              {t.autoButton}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5"
            disabled={!anyShare}
            onClick={onClear}
          >
            <Eraser aria-hidden />
            {t.clearButton}
          </Button>
        </div>
      </div>

      <div className="rounded-card overflow-x-auto border">
        <table className="w-full min-w-[38rem] border-collapse text-sm">
          <caption className="sr-only">{t.caption}</caption>
          <thead className="bg-surface-muted text-muted-foreground text-xs tracking-wide uppercase">
            <tr>
              <th scope="col" className="px-4 py-2.5 text-start font-semibold">
                {c.bill}
              </th>

              <th scope="col" className="px-3 py-2.5 text-end font-semibold">
                {c.net}
              </th>
              <th scope="col" className="px-3 py-2.5 text-end font-semibold">
                {c.outstanding}
              </th>
              <th
                scope="col"
                className="w-36 px-3 py-2.5 text-end font-semibold"
              >
                {c.allocate}
              </th>
              <th scope="col" className="px-4 py-2.5 text-end font-semibold">
                {c.left}
              </th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill, i) => (
              <BillRow
                key={bill.id}
                bill={bill}
                share={shares[i] ?? ""}
                manual={manual}
                error={errors[bill.id]}
                inputId={shareInputId(idPrefix, bill.id)}
                onChange={(value) => onShareChange(bill.id, value)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <th
                scope="row"
                colSpan={2}
                className="px-4 py-3 text-start font-semibold"
              >
                {t.total}
              </th>
              <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums">
                <span dir="ltr">{formatRs(totalOutstanding(bills))}</span>
              </td>
              <td
                className="px-3 py-3 text-end whitespace-nowrap tabular-nums"
                data-testid="allocation-total"
              >
                <span dir="ltr">{formatRs(totals.allocated)}</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {more ? <p className="text-muted-foreground text-xs">{t.more}</p> : null}
    </div>
  );
}

function BillRow({
  bill,
  share,
  manual,
  error,
  inputId,
  onChange,
}: {
  bill: OutstandingBill;
  share: string;
  manual: boolean;
  error: string | undefined;
  inputId: string;
  onChange: (value: string) => void;
}) {
  const takes = isAboveZero(share);
  const left = leftAfter(bill, share);
  const settled = takes && !isAboveZero(left);
  const errorId = `${inputId}-error`;
  // The auto split shows "" for a bill the amount doesn't reach.
  const shown = manual || takes ? share : "";

  return (
    <tr
      data-testid="allocation-row"
      data-bill={bill.billNo}
      className={cn(
        "border-t align-top transition-colors",
        takes && "bg-primary/[0.04]",
      )}
    >
      <th
        scope="row"
        className="px-4 py-3 text-start font-semibold whitespace-nowrap"
      >
        <span dir="ltr" className="block tabular-nums">
          {bill.billNo}
        </span>
        <time
          dateTime={bill.date}
          className="text-muted-foreground block text-xs font-normal"
        >
          {formatDate(bill.date)}
        </time>
      </th>
      <td className="px-3 py-3 text-end whitespace-nowrap tabular-nums">
        <span dir="ltr">{formatRs(bill.netAmount)}</span>
      </td>
      <td className="px-3 py-3 text-end font-semibold whitespace-nowrap tabular-nums">
        <span dir="ltr">{formatRs(bill.outstanding)}</span>
      </td>
      <td className="px-3 py-2">
        <Input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          placeholder="0"
          aria-label={t.allocateLabel(bill.billNo)}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : undefined}
          value={shown}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "rounded-field bg-card h-10 text-end font-semibold tabular-nums",
            !manual && takes && "border-primary/40",
          )}
        />
        {error ? (
          <p id={errorId} className="text-destructive mt-1 text-xs">
            {error}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-end">
        <span className="flex flex-col items-end gap-1">
          <span dir="ltr" className="whitespace-nowrap tabular-nums">
            {formatRs(left)}
          </span>
          {settled ? (
            <Badge
              variant="outline"
              className="text-success gap-1 border-transparent bg-success/10 font-semibold"
            >
              <CircleCheck aria-hidden />
              {t.settled}
            </Badge>
          ) : takes ? (
            <Badge
              variant="outline"
              className="bg-secondary text-secondary-foreground border-transparent font-semibold"
            >
              {t.part}
            </Badge>
          ) : null}
        </span>
      </td>
    </tr>
  );
}
