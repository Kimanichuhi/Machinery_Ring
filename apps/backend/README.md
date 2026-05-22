Backend application for server-side dashboard APIs.

This app owns Express routes, Supabase service-role access, server middleware, jobs, and backend-only modules. It loads `apps/backend/.env` first and then falls back to the repository root `.env` for local compatibility.
