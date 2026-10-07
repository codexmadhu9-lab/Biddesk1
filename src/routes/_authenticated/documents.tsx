import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { daysUntil, docsQuery, type CompanyDoc } from "@/lib/data";
import { EmptyState, PageHeader } from "@/components/tender-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Document Vault — BidWin AI" }, { name: "description", content: "Company documents for bids, with expiry tracking." }, { property: "og:title", content: "Document Vault — BidWin AI" }, { property: "og:description", content: "Company documents for bids, with expiry tracking." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(docsQuery); },
  component: Documents,
});

const TYPES = ["GST Certificate", "PAN", "Udyam / MSME", "ISO Certificate", "Audited Balance Sheet", "ITR", "Work Completion Certificate", "OEM Authorisation", "Power of Attorney", "Other"];

function expiryChip(date: string | null) {
  if (!date) return { label: "No expiry", cls: "bg-secondary text-secondary-foreground" };
  const d = daysUntil(date);
  if (d < 0) return { label: "Expired", cls: "bg-destructive-soft text-destructive" };
  if (d <= 30) return { label: `Expires in ${d}d`, cls: "bg-warning-soft text-warning-foreground" };
  return { label: new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), cls: "bg-success-soft text-success" };
}

function Documents() {
  const { data: docs } = useSuspenseQuery(docsQuery);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(TYPES[0]!);
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      let file_path: string | null = null;
      if (file) {
        file_path = `${u.user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("documents").upload(file_path, file);
        if (error) throw error;
      }
      const { error } = await supabase.from("company_documents").insert({
        name: name || file?.name || type, doc_type: type, expiry_date: expiry || null, file_path, file_size: file?.size ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setExpiry(""); setFile(null); if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["company_documents"] }); toast.success("Document added");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const del = useMutation({
    mutationFn: async (d: CompanyDoc) => {
      if (d.file_path) await supabase.storage.from("documents").remove([d.file_path]);
      const { error } = await supabase.from("company_documents").delete().eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["company_documents"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  async function download(d: CompanyDoc) {
    if (!d.file_path) return;
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  }

  const expiring = docs.filter((d) => d.expiry_date && daysUntil(d.expiry_date) <= 30).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Document vault" subtitle={`${docs.length} documents${expiring ? ` · ${expiring} expired or expiring within 30 days` : ""}`} />
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="mb-6 grid gap-3 rounded-2xl border bg-card p-4 shadow-card md:grid-cols-[1fr_200px_160px_1fr_auto] md:items-end">
        <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GST certificate – Maharashtra" /></div>
        <div className="space-y-1.5"><Label>Type</Label>
          <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5"><Label>Expiry</Label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>File (optional, max 20 MB)</Label><Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <Button disabled={add.isPending}><Upload /> {add.isPending ? "Uploading…" : "Add"}</Button>
      </form>
      {docs.length === 0 ? <EmptyState title="Your vault is empty" body="Upload GST, PAN, ISO, balance sheets and completion certificates once — reuse them in every bid." /> : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          {docs.map((d) => {
            const chip = expiryChip(d.expiry_date);
            return (
              <div key={d.id} className="flex items-center gap-4 border-b p-4 last:border-0">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><FileText className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{d.name}</div><div className="text-xs text-muted-foreground">{d.doc_type}{d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : " · no file"}</div></div>
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", chip.cls)}>{chip.label}</span>
                {d.file_path && <Button variant="ghost" size="icon" onClick={() => download(d)} aria-label="Download"><Download /></Button>}
                <Button variant="ghost" size="icon" onClick={() => del.mutate(d)} aria-label="Delete"><Trash2 /></Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
