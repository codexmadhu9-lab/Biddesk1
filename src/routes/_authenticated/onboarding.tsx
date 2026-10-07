import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/data";
import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/tender-ui";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your company — BidWin AI" }, { name: "description", content: "Tell us about your company so we can match tenders you can win." }, { property: "og:title", content: "Set up your company — BidWin AI" }, { property: "og:description", content: "Tell us about your company so we can match tenders you can win." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const navigate = useNavigate();
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Let's set up your bid profile" subtitle="We use this to score every tender for eligibility and fit. Takes about a minute." />
      <CompanyForm profile={profile} submitLabel="Find my tenders →" onDone={() => navigate({ to: "/dashboard" })} />
    </div>
  );
}
