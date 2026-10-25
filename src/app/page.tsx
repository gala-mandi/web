import { ApiStatus } from "@/features/health/components/api-status";

const text = {
  title: "Galla Mandi",
  subtitle: "Shop panel",
};

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="bg-card w-full max-w-md rounded-3xl border p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold">{text.title}</h1>
        <p className="text-muted-foreground mt-1">{text.subtitle}</p>
        <div className="mt-6">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}
