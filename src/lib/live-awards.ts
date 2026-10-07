import { parseHTML } from "linkedom";
import { z } from "zod";

export const AWARD_FEED_URL = "https://search.worldbank.org/api/v2/procnotices?format=json&project_ctry_name=India&notice_type=Contract%20Award&rows=100&srt=noticedate&order=desc";
export type LiveAward = {
  id: string; title: string; project: string; projectId: string; reference: string;
  supplier: string; amount: number | null; currency: string | null;
  awardedOn: string; publishedOn: string; method: string; category: string; sourceUrl: string;
};
export type AwardSnapshot = { awards: LiveAward[]; fetchedAt: string; total: number; scanned: number; excluded: number; stale: boolean; warning: string | null };
const noticeSchema = z.object({
  id: z.string(), notice_type: z.string(), project_ctry_name: z.string(), project_id: z.string(),
  project_name: z.string(), bid_reference_no: z.string(), bid_description: z.string(),
  noticedate: z.string(), notice_text: z.string(), procurement_group: z.string().optional(),
  procurement_method_name: z.string().optional(),
});
function text(html: string) {
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  for (const br of document.querySelectorAll("br")) br.replaceWith("\n");
  return { document, plain: document.body.textContent ?? "" };
}
export function parseAward(input: unknown): LiveAward | null {
  const parsed = noticeSchema.safeParse(input);
  if (!parsed.success) return null;
  const n = parsed.data;
  if (n.project_ctry_name !== "India" || n.notice_type !== "Contract Award" || !/^OP\d+$/.test(n.id)) return null;
  const { plain } = text(n.notice_text);
  // Reject upstream records whose index metadata and notice body disagree.
  const project = plain.match(/Project:\s*(P\d+)/)?.[1];
  const reference = plain.match(/Bid\/Contract Reference No:\s*([^\n]+)/)?.[1]?.trim();
  if (project !== n.project_id || reference !== n.bid_reference_no.trim()) return null;
  const start = n.notice_text.indexOf("Awarded Bidder(s):");
  if (start < 0) return null;
  const end = ["Beneficial Ownership Details", "Evaluated Bidder(s):", "Rejected Bidder(s):"].map((s) => n.notice_text.indexOf(s, start)).filter((v) => v > start);
  const section = n.notice_text.slice(start, end.length ? Math.min(...end) : undefined);
  const { document, plain: awardText } = text(section);
  const suppliers = [...new Set(Array.from(document.querySelectorAll("b")).map((b) => b.textContent?.trim() ?? "").filter((s) => /\(\d+\)$/.test(s)).map((s) => s.replace(/\s*\(\d+\)$/, "")))];
  if (!suppliers.length) return null;
  const prices = [...awardText.matchAll(/Signed Contract price\s*([A-Z]{3})\s+([\d,]+(?:\.\d+)?)/gi)];
  // Never split or duplicate a joint contract amount across its suppliers.
  const price = prices.length === 1 ? prices[0] : undefined;
  const amount = price ? Number(price[2]?.replaceAll(",", "")) : null;
  const date = plain.match(/Date Notification of Award Issued\s*\(YYYY\/MM\/DD\)\s*(\d{4}\/\d{2}\/\d{2})/)?.[1]?.replaceAll("/", "-");
  if (!date || !Number.isFinite(Date.parse(date)) || (amount !== null && (!Number.isFinite(amount) || amount <= 0))) return null;
  return {
    id: n.id, title: n.bid_description, project: n.project_name, projectId: n.project_id, reference: n.bid_reference_no,
    supplier: suppliers.join(" / "), amount, currency: price?.[1]?.toUpperCase() ?? null,
    awardedOn: date, publishedOn: n.noticedate, method: n.procurement_method_name ?? "Not published",
    category: ({ CW: "Works", GO: "Goods", CS: "Consulting services", NC: "Non-consulting services" } as Record<string, string>)[n.procurement_group ?? ""] ?? "Other",
    sourceUrl: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}`,
  };
}
export function normalizeAwards(payload: unknown, now = new Date().toISOString()): AwardSnapshot {
  const data = z.object({ total: z.union([z.string(), z.number()]), procnotices: z.array(z.unknown()) }).parse(payload);
  const awards = [...new Map(data.procnotices.map(parseAward).filter((a): a is LiveAward => a !== null).map((a) => [a.id, a])).values()].sort((a, b) => b.awardedOn.localeCompare(a.awardedOn));
  return { awards, fetchedAt: now, total: Number(data.total), scanned: data.procnotices.length, excluded: data.procnotices.length - awards.length, stale: false, warning: null };
}
export function money(amount: number | null, currency: string | null) {
  if (amount === null || !currency) return "Not published";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b), pos = (s.length - 1) * q;
  const a = s[Math.floor(pos)], b = s[Math.min(Math.floor(pos) + 1, s.length - 1)];
  return a === undefined || b === undefined ? null : a + (b - a) * (pos - Math.floor(pos));
}