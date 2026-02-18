import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CheckCircle, Clock, TrendingUp } from "lucide-react";

interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  allow_retake: boolean;
  completed?: boolean;
  result?: { score: number; percentage: number; passed: boolean; submitted_at: string };
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; student_id: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profileData }, { data: testsData }, { data: resultsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, student_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("tests").select("id, title, description, duration_minutes, is_active, allow_retake").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("results").select("test_id, score, percentage, passed, submitted_at").eq("student_id", user.id),
      ]);

      setProfile(profileData);

      const resultMap: Record<string, typeof resultsData extends (infer T)[] | null ? T : never> = {};
      (resultsData ?? []).forEach(r => { resultMap[r.test_id] = r; });

      const enriched = (testsData ?? []).map(t => ({
        ...t,
        completed: !!resultMap[t.id],
        result: resultMap[t.id]
          ? {
              score: resultMap[t.id].score,
              percentage: Number(resultMap[t.id].percentage),
              passed: resultMap[t.id].passed,
              submitted_at: resultMap[t.id].submitted_at,
            }
          : undefined,
      }));
      setTests(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const available = tests.filter(t => !t.completed || t.allow_retake);
  const completed = tests.filter(t => t.completed);

  const statCards = [
    { label: "Available Tests", value: available.length, icon: BookOpen, color: "text-primary" },
    { label: "Completed Tests", value: completed.length, icon: CheckCircle, color: "text-correct" },
    {
      label: "Average Score",
      value: completed.length > 0
        ? `${Math.round(completed.reduce((s, t) => s + (t.result?.percentage ?? 0), 0) / completed.length)}%`
        : "—",
      icon: TrendingUp,
      color: "text-primary",
    },
    {
      label: "Passed Tests",
      value: completed.filter(t => t.result?.passed).length,
      icon: CheckCircle,
      color: "text-correct",
    },
  ];

  return (
    <SidebarLayout title="Student Dashboard">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="font-heading text-xl font-medium text-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h2>
        {profile?.student_id && (
          <p className="text-sm text-muted-foreground mt-0.5">Student ID: {profile.student_id}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="institution-card p-4">
              <div className="flex items-start justify-between mb-2">
                <Icon size={18} className={c.color} />
              </div>
              <p className="font-heading text-2xl font-medium text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Available Tests */}
      <div className="mb-8">
        <h3 className="font-heading text-base font-medium text-foreground mb-3">Available Tests</h3>
        {loading ? (
          <div className="institution-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : available.length === 0 ? (
          <div className="institution-card p-8 text-center text-sm text-muted-foreground">
            No tests are currently available.
          </div>
        ) : (
          <div className="space-y-2">
            {available.map(test => (
              <div key={test.id} className="institution-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">{test.title}</p>
                  {test.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{test.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock size={12} />
                      {test.duration_minutes} min
                    </span>
                    {test.completed && test.allow_retake && (
                      <span className="text-xs text-primary">Retake available</span>
                    )}
                  </div>
                </div>
                <Link
                  to={`/dashboard/test/${test.id}`}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
                >
                  {test.completed ? "Retake" : "Start Test"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tests */}
      {completed.length > 0 && (
        <div>
          <h3 className="font-heading text-base font-medium text-foreground mb-3">Completed Tests</h3>
          <div className="institution-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Test</th>
                  <th className="text-left">Score</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {completed.map(test => (
                  <tr key={test.id}>
                    <td className="text-sm text-foreground">{test.title}</td>
                    <td className="text-sm">
                      {test.result?.score} ({test.result?.percentage}%)
                    </td>
                    <td className="text-sm text-muted-foreground">
                      {test.result ? new Date(test.result.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <span className={`status-badge ${test.result?.passed ? "status-pass" : "status-fail"}`}>
                        {test.result?.passed ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/dashboard/results/${test.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View Result
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};

export default StudentDashboard;
