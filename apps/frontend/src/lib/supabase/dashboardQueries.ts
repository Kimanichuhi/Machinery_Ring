// src/lib/supabase/dashboardQueries.ts
import { supabase } from "@/integrations/supabase/client";

export interface AdminStats {
  totalFarmers: number;
  totalSales: number;
  totalMRs: number;
  totalTots: number;
  totalRevenue: number;
  totalProducts: number;
  pendingApprovals: number;
  activeTots: number;
  completedMechanisation: number;
  mechanisationJobs: number;
  trainingsHeld: number;
}

export interface ManagerStats {
  totalFarmers: number;
  totalTots: number;
  totalSales: number;
  totalRevenue: number;
  totalVisits: number;
  totalTrainings: number;
  pendingApprovals: number;
  pendingMechanisation: number;
}

export interface TotStats {
  totalFarmers: number;
  totalSales: number;
  totalRevenue: number;
  mechanisationJobs: number;
  visitsCompleted: number;
  trainingsHeld: number;
  totalCommission: number;
  pendingSync: number;
}

export interface LocalMRWithStats {
  id: string;
  name: string;
  code: string;
  region: string;
  county: string;
  sub_county: string | null;
  ward: string | null;
  status: string;
  coordinator_id: string | null;
  totalTots: number;
  totalFarmers: number;
  coordinatorName?: string;
}

export interface MonthlySalesData {
  month: string;
  value: number;
  count: number;
}

export interface ProductPerformance {
  name: string;
  value: number;
  productId: string;
}

export interface TopPerformer {
  id: string;
  name: string;
  metric: string;
  value: string;
  rank: number;
}

function throwIfError(error: unknown) {
  if (!error) return;
  const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
  throw new Error(message || JSON.stringify(error));
}

function countValue(result: { count: number | null; error: unknown }) {
  throwIfError(result.error);
  return result.count || 0;
}

function sumBy<T>(rows: T[] | null, selector: (row: T) => unknown) {
  return (rows || []).reduce((sum, row) => sum + Number(selector(row) || 0), 0);
}

function getMonthRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
  };
}

async function fetchProfileNames(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", uniqueIds);

  throwIfError(error);
  return new Map((data || []).map((profile) => [profile.id, profile.name || "Unknown"]));
}

async function getLocalMrForCoordinator(userId: string) {
  const { data, error } = await supabase
    .from("local_mrs")
    .select("id, name")
    .eq("coordinator_id", userId)
    .maybeSingle();

  throwIfError(error);
  return data || null;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [
    farmersResult,
    salesResult,
    localMrsResult,
    totsResult,
    productsResult,
    machineryBookingsResult,
    trainingsResult,
  ] = await Promise.all([
    supabase.from("farmers").select("id", { count: "exact", head: true }),
    supabase.from("sales").select("id, total_amount", { count: "exact" }),
    supabase.from("local_mrs").select("id", { count: "exact", head: true }),
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "tot"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("machinery_bookings").select("id, status", { count: "exact" }),
    supabase.from("trainings").select("id", { count: "exact", head: true }),
  ]);

  const totalRevenue = sumBy(salesResult.data, (sale) => sale.total_amount);
  const completedMechanisation = (machineryBookingsResult.data || []).filter((job) => job.status === "completed").length;

  return {
    totalFarmers: countValue(farmersResult),
    totalSales: countValue(salesResult),
    totalMRs: countValue(localMrsResult),
    totalTots: countValue(totsResult),
    totalRevenue,
    totalProducts: countValue(productsResult),
    pendingApprovals: 0,
    activeTots: countValue(totsResult),
    completedMechanisation,
    mechanisationJobs: countValue(machineryBookingsResult),
    trainingsHeld: countValue(trainingsResult),
  };
}

export async function fetchTotStats(totId: string): Promise<TotStats> {
  const [salesResult, visitsResult, machineryBookingsResult, trainingsResult, farmerIdsResult] = await Promise.all([
    supabase.from("sales").select("id, total_amount, commission_amount").eq("tot_id", totId),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("tot_id", totId),
    supabase.from("machinery_bookings").select("id", { count: "exact", head: true }).eq("booked_by", totId),
    supabase.from("trainings").select("id", { count: "exact", head: true }).eq("trainer_id", totId),
    supabase.from("sales").select("farmer_id").eq("tot_id", totId),
  ]);

  [salesResult, visitsResult, machineryBookingsResult, trainingsResult, farmerIdsResult].forEach((result) => throwIfError(result.error));

  const uniqueFarmers = new Set((farmerIdsResult.data || []).map((sale) => sale.farmer_id).filter(Boolean)).size;

  return {
    totalFarmers: uniqueFarmers,
    totalSales: salesResult.data?.length || 0,
    totalRevenue: sumBy(salesResult.data, (sale) => sale.total_amount),
    mechanisationJobs: machineryBookingsResult.count || 0,
    visitsCompleted: visitsResult.count || 0,
    trainingsHeld: trainingsResult.count || 0,
    totalCommission: sumBy(salesResult.data, (sale) => sale.commission_amount),
    pendingSync: 0,
  };
}

export async function fetchManagerStats(localMrId: string): Promise<ManagerStats> {
  const [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, mechanisationResult] = await Promise.all([
    supabase.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
    supabase.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId).eq("status", "active"),
    supabase.from("sales").select("total_amount").eq("local_mr_id", localMrId),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
    supabase.from("trainings").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
    supabase.from("mechanisation_jobs").select("status").eq("local_mr_id", localMrId),
  ]);

  [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, mechanisationResult].forEach((result) => throwIfError(result.error));

  return {
    totalFarmers: farmersResult.count || 0,
    totalTots: totsResult.count || 0,
    totalSales: salesResult.data?.length || 0,
    totalRevenue: sumBy(salesResult.data, (sale) => sale.total_amount),
    totalVisits: visitsResult.count || 0,
    totalTrainings: trainingsResult.count || 0,
    pendingApprovals: 0,
    pendingMechanisation: (mechanisationResult.data || []).filter((job) => job.status === "pending").length,
  };
}

export async function fetchCoordinatorStats(userId: string) {
  const localMr = await getLocalMrForCoordinator(userId);
  if (!localMr) {
    throw new Error("No Local MR assigned to this coordinator.");
  }

  const [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, machineryResult] = await Promise.all([
    supabase.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
    supabase.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id).eq("status", "active"),
    supabase.from("sales").select("total_amount").eq("local_mr_id", localMr.id),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
    supabase.from("trainings").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
    supabase.from("machinery_bookings").select("id, status", { count: "exact" }).eq("local_mr_id", localMr.id),
  ]);

  [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, machineryResult].forEach((result) => throwIfError(result.error));

  return {
    totalFarmers: farmersResult.count || 0,
    totalTots: totsResult.count || 0,
    activeTots: totsResult.count || 0,
    totalSales: salesResult.data?.length || 0,
    totalRevenue: sumBy(salesResult.data, (sale) => sale.total_amount),
    completedJobs: (machineryResult.data || []).filter((job) => job.status === "completed").length,
    totalTrainings: trainingsResult.count || 0,
    totalVisits: visitsResult.count || 0,
    localMrName: localMr.name,
    localMrId: localMr.id,
  };
}

export async function fetchCoordinatorTots(userId: string) {
  const localMr = await getLocalMrForCoordinator(userId);
  if (!localMr) {
    throw new Error("No Local MR assigned to this coordinator.");
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("tot_assignments")
    .select("tot_id, status")
    .eq("local_mr_id", localMr.id);

  throwIfError(assignmentsError);
  const totIds = [...new Set((assignments || []).map((assignment) => assignment.tot_id).filter(Boolean))];

  const [profilesResult, salesResult, bookingsResult, trainingsResult, attendeesResult, visitsResult] = await Promise.all([
    totIds.length > 0 ? supabase.from("profiles").select("id, name, email, phone, status, created_at").in("id", totIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("sales").select("tot_id, total_amount, commission_amount, sale_date").eq("local_mr_id", localMr.id),
    supabase.from("machinery_bookings").select("tot_id, status, start_date").eq("local_mr_id", localMr.id),
    supabase.from("trainings").select("id, trainer_id, status, scheduled_date").eq("local_mr_id", localMr.id),
    totIds.length > 0 ? supabase.from("training_attendees").select("training_id, profile_id").in("profile_id", totIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("visits").select("tot_id, profile_id, visit_date").eq("local_mr_id", localMr.id),
  ]);

  [profilesResult, salesResult, bookingsResult, trainingsResult, attendeesResult, visitsResult].forEach((result) => throwIfError(result.error));

  const trainingDetailsMap = new Map((trainingsResult.data || []).map((training) => [training.id, { status: training.status, scheduled_date: training.scheduled_date }]));
  const byTot = new Map<string, any>();

  function ensure(id: string) {
    if (!byTot.has(id)) {
      byTot.set(id, { salesCount: 0, totalRevenue: 0, totalCommission: 0, jobsCount: 0, completedJobsCount: 0, trainingsCount: 0, completedTrainingsCount: 0, visitsCount: 0, lastActivityDate: null });
    }
    return byTot.get(id);
  }

  (salesResult.data || []).forEach((sale) => {
    if (!sale.tot_id || !totIds.includes(sale.tot_id)) return;
    const item = ensure(sale.tot_id);
    item.salesCount += 1;
    item.totalRevenue += Number(sale.total_amount || 0);
    item.totalCommission += Number(sale.commission_amount || 0);
    item.lastActivityDate = latestDate(item.lastActivityDate, sale.sale_date);
  });

  (bookingsResult.data || []).forEach((booking) => {
    if (!booking.tot_id || !totIds.includes(booking.tot_id)) return;
    const item = ensure(booking.tot_id);
    item.jobsCount += 1;
    if (booking.status === "completed") item.completedJobsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, booking.start_date);
  });

  (trainingsResult.data || []).forEach((training) => {
    if (!training.trainer_id || !totIds.includes(training.trainer_id)) return;
    const item = ensure(training.trainer_id);
    item.trainingsCount += 1;
    if (training.status === "completed") item.completedTrainingsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, training.scheduled_date);
  });

  (attendeesResult.data || []).forEach((attendance) => {
    if (!attendance.profile_id || !totIds.includes(attendance.profile_id)) return;
    const item = ensure(attendance.profile_id);
    const trainingDetails = trainingDetailsMap.get(attendance.training_id);
    item.trainingsCount += 1;
    if (trainingDetails?.status === "completed") item.completedTrainingsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, trainingDetails?.scheduled_date);
  });

  (visitsResult.data || []).forEach((visit) => {
    const ids = [visit.tot_id, visit.profile_id].filter((id): id is string => !!id && totIds.includes(id));
    ids.forEach((id) => {
      const item = ensure(id);
      item.visitsCount += 1;
      item.lastActivityDate = latestDate(item.lastActivityDate, visit.visit_date);
    });
  });

  const profileMap = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));

  return (assignments || []).map((assignment) => {
    const profile = profileMap.get(assignment.tot_id) || { id: assignment.tot_id, name: "Unknown", email: "", phone: "", status: "inactive", created_at: null };
    const metrics = ensure(assignment.tot_id);
    return {
      ...metrics,
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone || "",
      role: "tot",
      status: assignment.status || profile.status,
      createdAt: profile.created_at || null,
      localMrId: localMr.id,
      localMrName: localMr.name,
    };
  });
}

export async function fetchCoordinatorSales(userId: string) {
  const localMr = await getLocalMrForCoordinator(userId);
  if (!localMr) {
    throw new Error("No Local MR assigned to this coordinator.");
  }

  return fetchSales({ localMrId: localMr.id });
}

function latestDate(current: string | null, next?: string | null) {
  if (!next) return current;
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

export async function fetchLocalMRsWithStats(): Promise<LocalMRWithStats[]> {
  const { data: localMrs, error } = await supabase
    .from("local_mrs")
    .select("id, name, region, county, sub_county, ward, status, coordinator_id")
    .eq("status", "active");

  throwIfError(error);

  const profileNames = await fetchProfileNames((localMrs || []).map((mr) => mr.coordinator_id).filter(Boolean) as string[]);

  return Promise.all(
    (localMrs || []).map(async (mr) => {
      const [totsResult, farmersResult] = await Promise.all([
        supabase.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id).eq("status", "active"),
        supabase.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id),
      ]);

      return {
        id: mr.id,
        name: mr.name,
        code: String(mr.name || "").substring(0, 3).toUpperCase(),
        region: mr.region,
        county: mr.county,
        sub_county: mr.sub_county,
        ward: mr.ward,
        status: mr.status,
        coordinator_id: mr.coordinator_id,
        totalTots: countValue(totsResult),
        totalFarmers: countValue(farmersResult),
        coordinatorName: mr.coordinator_id ? profileNames.get(mr.coordinator_id) : undefined,
      };
    })
  );
}

export async function fetchMonthlySalesData(params?: {
  localMrId?: string;
  totId?: string;
  year?: number;
}): Promise<MonthlySalesData[]> {
  const year = params?.year || new Date().getFullYear();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  let query = supabase
    .from("sales")
    .select("sale_date, total_amount")
    .gte("sale_date", startDate)
    .lte("sale_date", endDate);

  if (params?.localMrId) query = query.eq("local_mr_id", params.localMrId);
  if (params?.totId) query = query.eq("tot_id", params.totId);

  const { data, error } = await query;
  throwIfError(error);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Object.fromEntries(months.map((month) => [month, { value: 0, count: 0 }]));

  (data || []).forEach((sale) => {
    const monthName = new Date(sale.sale_date).toLocaleString("en-US", { month: "short" });
    if (!monthlyData[monthName]) return;
    monthlyData[monthName].value += Number(sale.total_amount || 0);
    monthlyData[monthName].count += 1;
  });

  return months.map((month) => ({ month, value: monthlyData[month].value, count: monthlyData[month].count }));
}

export async function fetchProductPerformance(localMrId?: string): Promise<ProductPerformance[]> {
  let query = supabase
    .from("sales")
    .select("product_id, total_amount, products(name)");

  if (localMrId) query = query.eq("local_mr_id", localMrId);

  const { data, error } = await query;
  throwIfError(error);

  const productMap = new Map<string, { name: string; value: number }>();
  (data || []).forEach((sale: any) => {
    const productId = sale.product_id || "unknown";
    const existing = productMap.get(productId) || { name: sale.products?.name || "Unknown", value: 0 };
    existing.value += Number(sale.total_amount || 0);
    productMap.set(productId, existing);
  });

  return [...productMap.entries()]
    .map(([productId, item]) => ({ productId, ...item }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

async function fetchTopTotPerformers(localMrId?: string): Promise<TopPerformer[]> {
  async function fetchSalesForRange(range: { start: string; end: string }) {
    let query = supabase
      .from("sales")
      .select("tot_id, total_amount, commission_amount, sale_date")
      .gte("sale_date", range.start)
      .lt("sale_date", range.end);

    if (localMrId) query = query.eq("local_mr_id", localMrId);

    const { data, error } = await query;
    throwIfError(error);
    return data || [];
  }

  let range = getMonthRange();
  let sales = await fetchSalesForRange(range);

  if (sales.length === 0) {
    let latestQuery = supabase
      .from("sales")
      .select("sale_date")
      .not("sale_date", "is", null)
      .order("sale_date", { ascending: false })
      .limit(1);

    if (localMrId) latestQuery = latestQuery.eq("local_mr_id", localMrId);

    const { data: latestSales, error } = await latestQuery;
    throwIfError(error);

    const latestDateValue = latestSales?.[0]?.sale_date ? new Date(latestSales[0].sale_date) : null;
    if (latestDateValue && !Number.isNaN(latestDateValue.getTime())) {
      range = getMonthRange(latestDateValue);
      sales = await fetchSalesForRange(range);
    }
  }

  const totMap = new Map<string, { totalRevenue: number; salesCount: number }>();
  sales.forEach((sale) => {
    if (!sale.tot_id) return;
    const existing = totMap.get(sale.tot_id) || { totalRevenue: 0, salesCount: 0 };
    existing.totalRevenue += Number(sale.total_amount || 0);
    existing.salesCount += 1;
    totMap.set(sale.tot_id, existing);
  });

  const profileNames = await fetchProfileNames([...totMap.keys()]);

  return [...totMap.entries()]
    .map(([id, item]) => ({
      id,
      name: profileNames.get(id) || "Unknown TOT",
      metric: `Revenue - ${range.label}`,
      value: `KES ${Number(item.totalRevenue || 0).toLocaleString()}`,
      rank: 0,
    }))
    .sort((a, b) => Number(b.value.replace(/[^\d.-]/g, "")) - Number(a.value.replace(/[^\d.-]/g, "")))
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function fetchTopPerformers(type: "tots" | "farmers", localMrId?: string): Promise<TopPerformer[]> {
  if (type === "tots") {
    return fetchTopTotPerformers(localMrId);
  }

  let query = supabase.from("sales").select("farmer_id, total_amount, farmers(name)");
  if (localMrId) query = query.eq("local_mr_id", localMrId);

  const { data, error } = await query;
  throwIfError(error);

  const farmerMap = new Map<string, { name: string; total: number }>();
  (data || []).forEach((sale: any) => {
    const farmerId = sale.farmer_id || "unknown";
    const existing = farmerMap.get(farmerId) || { name: sale.farmers?.name || "Unknown", total: 0 };
    existing.total += Number(sale.total_amount || 0);
    farmerMap.set(farmerId, existing);
  });

  return [...farmerMap.entries()]
    .map(([id, item]) => ({ id, name: item.name, metric: "Purchases", value: `KES ${item.total.toLocaleString()}`, rank: 0 }))
    .sort((a, b) => Number(b.value.replace(/[^\d]/g, "")) - Number(a.value.replace(/[^\d]/g, "")))
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export async function fetchFarmers(filters?: {
  localMrId?: string;
  search?: string;
  status?: string;
}) {
  let query = supabase.from("farmers").select("*").order("created_at", { ascending: false });
  if (filters?.localMrId) query = query.eq("local_mr_id", filters.localMrId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);

  const { data, error } = await query;
  throwIfError(error);
  return data || [];
}

export async function fetchSales(filters?: {
  localMrId?: string;
  totId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase
    .from("sales")
    .select("*, products(name, category), farmers(name, phone)")
    .order("sale_date", { ascending: false });

  if (filters?.localMrId) query = query.eq("local_mr_id", filters.localMrId);
  if (filters?.totId) query = query.eq("tot_id", filters.totId);
  if (filters?.startDate) query = query.gte("sale_date", filters.startDate);
  if (filters?.endDate) query = query.lte("sale_date", filters.endDate);

  const { data, error } = await query;
  throwIfError(error);

  const profileNames = await fetchProfileNames((data || []).map((sale) => sale.tot_id).filter(Boolean) as string[]);
  return (data || []).map((sale) => ({
    ...sale,
    tot_name: sale.tot_id ? profileNames.get(sale.tot_id) || "Unknown TOT" : "Unknown TOT",
  }));
}

export async function fetchVisits(filters?: {
  localMrId?: string;
  totId?: string;
}) {
  let query = supabase
    .from("visits")
    .select("*, farmers(name, phone)")
    .order("visit_date", { ascending: false });

  if (filters?.localMrId) query = query.eq("local_mr_id", filters.localMrId);
  if (filters?.totId) query = query.eq("tot_id", filters.totId);

  const { data, error } = await query;
  throwIfError(error);

  const profileNames = await fetchProfileNames((data || []).map((visit) => visit.tot_id).filter(Boolean) as string[]);
  return (data || []).map((visit) => ({
    ...visit,
    tot_name: visit.tot_id ? profileNames.get(visit.tot_id) || "Unknown TOT" : "Unknown TOT",
  }));
}

export async function fetchMechanisationJobs(filters?: {
  localMrId?: string;
  totId?: string;
  status?: string;
}) {
  let query = supabase
    .from("mechanisation_jobs")
    .select("*, machinery(name, category), farmers(name)")
    .order("scheduled_date", { ascending: false });

  if (filters?.localMrId) query = query.eq("local_mr_id", filters.localMrId);
  if (filters?.totId) query = query.eq("tot_id", filters.totId);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  throwIfError(error);

  const profileNames = await fetchProfileNames((data || []).map((job) => job.tot_id).filter(Boolean) as string[]);
  return (data || []).map((job: any) => ({
    ...job,
    tot_name: job.tot_id ? profileNames.get(job.tot_id) || "Unknown TOT" : "Unknown TOT",
  }));
}

export async function fetchTrainings(filters?: {
  localMrId?: string;
  trainerId?: string;
}) {
  let query = supabase
    .from("trainings")
    .select("*, local_mrs(name)")
    .order("scheduled_date", { ascending: false });

  if (filters?.localMrId) query = query.eq("local_mr_id", filters.localMrId);
  if (filters?.trainerId) query = query.eq("trainer_id", filters.trainerId);

  const { data, error } = await query;
  throwIfError(error);

  const profileNames = await fetchProfileNames((data || []).map((training) => training.trainer_id).filter(Boolean) as string[]);
  return (data || []).map((training) => ({
    ...training,
    trainer_name: training.trainer_id ? profileNames.get(training.trainer_id) || "Unknown Trainer" : "Unknown Trainer",
  }));
}

export async function fetchUsers() {
  const [profilesResult, rolesResult, assignmentsResult, salesResult, jobsResult, trainingsResult, attendeesResult, visitsResult] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("tot_assignments").select("tot_id, local_mr_id, local_mrs(id, name)").eq("status", "active"),
      supabase.from("sales").select("tot_id, total_amount, commission_amount, sale_date"),
      supabase.from("machinery_bookings").select("tot_id, status, start_date"),
      supabase.from("trainings").select("id, trainer_id, status, scheduled_date"),
      supabase.from("training_attendees").select("profile_id, training_id").not("profile_id", "is", null),
      supabase.from("visits").select("tot_id, profile_id, visit_date"),
    ]);

  [profilesResult, rolesResult, assignmentsResult, salesResult, jobsResult, trainingsResult, attendeesResult, visitsResult].forEach((result) => throwIfError(result.error));

  const roleMap = new Map((rolesResult.data || []).map((role) => [role.user_id, role.role]));
  const assignmentMap = new Map((assignmentsResult.data || []).map((assignment: any) => [assignment.tot_id, {
    localMrId: assignment.local_mr_id,
    localMrName: assignment.local_mrs?.name || "Unknown",
  }]));

  const metrics = new Map<string, any>();
  function ensure(id: string | null) {
    if (!id) return null;
    if (!metrics.has(id)) {
      metrics.set(id, { salesCount: 0, totalRevenue: 0, totalCommission: 0, jobsCount: 0, completedJobsCount: 0, trainingsCount: 0, completedTrainingsCount: 0, visitsCount: 0, lastActivityDate: null });
    }
    return metrics.get(id);
  }

  (salesResult.data || []).forEach((sale) => {
    const item = ensure(sale.tot_id);
    if (!item) return;
    item.salesCount += 1;
    item.totalRevenue += Number(sale.total_amount || 0);
    item.totalCommission += Number(sale.commission_amount || 0);
    item.lastActivityDate = latestDate(item.lastActivityDate, sale.sale_date);
  });

  (jobsResult.data || []).forEach((job) => {
    const item = ensure(job.tot_id);
    if (!item) return;
    item.jobsCount += 1;
    if (job.status === "completed") item.completedJobsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, job.start_date);
  });

  const trainingDetailsMap = new Map((trainingsResult.data || []).map((training) => [training.id, { status: training.status, scheduled_date: training.scheduled_date }]));
  (trainingsResult.data || []).forEach((training) => {
    const item = ensure(training.trainer_id);
    if (!item) return;
    item.trainingsCount += 1;
    if (training.status === "completed") item.completedTrainingsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, training.scheduled_date);
  });

  (attendeesResult.data || []).forEach((attendance) => {
    const item = ensure(attendance.profile_id);
    if (!item) return;
    const trainingDetails = trainingDetailsMap.get(attendance.training_id);
    item.trainingsCount += 1;
    if (trainingDetails?.status === "completed") item.completedTrainingsCount += 1;
    item.lastActivityDate = latestDate(item.lastActivityDate, trainingDetails?.scheduled_date);
  });

  (visitsResult.data || []).forEach((visit) => {
    [visit.tot_id, visit.profile_id].forEach((id) => {
      const item = ensure(id);
      if (!item) return;
      item.visitsCount += 1;
      item.lastActivityDate = latestDate(item.lastActivityDate, visit.visit_date);
    });
  });

  return (profilesResult.data || []).map((profile) => {
    const assignment = assignmentMap.get(profile.id);
    return {
      ...profile,
      role: roleMap.get(profile.id) || "user",
      localMrId: assignment?.localMrId || null,
      localMrName: assignment?.localMrName || null,
      ...(ensure(profile.id) || {}),
    };
  });
}

export async function fetchRecentActivity(limit = 10) {
  const [salesResult, visitsResult, trainingsResult] = await Promise.all([
    supabase.from("sales").select("id, sale_date, total_amount, tot_id, farmers(name)").order("sale_date", { ascending: false }).limit(limit),
    supabase.from("visits").select("id, visit_date, purpose, tot_id, farmers(name)").order("visit_date", { ascending: false }).limit(limit),
    supabase.from("trainings").select("id, scheduled_date, title, trainer_id").order("scheduled_date", { ascending: false }).limit(limit),
  ]);

  [salesResult, visitsResult, trainingsResult].forEach((result) => throwIfError(result.error));

  const profileNames = await fetchProfileNames([
    ...(salesResult.data || []).map((sale) => sale.tot_id),
    ...(visitsResult.data || []).map((visit) => visit.tot_id),
    ...(trainingsResult.data || []).map((training) => training.trainer_id),
  ].filter(Boolean) as string[]);

  const activities = [
    ...(salesResult.data || []).map((sale: any) => ({
      id: sale.id,
      type: "sale",
      title: "Sale Recorded",
      description: `KES ${Number(sale.total_amount).toLocaleString()} to ${sale.farmers?.name || "Unknown"}`,
      timestamp: sale.sale_date,
      actor: sale.tot_id ? profileNames.get(sale.tot_id) || "Unknown TOT" : "Unknown TOT",
    })),
    ...(visitsResult.data || []).map((visit: any) => ({
      id: visit.id,
      type: "visit",
      title: "Farm Visit",
      description: `${visit.purpose} - ${visit.farmers?.name || "Unknown"}`,
      timestamp: visit.visit_date,
      actor: visit.tot_id ? profileNames.get(visit.tot_id) || "Unknown TOT" : "Unknown TOT",
    })),
    ...(trainingsResult.data || []).map((training) => ({
      id: training.id,
      type: "training",
      title: "Training Session",
      description: training.title,
      timestamp: training.scheduled_date,
      actor: training.trainer_id ? profileNames.get(training.trainer_id) || "Unknown Trainer" : "Unknown Trainer",
    })),
  ];

  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
