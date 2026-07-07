import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function getAuthToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function backendFetch<T>(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not configured. Set VITE_API_URL to your backend API URL.");
  }

  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      `Could not reach the dashboard backend at ${API_BASE_URL}. Start it with npm run dev or set VITE_API_URL to the running backend.`
    );
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  let data: any = null;

  if (text && isJson) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`The dashboard backend returned invalid JSON from ${API_BASE_URL}${path}.`);
    }
  } else if (text && !isJson) {
    const looksLikeHtml = text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html");
    throw new Error(
      looksLikeHtml
        ? `The AI request reached a web page instead of the backend API. Check that the backend is running at ${API_BASE_URL} and VITE_API_URL points to it.`
        : `The dashboard backend returned ${contentType || "a non-JSON response"} from ${API_BASE_URL}${path}.`
    );
  }

  if (!response.ok) {
    const message = data?.error || response.statusText || "Backend request failed.";
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export async function askFiaAssistant(prompt: string, context: unknown) {
  return backendFetch<{ content: string; model: string }>("/api/ai/assistant", {
    method: "POST",
    body: JSON.stringify({ prompt, context }),
  });
}

export async function fetchAdminStats() {
  return backendFetch("/api/dashboard/admin");
}

export async function fetchTotStats(totId) {
  return backendFetch(`/api/dashboard/tot?totId=${encodeURIComponent(totId)}`);
}

export async function fetchLocalMRsWithStats() {
  return backendFetch("/api/dashboard/local-mrs");
}

export async function fetchMonthlySalesData(params) {
  const query = new URLSearchParams();
  if (params?.year) query.set("year", String(params.year));
  if (params?.localMrId) query.set("localMrId", params.localMrId);
  if (params?.totId) query.set("totId", params.totId);
  return backendFetch(`/api/dashboard/monthly-sales?${query.toString()}`);
}

export async function fetchProductPerformance(localMrId) {
  const query = new URLSearchParams();
  if (localMrId) query.set("localMrId", localMrId);
  return backendFetch(`/api/dashboard/product-performance?${query.toString()}`);
}

export async function fetchTopPerformers(type, localMrId) {
  const query = new URLSearchParams();
  query.set("type", type);
  if (localMrId) query.set("localMrId", localMrId);
  return backendFetch(`/api/dashboard/top-performers?${query.toString()}`);
}

export async function fetchFarmers(filters) {
  const query = new URLSearchParams();
  if (filters?.localMrId) query.set("localMrId", filters.localMrId);
  if (filters?.status) query.set("status", filters.status);
  if (filters?.search) query.set("search", filters.search);
  return backendFetch(`/api/dashboard/farmers?${query.toString()}`);
}

export async function fetchSales(filters) {
  const query = new URLSearchParams();
  if (filters?.localMrId) query.set("localMrId", filters.localMrId);
  if (filters?.totId) query.set("totId", filters.totId);
  if (filters?.startDate) query.set("startDate", filters.startDate);
  if (filters?.endDate) query.set("endDate", filters.endDate);
  return backendFetch(`/api/dashboard/sales?${query.toString()}`);
}

export async function fetchVisits(filters) {
  const query = new URLSearchParams();
  if (filters?.localMrId) query.set("localMrId", filters.localMrId);
  if (filters?.totId) query.set("totId", filters.totId);
  return backendFetch(`/api/dashboard/visits?${query.toString()}`);
}

export async function fetchMechanisationJobs(filters) {
  const query = new URLSearchParams();
  if (filters?.localMrId) query.set("localMrId", filters.localMrId);
  if (filters?.totId) query.set("totId", filters.totId);
  if (filters?.status) query.set("status", filters.status);
  return backendFetch(`/api/dashboard/mechanisation?${query.toString()}`);
}

export async function fetchTrainings(filters) {
  const query = new URLSearchParams();
  if (filters?.localMrId) query.set("localMrId", filters.localMrId);
  if (filters?.trainerId) query.set("trainerId", filters.trainerId);
  return backendFetch(`/api/dashboard/trainings?${query.toString()}`);
}

export async function fetchUsers() {
  return backendFetch("/api/dashboard/users");
}

export async function fetchManagerStats(localMrId: string) {
  return backendFetch(`/api/dashboard/manager?localMrId=${encodeURIComponent(localMrId)}`);
}

export async function fetchCoordinatorStats() {
  return backendFetch(`/api/dashboard/coordinator/stats`);
}

export async function fetchCoordinatorTots() {
  return backendFetch(`/api/dashboard/coordinator/tots`);
}

export async function fetchCoordinatorSales() {
  return backendFetch(`/api/dashboard/coordinator/sales`);
}

export async function fetchRecentActivity(limit = 10) {
  return backendFetch(`/api/dashboard/recent-activity?limit=${encodeURIComponent(String(limit))}`);
}

export type SendSmsPayload = {
  title: string;
  message: string;
  type?: string;
  recipients: Array<{
    id?: string;
    farmer_id?: string;
    name?: string;
    phone: string;
    variables?: Record<string, unknown>;
  }>;
};

export async function sendSms(payload: SendSmsPayload) {
  return backendFetch<{
    messageId?: string;
    provider: string;
    status: string;
    recipients: Array<{ phone: string; providerId?: string; status: string }>;
    warning?: string | null;
  }>("/api/communication/send-sms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function getWeatherStatus() {
  return backendFetch<{
    status: 'configured' | 'not_configured' | 'error';
    location?: string;
    message?: string;
    snapshot?: Record<string, unknown>;
    lastUpdated?: string;
  }>('/api/communication/weather-status');
}

export async function syncWeather() {
  return backendFetch<{
    status: 'configured' | 'not_configured' | 'error';
    location?: string;
    message?: string;
    snapshot?: Record<string, unknown>;
    lastUpdated?: string;
    recommendations?: Array<Record<string, unknown>>;
    synced?: boolean;
  }>('/api/communication/sync-weather', {
    method: 'POST',
  });
}