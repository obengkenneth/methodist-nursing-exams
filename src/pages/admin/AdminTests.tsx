import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, Eye, ToggleLeft, ToggleRight } from "lucide-react";

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  is_active: boolean;
  allow_retake: boolean;
  created_at: string;
  question_count?: number;
}

const AdminTests: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTest, setEditTest] = useState<Test | null>(null);
  const [form, setForm] = useState({ title: "", description: "", duration_minutes: 60, is_active: true, allow_retake: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTests = async () => {
    const { data } = await supabase.from("tests").select("id, title, description, duration_minutes, is_active, allow_retake, created_at").order("created_at", { ascending: false });
    const tests = data ?? [];

    const withCounts = await Promise.all(tests.map(async t => {
      const { count } = await supabase.from("questions").select("id", { count: "exact", head: true }).eq("test_id", t.id);
      return { ...t, question_count: count ?? 0 };
    }));
    setTests(withCounts);
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, []);

  const openCreate = () => {
    setEditTest(null);
    setForm({ title: "", description: "", duration_minutes: 60, is_active: true, allow_retake: false });
    setError("");
    setShowForm(true);
  };

  const openEdit = (t: Test) => {
    setEditTest(t);
    setForm({ title: t.title, description: t.description ?? "", duration_minutes: t.duration_minutes, is_active: t.is_active, allow_retake: t.allow_retake });
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true);
    setError("");
    if (editTest) {
      await supabase.from("tests").update({ title: form.title.trim(), description: form.description || null, duration_minutes: form.duration_minutes, is_active: form.is_active, allow_retake: form.allow_retake }).eq("id", editTest.id);
    } else {
      await supabase.from("tests").insert({ title: form.title.trim(), description: form.description || null, duration_minutes: form.duration_minutes, is_active: form.is_active, allow_retake: form.allow_retake, created_by: user?.id });
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

  const toggleActive = async (t: Test) => {
    await supabase.from("tests").update({ is_active: !t.is_active }).eq("id", t.id);
    loadTests();
  };

  return (
    <SidebarLayout title="Manage Tests">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{tests.length} test(s) total</p>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary-dark transition-colors">
          <Plus size={16} />
          Create Test
        </button>
      </div>

      {loading ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : tests.length === 0 ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">
          No tests created yet. Click "Create Test" to get started.
        </div>
      ) : (
        <div className="institution-card overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Title</th>
                <th className="text-left">Duration</th>
                <th className="text-left">Questions</th>
                <th className="text-left">Status</th>
                <th className="text-left">Created</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(t => (
                <tr key={t.id}>
                  <td>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </td>
                  <td className="text-sm text-muted-foreground">{t.duration_minutes} min</td>
                  <td className="text-sm text-foreground">{t.question_count}</td>
                  <td>
                    <span className={`status-badge ${t.is_active ? "status-pass" : "status-fail"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="text-sm text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/tests/${t.id}/questions`} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Manage Questions">
                        <Eye size={15} />
                      </Link>
                      <button onClick={() => openEdit(t)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => toggleActive(t)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Toggle active">
                        {t.is_active ? <ToggleRight size={15} className="text-correct" /> : <ToggleLeft size={15} />}
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-muted-foreground hover:text-incorrect transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50 p-4">
          <div className="institution-card p-6 max-w-lg w-full">
            <h3 className="font-heading font-medium text-foreground mb-4">
              {editTest ? "Edit Test" : "Create New Test"}
            </h3>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Test Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Duration (minutes)</label>
                <input type="number" min={1} value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                  Active (visible to students)
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={form.allow_retake} onChange={e => setForm(p => ({ ...p, allow_retake: e.target.checked }))} className="rounded" />
                  Allow retake
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary-dark transition-colors disabled:opacity-60">
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
