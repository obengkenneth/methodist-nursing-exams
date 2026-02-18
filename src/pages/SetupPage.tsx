import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import mugLogo from "@/assets/mug-logo.png";

/**
 * Admin Setup Page — used ONLY to create the first administrator account.
 * After setup, this page can be disabled by the developer.
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

    await supabase.from("profiles").insert({
      user_id: userId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      is_active: true,
    });

    await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });

    setSuccess("Admin account created. You can now log in.");
    setSaving(false);
    setTimeout(() => navigate("/login"), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-primary-dark py-2 px-6">
        <p className="text-xs text-primary-foreground/70 text-center">
          Methodist University Ghana — Initial System Setup
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={mugLogo} alt="MUG" className="h-16 mx-auto mb-4 object-contain" />
            <h1 className="font-heading text-xl font-medium text-foreground">Administrator Setup</h1>
            <p className="text-sm text-muted-foreground mt-1">Create the first administrator account</p>
          </div>
          <div className="institution-card p-8">
            <div className="p-3 bg-muted border border-border rounded mb-5 text-xs text-muted-foreground">
              This page is for initial system setup only. Use setup key: <strong>MUG-NURSING-SETUP-2024</strong>
            </div>
            {error && <p className="text-sm text-incorrect mb-4">{error}</p>}
            {success && <p className="text-sm text-correct mb-4">{success}</p>}
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Setup Key *</label>
                <input type="password" value={form.setupKey} onChange={e => setForm(p => ({ ...p, setupKey: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 mt-2">
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
