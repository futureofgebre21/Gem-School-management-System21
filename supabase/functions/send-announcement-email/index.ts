import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { school_id, title, content, target_audience } = await req.json();

    if (!school_id || !title || !content) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create in-app notifications for all users in the school
    const { data: schoolUsers } = await supabase.from("user_roles")
      .select("user_id").eq("school_id", school_id);

    if (schoolUsers && schoolUsers.length > 0) {
      const notifications = schoolUsers.map((u: any) => ({
        user_id: u.user_id,
        school_id,
        title: `📢 ${title}`,
        message: content,
        type: "announcement",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Collect email addresses for logging/future SMTP integration
    const emails = new Set<string>();

    if (target_audience === "all" || target_audience === "teachers") {
      const { data: teachers } = await supabase.from("teachers")
        .select("email").eq("school_id", school_id).eq("status", "active");
      (teachers ?? []).forEach((t: any) => { if (t.email) emails.add(t.email); });
    }

    if (target_audience === "all" || target_audience === "parents" || target_audience === "students") {
      const { data: students } = await supabase.from("students")
        .select("parent_email").eq("school_id", school_id).eq("status", "active");
      (students ?? []).forEach((s: any) => { if (s.parent_email) emails.add(s.parent_email); });
    }

    return new Response(
      JSON.stringify({
        success: true,
        notifications_sent: schoolUsers?.length ?? 0,
        email_recipients: emails.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
