import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HeaderSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      className="relative hidden w-full max-w-xl md:block"
      onSubmit={(e) => { e.preventDefault(); navigate({ to: "/discover", search: { q } }); }}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search tenders, buyers, categories…"
        className="h-10 w-full rounded-full border border-transparent bg-muted pl-9 pr-3 text-sm outline-none transition focus:bg-card focus:border-primary focus:ring-2 focus:ring-ring/20"
      />
    </form>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggleDark = () => { document.documentElement.classList.toggle("dark"); setDark(!dark); };
  return <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle dark mode" title="Toggle dark mode">{dark ? <Sun /> : <Moon />}</Button>;
}

export function UserMenu({ sidebar = false }: { sidebar?: boolean }) {
  const { data: profile } = useQuery(profileQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const initials = (profile?.full_name ?? "U").split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-w-0 w-full">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={sidebar ? "h-auto w-full justify-start gap-3 rounded-xl border border-sidebar-border bg-sidebar-border/30 p-3 text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0" : "h-auto gap-3 px-2 py-1"}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{initials}</span>
          <span className="min-w-0 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-semibold">{profile?.full_name}</span>
            <span className="block truncate pt-1 text-xs opacity-65">{profile?.company_name}</span>
          </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{profile?.company_name ?? "Account"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>Company profile</DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}><LogOut /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
