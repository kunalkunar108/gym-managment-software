import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_URL") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization");
    if (!authorization) return respond({ error: "Sign in as the gym owner first." }, 401);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return respond({ error: "Your owner session is invalid." }, 401);
    const [{ data: ownerId }, { data: isOwner }] = await Promise.all([
      userClient.rpc("current_gym_owner_id"),
      userClient.rpc("is_gym_owner"),
    ]);
    if (!ownerId || isOwner !== true || ownerId !== userData.user.id) {
      return respond({ error: "Only the gym owner can manage trainer accounts." }, 403);
    }

    const { staff_id, action, password } = await req.json();
    if (!staff_id || !["invite", "remove"].includes(action)) return respond({ error: "Invalid request." }, 400);

    const admin = createClient(url, serviceKey);
    const { data: staff, error: staffError } = await admin.from("staff")
      .select("id,owner_id,full_name,email,status,user_id")
      .eq("id", staff_id).eq("owner_id", ownerId).eq("role", "trainer").maybeSingle();
    if (staffError || !staff) return respond({ error: "Trainer record not found." }, 404);

    if (action === "invite") {
      if (staff.status !== "active") return respond({ error: "Activate this trainer record before sending an invitation." }, 400);
      if (!staff.email) return respond({ error: "Add an email address to this trainer record first." }, 400);
      if (staff.user_id) return respond({ error: "This trainer already has a login account." }, 409);

      const appUrl = Deno.env.get("APP_URL") || "https://gym-managment-software-ecru.vercel.app";
      if (password !== undefined && (typeof password !== "string" || password.length < 8)) {
        return respond({ error: "Trainer password must be at least 8 characters." }, 400);
      }
      const userMetadata = { full_name: staff.full_name, account_type: "trainer" };
      const { data: invited, error: inviteError } = password
        ? await admin.auth.admin.createUser({ email: staff.email, password, email_confirm: true, user_metadata: userMetadata })
        : await admin.auth.admin.inviteUserByEmail(staff.email, {
            data: userMetadata,
            redirectTo: appUrl,
          });
      if (inviteError || !invited.user) return respond({ error: inviteError?.message || "Could not create trainer login." }, 400);

      const { error: linkError } = await admin.from("staff").update({ user_id: invited.user.id })
        .eq("id", staff.id).eq("owner_id", ownerId);
      if (linkError) {
        await admin.auth.admin.deleteUser(invited.user.id);
        return respond({ error: "Invitation could not be linked to the trainer record: " + linkError.message }, 500);
      }
      return respond({ message: password ? "Trainer login created for " + staff.email + "." : "Trainer invitation sent to " + staff.email + "." });
    }

    if (action === "remove") {
      if (!staff.user_id) return respond({ error: "This trainer does not have a login account." }, 400);
      const { error: deleteError } = await admin.auth.admin.deleteUser(staff.user_id);
      if (deleteError) return respond({ error: deleteError.message }, 400);
      return respond({ message: "Trainer login removed. The staff record remains in your directory." });
    }
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : "Unexpected server error." }, 500);
  }
});
