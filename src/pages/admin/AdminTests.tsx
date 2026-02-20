import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Eye, Search } from "lucide-react";

type TestStatus = "draft" | "active" | "completed";

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  status?: TestStatus;
  department: string | null;
  allow_retake: boolean;
  passing_percentage?: number;
  created_at: string;
  question_count?: number;
}

const AdminTests: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTest, setEditTest] = useState<Test | null>(null);
  const [form, setForm] = useState({ title: "", description: "", duration_minutes: 60, allow_retake: false, passing_percentage: 50, status: "active" as TestStatus, department: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadTests = async () => {
    const { data } = await supabase.from("tests").select("id, title, description, duration_minutes, is_active, status, department, allow_retake, passing_percentage, created_at").order("created_at", { ascending: false });
    const tests = data ?? [];

    const withCounts = await Promise.all(tests.map(async t => {
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("test_id", t.id);
      return { ...t, question_count: count ?? 0, status: (t as { status?: TestStatus }).status ?? "active", department: (t as { department?: string | null }).department ?? null };
    }));
    setTests(withCounts);
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, []);

  const filteredTests = useMemo(() => {
    if (!search.trim()) return tests;
    const q = search.trim().toLowerCase();
    return tests.filter(t => t.title.toLowerCase().includes(q));
  }, [tests, search]);

  const counts = useMemo(() => ({
    active: tests.filter(t => (t.status ?? "active") === "active").length,
    draft: tests.filter(t => (t.status ?? "active") === "draft").length,
    completed: tests.filter(t => (t.status ?? "active") === "completed").length,
  }), [tests]);

  const openCreate = () => {
    setEditTest(null);
    setForm({ title: "", description: "", duration_minutes: 60, allow_retake: false, passing_percentage: 50, status: "active", department: "" });
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: Test) => {
    setEditTest(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      duration_minutes: t.duration_minutes,
      allow_retake: t.allow_retake,
      passing_percentage: t.passing_percentage ?? 50,
      status: (t.status ?? "active") as TestStatus,
      department: t.department ?? "",
    });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      duration_minutes: form.duration_minutes,
      is_active: form.status === "active",
      allow_retake: form.allow_retake,
      passing_percentage: form.passing_percentage,
      status: form.status,
      department: form.department.trim() || null,
    };
    if (editTest) {
      await supabase.from("tests").update(payload).eq("id", editTest.id);
    } else {
      await supabase.from("tests").insert({ ...payload, created_by: user?.id });
    }
    setSaving(false);
    setShowForm(false);
    loadTests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test and all its questions? This cannot be undone.")) return;
    await supabase.from("tests").delete().eq("id", id);
    loadTests();
  };

  return (
    <SidebarLayout title="Manage Tests">
      <nav className="text-sm text-muted-foreground mb-6">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Manage Tests</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="font-heading text-xl font-bold text-foreground tracking-tight">Manage Tests</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search examinations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground w-48 sm:w-56 input-focus"
            />
          </div>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg">
            <Plus size={16} />
            Create New Test
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="status-active">{counts.active} Active</span>
            <span className="status-draft">{counts.draft} Drafts</span>
            <span className="status-completed">{counts.completed} Completed</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]">Loading...</div>
      ) : filteredTests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {search.trim() ? "No tests match your search." : "No tests created yet. Click \"Create New Test\" to get started."}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-x-auto">
          <table className="w-full data-table min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left">TITLE</th>
                <th className="text-left">DEPARTMENT</th>
                <th className="text-left">DATE</th>
                <th className="text-left">STATUS</th>
                <th className="text-left">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTests.map(t => {
                const status = (t.status ?? "active") as TestStatus;
                return (
                  <tr key={t.id}>
                    <td>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">ID: {t.id.slice(0, 8)}</p>
                    </td>
                    <td className="text-sm text-muted-foreground">{t.department ?? "—"}</td>
                    <td className="text-sm text-muted-foreground">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={
                        status === "active" ? "status-active" :
                        status === "draft" ? "status-draft" :
                        "status-completed"
                      }>
                        {status === "active" ? "ACTIVE" : status === "draft" ? "DRAFT" : "COMPLETED"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/tests/${t.id}/questions`} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Manage Questions">
                          <Eye size={15} />
                        </Link>
                        <button onClick={() => openEdit(t)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        
                        <button onClick={() => handleDelete(t.id)} className="p-1.5 text-muted-foreground hover:text-incorrect transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                        <Link to={`/admin/results?testId=${t.id}`} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="View Results">
                          View Results
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="rounded-xl border border-border bg-card p-6 max-w-lg w-full shadow-lg my-auto max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-medium text-foreground mb-4">
              {editTest ? "Edit Test" : "Create New Test"}
            </h3>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Test Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Department</label>
                <input value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  placeholder="e.g. Clinical Nursing"
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as TestStatus }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Only Active tests are visible to students.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Duration (minutes)</label>
                <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Passing percentage (%)</label>
                <input type="number" min={0} max={100} value={form.passing_percentage} onChange={e => setForm(p => ({ ...p, passing_percentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Student needs this % or higher to pass (default 50).</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.allow_retake} onChange={e => setForm(p => ({ ...p, allow_retake: e.target.checked }))} className="rounded" />
                  Allow retake
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
                {saving ? "Saving..." : editTest ? "Save Changes" : "Create Test"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};

export default AdminTests;
