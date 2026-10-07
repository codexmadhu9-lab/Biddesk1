import { describe, expect, it } from "vitest";
import { normalizeAwards, parseAward, quantile } from "@/lib/live-awards";

const notice = {
  id: "OP123", notice_type: "Contract Award", project_ctry_name: "India", project_id: "P123", project_name: "Project", bid_reference_no: "IN-123", bid_description: "Works", noticedate: "01-Oct-2026", procurement_group: "CW",
  notice_text: "<b>Project:</b>P123-Project<br/><b>Bid/Contract Reference No:</b>IN-123<br/><b>Date Notification of Award Issued</b><br/>(YYYY/MM/DD)<br/>2026/09/25<br/><b>Awarded Bidder(s):</b><b>Supplier One (123)</b><br/>Signed Contract price<br/>INR 123456.00<br/><b>Beneficial Ownership Details</b><b>Unrelated name (999)</b>",
};
describe("Official award parsing", () => {
  it("extracts original currency, award date and supplier without ownership data", () => {
    expect(parseAward(notice)).toMatchObject({ supplier: "Supplier One", amount: 123456, currency: "INR", awardedOn: "2026-09-25", category: "Works" });
  });
  it("rejects non-India, non-award and mismatched index/body records", () => {
    expect(parseAward({ ...notice, project_ctry_name: "Ghana" })).toBeNull();
    expect(parseAward({ ...notice, notice_type: "Invitation for Bids" })).toBeNull();
    expect(parseAward({ ...notice, project_id: "P999" })).toBeNull();
    expect(parseAward({ ...notice, bid_reference_no: "OTHER" })).toBeNull();
  });
  it("preserves missing or multiple ambiguous contract prices as null", () => {
    expect(parseAward({ ...notice, notice_text: notice.notice_text.replace("INR 123456.00", "INR") })?.amount).toBeNull();
    expect(parseAward({ ...notice, notice_text: notice.notice_text.replace("INR 123456.00", "INR 123456.00<br/>Signed Contract price<br/>INR 99.00") })?.amount).toBeNull();
  });
  it("keeps joint suppliers together without duplicating contract amounts", () => {
    const a = parseAward({ ...notice, notice_text: notice.notice_text.replace("Signed Contract price", "<b>Supplier Two (456)</b><br/>Signed Contract price") });
    expect(a?.supplier).toBe("Supplier One / Supplier Two");
    expect(a?.amount).toBe(123456);
  });
  it("deduplicates notices and computes quantiles safely", () => {
    expect(normalizeAwards({ total: "3", procnotices: [notice, notice, {}] }).awards).toHaveLength(1);
    expect(quantile([], .5)).toBeNull();
    expect(quantile([10, 20, 30], .5)).toBe(20);
  });
});