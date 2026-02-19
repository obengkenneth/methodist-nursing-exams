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
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    const jwt = authHeader?.replace(/^\s*Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user: caller },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !caller) {
      return new Response(
        JSON.stringify({ error: userError?.message ?? "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { user_id, password } = (await req.json()) as {
      user_id?: string;
      password?: string;
    };

    if (!user_id || !password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "user_id and password (min 6 characters) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
        JSON.stringify({ error: "Only admins can change student passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: targetRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user_id)
      .eq("role", "student")
      .maybeSingle();

    if (!targetRole) {
      return new Response(
        JSON.stringify({ error: "User is not a student or does not exist" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
