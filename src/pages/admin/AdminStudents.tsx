import React, { useEffect, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserCheck, UserX } from "lucide-react";

interface StudentProfile {
  id: string;
  user_id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
}

const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", student_id: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStudents = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setStudents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required."); return;
    }
    setSaving(true); setError(""); setSuccess("");

    // Create auth user via admin (using service role would be needed for true admin creation)
    // We'll use signUp for now with auto-confirm
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { data: { full_name: form.full_name.trim() } },
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? "Failed to create user."); setSaving(false); return;
    }

    const userId = signUpData.user.id;

    // Insert profile
    await supabase.from("profiles").insert({
      user_id: userId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      student_id: form.student_id.trim() || null,
      is_active: true,
    });

    // Assign student role
    await supabase.from("user_roles").insert({ user_id: userId, role: "student" });

    setSuccess(`Account created for ${form.full_name}. Student may need to verify their email.`);
    setForm({ full_name: "", email: "", student_id: "", password: "" });
    setSaving(false);
    loadStudents();
  };

  const toggleActive = async (s: StudentProfile) => {
    await supabase.from("profiles").update({ is_active: !s.is_active }).eq("id", s.id);
    loadStudents();
  };

  return (
    <SidebarLayout title="Manage Students">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{students.length} registered student(s)</p>
        <button onClick={() => { setShowForm(true); setError(""); setSuccess(""); }} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm hover:bg-primary-dark transition-colors">
          <Plus size={16} />
          Create Student Account
        </button>
      </div>

      {loading ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : students.length === 0 ? (
        <div className="institution-card p-8 text-center text-sm text-muted-foreground">
          No students registered. Create a student account to get started.
        </div>
      ) : (
        <div className="institution-card overflow-hidden">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Name</th>
                <th className="text-left">Email</th>
                <th className="text-left">Student ID</th>
                <th className="text-left">Registered</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td className="text-sm font-medium text-foreground">{s.full_name}</td>
                  <td className="text-sm text-muted-foreground">{s.email}</td>
                  <td className="text-sm text-muted-foreground">{s.student_id ?? "—"}</td>
                  <td className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${s.is_active ? "status-pass" : "status-fail"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleActive(s)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title={s.is_active ? "Deactivate" : "Activate"}>
                      {s.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 flex items-center justify-center z-50 p-4">
          <div className="institution-card p-6 max-w-md w-full">
            <h3 className="font-heading font-medium text-foreground mb-4">Create Student Account</h3>
            <p className="text-xs text-muted-foreground mb-4">
              The student will use the email and password you provide to log in.
            </p>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            {success && <p className="text-sm text-correct mb-3">{success}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Student ID</label>
                <input value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                  placeholder="e.g. NRS/2024/001"
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Temporary Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary-dark transition-colors disabled:opacity-60">
                {saving ? "Creating..." : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
};

export default AdminStudents;
