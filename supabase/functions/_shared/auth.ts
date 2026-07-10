// Shared authorization helpers for Supabase edge functions.
//
// Two invocation shapes are supported across our functions:
//  - System calls (cron / DB triggers / deploy scripts) authenticate by
//    presenting the service-role key itself as the bearer token.
//  - Interactive calls (an admin/manager acting from the dashboard)
//    authenticate with their own user JWT, and must hold an allowed role
//    in `user_roles`.

export interface MinimalSupabaseClient {
  auth: {
    getClaims: (token: string) => Promise<{ data: { claims?: { sub?: string } } | null; error: unknown }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: { role?: string } | null; error: unknown }>;
      };
    };
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  return authHeader.replace("Bearer ", "");
}

/**
 * Authorizes a request that must come either from the service-role key
 * (system/cron caller) or from a user JWT whose role is in `allowedRoles`.
 * Returns null when authorized, or a Response to return immediately when not.
 */
export async function authorizeSystemOrRole(
  req: Request,
  supabase: MinimalSupabaseClient,
  serviceRoleKey: string,
  allowedRoles: string[],
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const token = extractBearerToken(req);
  if (!token) {
    return jsonResponse({ error: "Missing authorization header" }, 401, corsHeaders);
  }

  if (token === serviceRoleKey) {
    return null;
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Invalid authentication" }, 401, corsHeaders);
  }

  const requestingUserId = claimsData.claims.sub;
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", requestingUserId)
    .maybeSingle();

  if (!roleData?.role || !allowedRoles.includes(roleData.role)) {
    return jsonResponse({ error: "Forbidden" }, 403, corsHeaders);
  }

  return null;
}

/**
 * Authorizes a request that must come from the service-role key only.
 * Used by bootstrap/system-only functions where no user role can be
 * checked yet (e.g. bootstrap-admin, before any admin exists).
 */
export function authorizeSystemOnly(
  req: Request,
  serviceRoleKey: string,
  corsHeaders: Record<string, string>,
): Response | null {
  const token = extractBearerToken(req);
  if (!token || token !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
  }
  return null;
}
