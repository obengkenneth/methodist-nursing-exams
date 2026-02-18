import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/SidebarLayout";
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface ResultDetail {
  id: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
  test_title: string;
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

  useEffect(() => {
    if (!testId || !user) return;
    const load = async () => {
      // Get result
      const { data: resultRow } = await supabase
        .from("results")
        .select("id, score, total_marks, percentage, passed, submitted_at, test_id")
        .eq("student_id", user.id)
        .eq("test_id", testId)
        .maybeSingle();

      if (!resultRow) { setLoading(false); return; }

      // Get test title
      const { data: testData } = await supabase
        .from("tests")
        .select("title")
        .eq("id", testId)
        .single();

      setResult({
        id: resultRow.id,
        score: resultRow.score,
        total_marks: resultRow.total_marks,
        percentage: Number(resultRow.percentage),
        passed: resultRow.passed,
        submitted_at: resultRow.submitted_at,
        test_title: testData?.title ?? "Test",
      });

      // Get answers
      const { data: ansRows } = await supabase
        .from("answers")
        .select("question_id, selected_option, is_correct")
        .eq("result_id", resultRow.id);

      if (!ansRows || ansRows.length === 0) { setLoading(false); return; }

      // Get questions
      const questionIds = ansRows.map(a => a.question_id);
      const { data: questionsData } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, rationale, order_index")
        .in("id", questionIds)
        .order("order_index");

      const qMap: Record<string, typeof questionsData extends (infer T)[] | null ? T : never> = {};
      (questionsData ?? []).forEach(q => { qMap[q.id] = q; });

      const enriched: AnswerDetail[] = ansRows.map(a => {
        const q = qMap[a.question_id];
        return {
          question_id: a.question_id,
          selected_option: a.selected_option,
          is_correct: a.is_correct,
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

  return (
    <SidebarLayout title="Test Results">
      {/* Summary card */}
      <div className="institution-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-heading text-lg font-medium text-foreground">{result.test_title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Submitted on {new Date(result.submitted_at).toLocaleString()}
            </p>
          </div>
          <span className={`status-badge text-sm px-3 py-1 ${result.passed ? "status-pass" : "status-fail"}`}>
            {result.passed ? "PASSED" : "FAILED"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Score</p>
            <p className="font-heading text-2xl font-medium text-foreground">
              {result.score}/{result.total_marks}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Percentage</p>
            <p className="font-heading text-2xl font-medium text-foreground">
              {Math.round(result.percentage)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Correct</p>
            <p className="font-heading text-2xl font-medium" style={{ color: "hsl(var(--correct))" }}>{correct}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Incorrect</p>
            <p className="font-heading text-2xl font-medium" style={{ color: "hsl(var(--incorrect))" }}>{incorrect}</p>
          </div>
        </div>
      </div>

      {/* Answer review */}
      <div>
        <h3 className="font-heading text-base font-medium text-foreground mb-3">Answer Review</h3>
        <div className="space-y-3">
          {answers.map((ans, i) => {
            const isOpen = expanded[ans.question_id];
            return (
              <div
                key={ans.question_id}
                className="institution-card overflow-hidden"
                style={{ borderLeft: `4px solid hsl(var(${ans.is_correct ? "--correct" : "--incorrect"}))` }}
              >
                <button
                  onClick={() => setExpanded(p => ({ ...p, [ans.question_id]: !p[ans.question_id] }))}
                  className="w-full flex items-start justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {ans.is_correct
                      ? <CheckCircle size={18} style={{ color: "hsl(var(--correct))" }} className="flex-shrink-0 mt-0.5" />
                      : <XCircle size={18} style={{ color: "hsl(var(--incorrect))" }} className="flex-shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Question {i + 1}</p>
                      <p className="text-sm text-foreground">{ans.question_text}</p>
                    </div>
                  </div>
                  {isOpen ? <ChevronUp size={16} className="text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown size={16} className="text-muted-foreground flex-shrink-0 mt-1" />}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border pt-4">
                    <div className="space-y-2 mb-4">
                      {(["a", "b", "c", "d"] as const).map(opt => {
                        const text = ans[`option_${opt}` as keyof AnswerDetail] as string;
                        const isCorrect = opt === ans.correct_option;
                        const isSelected = opt === ans.selected_option;
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-3 p-2.5 rounded border text-sm ${
                              isCorrect
                                ? "border-correct/40 text-correct"
                                : isSelected && !isCorrect
                                ? "border-incorrect/40 text-incorrect"
                                : "border-border text-muted-foreground"
                            }`}
                            style={{
                              background: isCorrect
                                ? "hsl(var(--correct-bg))"
                                : isSelected && !isCorrect
                                ? "hsl(var(--incorrect-bg))"
                                : undefined,
                            }}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-medium flex-shrink-0 text-primary-foreground`}
                              style={{
                                background: isCorrect
                                  ? "hsl(var(--correct))"
                                  : isSelected && !isCorrect
                                  ? "hsl(var(--incorrect))"
                                  : "hsl(var(--muted))",
                                color: isCorrect || (isSelected && !isCorrect) ? "white" : "hsl(var(--muted-foreground))",
                              }}>
                              {OPTIONS[opt]}
                            </span>
                            {text}
                            {isCorrect && <span className="ml-auto text-xs font-medium">Correct</span>}
                            {isSelected && !isCorrect && <span className="ml-auto text-xs font-medium">Your answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {ans.rationale && (
                      <div className="p-3 bg-muted rounded border border-border">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                          Rationale
                        </p>
                        <p className="text-sm text-foreground">{ans.rationale}</p>
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
          className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm hover:bg-primary-dark transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </SidebarLayout>
  );
};

export default ResultsPage;
