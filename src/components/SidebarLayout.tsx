import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import mugLogo from "@/assets/mug-logo.png";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Users,
  BookOpen,
  BarChart2,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const studentNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Available Tests", href: "/dashboard/tests", icon: BookOpen },
  { label: "My Results", href: "/dashboard/results", icon: BarChart2 },
];

const adminNav = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Manage Tests", href: "/admin/tests", icon: ClipboardList },
  { label: "Manage Students", href: "/admin/students", icon: Users },
  { label: "Student Results", href: "/admin/results", icon: BarChart2 },
];

const WONDERTECH_URL = "https://wondertechinnovations.com";

const SidebarContent: React.FC<{
  nav: typeof studentNav;
  location: ReturnType<typeof useLocation>;
  onNavClick?: () => void;
}> = ({ nav, location, onNavClick }) => (
  <>
    <div className="px-5 py-6 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
      <div className="flex items-center gap-3">
        <img src={mugLogo} alt="MUG" className="h-9 w-auto object-contain max-h-9" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        <div>
          <p className="text-xs font-medium leading-tight" style={{ color: "hsl(var(--sidebar-foreground))" }}>
            Methodist University
          </p>
          <p className="text-xs opacity-70" style={{ color: "hsl(var(--sidebar-foreground))" }}>
            Nursing Portal
          </p>
        </div>
      </div>
    </div>
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {nav.map(item => {
        const Icon = item.icon;
        const active = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavClick}
            className={`nav-sidebar-link ${active ? "active" : ""}`}
          >
            <Icon size={16} />
            {item.label}
            {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
          </Link>
        );
      })}
    </nav>
    <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
      <a
        href={WONDERTECH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1 flex-wrap"
        style={{ color: "hsl(var(--sidebar-foreground))" }}
      >
        Made with ♥ by wondertechinnovations
      </a>
    </div>
  </>
);

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, title }) => {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const nav = role === "admin" ? adminNav : studentNav;

  useEffect(() => {
    if (!user?.id) {
      setFullName(null);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setFullName(data?.full_name ?? null));
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  const headerUserBlock = (
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="text-right min-w-0 hidden sm:block">
        <p className="text-xs font-medium text-foreground truncate max-w-[180px] sm:max-w-xs">
          {fullName || user?.email}
        </p>
        {fullName && user?.email && (
          <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs">
            {user.email}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-md transition-colors"
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Mobile: top bar with hamburger + sign out */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-card" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-heading text-base font-medium text-foreground truncate flex-1 mx-3">
          {title ?? "Portal"}
        </h1>
        {headerUserBlock}
      </header>

      {/* Mobile: sidebar overlay — always in DOM for transition */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-foreground/30 transition-opacity duration-300 ease-out ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden
      />
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-56 flex flex-col z-50 transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <span className="text-sm font-medium" style={{ color: "hsl(var(--sidebar-foreground))" }}>Menu</span>
          <button type="button" onClick={closeSidebar} className="p-2 rounded-md opacity-80 hover:opacity-100 transition-opacity" style={{ color: "hsl(var(--sidebar-foreground))" }} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <SidebarContent nav={nav} location={location} onNavClick={closeSidebar} />
      </aside>

      {/* Desktop: sticky sidebar */}
      <aside
        className="hidden md:flex w-56 flex-shrink-0 flex-col sticky top-0 h-screen overflow-y-auto"
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <SidebarContent nav={nav} location={location} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 pt-12 md:pt-0">
        {/* Desktop: sticky header with title + user + logout */}
        <header className="hidden md:flex sticky top-0 z-10 page-header items-center justify-between bg-card">
          <div>
            {title && (
              <h1 className="font-heading text-lg font-medium text-foreground">{title}</h1>
            )}
          </div>
          {headerUserBlock}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
