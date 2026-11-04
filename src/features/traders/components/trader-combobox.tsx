"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
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
import { useCan } from "@/lib/can";
import { cn } from "@/lib/utils";
import { useTraderLookup } from "../hooks";
import { traderText } from "../text";
import type { Trader, TraderLookupItem, TraderType } from "../types";
import { TraderTypeBadge } from "./badges";
import { TraderFormSheet } from "./trader-form-sheet";
import { TraderName } from "./trader-name";

const t = traderText.combobox;

/** Typing waits this long before asking the server. */
export const TRADER_SEARCH_DEBOUNCE_MS = 250;
const LOOKUP_LIMIT = 10;
const QUICK_ADD_VALUE = "__quick-add__";

export interface TraderComboboxProps {
  /** The picked trader, or null. */
  value: TraderLookupItem | null;
  onChange: (trader: TraderLookupItem | null) => void;
  /** Only traders of this type (e.g. `kissan` in a purchase); also the quick-add type. */
  type?: TraderType;
  /** Shown on the button while nothing is picked. */
  placeholder?: string;
  disabled?: boolean;
  /**
   * Offer "Add '<typed>' as new trader" when nothing matches (default true).
   * Shown only to users with `trader.create`.
   */
  allowQuickAdd?: boolean;
  /** For a `<label htmlFor>`. */
  id?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

function toLookupItem(trader: Trader): TraderLookupItem {
  const { id, type, name, fatherName, phone, village } = trader;
  return { id, type, name, fatherName, phone, village };
}

/**
 * Trader picker for the purchase, sale and payment forms: search as you type
 * (name or phone, debounced 250 ms, `GET /traders/lookup`, active traders
 * only), keyboard friendly (↑ ↓ Enter, Esc), and a quick add that opens the
 * trader sheet prefilled with the typed name and picks the new trader
 * without leaving the page.
 *
 * @example
 * ```tsx
 * <Controller
 *   name="kissan"
 *   control={form.control}
 *   render={({ field, fieldState }) => (
 *     <Field data-invalid={fieldState.invalid}>
 *       <FieldLabel htmlFor="purchase-kissan">Kissan</FieldLabel>
 *       <TraderCombobox
 *         id="purchase-kissan"
 *         type="kissan"
 *         value={field.value}
 *         onChange={field.onChange}
 *         aria-invalid={fieldState.invalid}
 *       />
 *       <FieldError errors={[fieldState.error]} />
 *     </Field>
 *   )}
 * />
 * // Send `kissan.id` to the server; the value holds what the list shows.
 * ```
 */
export function TraderCombobox({
  value,
  onChange,
  type,
  placeholder = t.placeholder,
  disabled = false,
  allowQuickAdd = true,
  id,
  "aria-labelledby": labelledBy,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  className,
}: TraderComboboxProps) {
  const canCreate = useCan("trader.create");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // What the server was asked for: `search` after the pause.
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const next = search.trim();
    if (next === q) return;
    const timer = setTimeout(() => setQ(next), TRADER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, q]);

  const lookup = useTraderLookup(
    { q, ...(type ? { type } : {}), limit: LOOKUP_LIMIT },
    open,
  );
  const items = lookup.data ?? [];
  const typing = search.trim() !== q;
  const settled = !typing && !lookup.isFetching && !lookup.isError;
  const showEmpty = settled && lookup.isSuccess && items.length === 0;
  const showQuickAdd = showEmpty && allowQuickAdd && canCreate && q.length > 0;

  const close = () => {
    setOpen(false);
    setSearch("");
    setQ("");
  };

  const pick = (item: TraderLookupItem) => {
    onChange(item);
    close();
  };

  const startQuickAdd = () => {
    setAdding(q);
    close();
  };

  return (
    <>
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
              <span className="flex min-w-0 items-baseline gap-1.5">
                <TraderName
                  name={value.name}
                  className="truncate font-semibold"
                />
                {value.fatherName ? (
                  <span className="text-muted-foreground truncate text-xs">
                    {traderText.fatherPrefix}{" "}
                    <TraderName name={value.fatherName} />
                  </span>
                ) : null}
              </span>
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
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <TraderName
                            name={item.name}
                            className="truncate font-semibold"
                          />
                          {item.fatherName ? (
                            <span className="text-muted-foreground truncate text-xs">
                              {traderText.fatherPrefix}{" "}
                              <TraderName name={item.fatherName} />
                            </span>
                          ) : null}
                        </span>
                        {item.phone || item.village ? (
                          <span className="text-muted-foreground flex gap-2 text-xs">
                            {item.phone ? (
                              <span dir="ltr" className="tabular-nums">
                                {item.phone}
                              </span>
                            ) : null}
                            {item.village ? (
                              <TraderName name={item.village} />
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                      {type ? null : <TraderTypeBadge type={item.type} />}
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
              {showQuickAdd ? (
                <CommandGroup>
                  <CommandItem
                    value={QUICK_ADD_VALUE}
                    onSelect={startQuickAdd}
                    className="text-primary font-semibold"
                  >
                    <Plus aria-hidden />
                    <bdi dir="auto">{t.quickAdd(q)}</bdi>
                  </CommandItem>
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <TraderFormSheet
        open={adding !== null}
        onOpenChange={(next) => {
          if (!next) setAdding(null);
        }}
        prefill={{ name: adding ?? "", type }}
        onSaved={(trader) => onChange(toLookupItem(trader))}
      />
    </>
  );
}
