import type { Profile, Tender } from "./data";

export type FitResult = {
  score: number;
  checks: { label: string; ok: boolean | null; detail: string }[];
};

/** Deterministic opportunity-fit score (0–100) from company profile vs tender eligibility. */
export function computeFit(t: Tender, p: Profile | null | undefined): FitResult {
  if (!p) return { score: 0, checks: [] };
  const checks: FitResult["checks"] = [];
  let score = 0;

  const catOk = p.categories.includes(t.category);
  score += catOk ? 30 : 0;
  checks.push({ label: "Category match", ok: catOk, detail: catOk ? `You operate in ${t.category}` : `${t.category} not in your categories` });

  const stateOk = p.states.length === 0 || p.states.includes(t.state);
  score += stateOk ? 10 : 3;
  checks.push({ label: "Geography", ok: stateOk, detail: stateOk ? `${t.state} is in your service area` : `${t.state} is outside your service area` });

  const turnOk = Number(p.annual_turnover_cr) >= Number(t.min_turnover_cr);
  score += turnOk ? 20 : Math.min(15, (Number(p.annual_turnover_cr) / Math.max(1, Number(t.min_turnover_cr))) * 15);
  checks.push({ label: "Turnover", ok: turnOk, detail: `Need ₹${t.min_turnover_cr} Cr · You ₹${p.annual_turnover_cr} Cr` });

  const expOk = p.years_in_business >= t.min_experience_yrs;
  score += expOk ? 15 : 5;
  checks.push({ label: "Experience", ok: expOk, detail: `Need ${t.min_experience_yrs} yrs · You ${p.years_in_business} yrs` });

  const missing = t.required_certs.filter((c) => !p.certifications.includes(c));
  const certScore = t.required_certs.length ? (1 - missing.length / t.required_certs.length) * 20 : 20;
  score += certScore;
  checks.push({ label: "Certifications", ok: missing.length === 0, detail: missing.length ? `Missing: ${missing.join(", ")}` : "All required certifications held" });

  const emd = p.is_msme && t.msme_emd_exempt;
  score += emd ? 5 : 2;
  checks.push({ label: "EMD", ok: emd ? true : null, detail: emd ? "MSME EMD exemption applies" : `EMD ₹${t.emd_lakh} L payable` });

  return { score: Math.round(Math.min(100, score)), checks };
}

export function fitTone(score: number) {
  if (score >= 75) return "success" as const;
  if (score >= 50) return "warning" as const;
  return "destructive" as const;
}
