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

// Helper function to fetch profile names for given IDs
async function fetchProfileNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", uniqueIds);

  const nameMap = new Map<string, string>();
  (profiles || []).forEach((p) => {
    nameMap.set(p.id, p.name);
  });
  return nameMap;
}

/**
 * Fetch admin dashboard stats (organization-wide)
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  // Fetch counts in parallel
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

  // Calculate revenue from sales
  const totalRevenue = salesResult.data?.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0) || 0;
  const completedBookings = machineryBookingsResult.data?.filter(j => j.status === "completed").length || 0;

  return {
    totalFarmers: farmersResult.count || 0,
    totalSales: salesResult.count || 0,
    totalMRs: localMrsResult.count || 0,
    totalTots: totsResult.count || 0,
    totalRevenue,
    totalProducts: productsResult.count || 0,
    pendingApprovals: 0,
    activeTots: totsResult.count || 0,
    completedMechanisation: completedBookings,
    mechanisationJobs: machineryBookingsResult.count || 0,
    trainingsHeld: trainingsResult.count || 0,
  };
}

/**
 * Fetch TOT dashboard stats (personal stats)
 */
export async function fetchTotStats(totId: string): Promise<TotStats> {
  // Fetch TOT-specific data
  const [salesResult, visitsResult, machineryBookingsResult, trainingsResult] = await Promise.all([
    supabase.from("sales").select("id, total_amount, commission_amount").eq("tot_id", totId),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("tot_id", totId),
    supabase.from("machinery_bookings").select("id", { count: "exact", head: true }).eq("booked_by", totId),
    supabase.from("trainings").select("id", { count: "exact", head: true }).eq("trainer_id", totId),
  ]);

  // Count unique farmers from sales
  const { data: farmerIds } = await supabase
    .from("sales")
    .select("farmer_id")
    .eq("tot_id", totId);
  
  const uniqueFarmers = new Set(farmerIds?.map(s => s.farmer_id) || []).size;

  const totalRevenue = salesResult.data?.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0) || 0;
  const totalCommission = salesResult.data?.reduce((sum, s) => sum + (Number(s.commission_amount) || 0), 0) || 0;

  return {
    totalFarmers: uniqueFarmers,
    totalSales: salesResult.data?.length || 0,
    totalRevenue,
    mechanisationJobs: machineryBookingsResult.count || 0,
    visitsCompleted: visitsResult.count || 0,
    trainingsHeld: trainingsResult.count || 0,
    totalCommission,
    pendingSync: 0,
  };
}

/**
 * Fetch Local MRs with computed stats
 */
export async function fetchLocalMRsWithStats(): Promise<LocalMRWithStats[]> {
  const { data: localMrs, error } = await supabase
    .from("local_mrs")
    .select("id, name, region, county, sub_county, ward, status, coordinator_id")
    .eq("status", "active");

  if (error) {
    console.error("Error fetching local MRs:", error);
    return [];
  }

  // Collect coordinator IDs and fetch names
  const coordinatorIds = (localMrs || [])
    .map((mr) => mr.coordinator_id)
    .filter(Boolean) as string[];
  
  const profileNames = await fetchProfileNames(coordinatorIds);

  // Fetch counts for each local MR
  const enrichedMRs = await Promise.all(
    (localMrs || []).map(async (mr) => {
      const [totsResult, farmersResult] = await Promise.all([
        supabase.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id).eq("status", "active"),
        supabase.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id),
      ]);

      return {
        id: mr.id,
        name: mr.name,
        code: mr.name.substring(0, 3).toUpperCase(),
        region: mr.region,
        county: mr.county,
        sub_county: mr.sub_county,
        ward: mr.ward,
        status: mr.status,
        coordinator_id: mr.coordinator_id,
        totalTots: totsResult.count || 0,
        totalFarmers: farmersResult.count || 0,
        coordinatorName: mr.coordinator_id ? profileNames.get(mr.coordinator_id) : undefined,
      };
    })
  );

  return enrichedMRs;
}

/**
 * Fetch monthly sales data for charts
 */
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

  if (params?.localMrId) {
    query = query.eq("local_mr_id", params.localMrId);
  }
  if (params?.totId) {
    query = query.eq("tot_id", params.totId);
  }

  const { data: sales, error } = await query;

  if (error) {
    console.error("Error fetching monthly sales:", error);
    return [];
  }

  // Group by month
  const monthlyData: Record<string, { value: number; count: number }> = {};
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  months.forEach((month) => {
    monthlyData[month] = { value: 0, count: 0 };
  });

  (sales || []).forEach((sale) => {
    const date = new Date(sale.sale_date);
    const monthName = months[date.getMonth()];
    monthlyData[monthName].value += Number(sale.total_amount) || 0;
    monthlyData[monthName].count += 1;
  });

  return months.map((month) => ({
    month,
    value: monthlyData[month].value,
    count: monthlyData[month].count,
  }));
}

/**
 * Fetch product performance data
 */
export async function fetchProductPerformance(localMrId?: string): Promise<ProductPerformance[]> {
  let query = supabase
    .from("sales")
    .select("product_id, total_amount, products(name)");

  if (localMrId) {
    query = query.eq("local_mr_id", localMrId);
  }

  const { data: sales, error } = await query;

  if (error) {
    console.error("Error fetching product performance:", error);
    return [];
  }

  // Aggregate by product
  const productMap: Record<string, { name: string; value: number }> = {};

  (sales || []).forEach((sale) => {
    const productId = sale.product_id;
    const productName = (sale.products as any)?.name || "Unknown";
    if (!productMap[productId]) {
      productMap[productId] = { name: productName, value: 0 };
    }
    productMap[productId].value += Number(sale.total_amount) || 0;
  });

  return Object.entries(productMap)
    .map(([productId, data]) => ({
      productId,
      name: data.name,
      value: data.value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/**
 * Fetch top performers (TOTs or Farmers)
 */
export async function fetchTopPerformers(
  type: "tots" | "farmers",
  localMrId?: string
): Promise<TopPerformer[]> {
  if (type === "tots") {
    // Get sales data without FK join to profiles
    let query = supabase
      .from("sales")
      .select("tot_id, total_amount");

    if (localMrId) {
      query = query.eq("local_mr_id", localMrId);
    }

    const { data: sales, error } = await query;

    if (error) {
      console.error("Error fetching top TOTs:", error);
      return [];
    }

    // Aggregate by TOT
    const totMap: Record<string, { revenue: number; salesCount: number }> = {};

    (sales || []).forEach((sale) => {
      const totId = sale.tot_id;
      if (!totMap[totId]) {
        totMap[totId] = { revenue: 0, salesCount: 0 };
      }
      totMap[totId].revenue += Number(sale.total_amount) || 0;
      totMap[totId].salesCount += 1;
    });

    // Fetch profile names for TOTs
    const totIds = Object.keys(totMap);
    const profileNames = await fetchProfileNames(totIds);

    return Object.entries(totMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id, data], index) => ({
        id,
        name: profileNames.get(id) || "Unknown TOT",
        metric: `${data.salesCount} sales`,
        value: `KES ${(data.revenue / 1000).toFixed(0)}K`,
        rank: index + 1,
      }));
  } else {
    // Get farmers with their purchase history
    let query = supabase
      .from("sales")
      .select("farmer_id, total_amount, farmers(name)");

    if (localMrId) {
      query = query.eq("local_mr_id", localMrId);
    }

    const { data: sales, error } = await query;

    if (error) {
      console.error("Error fetching top farmers:", error);
      return [];
    }

    // Aggregate by farmer
    const farmerMap: Record<string, { name: string; totalSpent: number; purchases: number }> = {};

    (sales || []).forEach((sale) => {
      const farmerId = sale.farmer_id;
      if (!farmerId) return; // skip walk-in sales
      const farmerName = (sale.farmers as any)?.name || "Unknown Farmer";
      if (!farmerMap[farmerId]) {
        farmerMap[farmerId] = { name: farmerName, totalSpent: 0, purchases: 0 };
      }
      farmerMap[farmerId].totalSpent += Number(sale.total_amount) || 0;
      farmerMap[farmerId].purchases += 1;
    });

    return Object.entries(farmerMap)
      .sort((a, b) => b[1].totalSpent - a[1].totalSpent)
      .slice(0, 5)
      .map(([id, data], index) => ({
        id,
        name: data.name,
        metric: `${data.purchases} purchases`,
        value: `KES ${(data.totalSpent / 1000).toFixed(0)}K`,
        rank: index + 1,
      }));
  }
}

/**
 * Fetch all farmers with optional filters
 */
export async function fetchFarmers(filters?: {
  localMrId?: string;
  search?: string;
  status?: string;
}) {
  let query = supabase
    .from("farmers")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.localMrId) {
    query = query.eq("local_mr_id", filters.localMrId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching farmers:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all sales with optional filters - fetches TOT names separately
 */
export async function fetchSales(filters?: {
  localMrId?: string;
  totId?: string;
  startDate?: string;
  endDate?: string;
}) {
  let query = supabase
    .from("sales")
    .select(`
      *,
      products(name, category),
      farmers(name, phone)
    `)
    .order("sale_date", { ascending: false });

  if (filters?.localMrId) {
    query = query.eq("local_mr_id", filters.localMrId);
  }
  if (filters?.totId) {
    query = query.eq("tot_id", filters.totId);
  }
  if (filters?.startDate) {
    query = query.gte("sale_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("sale_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching sales:", error);
    return [];
  }

  // Fetch TOT profile names
  const totIds = (data || []).map((s) => s.tot_id).filter(Boolean);
  const profileNames = await fetchProfileNames(totIds);

  return (data || []).map((sale) => ({
    ...sale,
    tot_name: profileNames.get(sale.tot_id) || "Unknown TOT",
  }));
}

/**
 * Fetch all visits with optional filters
 */
export async function fetchVisits(filters?: {
  localMrId?: string;
  totId?: string;
}) {
  let query = supabase
    .from("visits")
    .select(`
      *,
      farmers(name, phone)
    `)
    .order("visit_date", { ascending: false });

  if (filters?.localMrId) {
    query = query.eq("local_mr_id", filters.localMrId);
  }
  if (filters?.totId) {
    query = query.eq("tot_id", filters.totId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching visits:", error);
    return [];
  }

  // Fetch TOT profile names
  const totIds = (data || []).map((v) => v.tot_id).filter(Boolean);
  const profileNames = await fetchProfileNames(totIds);

  return (data || []).map((visit) => ({
    ...visit,
    tot_name: profileNames.get(visit.tot_id) || "Unknown TOT",
  }));
}

/**
 * Fetch all mechanisation jobs
 */
export async function fetchMechanisationJobs(filters?: {
  localMrId?: string;
  totId?: string;
  status?: string;
}) {
  let query = supabase
    .from("mechanisation_jobs")
    .select(`
      *,
      machinery(name, category),
      farmers(name)
    `)
    .order("scheduled_date", { ascending: false });

  if (filters?.localMrId) {
    query = query.eq("local_mr_id", filters.localMrId);
  }
  if (filters?.totId) {
    query = query.eq("tot_id", filters.totId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching mechanisation jobs:", error);
    return [];
  }

  // Fetch TOT profile names
  const totIds = (data || []).map((j) => j.tot_id).filter(Boolean);
  const profileNames = await fetchProfileNames(totIds);

  return (data || []).map((job) => ({
    ...job,
    tot_name: profileNames.get(job.tot_id) || "Unknown TOT",
  }));
}

/**
 * Fetch all trainings
 */
export async function fetchTrainings(filters?: {
  localMrId?: string;
  trainerId?: string;
}) {
  let query = supabase
    .from("trainings")
    .select(`
      *,
      local_mrs(name)
    `)
    .order("scheduled_date", { ascending: false });

  if (filters?.localMrId) {
    query = query.eq("local_mr_id", filters.localMrId);
  }
  if (filters?.trainerId) {
    query = query.eq("trainer_id", filters.trainerId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trainings:", error);
    return [];
  }

  // Fetch trainer profile names
  const trainerIds = (data || []).map((t) => t.trainer_id).filter(Boolean);
  const profileNames = await fetchProfileNames(trainerIds);

  return (data || []).map((training) => ({
    ...training,
    trainer_name: profileNames.get(training.trainer_id) || "Unknown Trainer",
  }));
}

/**
 * Fetch users with their roles and performance metrics - separate queries
 */
export async function fetchUsers() {
  // Fetch profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  // Fetch all user roles
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (rolesError) {
    console.error("Error fetching user roles:", rolesError);
    // Continue without roles
  }

  // Fetch TOT assignments with Local MR details
  const { data: assignments, error: assignmentsError } = await supabase
    .from("tot_assignments")
    .select("tot_id, local_mr_id, local_mrs(id, name)")
    .eq("status", "active");

  if (assignmentsError) {
    console.error("Error fetching TOT assignments:", assignmentsError);
  }

  // Fetch sales data for TOT metrics
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("tot_id, total_amount, commission_amount, sale_date");

  if (salesError) {
    console.error("Error fetching sales for user metrics:", salesError);
  }

  // Fetch machinery bookings for TOT metrics
  const { data: jobs, error: jobsError } = await supabase
    .from("machinery_bookings")
    .select("tot_id, status, start_date");

  if (jobsError) {
    console.error("Error fetching machinery bookings for user metrics:", jobsError);
  }

  // Fetch trainings for TOT metrics (include id for lookup)
  const { data: trainings, error: trainingsError } = await supabase
    .from("trainings")
    .select("id, trainer_id, status, scheduled_date");

  if (trainingsError) {
    console.error("Error fetching trainings for user metrics:", trainingsError);
  }

  // Fetch training attendance for TOTs (via profile_id)
  const { data: trainingAttendees, error: attendeesError } = await supabase
    .from("training_attendees")
    .select("profile_id, training_id")
    .not("profile_id", "is", null);

  if (attendeesError) {
    console.error("Error fetching training attendees for user metrics:", attendeesError);
  }

  // Create a map of training_id to training details for lookup
  const trainingDetailsMap = new Map<string, { status: string; scheduled_date: string }>();
  (trainings || []).forEach((t: any) => {
    trainingDetailsMap.set(t.id, { status: t.status, scheduled_date: t.scheduled_date });
  });

  // Fetch visits for TOT metrics (both as creator via tot_id and as participant via profile_id)
  const { data: visits, error: visitsError } = await supabase
    .from("visits")
    .select("tot_id, profile_id, visit_date");

  if (visitsError) {
    console.error("Error fetching visits for user metrics:", visitsError);
  }

  // Create a map of user_id to role
  const roleMap = new Map<string, string>();
  (roles || []).forEach((r) => {
    roleMap.set(r.user_id, r.role);
  });

  // Create a map of tot_id to local MR info
  const totAssignmentMap = new Map<string, { localMrId: string; localMrName: string }>();
  (assignments || []).forEach((a: any) => {
    totAssignmentMap.set(a.tot_id, {
      localMrId: a.local_mr_id,
      localMrName: a.local_mrs?.name || "Unknown",
    });
  });

  // Aggregate sales metrics per TOT
  const totSalesMap = new Map<string, { count: number; revenue: number; commission: number; lastSaleDate: string | null }>();
  (sales || []).forEach((s) => {
    const existing = totSalesMap.get(s.tot_id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
    existing.count += 1;
    existing.revenue += Number(s.total_amount) || 0;
    existing.commission += Number(s.commission_amount) || 0;
    if (!existing.lastSaleDate || s.sale_date > existing.lastSaleDate) {
      existing.lastSaleDate = s.sale_date;
    }
    totSalesMap.set(s.tot_id, existing);
  });

  // Aggregate jobs per TOT
  const totJobsMap = new Map<string, { count: number; completedCount: number; lastJobDate: string | null }>();
  (jobs || []).forEach((j) => {
    if (!j.tot_id) return; // Skip entries without tot_id
    const existing = totJobsMap.get(j.tot_id) || { count: 0, completedCount: 0, lastJobDate: null };
    existing.count += 1;
    if (j.status === "completed") existing.completedCount += 1;
    if (!existing.lastJobDate || j.start_date > existing.lastJobDate) {
      existing.lastJobDate = j.start_date;
    }
    totJobsMap.set(j.tot_id, existing);
  });

  // Aggregate trainings per TOT (as trainer via trainer_id)
  const totTrainingsMap = new Map<string, { count: number; completedCount: number; lastTrainingDate: string | null }>();
  (trainings || []).forEach((t) => {
    const existing = totTrainingsMap.get(t.trainer_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
    existing.count += 1;
    if (t.status === "completed") existing.completedCount += 1;
    if (!existing.lastTrainingDate || t.scheduled_date > existing.lastTrainingDate) {
      existing.lastTrainingDate = t.scheduled_date;
    }
    totTrainingsMap.set(t.trainer_id, existing);
  });

  // Also count trainings where TOT attended as participant (via profile_id in training_attendees)
  (trainingAttendees || []).forEach((a: any) => {
    if (!a.profile_id) return;
    const existing = totTrainingsMap.get(a.profile_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
    existing.count += 1;
    // Lookup training details from the map
    const trainingDetails = trainingDetailsMap.get(a.training_id);
    if (trainingDetails?.status === "completed") existing.completedCount += 1;
    if (trainingDetails?.scheduled_date && (!existing.lastTrainingDate || trainingDetails.scheduled_date > existing.lastTrainingDate)) {
      existing.lastTrainingDate = trainingDetails.scheduled_date;
    }
    totTrainingsMap.set(a.profile_id, existing);
  });

  // Aggregate visits per TOT (both as creator via tot_id and as participant via profile_id)
  const totVisitsMap = new Map<string, { count: number; lastVisitDate: string | null }>();
  (visits || []).forEach((v) => {
    // Count visits created by TOT (tot_id)
    if (v.tot_id) {
      const existing = totVisitsMap.get(v.tot_id) || { count: 0, lastVisitDate: null };
      existing.count += 1;
      if (!existing.lastVisitDate || v.visit_date > existing.lastVisitDate) {
        existing.lastVisitDate = v.visit_date;
      }
      totVisitsMap.set(v.tot_id, existing);
    }
    // Count visits where TOT is the participant (profile_id)
    if (v.profile_id) {
      const existing = totVisitsMap.get(v.profile_id) || { count: 0, lastVisitDate: null };
      existing.count += 1;
      if (!existing.lastVisitDate || v.visit_date > existing.lastVisitDate) {
        existing.lastVisitDate = v.visit_date;
      }
      totVisitsMap.set(v.profile_id, existing);
    }
  });

  return (profiles || []).map((user) => {
    const assignment = totAssignmentMap.get(user.id);
    const salesData = totSalesMap.get(user.id);
    const jobsData = totJobsMap.get(user.id);
    const trainingsData = totTrainingsMap.get(user.id);
    const visitsData = totVisitsMap.get(user.id);

    // Calculate last activity date from all activity types
    const activityDates = [
      salesData?.lastSaleDate,
      jobsData?.lastJobDate,
      trainingsData?.lastTrainingDate,
      visitsData?.lastVisitDate,
    ].filter(Boolean) as string[];
    
    const lastActivityDate = activityDates.length > 0 
      ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;

    return {
      ...user,
      role: roleMap.get(user.id) || "user",
      localMrId: assignment?.localMrId || null,
      localMrName: assignment?.localMrName || null,
      // Performance metrics
      salesCount: salesData?.count || 0,
      totalRevenue: salesData?.revenue || 0,
      totalCommission: salesData?.commission || 0,
      jobsCount: jobsData?.count || 0,
      completedJobsCount: jobsData?.completedCount || 0,
      trainingsCount: trainingsData?.count || 0,
      completedTrainingsCount: trainingsData?.completedCount || 0,
      visitsCount: visitsData?.count || 0,
      lastActivityDate,
    };
  });
}

/**
 * Fetch recent activity for dashboard
 */
export async function fetchRecentActivity(limit = 10) {
  const [salesResult, visitsResult, trainingsResult] = await Promise.all([
    supabase
      .from("sales")
      .select("id, sale_date, total_amount, tot_id, farmers(name)")
      .order("sale_date", { ascending: false })
      .limit(limit),
    supabase
      .from("visits")
      .select("id, visit_date, purpose, tot_id, farmers(name)")
      .order("visit_date", { ascending: false })
      .limit(limit),
    supabase
      .from("trainings")
      .select("id, scheduled_date, title, trainer_id")
      .order("scheduled_date", { ascending: false })
      .limit(limit),
  ]);

  // Collect all user IDs for profile lookup
  const userIds: string[] = [];
  (salesResult.data || []).forEach((s) => s.tot_id && userIds.push(s.tot_id));
  (visitsResult.data || []).forEach((v) => v.tot_id && userIds.push(v.tot_id));
  (trainingsResult.data || []).forEach((t) => t.trainer_id && userIds.push(t.trainer_id));

  const profileNames = await fetchProfileNames(userIds);

  const activities: Array<{
    id: string;
    type: "sale" | "visit" | "training";
    title: string;
    description: string;
    timestamp: string;
    actor: string;
  }> = [];

  (salesResult.data || []).forEach((sale) => {
    activities.push({
      id: sale.id,
      type: "sale",
      title: "Sale Recorded",
      description: `KES ${Number(sale.total_amount).toLocaleString()} to ${(sale.farmers as any)?.name || "Unknown"}`,
      timestamp: sale.sale_date,
      actor: profileNames.get(sale.tot_id) || "Unknown TOT",
    });
  });

  (visitsResult.data || []).forEach((visit) => {
    activities.push({
      id: visit.id,
      type: "visit",
      title: "Farm Visit",
      description: `${visit.purpose} - ${(visit.farmers as any)?.name || "Unknown"}`,
      timestamp: visit.visit_date,
      actor: profileNames.get(visit.tot_id) || "Unknown TOT",
    });
  });

  (trainingsResult.data || []).forEach((training) => {
    activities.push({
      id: training.id,
      type: "training",
      title: "Training Session",
      description: training.title,
      timestamp: training.scheduled_date,
      actor: profileNames.get(training.trainer_id) || "Unknown Trainer",
    });
  });

  // Sort by timestamp and return top items
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
