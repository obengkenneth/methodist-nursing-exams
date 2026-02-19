import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { Eye } from "lucide-react";

interface ResultRow {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  student_name: string;
  test_title: string;
}

const AdminResults: React.FC = () => {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: resultsData } = await supabase
        .from("results")
        .select("id, score, total_marks, percentage, passed, submitted_at, student_id, test_id")
        .order("submitted_at", { ascending: false });

      const [{ data: profilesData }, { data: testsData }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("tests").select("id, title, passing_percentage"),
      ]);

      const profileMap: Record<string, string> = {};
      (profilesData ?? []).forEach(p => { profileMap[p.user_id] = p.full_name; });
      const testMap: Record<string, { title: string; passing_percentage?: number }> = {};
      (testsData ?? []).forEach(t => { testMap[t.id] = { title: t.title, passing_percentage: t.passing_percentage }; });

      setResults((resultsData ?? []).map(r => {
        const pct = Number(r.percentage);
        const test = testMap[r.test_id];
        const threshold = test?.passing_percentage ?? 50;
        return {
          id: r.id,
          score: r.score,
          total_marks: r.total_marks,
          percentage: pct,
          passed: pct >= threshold,
          submitted_at: r.submitted_at,
          student_name: profileMap[r.student_id] ?? "Unknown",
          test_title: test?.title ?? "Unknown",
        };
      }));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = results.filter(r =>
    r.student_name.toLowerCase().includes(filter.toLowerCase()) ||
    r.test_title.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <SidebarLayout title="Student Results">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{results.length} submission(s)</p>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by student or test..."
          className="px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-64"
        />
      </div>

      {loading ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">
          {results.length === 0 ? "No results submitted yet." : "No results match your search."}
        </div>
      ) : (
        <div className="institution-card overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left">Student</th>
                <th className="text-left">Test</th>
                <th className="text-left">Score</th>
                <th className="text-left">Percentage</th>
                <th className="text-left">Status</th>
                <th className="text-left">Date</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td className="text-sm font-medium text-foreground">{r.student_name}</td>
                  <td className="text-sm text-muted-foreground">{r.test_title}</td>
                  <td className="text-sm text-foreground">{r.score}/{r.total_marks}</td>
                  <td className="text-sm text-foreground">{Math.round(r.percentage)}%</td>
                  <td>
                    <span className={`status-badge ${r.passed ? "status-pass" : "status-fail"}`}>
                      {r.passed ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {new Date(r.submitted_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      to={`/admin/results/${r.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Eye size={14} />
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SidebarLayout>
  );
};

export default AdminResults;
