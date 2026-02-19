import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import mugLogo from "@/assets/mug-logo.png";
import { Clock, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_index: number;
}

interface TestInfo {
  id: string;
  title: string;
  duration_minutes: number;
  description: string | null;
  passing_percentage?: number;
}

const OPTIONS: Array<{ key: "a" | "b" | "c" | "d"; label: string }> = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
  { key: "c", label: "C" },
  { key: "d", label: "D" },
];

const TestTakingPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);

  useEffect(() => {
    if (!testId || !user) return;
    const load = async () => {
      const [{ data: testData }, { data: questionsData }, { data: existingResult }] = await Promise.all([
        supabase.from("tests").select("id, title, duration_minutes, description, allow_retake, passing_percentage").eq("id", testId).single(),
        supabase.from("questions").select("id, question_text, option_a, option_b, option_c, option_d, order_index").eq("test_id", testId).order("order_index"),
        supabase.from("results").select("id").eq("student_id", user.id).eq("test_id", testId).maybeSingle(),
      ]);

      if (existingResult && !testData?.allow_retake) {
        setAlreadyTaken(true);
        setLoading(false);
        return;
      }

      setTest(testData);
      setQuestions(questionsData ?? []);
      setTimeLeft((testData?.duration_minutes ?? 60) * 60);
      setLoading(false);
    };
    load();
  }, [testId, user]);

  // Timer
  const handleSubmit = useCallback(async (auto = false) => {
    if (!test || !user || submitting) return;
    setSubmitting(true);
    setShowSubmitConfirm(false);

    // fetch correct answers
    const { data: correctData } = await supabase
      .from("questions")
      .select("id, correct_option, marks")
      .eq("test_id", test.id);

    if (!correctData) { setSubmitting(false); return; }

    let score = 0;
    const totalMarks = correctData.reduce((s, q) => s + q.marks, 0);

    const answerRows = correctData.map(q => {
      const selected = answers[q.id] ?? null;
      const isCorrect = selected === q.correct_option;
      if (isCorrect) score += q.marks;
      return {
        question_id: q.id,
        selected_option: selected,
        is_correct: isCorrect,
      };
    });

    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = percentage >= (test.passing_percentage ?? 50);
    const roundedPct = Math.round(percentage * 100) / 100;

    // Check for existing result (retake): update instead of delete+insert to avoid unique constraint
    const { data: existingResult } = await supabase
      .from("results")
      .select("id")
      .eq("student_id", user.id)
      .eq("test_id", test.id)
      .maybeSingle();

    if (existingResult) {
      // Retake: delete old answers, update result row, insert new answers
      await supabase.from("answers").delete().eq("result_id", existingResult.id);
      await supabase
        .from("results")
        .update({
          score,
          total_marks: totalMarks,
          percentage: roundedPct,
          passed,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existingResult.id);
      await supabase.from("answers").insert(
        answerRows.map(row => ({ ...row, result_id: existingResult.id }))
      );
    } else {
      // First attempt: insert new result and answers
      const { data: result } = await supabase
        .from("results")
        .insert({
          student_id: user.id,
          test_id: test.id,
          score,
          total_marks: totalMarks,
          percentage: roundedPct,
          passed,
        })
        .select()
        .single();

      if (!result) {
        setSubmitting(false);
        return;
      }
      await supabase.from("answers").insert(
        answerRows.map(row => ({ ...row, result_id: result.id }))
      );
    }

    navigate(`/dashboard/results/${test.id}`);
  }, [test, user, submitting, answers, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 || submitting) return;
    if (timeLeft === 0) { handleSubmit(true); return; }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitting, handleSubmit]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading exam...</p>
      </div>
    );
  }

  if (alreadyTaken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="institution-card p-8 text-center max-w-md">
          <AlertTriangle size={36} className="text-accent-red mx-auto mb-3" />
          <h2 className="font-heading text-lg font-medium text-foreground mb-2">
            Test Already Submitted
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            You have already completed this test and retakes are not allowed.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary px-5 py-2 text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="institution-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No questions found for this test.</p>
          <button onClick={() => navigate("/dashboard")} className="mt-4 text-sm text-primary hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const answered = Object.keys(answers).length;
  const isLast = currentIndex === questions.length - 1;
  const timeWarning = timeLeft < 300;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Exam header */}
      <header className="bg-card border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={mugLogo} alt="MUG" className="h-8 object-contain" />
          <div>
            <p className="font-heading font-medium text-sm text-foreground">{test.title}</p>
            <p className="text-xs text-muted-foreground">School of Nursing and Midwifery</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded border font-mono text-sm font-medium ${
          timeWarning
            ? "bg-incorrect-bg border-incorrect/40 text-incorrect"
            : "bg-muted border-border text-foreground"
        }`}>
          <Clock size={14} />
          {formatTime(timeLeft)}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Question panel */}
        <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 py-8">
          {/* Progress info */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Question <span className="font-medium text-foreground">{currentIndex + 1}</span> of{" "}
              <span className="font-medium text-foreground">{questions.length}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{answered}</span> of{" "}
              {questions.length} answered
            </p>
          </div>

          {/* Progress bar: filled by number of questions answered */}
          <div className="w-full bg-muted rounded-full h-1 mb-6">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }}
            />
          </div>

          {/* Question navigator — mobile: fixed-height horizontal scroll (doesn't grow with question count) */}
          <div className="lg:hidden mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Question Navigator
            </p>
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto overflow-y-hidden py-1 -mx-1 min-h-[2.25rem] scroll-smooth" style={{ scrollbarGutter: 'stable' }}>
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={`flex-shrink-0 h-8 w-8 rounded text-xs font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isAnswered
                        ? "bg-correct-bg text-correct border border-correct/30"
                        : "bg-muted text-muted-foreground border border-border hover:border-primary hover:text-primary"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Answered {answered} · Unanswered {questions.length - answered}
            </p>
          </div>

          {/* Question */}
          <div className="institution-card p-6 mb-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Question {currentIndex + 1}
            </p>
            <p className="text-foreground leading-relaxed" style={{ fontSize: "17px" }}>
              {current.question_text}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-2.5 mb-8">
            {OPTIONS.map(opt => {
              const optionText = current[`option_${opt.key}` as keyof Question] as string;
              const selected = answers[current.id] === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setAnswers(prev => ({ ...prev, [current.id]: opt.key }))}
                  className={`exam-option w-full text-left ${selected ? "selected" : ""}`}
                >
                  <span className={`flex-shrink-0 w-7 h-7 rounded border flex items-center justify-center text-sm font-medium transition-colors ${
                    selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border text-muted-foreground bg-muted"
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-sm text-foreground">{optionText}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex(p => Math.max(0, p - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            {isLast ? (
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="btn-primary flex items-center gap-2 px-5 py-2 text-sm font-medium"
              >
                Submit Test
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(p => Math.min(questions.length - 1, p + 1))}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                Next
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Question navigator */}
        <aside className="w-56 flex-shrink-0 border-l border-border bg-card p-4 hidden lg:block">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Question Navigator
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : isAnswered
                      ? "bg-correct-bg text-correct border border-correct/30"
                      : "bg-muted text-muted-foreground border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded bg-correct-bg border border-correct/30 inline-block" />
              Answered ({answered})
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-3 h-3 rounded bg-muted border border-border inline-block" />
              Unanswered ({questions.length - answered})
            </div>
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="btn-primary mt-5 w-full py-2 text-xs font-medium"
          >
            Submit Test
          </button>
        </aside>
      </div>

      {/* Submit confirmation dialog */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="institution-card p-6 max-w-sm w-full">
            <h3 className="font-heading font-medium text-foreground mb-2">Submit Test?</h3>
            <p className="text-sm text-muted-foreground mb-1">
              You have answered <strong>{answered}</strong> of <strong>{questions.length}</strong> questions.
            </p>
            {answered < questions.length && (
              <p className="text-sm text-accent-red mb-4">
                {questions.length - answered} question(s) left unanswered.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-5">
              Once submitted, you cannot change your answers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="btn-outline flex-1 py-2 px-4 text-sm"
              >
                Continue Exam
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="btn-primary flex-1 py-2 px-4 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestTakingPage;
