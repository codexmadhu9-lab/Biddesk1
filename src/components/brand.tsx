export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-elevated">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17l5-5 4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </div>
      <span className="text-xl font-bold">
        BidWin<span className="text-sidebar-primary"> AI</span>
      </span>
    </div>
  );
}
