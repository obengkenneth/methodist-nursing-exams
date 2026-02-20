import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Briefcase, CheckCircle, ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react";

const DEFAULT_EXAM_IMAGE = "/default-exam-cover.svg";

interface TestSummary {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  status?: "draft" | "active" | "completed";
  allow_retake: boolean;
  image_url?: string | null;
  question_count?: number;
  completed?: boolean;
  result?: { score: number; total_marks: number; percentage: number; passed: boolean; submitted_at: string };
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string; student_id: string | null } | null>(null);

  const isTestsPage = location.pathname === "/dashboard/tests";
  const isResultsPage = location.pathname === "/dashboard/results";
  const isDashboard = !isTestsPage && !isResultsPage;

  const pageTitle = isTestsPage ? "Available Tests" : isResultsPage ? "My Results" : "Student Dashboard";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profileData }, { data: activeTestsData }, { data: resultsData }] = await Promise.all([
        supabase.from("profiles").select("full_name, student_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("tests").select("id, title, description, duration_minutes, is_active, status, allow_retake, passing_percentage, image_url").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("results").select("test_id, score, total_marks, percentage, passed, submitted_at").eq("student_id", user.id),
      ]);

      setProfile(profileData);

      const results = resultsData ?? [];
      const resultMap: Record<string, (typeof results)[number]> = {};
      results.forEach(r => { resultMap[r.test_id] = r; });

      const activeTests = activeTestsData ?? [];
      const activeTestIds = new Set(activeTests.map(t => t.id));
      const resultTestIds = [...new Set(results.map(r => r.test_id))];
      const inactiveResultTestIds = resultTestIds.filter(id => !activeTestIds.has(id));

      let inactiveTestsData: typeof activeTests = [];
      if (inactiveResultTestIds.length > 0) {
        const { data } = await supabase
          .from("tests")
          .select("id, title, description, duration_minutes, is_active, status, allow_retake, passing_percentage, image_url")
          .in("id", inactiveResultTestIds);
        inactiveTestsData = data ?? [];
      }

      const allTestIds = [...activeTests.map(t => t.id), ...inactiveTestsData.map(t => t.id)];
      const questionCounts: Record<string, number> = {};
      await Promise.all(
        allTestIds.map(async (testId) => {
          const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("test_id", testId);
          questionCounts[testId] = count ?? 0;
        })
      );

      const enrich = (t: (typeof activeTests)[number]) => {
        const res = resultMap[t.id];
        const pct = res ? Number(res.percentage) : 0;
        const threshold = (t as { passing_percentage?: number }).passing_percentage ?? 50;
        return {
          ...t,
          question_count: questionCounts[t.id],
          completed: !!res,
          result: res
            ? {
                score: res.score,
                total_marks: res.total_marks ?? res.score,
                percentage: pct,
                passed: pct >= threshold,
                submitted_at: res.submitted_at,
              }
            : undefined,
        };
      };

      const enrichedActive = activeTests.map(enrich);
      const enrichedInactive = inactiveTestsData.map(enrich);
      setTests([...enrichedActive, ...enrichedInactive]);
      setLoading(false);
    };
    load();
  }, [user]);

  const available = tests.filter(t => (t.status === "active" || t.is_active) && (!t.completed || t.allow_retake));
  const completed = tests.filter(t => t.completed);

  const [recentSort, setRecentSort] = useState<"recent" | "score">("recent");
  const [recentPage, setRecentPage] = useState(0);
  const RECENT_PAGE_SIZE = 10;

  const sortedCompleted = useMemo(() => {
    const list = [...completed];
    if (recentSort === "recent") {
      list.sort((a, b) => new Date((b.result?.submitted_at ?? "").toString()).getTime() - new Date((a.result?.submitted_at ?? "").toString()).getTime());
    } else {
      list.sort((a, b) => (b.result?.percentage ?? 0) - (a.result?.percentage ?? 0));
    }
    return list;
  }, [completed, recentSort]);

  const paginatedCompleted = useMemo(() => {
    const start = recentPage * RECENT_PAGE_SIZE;
    return sortedCompleted.slice(start, start + RECENT_PAGE_SIZE);
  }, [sortedCompleted, recentPage]);

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

  const availableToShow = isDashboard ? available.slice(0, 3) : available;

  const availableTestsSection = (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <Briefcase size={18} />
          </span>
          Available {isDashboard ? "Exams" : "Tests"}
        </h3>
        {isDashboard && available.length > 0 && (
          <Link to="/dashboard/tests" className="text-sm font-medium text-primary hover:underline">
            View All
          </Link>
        )}
      </div>
      {loading ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : available.length === 0 ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">
          No tests are currently available.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {availableToShow.map((test, idx) => (
            <div key={test.id} className="exam-card flex flex-col">
              <div className="exam-card__image relative overflow-hidden">
                <img
                  src={test.image_url || DEFAULT_EXAM_IMAGE}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_EXAM_IMAGE;
                  }}
                />
                {/* <span className={`exam-card__tag ${idx % 2 !== 0 ? "elective" : ""}`}>
                  {idx % 2 === 0 ? "Mandatory" : "Elective"}
                </span> */}
              </div>
              <div className="p-5 flex flex-col flex-1">
                <p className="font-heading font-medium text-foreground text-base">{test.title}</p>
                {test.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{test.description}</p>
                )}
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Clock size={14} className="flex-shrink-0" />
                    Duration: {test.duration_minutes} mins
                  </li>
                  {typeof test.question_count === "number" && (
                    <li>{test.question_count} Questions</li>
                  )}
                  {/* <li className="flex items-center gap-2 text-correct">
                    <CheckCircle size={14} className="flex-shrink-0" />
                    Prerequisites: Completed
                  </li> */}
                </ul>
                {(test.question_count ?? 0) === 0 ? (
                  <button
                    type="button"
                    disabled
                    className="mt-5 w-full inline-flex justify-center px-4 py-3 text-sm font-medium rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    title="This exam has no questions yet."
                  >
                    No questions yet
                  </button>
                ) : test.completed && test.allow_retake ? (
                  <Link
                    to={`/dashboard/test/${test.id}`}
                    className="btn-primary inline-flex mt-5 w-full justify-center px-4 py-3 text-sm font-medium rounded-lg"
                  >
                    Retake
                  </Link>
                ) : (
                  <Link
                    to={`/dashboard/test/${test.id}`}
                    className="btn-primary inline-flex mt-5 w-full justify-center px-4 py-3 text-sm font-medium rounded-lg"
                  >
                    Start Exam
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const completedTestsSection = completed.length > 0 && (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="font-heading text-base font-semibold text-foreground flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
            <TrendingUp size={18} />
          </span>
          Recent Performance
        </h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Sort by:</label>
          <select
            value={recentSort}
            onChange={(e) => { setRecentSort(e.target.value as "recent" | "score"); setRecentPage(0); }}
            className="text-sm border border-input rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="recent">Recent First</option>
            <option value="score">Score: High to Low</option>
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-x-auto">
        <table className="w-full data-table min-w-[500px]">
          <thead>
            <tr>
              <th className="text-left">TEST NAME</th>
              <th className="text-left">DATE ATTEMPTED</th>
              <th className="text-left">SCORE</th>
              <th className="text-left">STATUS</th>
              <th className="text-left">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCompleted.map(test => (
              <tr key={test.id}>
                <td className="text-sm">
                  <p className="font-medium text-foreground">{test.title}</p>
                  {test.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{test.description}</p>
                  )}
                </td>
                <td className="text-sm text-muted-foreground">
                  {test.result ? new Date(test.result.submitted_at).toLocaleDateString() : "—"}
                </td>
                <td className="text-sm">
                  {test.result != null
                    ? `${Math.round(test.result.percentage)}% (${test.result.score}/${test.result.total_marks})`
                    : "—"}
                </td>
                <td>
                  <span className={`status-badge ${test.result?.passed ? "status-pass" : "status-fail"}`}>
                    {test.result?.passed ? "PASS" : "FAIL"}
                  </span>
                </td>
                <td>
                <Link
                  to={`/dashboard/results/${test.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Details
                </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedCompleted.length > RECENT_PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border text-sm text-muted-foreground bg-[hsl(220_14%_98%)]">
            <span>
              Showing {recentPage * RECENT_PAGE_SIZE + 1} to {Math.min((recentPage + 1) * RECENT_PAGE_SIZE, sortedCompleted.length)} of {sortedCompleted.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRecentPage((p) => Math.max(0, p - 1))}
                disabled={recentPage === 0}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => setRecentPage((p) => Math.min(Math.ceil(sortedCompleted.length / RECENT_PAGE_SIZE) - 1, p + 1))}
                disabled={recentPage >= Math.ceil(sortedCompleted.length / RECENT_PAGE_SIZE) - 1}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const today = new Date();
  const sessionLabel = today.getMonth() >= 8 ? `Fall ${today.getFullYear()}` : today.getMonth() >= 0 ? `Spring ${today.getFullYear()}` : `Fall ${today.getFullYear() - 1}`;

  return (
    <SidebarLayout title={pageTitle}>
      {isDashboard && (
        <>
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
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Review your available examinations and track your progress.
            </p>
            {profile?.student_id && (
              <p className="text-xs text-muted-foreground mt-2">Student ID: {profile.student_id}</p>
            )}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {statCards.map((c, i) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.label}
                  className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] stat-card-stagger"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={`flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${c.color === "text-correct" ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                    <Icon size={22} />
                  </div>
                  <p className="font-heading text-2xl font-bold text-foreground">{c.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.label}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {isTestsPage && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {profile?.full_name && `Hi, ${profile.full_name}. `}
            Tests you can take or retake are listed below.
          </p>
        </div>
      )}
      {(isDashboard || isTestsPage) && availableTestsSection}

      {isDashboard && completedTestsSection}
      {isResultsPage && (
        completed.length === 0 ? (
          <div className="institution-card p-8 text-center text-sm text-muted-foreground">
            You have not completed any tests yet. Go to <Link to="/dashboard/tests" className="text-primary hover:underline">Available Tests</Link> to get started.
          </div>
        ) : (
          completedTestsSection
        )
      )}
    </SidebarLayout>
  );
};

export default StudentDashboard;
