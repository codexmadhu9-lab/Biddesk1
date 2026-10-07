import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getLiveAwards } from "./live-awards.functions";
import { getLiveTenders } from "./live-tenders.functions";

export type Tender = Tables<"tenders">;
export type Profile = Tables<"profiles">;
export type Bid = Tables<"bids">;
export type BidTask = Tables<"bid_tasks">;

export const BID_STAGES = [
  "Qualifying",
  "Preparing",
  "Approval",
  "Submitted",
  "Won",
  "Lost",
] as const;

export const CATEGORIES = [
  "Solar & Renewable",
  "Electrical",
  "Civil Construction",
  "IT & Software",
  "IT Hardware",
  "Medical & Healthcare",
  "Facility Management",
  "Water & Pipes",
  "Furniture",
];

export const STATES = [
  "Maharashtra", "Uttar Pradesh", "Gujarat", "Karnataka", "Tamil Nadu", "Rajasthan",
  "Delhi", "West Bengal", "Telangana", "Madhya Pradesh", "Odisha",
];

export const CERTIFICATIONS = [
  "ISO 9001", "ISO 14001", "ISO 27001", "CMMI Level 3", "BIS Certification", "BEE Star Rating",
  "MNRE Empanelment", "OEM Authorisation", "WHO-GMP", "CDSCO Licence",
  "Class-AA Contractor Registration", "Electrical Contractor Licence Class-A", "BIFMA / IS compliance",
];

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const tendersQuery = queryOptions({
  queryKey: ["tenders"],
  queryFn: async () => {
    const { data, error } = await supabase.from("tenders").select("*").order("deadline");
    if (error) throw error;
    return data;
  },
});

export const tenderQuery = (id: string) =>
  queryOptions({
    queryKey: ["tender", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenders").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const watchlistQuery = queryOptions({
  queryKey: ["watchlist"],
  queryFn: async () => {
    const { data, error } = await supabase.from("watchlist").select("tender_id");
    if (error) throw error;
    return data.map((w) => w.tender_id);
  },
});

export const bidsQuery = queryOptions({
  queryKey: ["bids"],
  queryFn: async () => {
    const { data, error } = await supabase.from("bids").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const tasksQuery = (bidId: string) =>
  queryOptions({
    queryKey: ["tasks", bidId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bid_tasks").select("*").eq("bid_id", bidId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

export const analysisQuery = (tenderId: string) =>
  queryOptions({
    queryKey: ["analysis", tenderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tender_analyses").select("analysis").eq("tender_id", tenderId).maybeSingle();
      if (error) throw error;
      return (data?.analysis ?? null) as TenderAnalysis | null;
    },
  });

export type TenderAnalysis = {
  summary: string;
  decision: "Bid" | "Bid with caution" | "No Bid";
  win_probability: number;
  key_requirements: string[];
  risks: string[];
  strengths: string[];
  next_steps: string[];
};

export async function toggleWatch(tenderId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase.from("watchlist").delete().eq("tender_id", tenderId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("watchlist").insert({ tender_id: tenderId });
    if (error) throw error;
  }
}

export async function startBid(tender: Tender) {
  const { data, error } = await supabase.from("bids").insert({ tender_id: tender.id }).select().single();
  if (error) throw error;
  const due = (days: number) => {
    const d = new Date(tender.deadline);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };
  await supabase.from("bid_tasks").insert([
    { bid_id: data.id, title: "Review tender document & corrigenda", assignee: "Tender Manager", due_date: due(10) },
    { bid_id: data.id, title: "Prepare technical compliance sheet", assignee: "Technical Team", due_date: due(6) },
    { bid_id: data.id, title: "Arrange EMD / bid security", assignee: "Finance", due_date: due(5) },
    { bid_id: data.id, title: "Finalise price bid (BOQ)", assignee: "Commercial Team", due_date: due(3) },
    { bid_id: data.id, title: "Management approval & digital signing", assignee: "Approver", due_date: due(1) },
  ]);
  return data;
}

export const inr = (cr: number) =>
  cr >= 1 ? `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr` : `₹${(cr * 100).toFixed(1)} L`;

export function daysLeft(deadline: string) {
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

export type Competitor = Tables<"competitors">;
export type Award = Tables<"awards">;
export type CompanyDoc = Tables<"company_documents">;
export type Guarantee = Tables<"guarantees">;
export type AlertRule = Tables<"alert_rules">;

const listQuery = <T extends "competitors" | "awards" | "company_documents" | "guarantees" | "alert_rules">(table: T, order: string, ascending = true) =>
  queryOptions({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order(order, { ascending });
      if (error) throw error;
      return data as Tables<T>[];
    },
  });

export const competitorsQuery = listQuery("competitors", "name");
export const awardsQuery = listQuery("awards", "awarded_on", false);
export const liveAwardsQuery = queryOptions({
  queryKey: ["live-awards", "world-bank", "India"],
  queryFn: () => getLiveAwards(),
  staleTime: 15 * 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
});
export const liveTendersQuery = queryOptions({
  queryKey: ["live-tenders", "world-bank", "India"],
  queryFn: () => getLiveTenders(),
  staleTime: 15 * 60 * 1000,
  retry: false,
  refetchOnWindowFocus: false,
});
export const docsQuery = listQuery("company_documents", "created_at", false);
export const guaranteesQuery = listQuery("guarantees", "expiry_date");
export const alertRulesQuery = listQuery("alert_rules", "created_at", false);

export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
