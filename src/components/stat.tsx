import { cn } from "@/lib/utils";

export function Stat({ label, value, sub, className }: { label: string; value: React.ReactNode; sub?: string; className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-card animate-rise", className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl font-medium tabular">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Panel({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-bold">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function Bar({ value, max, tone = "brand" }: { value: number; max: number; tone?: "brand" | "success" | "warning" }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const cls = tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-gradient-brand";
  return <div className="h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", cls)} style={{ width: `${pct}%` }} /></div>;
}

export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
