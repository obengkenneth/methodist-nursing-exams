import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import mugLogo from "@/assets/mug-logo.png";

const LoginPage: React.FC = () => {
  const { user, role, signIn, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    const { error: err } = await signIn(email.trim(), password);
    if (err) {
      setError("Invalid credentials. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header bar */}
      <div className="bg-primary-dark border-b border-primary-dark py-2 px-6">
        <p className="text-xs text-primary-foreground/70 text-center">
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
          <div className="institution-card p-8">
            <h2 className="font-heading text-lg font-medium text-foreground mb-1">
              Sign In
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your institutional credentials to access the exam portal.
            </p>

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
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
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
