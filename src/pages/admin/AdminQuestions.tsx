import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ChevronLeft } from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string | null;
  correct_option: string;
  rationale: string | null;
  marks: number;
  order_index: number;
}

const blank = { question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", rationale: "", marks: 1 };

const AdminQuestions: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [testTitle, setTestTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!testId) return;
    const [{ data: test }, { data: qs }] = await Promise.all([
      supabase.from("tests").select("title").eq("id", testId).single(),
      supabase.from("questions").select("*").eq("test_id", testId).order("order_index"),
    ]);
    setTestTitle(test?.title ?? "");
    setQuestions(qs ?? []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [testId]);

  const openCreate = () => { setEditQ(null); setForm(blank); setError(""); setShowForm(true); };
  const openEdit = (q: Question) => { setEditQ(q); setForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d ?? "", correct_option: q.correct_option, rationale: q.rationale ?? "", marks: q.marks }); setError(""); setShowForm(true); };

  const validate = () => {
    if (!form.question_text.trim()) return "Question text is required.";
    if (!form.option_a.trim() || !form.option_b.trim() || !form.option_c.trim()) return "Options A, B, and C are required.";
    if (form.correct_option === "d" && !form.option_d.trim()) return "Option D is required if it is the correct answer.";
    return "";
  };

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true); setError("");
    const payload = {
      test_id: testId,
      question_text: form.question_text.trim(),
      option_a: form.option_a.trim(),
      option_b: form.option_b.trim(),
      option_c: form.option_c.trim(),
      option_d: form.option_d.trim() || null,
      correct_option: form.correct_option,
      rationale: form.rationale?.trim() || null,
      marks: form.marks,
      order_index: editQ ? editQ.order_index : questions.length,
    };
    if (editQ) {
      await supabase.from("questions").update(payload).eq("id", editQ.id);
    } else {
      await supabase.from("questions").insert(payload);
    }
    setSaving(false); setShowForm(false); loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", id);
    loadData();
  };

  return (
    <SidebarLayout title="Manage Questions">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span className="mx-2">/</span>
        <Link to="/admin/tests" className="hover:text-foreground">Manage Tests</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{testTitle || "Questions"}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground tracking-tight">{testTitle || "Questions"}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{questions.length} question(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg">
          <Plus size={16} />
          Add Question
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]">Loading...</div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          No questions yet. Click "Add Question" to start building this exam.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Question {i + 1} · {q.marks} mark{q.marks !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-foreground mb-3">{q.question_text}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["a", "b", "c", "d"] as const).map(opt => {
                      const optionValue = q[`option_${opt}` as keyof Question] as string | null;
                      if (opt === "d" && (!optionValue || !optionValue.trim())) return null;
                      return (
                        <div key={opt} className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${
                          q.correct_option === opt ? "border-correct/40 bg-correct-bg text-correct" : "border-border text-muted-foreground"
                        }`}>
                          <span className="font-medium uppercase">{opt}.</span>
                          {optionValue}
                          {q.correct_option === opt && <span className="ml-auto font-medium">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.rationale && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{q.rationale}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(q)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 text-muted-foreground hover:text-incorrect transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="rounded-xl border border-border bg-card p-6 max-w-2xl w-full my-8 shadow-lg">
            <h3 className="font-heading font-medium text-foreground mb-4">
              {editQ ? "Edit Question" : "Add New Question"}
            </h3>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Question Text *</label>
                <textarea value={form.question_text} onChange={e => setForm(p => ({ ...p, question_text: e.target.value }))}
                  rows={3} className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground resize-none" />
              </div>
              {(["a", "b", "c"] as const).map(opt => (
                <div key={opt}>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Option {opt.toUpperCase()} *</label>
                  <input value={form[`option_${opt}` as keyof typeof form] as string}
                    onChange={e => setForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))}
                    className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Option D (optional)</label>
                <input value={form.option_d}
                  onChange={e => {
                    setForm(p => ({ ...p, option_d: e.target.value }));
                    // If D is cleared and it was the correct answer, reset to 'a'
                    if (!e.target.value.trim() && form.correct_option === "d") {
                      setForm(p => ({ ...p, correct_option: "a" }));
                    }
                  }}
                  placeholder="Leave empty for 3-option question"
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Correct Answer *</label>
                  <select value={form.correct_option} onChange={e => setForm(p => ({ ...p, correct_option: e.target.value }))}
                    className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground">
                    <option value="a">Option A</option>
                    <option value="b">Option B</option>
                    <option value="c">Option C</option>
                    {form.option_d.trim() && <option value="d">Option D</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Marks</label>
                  <input type="number" min={1} value={form.marks} onChange={e => setForm(p => ({ ...p, marks: Number(e.target.value) }))}
                    className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Rationale (optional)</label>
                <textarea value={form.rationale} onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))}
                  rows={2} placeholder="Explain why this answer is correct..."
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
                {saving ? "Saving..." : editQ ? "Save Changes" : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};

export default AdminQuestions;
