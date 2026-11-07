import { useTranslations } from "next-intl";
import { ApiStatus } from "@/features/health/components/api-status";

export default function Home() {
  const t = useTranslations("panel");
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="bg-card w-full max-w-md rounded-3xl border p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold">{t("appName")}</h1>
        <p className="text-muted-foreground mt-1">{t("appSubtitle")}</p>
        <div className="mt-6">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}
