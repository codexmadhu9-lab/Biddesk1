import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CERTIFICATIONS, STATES, type Profile } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button" key={o}
            onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={cn("rounded-lg border px-3 py-1.5 text-sm transition", on ? "border-primary bg-primary-soft font-semibold text-primary" : "bg-card hover:bg-muted")}
          >{o}</button>
        );
      })}
    </div>
  );
}

export function CompanyForm({ profile, submitLabel, onDone }: { profile: Profile; submitLabel: string; onDone?: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    full_name: profile.full_name ?? "",
    company_name: profile.company_name ?? "",
    industry: profile.industry ?? "",
    categories: profile.categories,
    states: profile.states,
    annual_turnover_cr: String(profile.annual_turnover_cr ?? 0),
    years_in_business: String(profile.years_in_business ?? 0),
    certifications: profile.certifications,
    is_msme: profile.is_msme,
  });
  const m = useMutation({
    mutationFn: async () => {
      if (!f.company_name.trim()) throw new Error("Company name is required");
      if (f.categories.length === 0) throw new Error("Pick at least one category");
      const { error } = await supabase.from("profiles").update({
        ...f,
        annual_turnover_cr: Number(f.annual_turnover_cr) || 0,
        years_in_business: Number(f.years_in_business) || 0,
        onboarded: true,
      }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Company profile saved"); onDone?.(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const section = "rounded-2xl border bg-card p-6 shadow-card space-y-4";
  return (
    <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-5">
      <div className={section}>
        <h2 className="font-bold">Company</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5"><Label>Your name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Company name</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} placeholder="e.g. Shakti Infra Pvt Ltd" /></div>
          <div className="space-y-1.5"><Label>Industry</Label><Input value={f.industry} onChange={(e) => setF({ ...f, industry: e.target.value })} placeholder="e.g. EPC contractor" /></div>
          <div className="space-y-1.5"><Label>Annual turnover (₹ Cr)</Label><Input type="number" step="0.1" value={f.annual_turnover_cr} onChange={(e) => setF({ ...f, annual_turnover_cr: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Years in business</Label><Input type="number" value={f.years_in_business} onChange={(e) => setF({ ...f, years_in_business: e.target.value })} /></div>
          <label className="flex items-center gap-3 self-end rounded-lg border px-3 py-2"><Switch checked={f.is_msme} onCheckedChange={(v) => setF({ ...f, is_msme: v })} /><span className="text-sm font-medium">Udyam-registered MSME</span></label>
        </div>
      </div>
      <div className={section}><h2 className="font-bold">Categories you supply</h2><Chips options={CATEGORIES} value={f.categories} onChange={(v) => setF({ ...f, categories: v })} /></div>
      <div className={section}><h2 className="font-bold">States you serve <span className="text-sm font-normal text-muted-foreground">(leave empty for pan-India)</span></h2><Chips options={STATES} value={f.states} onChange={(v) => setF({ ...f, states: v })} /></div>
      <div className={section}><h2 className="font-bold">Certifications & registrations</h2><Chips options={CERTIFICATIONS} value={f.certifications} onChange={(v) => setF({ ...f, certifications: v })} /></div>
      <Button size="lg" disabled={m.isPending}>{m.isPending ? "Saving…" : submitLabel}</Button>
    </form>
  );
}
