import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { daysLeft, inr, toggleWatch, type Tender } from "@/lib/data";
import { fitTone } from "@/lib/fit";

const toneCls = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning-foreground",
  destructive: "bg-destructive-soft text-destructive",
};

export function FitBadge({ score, className }: { score: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-medium tabular", toneCls[fitTone(score)], className)}>
      {score}<span className="opacity-60">/100</span>
    </span>
  );
}

export function DeadlineChip({ deadline }: { deadline: string }) {
  const d = daysLeft(deadline);
  const tone = d < 0 ? "bg-muted text-muted-foreground" : d <= 5 ? toneCls.destructive : d <= 12 ? toneCls.warning : "bg-secondary text-secondary-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", tone)}>
      <Clock className="h-3 w-3" />{d < 0 ? "Closed" : d === 0 ? "Today" : `${d}d left`}
    </span>
  );
}

export function WatchButton({ tenderId, saved }: { tenderId: string; saved: boolean }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => toggleWatch(tenderId, saved),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["watchlist"] }); toast.success(saved ? "Removed from watchlist" : "Saved to watchlist"); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); m.mutate(); }}
      disabled={m.isPending}
      aria-label={saved ? "Remove from watchlist" : "Save to watchlist"}
      className={cn("grid h-8 w-8 place-items-center rounded-lg border transition hover:bg-muted", saved && "border-primary/30 bg-primary-soft text-primary")}
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  );
}

export function TenderRow({ t, fit, saved }: { t: Tender; fit: number; saved: boolean }) {
  return (
    <Link
      to="/tenders/$id" params={{ id: t.id }}
      className="group grid grid-cols-[1fr_auto] gap-4 rounded-xl border bg-card p-4 shadow-card transition hover:-translate-y-px hover:border-primary/30 hover:shadow-elevated md:grid-cols-[1fr_120px_110px_auto]"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold text-secondary-foreground">{t.source}</span>
          <span>{t.category}</span>
          <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{t.city}, {t.state}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-1 font-semibold group-hover:text-primary">{t.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{t.buyer} · {t.ref_no}</p>
      </div>
      <div className="hidden flex-col justify-center md:flex">
        <span className="text-xs text-muted-foreground">Value</span>
        <span className="font-mono text-sm font-medium tabular">{inr(Number(t.value_cr))}</span>
      </div>
      <div className="hidden flex-col justify-center gap-1 md:flex">
        <DeadlineChip deadline={t.deadline} />
      </div>
      <div className="flex items-center gap-2">
        <FitBadge score={fit} />
        <WatchButton tenderId={t.id} saved={saved} />
      </div>
    </Link>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
      <h3 className="font-bold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
