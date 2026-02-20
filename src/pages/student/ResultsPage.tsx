import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/SidebarLayout";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Printer, Download } from "lucide-react";

interface ResultDetail {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  test_title: string;
  time_spent_seconds: number | null;
  duration_minutes: number;
}

interface AnswerDetail {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  rationale: string | null;
  selected_option: string | null;
  is_correct: boolean;
  flagged: boolean;
  marks: number;
}

const OPTIONS: Record<string, string> = { a: "A", b: "B", c: "C", d: "D" };

const ResultsPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"all" | "correct" | "incorrect" | "flagged">("all");

  const filteredAnswers = useMemo(() => {
    if (tab === "correct") return answers.filter(a => a.is_correct);
    if (tab === "incorrect") return answers.filter(a => !a.is_correct);
    if (tab === "flagged") return answers.filter(a => a.flagged);
    return answers;
  }, [answers, tab]);

  useEffect(() => {
    if (!testId || !user) return;
    const load = async () => {
      // Get latest result (most recent attempt if retakes)
      const { data: resultRows } = await supabase
        .from("results")
        .select("id, score, total_marks, percentage, passed, submitted_at, test_id, time_spent_seconds")
        .eq("student_id", user.id)
        .eq("test_id", testId)
        .order("submitted_at", { ascending: false })
        .limit(1);

      const resultRow = resultRows?.[0] ?? null;
      if (!resultRow) { setLoading(false); return; }

      // Get test title, passing threshold, and duration
      const { data: testData } = await supabase
        .from("tests")
        .select("title, passing_percentage, duration_minutes")
        .eq("id", testId)
        .single();

      const pct = Number(resultRow.percentage);
      const threshold = testData?.passing_percentage ?? 50;

      setResult({
        id: resultRow.id,
        score: resultRow.score,
        total_marks: resultRow.total_marks,
        percentage: pct,
        passed: pct >= threshold,
        submitted_at: resultRow.submitted_at,
        test_title: testData?.title ?? "Test",
        time_spent_seconds: resultRow.time_spent_seconds ?? null,
        duration_minutes: testData?.duration_minutes ?? 60,
      });

      // Get answers (include flagged)
      const { data: ansRows } = await supabase
        .from("answers")
        .select("question_id, selected_option, is_correct, flagged")
        .eq("result_id", resultRow.id);

      if (!ansRows || ansRows.length === 0) { setLoading(false); return; }

      // Get questions
      const questionIds = ansRows.map(a => a.question_id);
      const { data: questionsData } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, rationale, order_index, marks")
        .in("id", questionIds)
        .order("order_index");

      const qMap: Record<string, (typeof questionsData) extends (infer T)[] | null ? T : never> = {};
      (questionsData ?? []).forEach(q => { qMap[q.id] = q; });

      const enriched: AnswerDetail[] = ansRows.map(a => {
        const q = qMap[a.question_id];
        return {
          question_id: a.question_id,
          selected_option: a.selected_option,
          is_correct: a.is_correct,
          flagged: (a as { flagged?: boolean }).flagged ?? false,
          marks: (q as { marks?: number })?.marks ?? 1,
          question_text: q?.question_text ?? "",
          option_a: q?.option_a ?? "",
          option_b: q?.option_b ?? "",
          option_c: q?.option_c ?? "",
          option_d: q?.option_d ?? "",
          correct_option: q?.correct_option ?? "",
          rationale: q?.rationale ?? null,
        };
      });

      // Sort by question order
      enriched.sort((a, b) => {
        const qa = qMap[a.question_id];
        const qb = qMap[b.question_id];
        return (qa?.order_index ?? 0) - (qb?.order_index ?? 0);
      });

      setAnswers(enriched);
      setLoading(false);
    };
    load();
  }, [testId, user]);

  if (loading) {
    return (
      <SidebarLayout title="Test Results">
        <div className="text-sm text-muted-foreground">Loading results...</div>
      </SidebarLayout>
    );
  }

  if (!result) {
    return (
      <SidebarLayout title="Test Results">
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">
          No result found for this test.
          <div className="mt-4">
            <Link to="/dashboard" className="text-primary hover:underline">Back to Dashboard</Link>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const correct = answers.filter(a => a.is_correct).length;
  const incorrect = answers.filter(a => !a.is_correct).length;
  const flaggedCount = answers.filter(a => a.flagged).length;

  const submittedDate = new Date(result.submitted_at);
  const timeSpentLabel =
    result.time_spent_seconds != null
      ? result.time_spent_seconds >= 60
        ? `${Math.floor(result.time_spent_seconds / 60)} min${result.time_spent_seconds % 60 ? ` ${result.time_spent_seconds % 60} sec` : ""}`
        : `${result.time_spent_seconds} sec`
      : null;

  const handlePrint = () => window.print();
  const handleDownloadPDF = () => window.print();

  return (
    <SidebarLayout title="Test Results">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground mb-4">
        <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link to="/dashboard/results" className="hover:text-foreground">Results</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{result.test_title}</span>
      </nav>

      {/* Header with actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-medium text-foreground">{result.test_title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Completed on {submittedDate.toLocaleDateString()} – {submittedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
            <Printer size={16} />
            Print Results
          </button>
          <button type="button" onClick={handleDownloadPDF} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-sm">
            <Download size={16} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Summary block: circular overall (green/red), raw score, time spent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center text-center shadow-sm">
          <div
            className="relative w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${result.passed ? "hsl(var(--correct))" : "hsl(var(--incorrect))"} ${result.percentage * 3.6}deg, hsl(var(--muted)) 0deg)`,
            }}
          >
            <div className="absolute inset-2 rounded-full bg-card flex flex-col items-center justify-center">
              <span className="font-heading text-3xl font-semibold text-foreground">{Math.round(result.percentage)}%</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">Overall</span>
            </div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mt-4 ${result.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {result.passed ? "PASSED" : "FAILED"}
          </span>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs">
            {result.passed
              ? "Congratulations! You have successfully cleared the competency threshold for this module."
              : "You did not meet the threshold for this module."}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Raw Score</p>
          <p className="font-heading text-3xl font-semibold text-foreground">
            {result.score} / {result.total_marks}
          </p>
          <p className="text-sm text-muted-foreground mt-2">Questions Completed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Time Spent</p>
          <p className="font-heading text-3xl font-semibold text-foreground">
            {timeSpentLabel ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {result.duration_minutes} min allocated
          </p>
        </div>
      </div>

      {/* Question filter tabs (mockup: pill bar, active blue) — scroll on small screens */}
      <div className="result-tabs mb-6 overflow-x-auto overflow-y-hidden min-w-0">
        {(["all", "correct", "incorrect", "flagged"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`result-tab ${tab === t ? "active" : ""}`}
          >
            {t === "all" && `All Questions (${answers.length})`}
            {t === "correct" && `Correct (${correct})`}
            {t === "incorrect" && `Incorrect (${incorrect})`}
            {t === "flagged" && `Flagged (${flaggedCount})`}
          </button>
        ))}
      </div>

      {/* Answer review — mockup question cards; responsive */}
      <div className="min-w-0 overflow-x-hidden">
        <h3 className="font-heading text-lg font-semibold text-foreground mb-4">Answer Review</h3>
        <div className="space-y-4 min-w-0">
          {filteredAnswers.map((ans) => {
            const originalIndex = answers.findIndex(a => a.question_id === ans.question_id) + 1;
            const isOpen = expanded[ans.question_id];
            const pointsLabel = ans.is_correct ? `+${ans.marks} Points` : `0.0 / ${ans.marks} Points`;
            return (
              <div
                key={ans.question_id}
                className="question-card-result"
              >
                <button
                  onClick={() => setExpanded(p => ({ ...p, [ans.question_id]: !p[ans.question_id] }))}
                  className="w-full flex items-start justify-between gap-3 p-4 sm:p-5 text-left hover:bg-muted/20 transition-colors min-w-0"
                >
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    {ans.is_correct
                      ? <CheckCircle size={20} className="flex-shrink-0 mt-0.5 text-green-600" />
                      : <XCircle size={20} className="flex-shrink-0 mt-0.5 text-red-600" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5 flex-wrap">
                        <span>Question {String(originalIndex).padStart(2, "0")}</span>
                        <span className={`font-medium normal-case ${ans.is_correct ? "text-green-600" : "text-red-600"}`}>
                          ({pointsLabel})
                        </span>
                      </p>
                      <p className="text-sm sm:text-base text-foreground leading-relaxed break-words">{ans.question_text}</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={18} className="flex-shrink-0 text-muted-foreground ml-2" /> : <ChevronDown size={18} className="flex-shrink-0 text-muted-foreground ml-2" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border pt-5">
                    <div className="space-y-2 mb-4">
                      {(["a", "b", "c", "d"] as const).map(opt => {
                        const text = ans[`option_${opt}` as keyof AnswerDetail] as string;
                        const isCorrect = opt === ans.correct_option;
                        const isSelected = opt === ans.selected_option;
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                              isCorrect
                                ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-200"
                                : isSelected && !isCorrect
                                ? "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
                                : "border-border text-muted-foreground bg-muted/30"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                              isCorrect ? "bg-green-600 text-white" : isSelected && !isCorrect ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {OPTIONS[opt]}
                            </span>
                            <span className="flex-1">{text}</span>
                            {isCorrect && <span className="text-xs font-semibold text-green-700">Correct</span>}
                            {isSelected && !isCorrect && <span className="text-xs font-semibold text-red-700">Your answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {ans.rationale && (
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="rationale-heading">Rationale</p>
                        <p className="text-sm text-foreground leading-relaxed">{ans.rationale}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-primary px-5 py-2 text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    </SidebarLayout>
  );
};

export default ResultsPage;
