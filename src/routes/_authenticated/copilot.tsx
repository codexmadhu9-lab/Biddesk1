import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowRight, Square, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/copilot")({
  head: () => ({ meta: [{ title: "AI Copilot — BidWin AI" }, { name: "description", content: "Ask anything about tenders, eligibility, EMD and bid strategy." }, { property: "og:title", content: "AI Copilot — BidWin AI" }, { property: "og:description", content: "Ask anything about tenders, eligibility, EMD and bid strategy." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Copilot,
});

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = [
  "Which 3 open tenders should we prioritise this week, and why?",
  "Which tenders are we not eligible for, and what would fix that?",
  "Explain MSE purchase preference and EMD exemption for our bids.",
  "Draft a checklist for submitting a GeM bid.",
];

function Copilot() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const { data } = await supabase.auth.getSession();
      const res = await fetch("/api/copilot", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token}` },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text() || "Copilot failed");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
      if (!acc) setMsgs([...next, { role: "assistant", content: "I couldn't produce an answer. Please try again." }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsgs([...next, { role: "assistant", content: `⚠ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100svh-7rem)] min-h-[540px] max-w-4xl flex-col gap-6">
      <div className={cn("min-h-0 flex-1 overflow-y-auto pb-4", msgs.length === 0 ? "flex items-center justify-center" : "space-y-6")}>
        {msgs.length === 0 && (
          <div className="w-full max-w-3xl space-y-10 animate-rise sm:space-y-12">
            <div className="space-y-3 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary"><Radar className="h-3.5 w-3.5" />BidWin AI</span>
              <h1 className="text-4xl font-bold">AI Copilot</h1>
              <p className="mx-auto max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">Knows your company profile, your bids and every open tender.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <Button variant="outline" key={s} onClick={() => send(s)} className="group flex h-auto min-h-36 flex-col items-stretch justify-between whitespace-normal rounded-2xl border-border bg-card p-6 text-left text-sm font-medium leading-relaxed text-foreground shadow-card transition-all duration-200 hover:border-primary/45 hover:bg-card hover:text-primary hover:shadow-elevated sm:text-base">
                  <span>{s}</span>
                  <span className="mt-4 flex justify-end"><span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary-soft group-hover:text-primary"><ArrowRight className="h-4 w-4" /></span></span>
                </Button>
              ))}
            </div>
          </div>
        )}
        {msgs.length > 0 && <h1 className="border-b pb-4 text-xl font-semibold">AI Copilot</h1>}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-3 animate-rise", m.role === "user" && "justify-end")}>
             {m.role === "assistant" && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Radar className="h-4 w-4" /></span>}
            <div className={cn("max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed", m.role === "user" ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "pt-1.5")}>
              {m.content || <span className="inline-flex gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" /><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" /></span>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex shrink-0 items-end gap-2 rounded-2xl border bg-card p-2.5 shadow-elevated transition duration-200 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} rows={1}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask about tenders, eligibility, pricing, EMD…"
          aria-label="Message AI Copilot"
          className="max-h-40 min-h-12 min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        {busy ? (
          <Button type="button" variant="secondary" size="icon" onClick={() => abort.current?.abort()} className="h-12 w-12 shrink-0 rounded-xl" aria-label="Stop" title="Stop response"><Square className="h-4 w-4" /></Button>
        ) : (
          <Button disabled={!input.trim()} size="icon" className="h-12 w-12 shrink-0 rounded-xl" aria-label="Send" title="Send message"><ArrowUp className="h-4 w-4" /></Button>
        )}
      </form>
    </div>
  );
}
