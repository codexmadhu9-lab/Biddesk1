import { Link, useRouterState, type LinkProps } from "@tanstack/react-router";
import {
  LayoutDashboard, Search, Sparkles, Bookmark, KanbanSquare, Building2,
  Users, Landmark, IndianRupee, FileText, Banknote, Bell, Bot, BarChart3, Radio,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "./brand";
import { UserMenu } from "./app-header";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Discover Tenders", url: "/discover", icon: Search },
  { title: "Live Tenders", url: "/live-tenders", icon: Radio },
  { title: "AI Recommended", url: "/recommended", icon: Sparkles },
  { title: "Watchlist", url: "/watchlist", icon: Bookmark },
  { title: "Bid Pipeline", url: "/bids", icon: KanbanSquare },
  { title: "AI Copilot", url: "/copilot", icon: Bot },
] as const;

const intel = [
  { title: "Competitor Intelligence", url: "/competitors", icon: Users },
  { title: "Buyer Intelligence", url: "/buyers", icon: Landmark },
  { title: "Pricing Intelligence", url: "/pricing", icon: IndianRupee },
  { title: "Reports", url: "/reports", icon: BarChart3 },
] as const;

const ops = [
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "EMD & Bank Guarantees", url: "/guarantees", icon: Banknote },
  { title: "Alerts", url: "/alerts", icon: Bell },
  { title: "Company Profile", url: "/settings", icon: Building2 },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-6 py-6 group-data-[collapsible=icon]:px-2">
        {collapsed ? <BrandMark className="[&>span]:hidden" /> : <BrandMark className="text-sidebar-foreground" />}
      </SidebarHeader>
      <SidebarContent className="gap-5 px-3 pb-5 group-data-[collapsible=icon]:px-0">
        <Group label="Workspace" items={main} path={path} />
        <Group label="Intelligence" items={intel} path={path} />
        <Group label="Operations" items={ops} path={path} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2"><UserMenu sidebar /></SidebarFooter>
    </Sidebar>
  );
}

type Item = { title: string; url: NonNullable<LinkProps["to"]>; icon: React.ComponentType };
function Group({ label, items, path }: { label: string; items: readonly Item[]; path: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="mb-2 text-[11px] font-semibold uppercase text-sidebar-foreground/55">{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((i) => (
            <SidebarMenuItem key={i.url}>
              <SidebarMenuButton asChild isActive={path.startsWith(i.url)} tooltip={i.title} className="h-10 border border-transparent px-3 text-[13px] transition-colors duration-200 data-[active=true]:border-sidebar-primary/20 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary">
                <Link to={i.url}><i.icon /><span>{i.title}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
