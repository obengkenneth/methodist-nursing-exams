import React, { useEffect, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { PasswordInput } from "@/components/ui/password-input";
import { supabase } from "@/integrations/supabase/client";
import { Plus, UserCheck, UserX, Pencil, Key } from "lucide-react";

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
  const [editStudent, setEditStudent] = useState<StudentProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", student_id: "" });
  const [changePasswordStudent, setChangePasswordStudent] = useState<StudentProfile | null>(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStudents = async () => {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");
    const studentIds = (roleRows ?? []).map(r => r.user_id);
    if (studentIds.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false });
    setStudents(data ?? []);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleCreate = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required."); return;
    }
    setSaving(true); setError(""); setSuccess("");

    const payload = {
      email: form.email.trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      student_id: form.student_id.trim() || undefined,
    };

    const { data: fnData, error: fnError } = await supabase.functions.invoke("create-student", {
      body: payload,
    });

    if (!fnError && fnData?.success) {
      setSuccess(`Account created for ${form.full_name}.`);
      setForm({ full_name: "", email: "", student_id: "", password: "" });
      setSaving(false);
      loadStudents();
      return;
    }

    // Function was called but returned an error (401, 403, 500, etc.): show message and stay on page.
    const errorMessage = typeof fnData?.error === "string" ? fnData.error : fnError?.message ?? "Failed to create student account.";
    setError(errorMessage);
    setSaving(false);
  };

  const toggleActive = async (s: StudentProfile) => {
    await supabase.from("profiles").update({ is_active: !s.is_active }).eq("id", s.id);
    loadStudents();
  };

  const openEdit = (s: StudentProfile) => {
    setEditStudent(s);
    setEditForm({ full_name: s.full_name, email: s.email, student_id: s.student_id ?? "" });
    setError("");
    setSuccess("");
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;
    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      setError("Name and email are required."); return;
    }
    setSaving(true); setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        student_id: editForm.student_id.trim() || null,
      })
      .eq("id", editStudent.id);
    if (updateError) {
      setError(updateError.message); setSaving(false); return;
    }
    setSuccess("Student updated.");
    setEditStudent(null);
    setSaving(false);
    loadStudents();
  };

  const openChangePassword = (s: StudentProfile) => {
    setChangePasswordStudent(s);
    setPasswordForm({ newPassword: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  };

  const handleChangePassword = async () => {
    if (!changePasswordStudent) return;
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match."); return;
    }
    setSaving(true); setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }
    const { data: fnData, error: fnError } = await supabase.functions.invoke("update-student-password", {
      body: { user_id: changePasswordStudent.user_id, password: passwordForm.newPassword },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!fnError && fnData?.success) {
      setSuccess("Password updated. The student can sign in with the new password.");
      setChangePasswordStudent(null);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } else {
      const msg = typeof fnData?.error === "string" ? fnData.error : fnError?.message ?? "Failed to update password.";
      setError(msg);
    }
    setSaving(false);
  };

  return (
    <SidebarLayout title="Manage Students">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">{students.length} registered student(s)</p>
        <button onClick={() => { setShowForm(true); setError(""); setSuccess(""); }} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
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
        <div className="institution-card overflow-hidden overflow-x-auto">
          <table className="w-full data-table min-w-[600px]">
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
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openChangePassword(s)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Change password">
                        <Key size={15} />
                      </button>
                      <button onClick={() => toggleActive(s)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title={s.is_active ? "Deactivate" : "Activate"}>
                        {s.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editStudent && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="institution-card p-6 max-w-md w-full">
            <h3 className="font-heading font-medium text-foreground mb-4">Edit Student</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Updating name, email, or student ID here only updates the profile record. The student continues to sign in with their current email.
            </p>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            {success && <p className="text-sm text-correct mb-3">{success}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email (display) *</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Student ID</label>
                <input value={editForm.student_id} onChange={e => setEditForm(p => ({ ...p, student_id: e.target.value }))}
                  placeholder="e.g. NRS/2024/001"
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setEditStudent(null); setError(""); setSuccess(""); }} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {changePasswordStudent && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="institution-card p-6 max-w-md w-full">
            <h3 className="font-heading font-medium text-foreground mb-4">Change password</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a new password for <strong>{changePasswordStudent.full_name}</strong> ({changePasswordStudent.email}). They will use it to sign in.
            </p>
            {error && <p className="text-sm text-incorrect mb-3">{error}</p>}
            {success && <p className="text-sm text-correct mb-3">{success}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New password *</label>
                <PasswordInput
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min 6 characters"
                  className="input-focus w-full px-3 py-2 pr-10 text-sm border border-input rounded-md bg-card text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password *</label>
                <PasswordInput
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="input-focus w-full px-3 py-2 pr-10 text-sm border border-input rounded-md bg-card text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setChangePasswordStudent(null); setError(""); setSuccess(""); }} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleChangePassword} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
                {saving ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Student ID</label>
                <input value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
                  placeholder="e.g. NRS/2024/001"
                  className="input-focus w-full px-3 py-2 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Temporary Password *</label>
                <PasswordInput value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input-focus w-full px-3 py-2 pr-10 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 py-2 text-sm disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
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
