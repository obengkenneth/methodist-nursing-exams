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
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("results").select("id", { count: "exact", head: true }),
        supabase.from("questions").select("id", { count: "exact", head: true }),
      ]);
      setStats({ tests: tests ?? 0, students: students ?? 0, results: results ?? 0, questions: questions ?? 0 });
    };
    load();
  }, []);

  const cards = [
    { label: "Total Tests", value: stats.tests, icon: ClipboardList },
    { label: "Registered Students", value: stats.students, icon: Users },
    { label: "Test Submissions", value: stats.results, icon: BarChart2 },
    { label: "Total Questions", value: stats.questions, icon: BookOpen },
  ];

  return (
    <SidebarLayout title="Admin Overview">
      <div className="mb-6">
        <h2 className="font-heading text-xl font-medium text-foreground">Administration</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage tests, students, and view results.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="institution-card p-4">
              <Icon size={18} className="text-primary mb-2" />
              <p className="font-heading text-2xl font-medium text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="institution-card p-5">
        <p className="text-sm font-medium text-foreground mb-1">Quick Actions</p>
        <p className="text-xs text-muted-foreground mb-4">Use the sidebar navigation to manage the portal.</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Go to <strong>Manage Tests</strong> to create or edit exams and questions.</li>
          <li>Go to <strong>Manage Students</strong> to create student accounts.</li>
          <li>Go to <strong>Student Results</strong> to review exam performance.</li>
        </ul>
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboard;
