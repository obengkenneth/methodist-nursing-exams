import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import mugLogo from "@/assets/mug-logo.png";

/**
 * Admin Setup Page — create administrator accounts.
 * Anyone with the setup key can create an admin account (first or additional).
 * Restrict or remove the /setup route when you no longer want new admins created here.
 */
const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", setupKey: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const SETUP_KEY = "MUG-NURSING-SETUP-2024"; // Simple guard — change or remove after first use

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.setupKey !== SETUP_KEY) { setError("Invalid setup key."); return; }
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("All fields are required."); return;
    }
    setSaving(true); setError("");

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    });

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message ?? "Failed to create account.");
      setSaving(false); return;
    }

    const userId = signUpData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: userId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      is_active: true,
    });
    if (profileError) {
      setError(profileError.message ?? "Failed to create profile.");
      setSaving(false);
      return;
    }

    const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (roleError) {
      setError(roleError.message ?? "Failed to assign admin role. You may need to run the latest migration (allow first admin user_roles).");
      setSaving(false);
      return;
    }

    setSuccess("Admin account created. You can log in with this account or create another admin below.");
    setSaving(false);
    setForm((p) => ({ ...p, full_name: "", email: "", password: "" }));
  };

  return (
    <div className="min-h-screen auth-page-bg flex flex-col">
      <div className="bg-primary-dark py-2 px-6 shadow-sm">
        <p className="text-xs text-primary-foreground/70 text-center">
          Methodist University Ghana — Initial System Setup
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={mugLogo} alt="MUG" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="font-heading text-xl font-medium text-foreground">Administrator Setup</h1>
            <p className="text-sm text-muted-foreground mt-1">Create an administrator account</p>
          </div>
          <div className="institution-card card-elevated rounded-[10px] border-t-4 border-primary p-8">
            
            {error && <p className="text-sm text-incorrect mb-4">{error}</p>}
            {success && (
              <div className="mb-4 flex flex-col gap-2">
                <p className="text-sm text-correct">{success}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSuccess(""); setForm((p) => ({ ...p, full_name: "", email: "", password: "" })); }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Create another admin
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Go to Sign in
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Setup Key *</label>
                <PasswordInput value={form.setupKey} onChange={e => setForm(p => ({ ...p, setupKey: e.target.value }))}
                  className="input-focus w-full px-3 py-2.5 pr-10 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="input-focus w-full px-3 py-2.5 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input-focus w-full px-3 py-2.5 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                <PasswordInput value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input-focus w-full px-3 py-2.5 pr-10 text-sm border border-input rounded-md bg-card text-foreground" />
              </div>
              <button type="submit" disabled={saving}
                className="btn-primary w-full py-2.5 mt-2 disabled:opacity-60 disabled:transform-none disabled:hover:shadow-none">
                {saving ? "Creating Account..." : "Create Admin Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
