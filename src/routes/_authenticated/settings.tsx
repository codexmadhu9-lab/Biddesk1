import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/data";
import { CompanyForm } from "@/components/company-form";
import { PageHeader } from "@/components/tender-ui";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Company profile — BidWin AI" }, { name: "description", content: "Manage your company's eligibility profile." }, { property: "og:title", content: "Company profile — BidWin AI" }, { property: "og:description", content: "Manage your company's eligibility profile." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Settings,
});

function Settings() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  if (!profile) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Company profile" subtitle="Changes immediately re-score every tender." />
      <CompanyForm profile={profile} submitLabel="Save changes" />
    </div>
  );
}
