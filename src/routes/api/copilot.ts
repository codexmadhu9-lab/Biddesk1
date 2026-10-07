import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).min(1).max(40),
});

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/api/copilot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const supabase = userClient(token);
        const { data: u } = await supabase.auth.getUser(token);
        if (!u.user) return new Response("Unauthorized", { status: 401 });

        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid request", { status: 400 });

        const [{ data: profile }, { data: tenders }, { data: bids }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
          supabase.from("tenders").select("id,ref_no,title,buyer,category,state,value_cr,emd_lakh,deadline,min_turnover_cr,min_experience_yrs,required_certs").gte("deadline", new Date().toISOString()).order("deadline").limit(60),
          supabase.from("bids").select("tender_id,stage"),
        ]);

        const instructions = `You are BidWin Copilot, an expert Indian government procurement and bid consultant (GeM, CPPP, state e-procurement, GFR 2017, MSE preference policy, EMD/BG norms).
Be concise and practical. Use ₹ and Indian numbering (lakh/crore). Use short markdown-free paragraphs and simple "-" bullet lists.
Company profile: ${JSON.stringify(profile ?? {})}
User's bids: ${JSON.stringify(bids ?? [])}
Open tenders (value in ₹ Cr, EMD in ₹ lakh): ${JSON.stringify(tenders ?? [])}
When recommending tenders, cite their title and ref_no. Never invent tenders that aren't listed.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: {
            "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
            "X-Lovable-AIG-SDK": "fetch",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions,
            input: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
            reasoning: { effort: "low" },
            store: false,
            stream: true,
          }),
        });
        if (!upstream.ok || !upstream.body) {
          const msg = upstream.status === 429 ? "Copilot is busy — try again in a minute."
            : upstream.status === 402 ? "AI credits are exhausted for this workspace."
            : "Copilot is unavailable right now.";
          console.error("copilot upstream", upstream.status, await upstream.text().catch(() => ""));
          return new Response(msg, { status: upstream.status === 403 ? 403 : upstream.status >= 500 ? 502 : upstream.status });
        }

        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        let buf = "";
        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) return controller.close();
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const p = line.slice(5).trim();
              if (!p || p === "[DONE]") continue;
              try {
                const ev = JSON.parse(p);
                if (ev.type === "response.output_text.delta") controller.enqueue(enc.encode(ev.delta));
              } catch { /* partial line */ }
            }
          },
          cancel() { reader.cancel(); },
        });
        const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        const runId = upstream.headers.get("X-Lovable-AIG-Run-ID");
        if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
        return new Response(stream, { headers });
      },
    },
  },
});
