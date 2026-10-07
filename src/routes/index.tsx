import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Radar, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BidWin AI — Tender intelligence & bid management for India" },
      { name: "description", content: "Discover GeM, CPPP and state tenders you can actually win. AI fit scores, bid/no-bid analysis and a bid pipeline for Indian businesses." },
      { property: "og:title", content: "BidWin AI — Win more government tenders" },
      { property: "og:description", content: "AI-powered tender discovery, bid/no-bid decisions and bid pipeline for Indian suppliers and contractors." },
     { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: Landing,
});

const features = [
  { icon: Radar, title: "Unified discovery", body: "GeM, CPPP, state e-procurement and IREPS tenders in one searchable feed." },
  { icon: Target, title: "Opportunity fit score", body: "Every tender scored 0–100 against your turnover, experience, certifications and geography." },
  { icon: Brain, title: "AI bid / no-bid", body: "Executive summary, risks, win probability and next steps — in seconds." },
  { icon: ShieldCheck, title: "Bid pipeline", body: "Move bids from qualifying to won, with tasks auto-planned back from the deadline." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background bg-gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark />
        <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <div className="max-w-3xl animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Tender Intelligence OS for Indian businesses
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            Stop chasing every tender.<br />
            <span className="bg-gradient-brand bg-clip-text text-transparent">Bid on the ones you'll win.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            BidWin AI tells you which opportunities to pursue, why, what blocks you from qualifying, and what to do before the deadline.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/auth">Get started free <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="animate-rise rounded-2xl border bg-card p-5 shadow-card" style={{ animationDelay: `${100 + i * 70}ms` }}>
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><f.icon className="h-4.5 w-4.5" /></div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
