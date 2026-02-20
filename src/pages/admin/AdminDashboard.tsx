import React, { useEffect, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardList, Users, BarChart2, BookOpen } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({ tests: 0, students: 0, results: 0, questions: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ count: tests }, { count: students }, { count: results }, { count: questions }] = await Promise.all([
        supabase.from("tests").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("results").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
      ]);
      setStats({ tests: tests ?? 0, students: students ?? 0, results: results ?? 0, questions: questions ?? 0 });
    };
    load();
  }, []);

  const today = new Date();
  const sessionLabel = today.getMonth() >= 8 ? `Fall ${today.getFullYear()}` : today.getMonth() >= 0 ? `Spring ${today.getFullYear()}` : `Fall ${today.getFullYear() - 1}`;

  const cards = [
    { label: "Total Tests", value: stats.tests, icon: ClipboardList },
    { label: "Registered Students", value: stats.students, icon: Users },
    { label: "Test Submissions", value: stats.results, icon: BarChart2 },
    { label: "Total Questions", value: stats.questions, icon: BookOpen },
  ];

  return (
    <SidebarLayout title="Admin Overview">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/80">
        {/* <p className="text-sm text-muted-foreground">
          Academic Session: <span className="font-medium text-foreground">{sessionLabel}</span>
        </p> */}
        <p className="text-sm text-muted-foreground">
          Today is {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="mb-8">
        <h2 className="font-heading text-2xl font-bold text-foreground tracking-tight">
          Administration
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage tests, students, and view results.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] stat-card-stagger"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl mb-3 bg-primary/10 text-primary">
                <Icon size={22} />
              </div>
              <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-sm font-semibold text-foreground mb-1">Quick Actions</p>
        <p className="text-sm text-muted-foreground mb-4">Use the sidebar navigation to manage the portal.</p>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Go to <strong className="text-foreground">Manage Tests</strong> to create or edit exams and questions.</li>
          <li>Go to <strong className="text-foreground">Manage Students</strong> to create student accounts.</li>
          <li>Go to <strong className="text-foreground">Student Results</strong> to review exam performance.</li>
        </ul>
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboard;
