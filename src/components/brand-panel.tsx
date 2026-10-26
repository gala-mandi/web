import {
  BookOpen,
  Clock,
  LineChart,
  Scale,
  ShieldCheck,
  Users,
  Wheat,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import { brandText } from "@/features/auth/text";
import { cn } from "@/lib/utils";

const chipIcons = [BookOpen, Scale, LineChart];
const featureIcons = [ShieldCheck, Users, Clock, Wifi];
const toneClass = {
  up: "text-green-200",
  down: "text-orange-200",
  flat: "text-white/85",
} as const;

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-11 items-center justify-center rounded-xl border border-white/30 bg-white/20">
        <Wheat aria-hidden className="size-6" strokeWidth={1.8} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-heading text-xl font-extrabold tracking-tight">
          {brandText.name}
        </span>
        <span
          lang="ur"
          dir="rtl"
          className="font-urdu text-xs/relaxed text-white/85"
        >
          {brandText.nameUr}
        </span>
      </div>
    </div>
  );
}

/** Left side of every desktop auth screen (wraps above the form on phones). */
export function BrandPanel() {
  return (
    <aside className="bg-brand-from relative w-full overflow-hidden text-white">
      <Image
        src="/images/wheat-grain.webp"
        alt=""
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="from-brand-from via-brand-from/90 to-brand-to/85 absolute inset-0 bg-linear-150 via-45%" />
      <div className="absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.22)_1px,transparent_1.2px)] bg-size-[22px_22px] opacity-50" />

      <div className="relative flex h-full flex-col justify-between gap-8 px-6 py-8 sm:px-14 sm:pt-11 sm:pb-9 lg:min-h-screen">
        <BrandLogo />

        <div className="flex max-w-[540px] flex-col gap-4">
          <h1 className="font-heading text-3xl/tight font-extrabold tracking-tight sm:text-5xl/[1.04]">
            {brandText.headline}
          </h1>
          <p
            lang="ur"
            dir="rtl"
            className="font-urdu text-start text-lg/loose sm:text-xl/loose"
          >
            {brandText.headlineUr}
          </p>
          <p className="hidden text-base/relaxed text-white/90 sm:block">
            {brandText.intro}
          </p>
          <ul className="hidden flex-wrap gap-2 sm:flex">
            {brandText.chips.map((chip, i) => {
              const Icon = chipIcons[i];
              return (
                <li
                  key={chip}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-2 text-[13px] font-semibold"
                >
                  <Icon aria-hidden className="size-4" />
                  {chip}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden flex-wrap items-end gap-6 lg:flex">
          <div className="flex max-w-[380px] flex-[1_1_300px] flex-col gap-2.5 rounded-[18px] border border-white/20 bg-[rgb(20_10_40/0.32)] px-4.5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13px] font-bold">
                  {brandText.ratesTitle}
                </span>
                <span
                  lang="ur"
                  dir="rtl"
                  className="font-urdu text-start text-[11px]/relaxed text-white/85"
                >
                  {brandText.ratesTitleUr}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                <span
                  aria-hidden
                  className="size-[7px] rounded-full bg-green-300"
                />
                {brandText.ratesBadge}
              </span>
            </div>
            <ul>
              {brandText.rates.map((rate) => (
                <li
                  key={rate.name}
                  className="flex items-center gap-2.5 border-t border-white/15 py-2"
                >
                  <span className="flex-auto text-sm font-semibold">
                    {rate.name}{" "}
                    <span className="font-normal text-white/80">{rate.en}</span>
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    {rate.price}
                  </span>
                  <span
                    className={cn(
                      "min-w-[62px] text-end text-xs font-bold tabular-nums",
                      toneClass[rate.tone],
                    )}
                  >
                    {rate.change}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <MandiIllustration />
        </div>

        <ul className="hidden flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/90 sm:flex">
          {brandText.features.map((feature, i) => {
            const Icon = featureIcons[i];
            return (
              <li key={feature} className="inline-flex items-center gap-1.5">
                <Icon aria-hidden className="size-3.5" />
                {feature}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}

function MandiIllustration() {
  return (
    <svg
      role="img"
      aria-label={brandText.illustrationLabel}
      width="220"
      height="150"
      viewBox="0 0 220 150"
      fill="none"
      className="flex-none stroke-white"
      strokeLinecap="round"
    >
      <path d="M4 142h212" strokeOpacity={0.45} strokeWidth={2} />
      <g fill="white" fillOpacity={0.2} strokeOpacity={0.75} strokeWidth={2}>
        <path d="M22 142c-10 0-12-34 0-52l4-8c2-5 18-5 20 0l4 8c12 18 10 52 0 52z" />
        <path d="M62 142c-10 0-12-34 0-52l4-8c2-5 18-5 20 0l4 8c12 18 10 52 0 52z" />
        <path d="M140 128c-7 0-8-22 0-34l3-5c1-3 11-3 12 0l3 5c8 12 7 34 0 34z" />
      </g>
      <path d="M28 82h16M68 82h16" strokeOpacity={0.75} strokeWidth={2} />
      <path
        d="M30 108h12M28 118h16M70 108h12M68 118h16"
        strokeOpacity={0.45}
        strokeWidth={1.5}
      />
      <path
        d="M42 90c-9 0-11-30 0-46l4-7c2-4 16-4 18 0l4 7c11 16 9 46 0 46z"
        fill="white"
        fillOpacity={0.28}
        strokeOpacity={0.85}
        strokeWidth={2}
      />
      <path d="M47 37h14" strokeOpacity={0.85} strokeWidth={2} />
      <rect
        x="122"
        y="128"
        width="84"
        height="12"
        rx="3"
        fill="white"
        fillOpacity={0.22}
        strokeOpacity={0.8}
        strokeWidth={2}
      />
      <path d="M196 128V66" strokeOpacity={0.8} strokeWidth={3} />
      <circle
        cx="196"
        cy="50"
        r="17"
        fill="white"
        fillOpacity={0.22}
        strokeOpacity={0.85}
        strokeWidth={2}
      />
      <path d="M196 50l7-9" strokeWidth={2} />
      <path
        d="M184 50h3M205 50h3M196 38v3"
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
      <path d="M108 142V100" strokeOpacity={0.7} strokeWidth={1.8} />
      <path
        d="M108 112c-5 0-8-3-8-8 5 0 8 3 8 8zM108 112c5 0 8-3 8-8-5 0-8 3-8 8zM108 102c-5 0-8-3-8-8 5 0 8 3 8 8zM108 102c5 0 8-3 8-8-5 0-8 3-8 8z"
        fill="white"
        fillOpacity={0.35}
        strokeOpacity={0.8}
        strokeWidth={1.4}
      />
    </svg>
  );
}
