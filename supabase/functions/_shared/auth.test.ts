import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { authorizeSystemOnly, authorizeSystemOrRole, type MinimalSupabaseClient } from "./auth.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const SERVICE_ROLE_KEY = "test-service-role-key";

function makeRequest(token?: string): Request {
  const headers = new Headers();
  if (token !== undefined) headers.set("Authorization", `Bearer ${token}`);
  return new Request("https://example.com/fn", { headers });
}

function makeSupabaseStub(opts: {
  claimsSub?: string;
  claimsError?: unknown;
  role?: string;
}): MinimalSupabaseClient {
  return {
    auth: {
      getClaims: async (_token: string) => {
        if (opts.claimsError) return { data: null, error: opts.claimsError };
        return { data: { claims: opts.claimsSub ? { sub: opts.claimsSub } : undefined }, error: null };
      },
    },
    from: (_table: string) => ({
      select: (_columns: string) => ({
        eq: (_column: string, _value: string) => ({
          maybeSingle: async () => ({ data: opts.role ? { role: opts.role } : null, error: null }),
        }),
      }),
    }),
  };
}

Deno.test("authorizeSystemOrRole: rejects with 401 when no Authorization header", async () => {
  const supabase = makeSupabaseStub({});
  const res = await authorizeSystemOrRole(makeRequest(undefined), supabase, SERVICE_ROLE_KEY, ["admin"], corsHeaders);
  assertEquals(res?.status, 401);
});

Deno.test("authorizeSystemOrRole: allows the service-role key through", async () => {
  const supabase = makeSupabaseStub({});
  const res = await authorizeSystemOrRole(makeRequest(SERVICE_ROLE_KEY), supabase, SERVICE_ROLE_KEY, ["admin"], corsHeaders);
  assertEquals(res, null);
});

Deno.test("authorizeSystemOrRole: rejects with 401 when the JWT is invalid", async () => {
  const supabase = makeSupabaseStub({ claimsError: new Error("bad token") });
  const res = await authorizeSystemOrRole(makeRequest("garbage-token"), supabase, SERVICE_ROLE_KEY, ["admin"], corsHeaders);
  assertEquals(res?.status, 401);
});

Deno.test("authorizeSystemOrRole: rejects with 403 when the caller's role is not allowed", async () => {
  const supabase = makeSupabaseStub({ claimsSub: "user-1", role: "tot" });
  const res = await authorizeSystemOrRole(makeRequest("user-jwt"), supabase, SERVICE_ROLE_KEY, ["admin", "manager"], corsHeaders);
  assertEquals(res?.status, 403);
});

Deno.test("authorizeSystemOrRole: rejects with 403 when the caller has no role row at all", async () => {
  const supabase = makeSupabaseStub({ claimsSub: "user-1" });
  const res = await authorizeSystemOrRole(makeRequest("user-jwt"), supabase, SERVICE_ROLE_KEY, ["admin", "manager"], corsHeaders);
  assertEquals(res?.status, 403);
});

Deno.test("authorizeSystemOrRole: allows a caller whose role is in the allowed list", async () => {
  const supabase = makeSupabaseStub({ claimsSub: "user-1", role: "manager" });
  const res = await authorizeSystemOrRole(makeRequest("user-jwt"), supabase, SERVICE_ROLE_KEY, ["admin", "manager"], corsHeaders);
  assertEquals(res, null);
});

Deno.test("authorizeSystemOnly: rejects with 401 when no Authorization header", () => {
  const res = authorizeSystemOnly(makeRequest(undefined), SERVICE_ROLE_KEY, corsHeaders);
  assertEquals(res?.status, 401);
});

Deno.test("authorizeSystemOnly: rejects with 401 when the token does not match the service-role key", () => {
  const res = authorizeSystemOnly(makeRequest("anon-key-or-anything-else"), SERVICE_ROLE_KEY, corsHeaders);
  assertEquals(res?.status, 401);
});

Deno.test("authorizeSystemOnly: allows the service-role key through", () => {
  const res = authorizeSystemOnly(makeRequest(SERVICE_ROLE_KEY), SERVICE_ROLE_KEY, corsHeaders);
  assertEquals(res, null);
});
