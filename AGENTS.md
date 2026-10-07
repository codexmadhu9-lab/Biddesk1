<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules

- Signed-in app pages live under `src/routes/_authenticated/` (client-only gate redirects to /auth, and to /onboarding until the profile is onboarded) — keeps auth and onboarding in one place.
- Data reads/writes go through the browser Lovable Cloud client with RLS, defined as query options/helpers in `src/lib/data.ts` — one source of query keys.
- Opportunity fit score is computed deterministically client-side in `src/lib/fit.ts` — instant re-scoring when the profile changes, no AI cost.
- AI tender analysis runs in an authenticated server function (`src/lib/ai.functions.ts`) and is cached per user+tender in `tender_analyses` — avoids repeat AI calls.
- Tender catalogue is seeded sample data; the separate Live Tenders page reads World Bank India open notices via `src/lib/live-tenders.ts` with the same bounded, cached, authenticated server-fetch pattern as live awards — never mixed with sample tenders.
- Competitor, buyer and pricing intelligence consume a shared authenticated World Bank India notice snapshot via query options in `src/lib/data.ts`; `src/lib/live-awards.ts` validates source/body consistency and preserves currencies, missing prices and joint suppliers — excludes sample records and fabricated buyer/estimate metrics. Reports retain the separate sample award history.
- Live award reads use a bounded 100-notice server fetch with a 15-minute per-instance cache, request coalescing and explicit stale fallback, never a protected route loader or continuous polling — limits source load without implying durable ingestion or comprehensive coverage.
- AI Copilot streams through the server route `/api/copilot` (bearer-verified, text stream) because server functions can't return raw streams.
- Company document files live in the private `documents` storage bucket under `<user_id>/...`, with metadata in `company_documents`.

- Shared visual tokens live in `src/styles.css`; the authenticated shell and navigation own application-wide presentation, while Copilot retains its existing chat logic — keeps visual refreshes independent from data and AI behavior.
