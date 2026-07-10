import express from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import { cacheGetResponse } from "../utils/cache.js";

const router = express.Router();

// Dashboard aggregate stats run several Supabase queries per request and
// don't need to be real-time; a short TTL trades a little staleness for
// materially faster repeat loads.
const CACHE_TTL_MS = 30_000;

function parseQueryString(value) {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

async function verifyAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.toString().startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.toString().replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: "Invalid authentication token" });
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (roleError) {
    return res.status(500).json({ error: "Could not verify user role." });
  }

  req.user = data.user;
  req.role = roleRow?.role || null;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ error: "You do not have permission to access this resource." });
    }
    next();
  };
}

function buildErrorMessage(error) {
  if (!error) return "Unexpected Supabase error.";
  return error.message || JSON.stringify(error);
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

async function fetchProfileNames(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(buildErrorMessage(error));
  }

  const profileMap = new Map();
  (data || []).forEach((profile) => {
    profileMap.set(profile.id, profile.name);
  });
  return profileMap;
}

async function getLocalMrForCoordinator(userId) {
  const { data, error } = await supabaseAdmin
    .from("local_mrs")
    .select("id, name")
    .eq("coordinator_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(buildErrorMessage(error));
  }

  return data || null;
}

async function fetchTopTotPerformers(localMrId) {
  async function fetchSalesForRange(range) {
    let query = supabaseAdmin
      .from("sales")
      .select("tot_id, total_amount, commission_amount, sale_date")
      .gte("sale_date", range.start)
      .lt("sale_date", range.end);

    if (localMrId) query = query.eq("local_mr_id", localMrId);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));
    return data || [];
  }

  let range = getMonthRange();
  let sales = await fetchSalesForRange(range);

  if (sales.length === 0) {
    let latestQuery = supabaseAdmin
      .from("sales")
      .select("sale_date")
      .not("sale_date", "is", null)
      .order("sale_date", { ascending: false })
      .limit(1);

    if (localMrId) latestQuery = latestQuery.eq("local_mr_id", localMrId);

    const { data: latestSales, error } = await latestQuery;
    if (error) throw new Error(buildErrorMessage(error));

    const latestDate = latestSales?.[0]?.sale_date ? new Date(latestSales[0].sale_date) : null;
    if (latestDate && !Number.isNaN(latestDate.getTime())) {
      range = getMonthRange(latestDate);
      sales = await fetchSalesForRange(range);
    }
  }

  const totMap = new Map();
  for (const sale of sales) {
    if (!sale.tot_id) continue;
    const existing = totMap.get(sale.tot_id) || { totalRevenue: 0, totalCommission: 0, salesCount: 0 };
    existing.totalRevenue += Number(sale.total_amount || 0);
    existing.totalCommission += Number(sale.commission_amount || 0);
    existing.salesCount += 1;
    totMap.set(sale.tot_id, existing);
  }

  const profileNames = await fetchProfileNames([...totMap.keys()]);
  return [...totMap.entries()]
    .map(([totId, data]) => ({
      id: totId,
      name: profileNames.get(totId) || "Unknown TOT",
      metric: `Revenue - ${range.label}`,
      value: `KES ${Number(data.totalRevenue || 0).toLocaleString()}`,
      rank: 0,
      salesCount: data.salesCount,
      totalCommission: data.totalCommission,
    }))
    .sort((a, b) => Number(b.value.replace(/[^\d.-]/g, "")) - Number(a.value.replace(/[^\d.-]/g, "")))
    .slice(0, 5)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

router.use(verifyAuth);

router.get("/admin", requireRole("admin"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const [farmersResult, salesResult, localMrsResult, totsResult, productsResult, machineryBookingsResult, trainingsResult] =
      await Promise.all([
        supabaseAdmin.from("farmers").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("sales").select("id, total_amount", { count: "exact" }),
        supabaseAdmin.from("local_mrs").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "tot"),
        supabaseAdmin.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("machinery_bookings").select("id, status", { count: "exact" }),
        supabaseAdmin.from("trainings").select("id", { count: "exact", head: true }),
      ]);

    const totalRevenue = (salesResult.data || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const completedMechanisation = (machineryBookingsResult.data || []).filter((j) => j.status === "completed").length;

    return res.json({
      totalFarmers: farmersResult.count || 0,
      totalSales: salesResult.count || 0,
      totalMRs: localMrsResult.count || 0,
      totalTots: totsResult.count || 0,
      totalRevenue,
      totalProducts: productsResult.count || 0,
      pendingApprovals: 0,
      activeTots: totsResult.count || 0,
      completedMechanisation,
      mechanisationJobs: machineryBookingsResult.count || 0,
      trainingsHeld: trainingsResult.count || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load admin dashboard stats." });
  }
});

router.get("/tot", requireRole("admin", "manager", "local_mr_coordinator", "tot"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    // TOTs may only view their own stats; management roles may query any totId.
    const totId = req.role === "tot" ? req.user.id : parseQueryString(req.query.totId);
    if (!totId) {
      return res.status(400).json({ error: "totId query parameter is required." });
    }

    const [salesResult, visitsResult, machineryBookingsResult, trainingsResult, farmerIdsResult] = await Promise.all([
      supabaseAdmin.from("sales").select("id, total_amount, commission_amount").eq("tot_id", totId),
      supabaseAdmin.from("visits").select("id", { count: "exact", head: true }).eq("tot_id", totId),
      supabaseAdmin.from("machinery_bookings").select("id", { count: "exact", head: true }).eq("booked_by", totId),
      supabaseAdmin.from("trainings").select("id", { count: "exact", head: true }).eq("trainer_id", totId),
      supabaseAdmin.from("sales").select("farmer_id").eq("tot_id", totId),
    ]);

    const uniqueFarmers = new Set((farmerIdsResult.data || []).map((sale) => sale.farmer_id).filter(Boolean)).size;
    const totalRevenue = (salesResult.data || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const totalCommission = (salesResult.data || []).reduce((sum, sale) => sum + Number(sale.commission_amount || 0), 0);

    return res.json({
      totalFarmers: uniqueFarmers,
      totalSales: salesResult.data?.length || 0,
      totalRevenue,
      mechanisationJobs: machineryBookingsResult.count || 0,
      visitsCompleted: visitsResult.count || 0,
      trainingsHeld: trainingsResult.count || 0,
      totalCommission,
      pendingSync: 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load TOT dashboard stats." });
  }
});

router.get("/manager", requireRole("admin", "manager"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    if (!localMrId) {
      return res.status(400).json({ error: "localMrId query parameter is required." });
    }

    const [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, mechanisationResult] = await Promise.all([
      supabaseAdmin.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
      supabaseAdmin.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId).eq("status", "active"),
      supabaseAdmin.from("sales").select("total_amount").eq("local_mr_id", localMrId),
      supabaseAdmin.from("visits").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
      supabaseAdmin.from("trainings").select("id", { count: "exact", head: true }).eq("local_mr_id", localMrId),
      supabaseAdmin.from("mechanisation_jobs").select("status").eq("local_mr_id", localMrId),
    ]);

    const revenue = (salesResult.data || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const pendingMechanisation = (mechanisationResult.data || []).filter((job) => job.status === "pending").length;

    return res.json({
      totalFarmers: farmersResult.count || 0,
      totalTots: totsResult.count || 0,
      totalSales: salesResult.data?.length || 0,
      totalRevenue: revenue,
      totalVisits: visitsResult.count || 0,
      totalTrainings: trainingsResult.count || 0,
      pendingApprovals: 0,
      pendingMechanisation,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load manager dashboard stats." });
  }
});

router.get("/coordinator/stats", requireRole("admin", "local_mr_coordinator"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMr = await getLocalMrForCoordinator(req.user.id);
    if (!localMr) {
      return res.status(404).json({ error: "No Local MR assigned to this coordinator." });
    }

    const [farmersResult, totsResult, salesResult, visitsResult, trainingsResult, machineryResult] = await Promise.all([
      supabaseAdmin.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
      supabaseAdmin.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id).eq("status", "active"),
      supabaseAdmin.from("sales").select("total_amount").eq("local_mr_id", localMr.id),
      supabaseAdmin.from("visits").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
      supabaseAdmin.from("trainings").select("id", { count: "exact", head: true }).eq("local_mr_id", localMr.id),
      supabaseAdmin.from("machinery_bookings").select("id, status", { count: "exact" }).eq("local_mr_id", localMr.id),
    ]);

    const revenue = (salesResult.data || []).reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0);
    const completedJobs = (machineryResult.data || []).filter((job) => job.status === "completed").length;

    return res.json({
      totalFarmers: farmersResult.count || 0,
      totalTots: totsResult.count || 0,
      activeTots: totsResult.count || 0,
      totalSales: salesResult.data?.length || 0,
      totalRevenue: revenue,
      completedJobs,
      totalTrainings: trainingsResult.count || 0,
      totalVisits: visitsResult.count || 0,
      localMrName: localMr.name,
      localMrId: localMr.id,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load coordinator stats." });
  }
});

router.get("/coordinator/tots", requireRole("admin", "local_mr_coordinator"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMr = await getLocalMrForCoordinator(req.user.id);
    if (!localMr) {
      return res.status(404).json({ error: "No Local MR assigned to this coordinator." });
    }

    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from("tot_assignments")
      .select("tot_id, status")
      .eq("local_mr_id", localMr.id);

    if (assignmentsError) {
      throw new Error(buildErrorMessage(assignmentsError));
    }

    const totIds = [...new Set((assignments || []).map((assignment) => assignment.tot_id).filter(Boolean))];

    const [profilesResult, salesResult, bookingsResult, trainingsResult, attendeesResult, visitsResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, name, email, phone, status").in("id", totIds),
      supabaseAdmin.from("sales").select("tot_id, total_amount, commission_amount, sale_date").eq("local_mr_id", localMr.id),
      supabaseAdmin.from("machinery_bookings").select("tot_id, status, start_date").eq("local_mr_id", localMr.id),
      supabaseAdmin.from("trainings").select("id, trainer_id, status, scheduled_date").eq("local_mr_id", localMr.id),
      totIds.length > 0
        ? supabaseAdmin.from("training_attendees").select("training_id, profile_id").in("profile_id", totIds)
        : { data: [] },
      supabaseAdmin.from("visits").select("tot_id, profile_id, visit_date").eq("local_mr_id", localMr.id),
    ]);

    const trainingDetailsMap = new Map((trainingsResult.data || []).map((training) => [training.id, { status: training.status, scheduled_date: training.scheduled_date }]));

    const totSalesMap = new Map();
    (salesResult.data || []).forEach((sale) => {
      if (!totIds.includes(sale.tot_id)) return;
      const existing = totSalesMap.get(sale.tot_id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
      existing.count += 1;
      existing.revenue += Number(sale.total_amount || 0);
      existing.commission += Number(sale.commission_amount || 0);
      if (!existing.lastSaleDate || sale.sale_date > existing.lastSaleDate) existing.lastSaleDate = sale.sale_date;
      totSalesMap.set(sale.tot_id, existing);
    });

    const totJobsMap = new Map();
    (bookingsResult.data || []).forEach((booking) => {
      if (!totIds.includes(booking.tot_id)) return;
      const existing = totJobsMap.get(booking.tot_id) || { count: 0, completedCount: 0, lastJobDate: null };
      existing.count += 1;
      if (booking.status === "completed") existing.completedCount += 1;
      if (!existing.lastJobDate || booking.start_date > existing.lastJobDate) existing.lastJobDate = booking.start_date;
      totJobsMap.set(booking.tot_id, existing);
    });

    const totTrainingsMap = new Map();
    (trainingsResult.data || []).forEach((training) => {
      if (!totIds.includes(training.trainer_id)) return;
      const existing = totTrainingsMap.get(training.trainer_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      existing.count += 1;
      if (training.status === "completed") existing.completedCount += 1;
      if (!existing.lastTrainingDate || training.scheduled_date > existing.lastTrainingDate) existing.lastTrainingDate = training.scheduled_date;
      totTrainingsMap.set(training.trainer_id, existing);
    });

    (attendeesResult.data || []).forEach((attendance) => {
      if (!attendance.profile_id || !totIds.includes(attendance.profile_id)) return;
      const existing = totTrainingsMap.get(attendance.profile_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      existing.count += 1;
      const trainingDetails = trainingDetailsMap.get(attendance.training_id);
      if (trainingDetails?.status === "completed") existing.completedCount += 1;
      if (trainingDetails?.scheduled_date && (!existing.lastTrainingDate || trainingDetails.scheduled_date > existing.lastTrainingDate)) {
        existing.lastTrainingDate = trainingDetails.scheduled_date;
      }
      totTrainingsMap.set(attendance.profile_id, existing);
    });

    const totVisitsMap = new Map();
    (visitsResult.data || []).forEach((visit) => {
      if (visit.tot_id && totIds.includes(visit.tot_id)) {
        const existing = totVisitsMap.get(visit.tot_id) || { count: 0, lastVisitDate: null };
        existing.count += 1;
        if (!existing.lastVisitDate || visit.visit_date > existing.lastVisitDate) existing.lastVisitDate = visit.visit_date;
        totVisitsMap.set(visit.tot_id, existing);
      }
      if (visit.profile_id && totIds.includes(visit.profile_id)) {
        const existing = totVisitsMap.get(visit.profile_id) || { count: 0, lastVisitDate: null };
        existing.count += 1;
        if (!existing.lastVisitDate || visit.visit_date > existing.lastVisitDate) existing.lastVisitDate = visit.visit_date;
        totVisitsMap.set(visit.profile_id, existing);
      }
    });

    const totMap = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]));

    const enriched = (assignments || []).map((assignment) => {
      const tot = totMap.get(assignment.tot_id) || { id: assignment.tot_id, name: 'Unknown', email: '', phone: '', status: 'inactive' };
      const sales = totSalesMap.get(assignment.tot_id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
      const jobs = totJobsMap.get(assignment.tot_id) || { count: 0, completedCount: 0, lastJobDate: null };
      const trainings = totTrainingsMap.get(assignment.tot_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      const visits = totVisitsMap.get(assignment.tot_id) || { count: 0, lastVisitDate: null };
      const lastActivityDate = [sales.lastSaleDate, jobs.lastJobDate, trainings.lastTrainingDate, visits.lastVisitDate]
        .filter(Boolean)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

      return {
        id: tot.id,
        name: tot.name,
        email: tot.email,
        phone: tot.phone || '',
        role: 'tot',
        status: assignment.status || tot.status,
        createdAt: tot.created_at || null,
        localMrId: localMr.id,
        localMrName: localMr.name,
        salesCount: sales.count,
        totalRevenue: sales.revenue,
        totalCommission: sales.commission,
        jobsCount: jobs.count,
        completedJobsCount: jobs.completedCount,
        trainingsCount: trainings.count,
        completedTrainingsCount: trainings.completedCount,
        visitsCount: visits.count,
        lastActivityDate,
      };
    });

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load coordinator TOTs." });
  }
});

router.get("/coordinator/sales", requireRole("admin", "local_mr_coordinator"), cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMr = await getLocalMrForCoordinator(req.user.id);
    if (!localMr) {
      return res.status(404).json({ error: "No Local MR assigned to this coordinator." });
    }

    const { data, error } = await supabaseAdmin
      .from("sales")
      .select(`*, products(name), farmers(name, phone)`)
      .eq("local_mr_id", localMr.id)
      .order("sale_date", { ascending: false });

    if (error) {
      throw new Error(buildErrorMessage(error));
    }

    return res.json((data || []).map((sale) => ({
      ...sale,
      productName: sale.products?.name || "Unknown",
      farmerName: sale.farmers?.name || "Unknown",
      farmerPhone: sale.farmers?.phone || "",
    })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load coordinator sales." });
  }
});

router.get("/local-mrs", requireRole("admin", "manager"), cacheGetResponse(CACHE_TTL_MS), async (_req, res) => {
  try {
    const { data: localMrs, error } = await supabaseAdmin
      .from("local_mrs")
      .select("id, name, region, county, sub_county, ward, status, coordinator_id")
      .eq("status", "active");

    if (error) {
      throw new Error(buildErrorMessage(error));
    }

    const coordinatorIds = [...new Set((localMrs || []).map((mr) => mr.coordinator_id).filter(Boolean))];
    const profileNames = await fetchProfileNames(coordinatorIds);

    const enriched = await Promise.all(
      (localMrs || []).map(async (mr) => {
        const [totsResult, farmersResult] = await Promise.all([
          supabaseAdmin.from("tot_assignments").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id).eq("status", "active"),
          supabaseAdmin.from("farmers").select("id", { count: "exact", head: true }).eq("local_mr_id", mr.id),
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
          totalTots: totsResult.count || 0,
          totalFarmers: farmersResult.count || 0,
          coordinatorName: mr.coordinator_id ? profileNames.get(mr.coordinator_id) : undefined,
        };
      })
    );

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load local MR stats." });
  }
});

router.get("/monthly-sales", cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const totId = parseQueryString(req.query.totId);
    const year = Number(req.query.year || new Date().getFullYear());
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabaseAdmin
      .from("sales")
      .select("sale_date, total_amount")
      .gte("sale_date", startDate)
      .lte("sale_date", endDate);

    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (totId) query = query.eq("tot_id", totId);

    const { data: sales, error } = await query;
    if (error) {
      throw new Error(buildErrorMessage(error));
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData = Object.fromEntries(months.map((month) => [month, { value: 0, count: 0 }]));

    (sales || []).forEach((sale) => {
      const monthName = new Date(sale.sale_date).toLocaleString("en-US", { month: "short" });
      if (!monthlyData[monthName]) return;
      monthlyData[monthName].value += Number(sale.total_amount || 0);
      monthlyData[monthName].count += 1;
    });

    return res.json(months.map((month) => ({ month, value: monthlyData[month].value, count: monthlyData[month].count })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load monthly sales." });
  }
});

router.get("/product-performance", cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    let query = supabaseAdmin
      .from("sales")
      .select("product_id, total_amount, products(name)");

    if (localMrId) query = query.eq("local_mr_id", localMrId);

    const { data: sales, error } = await query;
    if (error) {
      throw new Error(buildErrorMessage(error));
    }

    const productMap = {};
    (sales || []).forEach((sale) => {
      const productId = sale.product_id;
      const productName = sale.products?.name || "Unknown";
      if (!productMap[productId]) {
        productMap[productId] = { name: productName, value: 0 };
      }
      productMap[productId].value += Number(sale.total_amount || 0);
    });

    return res.json(
      Object.entries(productMap)
        .map(([productId, data]) => ({ productId, name: data.name, value: data.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    );
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load product performance." });
  }
});

router.get("/top-performers", cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const type = parseQueryString(req.query.type) || "tots";
    const localMrId = parseQueryString(req.query.localMrId);

    if (type === "tots") {
      return res.json(await fetchTopTotPerformers(localMrId));
    }

    let query = supabaseAdmin.from("sales").select("farmer_id, total_amount, farmers(name)");
    if (localMrId) query = query.eq("local_mr_id", localMrId);
    const { data: sales, error } = await query;
    if (error) {
      throw new Error(buildErrorMessage(error));
    }

    const farmerMap = {};
    (sales || []).forEach((sale) => {
      const farmerId = sale.farmer_id;
      const farmerName = sale.farmers?.name || "Unknown";
      if (!farmerMap[farmerId]) {
        farmerMap[farmerId] = { name: farmerName, total: 0 };
      }
      farmerMap[farmerId].total += Number(sale.total_amount || 0);
    });

    return res.json(
      Object.entries(farmerMap)
        .map(([id, data]) => ({ id, name: data.name, metric: "Purchases", value: `KES ${data.total.toLocaleString()}`, rank: 0 }))
        .sort((a, b) => Number(b.value.replace(/[^\d]/g, "")) - Number(a.value.replace(/[^\d]/g, "")))
        .slice(0, 5)
        .map((item, index) => ({ ...item, rank: index + 1 }))
    );
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load top performers." });
  }
});

router.get("/farmers", async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const status = parseQueryString(req.query.status);
    const search = parseQueryString(req.query.search);

    let query = supabaseAdmin.from("farmers").select("*").order("created_at", { ascending: false });
    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (status) query = query.eq("status", status);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));
    return res.json(data || []);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load farmers." });
  }
});

router.get("/sales", async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const totId = parseQueryString(req.query.totId);
    const startDate = parseQueryString(req.query.startDate);
    const endDate = parseQueryString(req.query.endDate);

    let query = supabaseAdmin
      .from("sales")
      .select(`*, products(name, category), farmers(name, phone)`)
      .order("sale_date", { ascending: false });

    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (totId) query = query.eq("tot_id", totId);
    if (startDate) query = query.gte("sale_date", startDate);
    if (endDate) query = query.lte("sale_date", endDate);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));

    const totIds = [...new Set((data || []).map((item) => item.tot_id).filter(Boolean))];
    const profileNames = await fetchProfileNames(totIds);
    return res.json((data || []).map((sale) => ({
      ...sale,
      tot_name: profileNames.get(sale.tot_id) || "Unknown TOT",
    })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load sales." });
  }
});

router.get("/visits", async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const totId = parseQueryString(req.query.totId);

    let query = supabaseAdmin
      .from("visits")
      .select(`*, farmers(name, phone)`)
      .order("visit_date", { ascending: false });

    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (totId) query = query.eq("tot_id", totId);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));

    const totIds = [...new Set((data || []).map((item) => item.tot_id).filter(Boolean))];
    const profileNames = await fetchProfileNames(totIds);

    return res.json((data || []).map((visit) => ({
      ...visit,
      tot_name: profileNames.get(visit.tot_id) || "Unknown TOT",
    })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load visits." });
  }
});

router.get("/mechanisation", async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const totId = parseQueryString(req.query.totId);
    const status = parseQueryString(req.query.status);

    let query = supabaseAdmin
      .from("mechanisation_jobs")
      .select(`*, machinery(name, category), farmers(name)`)
      .order("scheduled_date", { ascending: false });

    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (totId) query = query.eq("tot_id", totId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));

    const totIds = [...new Set((data || []).map((job) => job.tot_id).filter(Boolean))];
    const profileNames = await fetchProfileNames(totIds);

    return res.json((data || []).map((job) => ({
      ...job,
      tot_name: profileNames.get(job.tot_id) || "Unknown TOT",
    })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load mechanisation jobs." });
  }
});

router.get("/trainings", async (req, res) => {
  try {
    const localMrId = parseQueryString(req.query.localMrId);
    const trainerId = parseQueryString(req.query.trainerId);

    let query = supabaseAdmin
      .from("trainings")
      .select(`*, local_mrs(name)`)
      .order("scheduled_date", { ascending: false });

    if (localMrId) query = query.eq("local_mr_id", localMrId);
    if (trainerId) query = query.eq("trainer_id", trainerId);

    const { data, error } = await query;
    if (error) throw new Error(buildErrorMessage(error));

    const trainerIds = [...new Set((data || []).map((training) => training.trainer_id).filter(Boolean))];
    const profileNames = await fetchProfileNames(trainerIds);

    return res.json((data || []).map((training) => ({
      ...training,
      trainer_name: profileNames.get(training.trainer_id) || "Unknown Trainer",
    })));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load trainings." });
  }
});

router.get("/users", requireRole("admin"), cacheGetResponse(CACHE_TTL_MS), async (_req, res) => {
  try {
    const [profilesResult, rolesResult, assignmentsResult, salesResult, jobsResult, trainingsResult, attendeesResult, visitsResult] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id, role"),
        supabaseAdmin.from("tot_assignments").select("tot_id, local_mr_id, local_mrs(id, name)").eq("status", "active"),
        supabaseAdmin.from("sales").select("tot_id, total_amount, commission_amount, sale_date"),
        supabaseAdmin.from("machinery_bookings").select("tot_id, status, start_date"),
        supabaseAdmin.from("trainings").select("id, trainer_id, status, scheduled_date"),
        supabaseAdmin.from("training_attendees").select("profile_id, training_id").not("profile_id", "is", null),
        supabaseAdmin.from("visits").select("tot_id, profile_id, visit_date"),
      ]);

    const roleMap = new Map((rolesResult.data || []).map((role) => [role.user_id, role.role]));
    const totAssignmentMap = new Map((assignmentsResult.data || []).map((assignment) => [assignment.tot_id, {
      localMrId: assignment.local_mr_id,
      localMrName: assignment.local_mrs?.name || "Unknown",
    }]));

    const totSalesMap = new Map();
    (salesResult.data || []).forEach((s) => {
      const id = s.tot_id;
      const existing = totSalesMap.get(id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
      existing.count += 1;
      existing.revenue += Number(s.total_amount) || 0;
      existing.commission += Number(s.commission_amount) || 0;
      if (!existing.lastSaleDate || s.sale_date > existing.lastSaleDate) existing.lastSaleDate = s.sale_date;
      totSalesMap.set(id, existing);
    });

    const totJobsMap = new Map();
    (jobsResult.data || []).forEach((job) => {
      if (!job.tot_id) return;
      const existing = totJobsMap.get(job.tot_id) || { count: 0, completedCount: 0, lastJobDate: null };
      existing.count += 1;
      if (job.status === "completed") existing.completedCount += 1;
      if (!existing.lastJobDate || job.start_date > existing.lastJobDate) existing.lastJobDate = job.start_date;
      totJobsMap.set(job.tot_id, existing);
    });

    const totTrainingsMap = new Map();
    const trainingDetailsMap = new Map((trainingsResult.data || []).map((t) => [t.id, { status: t.status, scheduled_date: t.scheduled_date }]));
    (trainingsResult.data || []).forEach((training) => {
      const existing = totTrainingsMap.get(training.trainer_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      existing.count += 1;
      if (training.status === "completed") existing.completedCount += 1;
      if (!existing.lastTrainingDate || training.scheduled_date > existing.lastTrainingDate) existing.lastTrainingDate = training.scheduled_date;
      totTrainingsMap.set(training.trainer_id, existing);
    });

    (attendeesResult.data || []).forEach((attendance) => {
      if (!attendance.profile_id) return;
      const existing = totTrainingsMap.get(attendance.profile_id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      existing.count += 1;
      const trainingDetails = trainingDetailsMap.get(attendance.training_id);
      if (trainingDetails?.status === "completed") existing.completedCount += 1;
      if (trainingDetails?.scheduled_date && (!existing.lastTrainingDate || trainingDetails.scheduled_date > existing.lastTrainingDate)) {
        existing.lastTrainingDate = trainingDetails.scheduled_date;
      }
      totTrainingsMap.set(attendance.profile_id, existing);
    });

    const totVisitsMap = new Map();
    (visitsResult.data || []).forEach((visit) => {
      if (visit.tot_id) {
        const existing = totVisitsMap.get(visit.tot_id) || { count: 0, lastVisitDate: null };
        existing.count += 1;
        if (!existing.lastVisitDate || visit.visit_date > existing.lastVisitDate) existing.lastVisitDate = visit.visit_date;
        totVisitsMap.set(visit.tot_id, existing);
      }
      if (visit.profile_id) {
        const existing = totVisitsMap.get(visit.profile_id) || { count: 0, lastVisitDate: null };
        existing.count += 1;
        if (!existing.lastVisitDate || visit.visit_date > existing.lastVisitDate) existing.lastVisitDate = visit.visit_date;
        totVisitsMap.set(visit.profile_id, existing);
      }
    });

    const users = (profilesResult.data || []).map((user) => {
      const assignment = totAssignmentMap.get(user.id);
      const sales = totSalesMap.get(user.id) || { count: 0, revenue: 0, commission: 0, lastSaleDate: null };
      const jobs = totJobsMap.get(user.id) || { count: 0, completedCount: 0, lastJobDate: null };
      const trainings = totTrainingsMap.get(user.id) || { count: 0, completedCount: 0, lastTrainingDate: null };
      const visits = totVisitsMap.get(user.id) || { count: 0, lastVisitDate: null };
      const activityDates = [sales.lastSaleDate, jobs.lastJobDate, trainings.lastTrainingDate, visits.lastVisitDate].filter(Boolean);
      const lastActivityDate = activityDates.length ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] : null;

      return {
        ...user,
        role: roleMap.get(user.id) || "user",
        localMrId: assignment?.localMrId || null,
        localMrName: assignment?.localMrName || null,
        salesCount: sales.count,
        totalRevenue: sales.revenue,
        totalCommission: sales.commission,
        jobsCount: jobs.count,
        completedJobsCount: jobs.completedCount,
        trainingsCount: trainings.count,
        completedTrainingsCount: trainings.completedCount,
        visitsCount: visits.count,
        lastActivityDate,
      };
    });

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load users." });
  }
});

router.get("/recent-activity", cacheGetResponse(CACHE_TTL_MS), async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const [salesResult, visitsResult, trainingsResult] = await Promise.all([
      supabaseAdmin
        .from("sales")
        .select("id, sale_date, total_amount, tot_id, farmers(name)")
        .order("sale_date", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("visits")
        .select("id, visit_date, purpose, tot_id, farmers(name)")
        .order("visit_date", { ascending: false })
        .limit(limit),
      supabaseAdmin
        .from("trainings")
        .select("id, scheduled_date, title, trainer_id")
        .order("scheduled_date", { ascending: false })
        .limit(limit),
    ]);

    const userIds = [
      ...(salesResult.data || []).map((s) => s.tot_id),
      ...(visitsResult.data || []).map((v) => v.tot_id),
      ...(trainingsResult.data || []).map((t) => t.trainer_id),
    ].filter(Boolean);
    const profileNames = await fetchProfileNames(userIds);

    const activities = [];
    (salesResult.data || []).forEach((sale) => {
      activities.push({
        id: sale.id,
        type: "sale",
        title: "Sale Recorded",
        description: `KES ${Number(sale.total_amount).toLocaleString()} to ${(sale.farmers || {}).name || "Unknown"}`,
        timestamp: sale.sale_date,
        actor: profileNames.get(sale.tot_id) || "Unknown TOT",
      });
    });

    (visitsResult.data || []).forEach((visit) => {
      activities.push({
        id: visit.id,
        type: "visit",
        title: "Farm Visit",
        description: `${visit.purpose} - ${(visit.farmers || {}).name || "Unknown"}`,
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

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return res.json(activities.slice(0, limit));
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Failed to load recent activity." });
  }
});

export { router as dashboardRouter };
