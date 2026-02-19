import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { email, password, full_name, student_id } = (await req.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
      student_id?: string;
    };

    if (!email?.trim() || !password || !full_name?.trim()) {
      return new Response(
        JSON.stringify({ error: "email, password, and full_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: userError,
    } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow || roleRow.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can create student accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user: newUser },
      error: createError,
    } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (createError || !newUser) {
      return new Response(
        JSON.stringify({ error: createError?.message ?? "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: newUser.id,
      full_name: full_name.trim(),
      email: email.trim(),
      student_id: student_id?.trim() || null,
      is_active: true,
    });

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Failed to create profile: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: newUser.id,
      role: "student",
    });

    if (roleError) {
      return new Response(
        JSON.stringify({ error: "Failed to assign role: " + roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUser.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
