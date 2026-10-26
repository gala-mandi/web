"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils";

const LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  label: (position: number) => string;
  describedBy?: string;
  autoFocus?: boolean;
}

/** Six one-digit boxes; typing moves forward, Backspace moves back, paste fills all. */
export function OtpInput({
  value,
  onChange,
  invalid,
  label,
  describedBy,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? "");

  const focus = (i: number) =>
    refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus();

  const setAt = (i: number, digit: string) => {
    const next = [...digits];
    next[i] = digit;
    onChange(next.join("").slice(0, LENGTH));
  };

  const fill = (from: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, LENGTH - from);
    if (!incoming) return;
    const next = [...digits];
    for (let k = 0; k < incoming.length; k++) next[from + k] = incoming[k];
    onChange(next.join(""));
    focus(from + incoming.length);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i]) {
      e.preventDefault();
      if (i > 0) setAt(i - 1, "");
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };

  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    fill(i, e.clipboardData.getData("text"));
  };

  return (
    <div dir="ltr" className="flex justify-between gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          // Room for a pasted or auto-filled full code in any box.
          maxLength={LENGTH}
          value={digit}
          autoFocus={autoFocus && i === 0}
          aria-label={label(i + 1)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onKeyDown={onKeyDown(i)}
          onPaste={onPaste(i)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const text = e.currentTarget.value.replace(/\D/g, "");
            if (text.length > 2 || (text.length === 2 && !digit)) {
              // Auto-filled or pasted code.
              fill(i, text);
              return;
            }
            // One new digit typed (replacing the old one if it was kept).
            const typed = text.slice(-1);
            setAt(i, typed);
            if (typed) focus(i + 1);
          }}
          className={cn(
            "rounded-field border-input bg-card font-heading size-12 min-w-0 flex-1 border text-center text-xl font-extrabold tabular-nums outline-none sm:h-14",
            "focus-visible:border-ring focus-visible:ring-ring/15 focus-visible:border-2 focus-visible:ring-4",
            digit && "bg-background",
            invalid && "border-destructive",
          )}
        />
      ))}
    </div>
  );
}
