import { z } from "zod";

const BASE = "https://search.worldbank.org/api/v2/procnotices?format=json&project_ctry_name=India&rows=100&srt=noticedate&order=desc&notice_type=";
export const TENDER_FEED_URLS = ["Invitation%20for%20Bids", "Request%20for%20Expression%20of%20Interest"].map((t) => BASE + t);

export type LiveTender = {
  id: string; title: string; noticeType: string; project: string; projectId: string; reference: string;
  buyer: string; buyerAddress: string; category: string; method: string;
  publishedOn: string; deadline: string | null; deadlineTime: string | null; sourceUrl: string;
};
export type TenderSnapshot = { tenders: LiveTender[]; fetchedAt: string; total: number; scanned: number; excluded: number; stale: boolean; warning: string | null };

const noticeSchema = z.object({
  id: z.string().regex(/^OP\d+$/), notice_type: z.string(), project_ctry_name: z.literal("India"),
  project_id: z.string(), project_name: z.string(), bid_reference_no: z.string().optional(),
  bid_description: z.string().min(1), noticedate: z.string(),
  submission_deadline_date: z.string().optional(), submission_deadline_time: z.string().optional(),
  procurement_group: z.string().optional(), procurement_method_name: z.string().optional(),
  contact_organization: z.string().optional(), contact_address: z.string().optional(),
});
const GROUPS: Record<string, string> = { CW: "Works", GO: "Goods", CS: "Consulting services", NC: "Non-consulting services" };

export function parseTender(input: unknown): LiveTender | null {
  const p = noticeSchema.safeParse(input);
  if (!p.success) return null;
  const n = p.data;
  const deadline = n.submission_deadline_date?.slice(0, 10) ?? null;
  return {
    id: n.id, title: n.bid_description.trim(), noticeType: n.notice_type, project: n.project_name, projectId: n.project_id,
    reference: n.bid_reference_no?.trim() || "Not published",
    buyer: n.contact_organization?.trim() || "Not published", buyerAddress: n.contact_address?.trim() ?? "",
    category: GROUPS[n.procurement_group ?? ""] ?? "Other", method: n.procurement_method_name ?? "Not published",
    publishedOn: n.noticedate, deadline: deadline && Number.isFinite(Date.parse(deadline)) ? deadline : null,
    deadlineTime: n.submission_deadline_time ?? null,
    sourceUrl: `https://projects.worldbank.org/en/projects-operations/procurement-detail/${n.id}`,
  };
}

const pageSchema = z.object({ total: z.union([z.string(), z.number()]), procnotices: z.array(z.unknown()) });
export function normalizeTenders(payloads: unknown[], now = new Date().toISOString()): TenderSnapshot {
  const pages = payloads.map((p) => pageSchema.parse(p));
  const raw = pages.flatMap((p) => p.procnotices);
  const tenders = [...new Map(raw.map(parseTender).filter((t): t is LiveTender => t !== null).map((t) => [t.id, t])).values()]
    .sort((a, b) => Date.parse(b.publishedOn) - Date.parse(a.publishedOn));
  return { tenders, fetchedAt: now, total: pages.reduce((s, p) => s + Number(p.total), 0), scanned: raw.length, excluded: raw.length - tenders.length, stale: false, warning: null };
}
