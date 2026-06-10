import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "manager" | "local_mr_coordinator" | "tot";
  localMrId?: string;
}

const normalizeEmail = (value: string) => value.toLowerCase().trim();

async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;

  // Safety cap to avoid scanning forever in very large user bases
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data?.users?.find((u: any) => normalizeEmail(u.email ?? "") === target);
    if (match) return match;

    if (!data?.users || data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function purgeUserCompletely(supabaseAdmin: any, userId: string) {
  // Best-effort cleanup in public tables (covers older partial deletions)
  // IMPORTANT: remove all FK dependencies BEFORE deleting the auth user.
  const cleanupResults = await Promise.all([
    // Nullify references where we want to preserve the record but remove the user link
    supabaseAdmin.from("local_mrs").update({ coordinator_id: null }).eq("coordinator_id", userId),
    supabaseAdmin.from("farmers").update({ registered_by: null }).eq("registered_by", userId),

    // Delete records owned by / linked to this user
    supabaseAdmin.from("sales").delete().eq("tot_id", userId),
    supabaseAdmin.from("visits").delete().eq("tot_id", userId),
    supabaseAdmin.from("trainings").delete().eq("trainer_id", userId),
    supabaseAdmin.from("mechanisation_jobs").delete().eq("tot_id", userId),
    supabaseAdmin.from("machinery_bookings").delete().eq("booked_by", userId),

    // Core user-related tables
    supabaseAdmin.from("tot_assignments").delete().eq("tot_id", userId),
    supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
    supabaseAdmin.from("notification_settings").delete().eq("user_id", userId),
    supabaseAdmin.from("notifications").delete().eq("user_id", userId),
    supabaseAdmin.from("profiles").delete().eq("id", userId),
  ]);

  const cleanupError = cleanupResults.find((r: any) => r?.error)?.error;
  if (cleanupError) {
    console.warn("Cleanup warning while purging user:", cleanupError);
  }

  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (deleteAuthError) throw deleteAuthError;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the JWT token using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Token validation error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUserId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can create users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { name, email, phone, password, role, localMrId } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: name, email, password, role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    const trimmedPhone = phone?.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return new Response(
        JSON.stringify({ success: false, error: "Name must be between 2 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (normalizedEmail.length > 255) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (trimmedPhone && trimmedPhone.length > 30) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "manager", "local_mr_coordinator", "tot", "office_employee"] as const;
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate localMrId for TOT and coordinator roles
    if ((role === "tot" || role === "local_mr_coordinator") && !localMrId) {
      return new Response(
        JSON.stringify({ success: false, error: "Local MR assignment is required for TOT and Coordinator roles" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating user: ${normalizedEmail} with role: ${role}`);

    const createAuthUser = () =>
      supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { name: trimmedName, phone: trimmedPhone },
      });

    // Create the auth user with admin API
    let { data: authData, error: createAuthError } = await createAuthUser();

    // If the email exists, it may be an orphaned auth account from an older partial deletion.
    // We only auto-purge when there is NO corresponding profile record.
    if (createAuthError && (createAuthError as any)?.code === "email_exists") {
      console.warn(`Email already registered in auth: ${normalizedEmail}. Checking for orphaned account...`);

      const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);
      if (existingAuthUser?.id) {
        const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
          .from("profiles")
          .select("id, name, status")
          .eq("id", existingAuthUser.id)
          .maybeSingle();

        if (profileLookupError) {
          console.warn("Profile lookup warning:", profileLookupError);
        }

        if (existingProfile) {
          // User exists with a valid profile - cannot create duplicate
          console.error(`User ${normalizedEmail} already exists with profile ID: ${existingProfile.id}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `A user with email "${normalizedEmail}" already exists in the system. To re-invite this user, first delete them from User Management, then try again.` 
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Orphaned account - no profile exists
        console.warn(
          `Found orphaned auth user ${existingAuthUser.id} for ${normalizedEmail}. Purging then retrying create...`
        );

        try {
          await purgeUserCompletely(supabaseAdmin, existingAuthUser.id);
          // Small delay to avoid rare eventual-consistency issues
          await new Promise((r) => setTimeout(r, 150));
          ({ data: authData, error: createAuthError } = await createAuthUser());
        } catch (purgeError: unknown) {
          const message = purgeError instanceof Error ? purgeError.message : "Failed to purge existing user";
          console.error("Failed to purge orphaned user:", purgeError);
          return new Response(
            JSON.stringify({ success: false, error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (createAuthError) {
      console.error("Auth creation error:", createAuthError);
      return new Response(
        JSON.stringify({ success: false, error: createAuthError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData?.user?.id;
    if (!userId) {
      console.error("Auth createUser returned no user");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User created with ID: ${userId}`);

    // Ensure profile exists
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          name: trimmedName,
          email: normalizedEmail,
          phone: trimmedPhone || null,
          status: "active",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Non-fatal
    }

    // Assign role
    const { error: roleInsertError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role,
    });

    if (roleInsertError) {
      console.error("Role assignment error:", roleInsertError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to assign role: ${roleInsertError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If TOT or coordinator, create local MR assignment
    if (localMrId && (role === "tot" || role === "local_mr_coordinator")) {
      const { error: assignmentError } = await supabaseAdmin.from("tot_assignments").insert({
        tot_id: userId,
        local_mr_id: localMrId,
        status: "active",
      });

      if (assignmentError) {
        console.error("Assignment error:", assignmentError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to assign Local MR: ${assignmentError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Also update coordinator_id on local_mrs table if role is coordinator
    if (role === "local_mr_coordinator" && localMrId) {
      const { error: coordinatorError } = await supabaseAdmin
        .from("local_mrs")
        .update({ coordinator_id: userId })
        .eq("id", localMrId);

      if (coordinatorError) {
        console.error("Coordinator assignment error:", coordinatorError);
        // Non-fatal
      }
    }

    console.log(`User ${normalizedEmail} created successfully with role ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: userId,
          email: normalizedEmail,
          name: trimmedName,
          role,
        },
        message: `User ${trimmedName} created successfully`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
