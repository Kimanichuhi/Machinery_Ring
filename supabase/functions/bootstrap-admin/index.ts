import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeSystemOnly } from "../_shared/auth.ts";

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

    // This endpoint creates the first admin account, so there is no admin
    // yet to gate it with a role check. Only the deploy operator, who holds
    // the service-role key, is allowed to invoke it.
    const authError = authorizeSystemOnly(req, serviceRoleKey, corsHeaders);
    if (authError) return authError;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get admin credentials from environment variables
    const adminEmail = Deno.env.get("BOOTSTRAP_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("BOOTSTRAP_ADMIN_PASSWORD");
    const adminName = Deno.env.get("BOOTSTRAP_ADMIN_NAME") || "System Admin";
    const adminPhone = Deno.env.get("BOOTSTRAP_ADMIN_PHONE") || "";

    if (!adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required environment variables: BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(u => u.email === adminEmail);
    
    if (existingAdmin) {
      // Check if already has admin role
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", existingAdmin.id)
        .eq("role", "admin")
        .single();
      
      if (existingRole) {
        return new Response(
          JSON.stringify({ success: true, message: "Admin already exists", userId: existingAdmin.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Assign admin role to existing user
      await supabase.from("user_roles").insert({ user_id: existingAdmin.id, role: "admin" });
      
      return new Response(
        JSON.stringify({ success: true, message: "Admin role assigned to existing user", userId: existingAdmin.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: adminName, phone: adminPhone }
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user.id;

    // Ensure profile exists (trigger should create it, but let's be safe)
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ 
        id: userId, 
        name: adminName, 
        email: adminEmail, 
        phone: adminPhone,
        status: "active"
      }, { onConflict: "id" });

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    // Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      throw roleError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin created successfully",
        userId,
        email: adminEmail
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
