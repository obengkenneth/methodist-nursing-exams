import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import mugLogo from "@/assets/mug-logo.png";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  Users,
  BookOpen,
  BarChart2,
  ChevronRight,
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

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children, title }) => {
  const { role, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const nav = role === "admin" ? adminNav : studentNav;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: "hsl(var(--sidebar-background))" }}>
        {/* Logo */}
        <div className="px-4 py-5 border-b" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-2.5">
            <img src={mugLogo} alt="MUG" className="h-9 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
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

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-sidebar-link ${active ? "active" : ""}`}
              >
                <Icon size={16} />
                {item.label}
                {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User info & logout */}
        <div className="px-3 py-4 border-t" style={{ borderColor: "hsl(var(--sidebar-border))" }}>
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-medium truncate" style={{ color: "hsl(var(--sidebar-foreground))" }}>
              {user?.email}
            </p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: "hsl(var(--sidebar-foreground) / 0.6)" }}>
              {role}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="nav-sidebar-link w-full text-left"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="page-header flex items-center justify-between">
          <div>
            {title && (
              <h1 className="font-heading text-lg font-medium text-foreground">{title}</h1>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            School of Nursing and Midwifery — Methodist University Ghana
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
