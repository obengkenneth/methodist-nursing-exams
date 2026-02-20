import React, { useEffect, useRef, useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Menu,
  User,
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
  collapsed?: boolean;
}> = ({ nav, location, onNavClick, collapsed }) => (
  <>
    <div
      className={`border-b flex-shrink-0 ${collapsed ? "px-0 py-4 justify-center" : "px-5 py-6"}`}
      style={{ borderColor: "hsl(var(--sidebar-border))" }}
    >
      <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
        <img
          src={mugLogo}
          alt="MUG"
          className={`object-contain ${collapsed ? "h-8 w-8" : "h-9 max-h-9"}`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        {!collapsed && (
          <div>
            <p className="text-xs font-medium leading-tight" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              Methodist University
            </p>
            <p className="text-xs opacity-70" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              Nursing Portal
            </p>
          </div>
        )}
      </div>
    </div>
    <nav className={`flex-1 py-4 space-y-0.5 ${collapsed ? "px-2 flex flex-col items-center" : "px-3"}`}>
      {nav.map(item => {
        const Icon = item.icon;
        const active = location.pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavClick}
            title={collapsed ? item.label : undefined}
            className={`nav-sidebar-link ${active ? "active" : ""} ${collapsed ? "justify-center p-2.5 w-10 h-10 rounded-lg" : ""}`}
          >
            <Icon size={20} />
            {!collapsed && (
              <>
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </>
            )}
          </Link>
        );
      })}
    </nav>
    <div
      className={`border-t flex-shrink-0 ${collapsed ? "px-0 py-3 justify-center" : "px-3 py-4"}`}
      style={{ borderColor: "hsl(var(--sidebar-border))" }}
    >
      <a
        href={WONDERTECH_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Made with ♥ by wondertechinnovations"
        className={`opacity-70 hover:opacity-100 transition-opacity flex items-center ${collapsed ? "justify-center text-base" : "gap-1 flex-wrap text-xs"}`}
        style={{ color: "hsl(var(--sidebar-foreground))" }}
      >
        {collapsed ? <span className="text-red-500">♥</span> : (
          <>Made with <span className="text-red-500 opacity-100">♥</span> by WonderTech Innovations</>
        )}
      </a>
    </div>
  </>
);

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, title }) => {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const nav = role === "admin" ? adminNav : studentNav;

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  };

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  const displayName = fullName || user?.email || "User";
  const displayEmail = fullName && user?.email ? user.email : null;

  const headerUserBlock = (
    <div className="relative flex items-center flex-shrink-0" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setUserMenuOpen((open) => !open)}
        className="hidden sm:flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-card border border-primary/25 hover:border-primary/40 transition-colors text-left min-w-0 shadow-sm"
        aria-expanded={userMenuOpen}
        aria-haspopup="true"
      >
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <User size={14} />
        </span>
        <div className="min-w-0 hidden sm:block">
          <p className="text-xs font-medium text-foreground truncate max-w-[120px] leading-tight">
            {displayName}
          </p>
          {displayEmail && (
            <p className="text-[11px] text-muted-foreground truncate max-w-[120px] leading-tight">
              {displayEmail}
            </p>
          )}
        </div>
        <ChevronDown size={14} className={`flex-shrink-0 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {userMenuOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-card py-2 shadow-lg z-50">
          <div className="px-3 py-2.5 border-b border-border">
            <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
            {displayEmail && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{displayEmail}</p>
            )}
          </div>
          <div className="py-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Fallback when no dropdown (e.g. narrow): show sign out only */}
      <div className="flex items-center gap-2 sm:hidden">
        <span className="text-xs text-foreground truncate max-w-[100px]">{displayName}</span>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-muted rounded-md"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="sidebar-layout flex min-h-screen">
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

      {/* Desktop/tablet: collapsible sidebar (narrow = icons + logo only) */}
      <aside
        className={`hidden md:flex flex-shrink-0 flex-col sticky top-0 h-screen overflow-y-auto border-r border-[hsl(var(--sidebar-border))] transition-[width] duration-300 ease-out ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
        style={{ background: "hsl(var(--sidebar-background))" }}
      >
        <SidebarContent nav={nav} location={location} collapsed={sidebarCollapsed} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 pt-12 md:pt-0">
        {/* Desktop: sticky header with menu + title + user */}
        <header className="hidden md:flex sticky top-0 z-10 page-header items-center justify-between gap-4 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors flex-shrink-0"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu size={20} />
            </button>
            {title && (
              <h1 className="font-heading text-lg font-medium text-foreground truncate">{title}</h1>
            )}
          </div>
          {headerUserBlock}
        </header>

        {/* Page content - white for clean look */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-card">
          {children}
        </main>
      </div>
    </div>
  );
};
