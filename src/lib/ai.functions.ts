import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TenderAnalysis } from "./data";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzeTender = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("tenders").select("*").eq("id", data.tenderId).single(),
      supabase.from("profiles").select("*").eq("id", userId).single(),
    ]);
    if (!t) throw new Error("Tender not found");

    const prompt = `Tender:
Title: ${t.title}
Buyer: ${t.buyer} (${t.ministry}), ${t.city}, ${t.state}. Source: ${t.source}
Value: ₹${t.value_cr} Cr, EMD ₹${t.emd_lakh} lakh, MSME EMD exemption: ${t.msme_emd_exempt}
Deadline: ${t.deadline}
Scope: ${t.description}
Eligibility: min turnover ₹${t.min_turnover_cr} Cr, min ${t.min_experience_yrs} yrs experience, certifications: ${t.required_certs.join(", ")}
Documents: ${t.documents.join(", ")}

Bidder company:
${p ? `${p.company_name}, industry ${p.industry}, categories ${p.categories.join(", ")}, states ${p.states.join(", ")}, turnover ₹${p.annual_turnover_cr} Cr, ${p.years_in_business} yrs, certifications ${p.certifications.join(", ")}, MSME: ${p.is_msme}` : "Unknown"}

Act as a senior Indian government tender bid consultant. Give an executive analysis and bid/no-bid recommendation.`;

    const arr = { type: "array", items: { type: "string" } };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Lovable-API-Key": process.env["LOVABLE_API_KEY"]!,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [{ role: "user", content: prompt }],
        reasoning: { effort: "low" },
        store: false,
        stream: true,
        text: {
          format: {
            type: "json_schema",
            name: "report",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string", description: "3-4 sentence executive summary" },
                decision: { type: "string", enum: ["Bid", "Bid with caution", "No Bid"] },
                win_probability: { type: "number", description: "0-100" },
                key_requirements: arr,
                strengths: arr,
                risks: arr,
                next_steps: arr,
              },
              required: ["summary", "decision", "win_probability", "key_requirements", "strengths", "risks", "next_steps"],
            },
          },
        },
      }),
    });
    if (res.status === 429) throw new Error("AI is busy right now — please try again in a minute.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok || !res.body) {
      console.error("AI error", res.status, await res.text());
      throw new Error("AI analysis failed. Please try again.");
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let args = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") args += ev.delta;
        } catch { /* ignore partial */ }
      }
    }
    if (!args) throw new Error("AI returned no analysis.");
    const analysis = JSON.parse(args) as TenderAnalysis;
    await supabase.from("tender_analyses").upsert(
      { user_id: userId, tender_id: t.id, analysis },
      { onConflict: "user_id,tender_id" },
    );
    return analysis as TenderAnalysis;
  });
