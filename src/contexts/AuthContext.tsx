import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "student" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string): Promise<AppRole> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as AppRole) ?? null;
  };

  const fetchRoleWithTimeout = (userId: string, ms: number) =>
    Promise.race([
      fetchRole(userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);

  useEffect(() => {
    const applySession = async (session: Session | null) => {
      if (!session?.user) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      const r = await fetchRole(session.user.id);
      if (r === "student") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (profile?.is_active === false) {
          await supabase.auth.signOut();
          return;
        }
      }
      setSession(session);
      setUser(session.user);
      setLoading(false);
      fetchRoleWithTimeout(session.user.id, 8000).then(setRole);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error };
    const role = await fetchRole(data.user.id);
    if (role === "student") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (profile?.is_active === false) {
        await supabase.auth.signOut();
        return { error: new Error("Your account has been deactivated. Please contact your administrator.") };
      }
    }
    return { error: null };
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    if (!user || role !== "student") return;
    let cancelled = false;
    const checkActive = () => {
      supabase
        .from("profiles")
        .select("is_active")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (data?.is_active === false) {
            sessionStorage.setItem("loginMessage", "Your account has been deactivated. Please contact your administrator.");
            signOut();
          }
        });
    };
    checkActive();
    const interval = setInterval(checkActive, 30_000);
    const onFocus = () => checkActive();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, role, signOut]);

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
