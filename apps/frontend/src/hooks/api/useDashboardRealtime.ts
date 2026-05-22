// src/hooks/api/useDashboardRealtime.ts
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { supabaseDashboardKeys } from "./useSupabaseDashboard";

/**
 * Helper function to invalidate all dashboard-related queries across all dashboards
 * This ensures Admin, Manager, Coordinator, and TOT dashboards all update in real-time
 */
function invalidateAllDashboardQueries(queryClient: ReturnType<typeof useQueryClient>) {
  // Core supabase dashboard keys
  queryClient.invalidateQueries({ queryKey: ["supabase", "dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["supabase", "users"] });
  queryClient.invalidateQueries({ queryKey: ["supabase", "activity"] });
  
  // Coordinator-specific dashboard queries (key pattern: ['coordinator-*', userId])
  queryClient.invalidateQueries({ queryKey: ["coordinator-stats"] });
  queryClient.invalidateQueries({ queryKey: ["coordinator-tots"] });
  queryClient.invalidateQueries({ queryKey: ["coordinator-sales"] });
  
  // Manager dashboard queries
  queryClient.invalidateQueries({ queryKey: ["manager-stats"] });
  queryClient.invalidateQueries({ queryKey: ["manager-tots"] });
  
  // TOT dashboard queries
  queryClient.invalidateQueries({ queryKey: ["tot-stats"] });
  queryClient.invalidateQueries({ queryKey: ["tot-dashboard"] });
  
  // Admin dashboard queries
  queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
}

/**
 * Hook that subscribes to realtime changes on sales, visits, and trainings
 * and invalidates the relevant query cache to trigger refetches.
 */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a single channel for all dashboard realtime updates
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sales",
        },
        () => {
          // Sales changes affect all dashboards - metrics, TOT performance, charts
          queryClient.invalidateQueries({ queryKey: ["supabase", "sales"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "topPerformers"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "products", "performance"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "visits",
        },
        () => {
          // Visits affect TOT metrics and farmer visit counts (via DB trigger)
          queryClient.invalidateQueries({ queryKey: ["supabase", "visits"] });
          queryClient.invalidateQueries({ queryKey: ["visits"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "farmers"] });
          queryClient.invalidateQueries({ queryKey: ["farmers"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trainings",
        },
        () => {
          // Trainings affect TOT metrics across all dashboards
          queryClient.invalidateQueries({ queryKey: ["supabase", "trainings"] });
          queryClient.invalidateQueries({ queryKey: ["trainings"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_attendees",
        },
        () => {
          // Training attendees affect farmer counts and training stats
          queryClient.invalidateQueries({ queryKey: ["trainings"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "trainings"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "farmers"] });
          queryClient.invalidateQueries({ queryKey: ["farmer-trainings"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "machinery_bookings",
        },
        () => {
          // Bookings impact performance tables and dashboards
          queryClient.invalidateQueries({ queryKey: ["supabase", "localMRs"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanisation_jobs",
        },
        () => {
          // Jobs impact TOT metrics across all dashboards
          queryClient.invalidateQueries({ queryKey: ["supabase", "mechanisation"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tot_assignments",
        },
        () => {
          // Impacts TOT listings + MR scoping
          queryClient.invalidateQueries({ queryKey: ["supabase", "localMRs"] });
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_roles",
        },
        () => {
          // Impacts role-based counts (e.g., Total TOTs)
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          // User status/name changes
          invalidateAllDashboardQueries(queryClient);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook specifically for farmer changes realtime updates
 */
export function useFarmersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("farmers-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "farmers",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["supabase", "farmers"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "dashboard"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "localMRs"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * Hook specifically for mechanisation job changes
 */
export function useMechanisationRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("mechanisation-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mechanisation_jobs",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["supabase", "mechanisation"] });
          queryClient.invalidateQueries({ queryKey: ["supabase", "dashboard"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
