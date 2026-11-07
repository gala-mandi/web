import Link from "next/link";
import { useLocale } from "next-intl";
import { UrduName } from "@/features/commodities/components/commodity-name";
import { TraderName } from "@/features/traders/components/trader-name";
import { formatCell } from "../cell-format";
import type { ReportCell } from "../sheet";

/** One report cell on screen: names keep their own direction, numbers LTR. */
export function ReportCellView({
  cell,
  maundKg,
  links = true,
}: {
  cell: ReportCell;
  maundKg?: string;
  /** Off on paper. */
  links?: boolean;
}) {
  const locale = useLocale();
  if (cell.kind === "text") {
    const name =
      links && cell.href ? (
        <Link
          href={cell.href}
          aria-label={cell.hrefLabel}
          className="text-foreground focus-visible:ring-ring/50 rounded-sm font-semibold outline-none hover:underline focus-visible:ring-3"
        >
          <TraderName name={cell.value} />
        </Link>
      ) : (
        <TraderName name={cell.value} />
      );
    return cell.secondary ? (
      <span className="inline-flex min-w-0 items-baseline gap-2">
        {name}
        <UrduName name={cell.secondary} className="text-muted-foreground" />
      </span>
    ) : (
      name
    );
  }
  if (cell.kind === "date") {
    return (
      <time dateTime={cell.value} className="whitespace-nowrap">
        {formatCell(cell, undefined, locale)}
      </time>
    );
  }
  return (
    <span dir="auto" className="whitespace-nowrap tabular-nums">
      {formatCell(cell, maundKg, locale)}
    </span>
  );
}
