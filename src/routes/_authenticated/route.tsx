import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { HeaderSearch, ThemeToggle } from "@/components/app-header";
import { profileQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    const profile = await context.queryClient.ensureQueryData(profileQuery);
    if (!profile?.onboarded && location.pathname !== "/onboarding") throw redirect({ to: "/onboarding" });
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider className="executive-shell">
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b bg-card/80 px-4 backdrop-blur-md md:px-8">
            <SidebarTrigger />
            <HeaderSearch />
            <div className="ml-auto"><ThemeToggle /></div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
