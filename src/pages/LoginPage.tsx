import React, { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordInput } from "@/components/ui/password-input";
import { Lock, GraduationCap } from "lucide-react";
import mugLogo from "@/assets/mug-logo.png";

const LoginPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [storedMessage, setStoredMessage] = useState("");
  const message = searchParams.get("message");

  useEffect(() => {
    if (message) setSearchParams({}, { replace: true });
  }, [message, setSearchParams]);

  useEffect(() => {
    if (!user && !loading) {
      const m = sessionStorage.getItem("loginMessage");
      if (m) {
        sessionStorage.removeItem("loginMessage");
        setStoredMessage(m);
      }
    }
  }, [user, loading]);

  if (!loading && user) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setSubmitting(true);
    const timeout = new Promise<{ error: Error | null }>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timed out. Please try again.")), 15000)
    );
    const result = await Promise.race([signIn(email.trim(), password), timeout]).catch((e) => ({
      error: e instanceof Error ? e : new Error("Something went wrong"),
    }));
    const err = "error" in result ? result.error : null;
    if (err) {
      const msg = err?.message ?? "";
      if (msg.toLowerCase().includes("confirm") || msg.toLowerCase().includes("verified")) {
        setError("Your email is not confirmed yet. Check your inbox for the confirmation link, or ask your admin to disable “Confirm email” in Supabase (Authentication → Providers → Email).");
      } else if (msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("credentials")) {
        setError("Invalid credentials.");
      } else {
        setError(msg || "Invalid credentials. Please try again.");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header bar — sticky */}
      <div className="sticky top-0 z-10 bg-primary-dark border-b border-primary-dark py-2 px-6">
        <p className="text-xs text-primary-foreground/70 text-center flex items-center justify-center gap-1.5">
          <GraduationCap size={14} className="flex-shrink-0" />
          Methodist University Ghana — School of Nursing and Midwifery
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Institution header */}
          <div className="text-center mb-8">
            <img
              src={mugLogo}
              alt="Methodist University Ghana"
              className="h-20 mx-auto mb-4 object-contain"
            />
            <h1 className="font-heading text-2xl font-medium text-foreground mb-1">
              Nursing Exam Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              School of Nursing and Midwifery
            </p>
          </div>

          {/* Login card */}
          <div className="institution-card card-elevated rounded-[10px] p-8">
            <h2 className="font-heading text-lg font-medium text-foreground mb-1 flex items-center gap-2">
              <Lock size={18} className="text-muted-foreground flex-shrink-0" />
              Sign In
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your institutional credentials to access the exam portal.
            </p>

            {(message || storedMessage) && (
              <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-sm text-amber-800 dark:text-amber-200">
                {message ? decodeURIComponent(message) : storedMessage}
              </div>
            )}
            {error && (
              <div className="mb-5 p-3 bg-incorrect-bg border border-incorrect/30 rounded text-sm text-incorrect">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@institution.edu.gh"
                  className="input-focus w-full px-3 py-2.5 text-sm border border-input rounded-md bg-card text-foreground placeholder:text-muted-foreground transition-colors"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-focus w-full px-3 py-2.5 pr-10 text-sm border border-input rounded-md bg-card text-foreground placeholder:text-muted-foreground transition-colors"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full py-2.5 px-4 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Student accounts are created by administrators only.
                <br />
                Contact your department if you cannot log in.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} Methodist University Ghana. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
