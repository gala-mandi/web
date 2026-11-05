"use client";

import { ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatKg } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCommodityLookup } from "../hooks";
import { commodityText, unitShortText } from "../text";
import type { CommodityLookupItem } from "../types";
import { CommodityName } from "./commodity-name";

const t = commodityText.combobox;

/** Typing waits this long before asking the server. */
export const COMMODITY_SEARCH_DEBOUNCE_MS = 250;
const LOOKUP_LIMIT = 10;

export interface CommodityComboboxProps {
  /** The picked commodity, or null. */
  value: CommodityLookupItem | null;
  /** Gets the lookup item, with the charges that apply (`charges`). */
  onChange: (commodity: CommodityLookupItem | null) => void;
  /** Shown on the button while nothing is picked. */
  placeholder?: string;
  disabled?: boolean;
  /** For a `<label htmlFor>`. */
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

/** "Bag · 100 kg bag" or "Maund". */
function unitLine(item: CommodityLookupItem): string {
  const unit = unitShortText[item.defaultUnit];
  return item.bagWeightKg
    ? `${unit} · ${commodityText.bagOf(formatKg(item.bagWeightKg))}`
    : unit;
}

/**
 * Commodity picker for the rates, purchase and sale forms: search as you
 * type (English or Urdu name, debounced 250 ms, `GET /commodities/lookup`,
 * active commodities only, so a deactivated one never shows up), keyboard
 * friendly (↑ ↓ Enter, Esc). The value is the lookup item, which carries the
 * default unit, bag weight and the charges that apply (the commodity's
 * override, else the shop default), so the form can prefill from it.
 *
 * @example
 * ```tsx
 * <Controller
 *   name="commodity"
 *   control={form.control}
 *   render={({ field, fieldState }) => (
 *     <Field data-invalid={fieldState.invalid}>
 *       <FieldLabel htmlFor="purchase-commodity">Commodity</FieldLabel>
 *       <CommodityCombobox
 *         id="purchase-commodity"
 *         value={field.value}
 *         onChange={field.onChange}
 *         aria-invalid={fieldState.invalid}
 *       />
 *       <FieldError errors={[fieldState.error]} />
 *     </Field>
 *   )}
 * />
 * // Send `commodity.id` to the server; the server works out the charges again.
 * ```
 */
export function CommodityCombobox({
  value,
  onChange,
  placeholder = t.placeholder,
  disabled = false,
  id,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  className,
}: CommodityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // What the server was asked for: `search` after the pause.
  const [q, setQ] = useState("");

  useEffect(() => {
    const next = search.trim();
    if (next === q) return;
    const timer = setTimeout(() => setQ(next), COMMODITY_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q]);

  const lookup = useCommodityLookup({ q, limit: LOOKUP_LIMIT }, open);
  const items = lookup.data ?? [];
  const typing = search.trim() !== q;
  const settled = !typing && !lookup.isFetching && !lookup.isError;
  const showEmpty = settled && lookup.isSuccess && items.length === 0;

  const close = () => {
    setOpen(false);
    setSearch("");
    setQ("");
  };

  const pick = (item: CommodityLookupItem) => {
    onChange(item);
    close();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          className={cn(
            "rounded-field bg-card h-11 w-full justify-between gap-2 px-3 font-normal",
            className,
          )}
        >
          {value ? (
            <CommodityName name={value.name} nameUr={value.nameUr} />
          ) : (
            <span className="text-muted-foreground truncate">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown aria-hidden className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-72 p-0"
      >
        <Command shouldFilter={false} label={t.searchLabel}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchLabel}
            dir="auto"
          />
          <CommandList aria-label={t.results}>
            {lookup.isError && !typing ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-2 px-3 py-4 text-center text-sm"
              >
                <span className="text-destructive">{t.error}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void lookup.refetch()}
                >
                  {t.retry}
                </Button>
              </div>
            ) : null}
            {lookup.isPending && open && !lookup.isError ? (
              <p
                role="status"
                className="text-muted-foreground px-3 py-4 text-center text-sm"
              >
                {t.loading}
              </p>
            ) : null}
            {items.length > 0 ? (
              <CommandGroup
                className={cn((typing || lookup.isFetching) && "opacity-60")}
              >
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => pick(item)}
                    data-checked={value?.id === item.id || undefined}
                    className="items-start py-2"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <CommodityName name={item.name} nameUr={item.nameUr} />
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {unitLine(item)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {showEmpty ? (
              <p
                role="status"
                className="text-muted-foreground px-3 py-4 text-center text-sm"
              >
                <bdi dir="auto">{t.empty(q)}</bdi>
              </p>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
