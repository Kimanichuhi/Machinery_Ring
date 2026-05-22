import { useCallback, useEffect, useRef } from "react";

// Map of routes to their dynamic import functions
const routeImports: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/dashboard/admin": () => import("@/pages/dashboard/AdminDashboard"),
  "/dashboard/manager": () => import("@/pages/dashboard/ManagerDashboard"),
  "/dashboard/local-mr": () => import("@/pages/dashboard/CoordinatorDashboard"),
  "/dashboard/tot": () => import("@/pages/dashboard/TotDashboard"),
  "/farmers": () => import("@/pages/Farmers"),
  "/sales": () => import("@/pages/Sales"),
  "/machinery": () => import("@/pages/Machinery"),
  "/products": () => import("@/pages/Products"),
  "/visits": () => import("@/pages/Visits"),
  "/trainings": () => import("@/pages/Trainings"),
  "/reports": () => import("@/pages/Reports"),
  "/settings": () => import("@/pages/Settings"),
  "/commission": () => import("@/pages/Commission"),
  "/notifications": () => import("@/pages/Notifications"),
  "/tots": () => import("@/pages/TOTManagement"),
  "/local-mrs": () => import("@/pages/admin/LocalMRs"),
  "/users": () => import("@/pages/admin/Users"),
  "/audit": () => import("@/pages/admin/AuditLog"),
  "/system-logs": () => import("@/pages/admin/SystemLogs"),
  "/support": () => import("@/pages/Support"),
};

// Track prefetched routes to avoid duplicate fetches
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's code chunk
 */
export function prefetchRoute(path: string): void {
  // Normalize path
  const normalizedPath = path.split("?")[0].split("#")[0];
  
  if (prefetchedRoutes.has(normalizedPath)) return;
  
  const importFn = routeImports[normalizedPath];
  if (importFn) {
    prefetchedRoutes.add(normalizedPath);
    // Use requestIdleCallback for non-blocking prefetch
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => importFn().catch(() => {
        // Remove from set on failure so it can retry
        prefetchedRoutes.delete(normalizedPath);
      }));
    } else {
      // Fallback for Safari
      setTimeout(() => importFn().catch(() => {
        prefetchedRoutes.delete(normalizedPath);
      }), 100);
    }
  }
}

/**
 * Hook to prefetch routes on hover
 */
export function usePrefetchOnHover(path: string) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const onMouseEnter = useCallback(() => {
    // Small delay to avoid prefetching on accidental hovers
    timeoutRef.current = setTimeout(() => {
      prefetchRoute(path);
    }, 100);
  }, [path]);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { onMouseEnter, onMouseLeave };
}

/**
 * Hook to prefetch common routes after initial load
 */
export function usePrefetchCommonRoutes(routes: string[]) {
  useEffect(() => {
    // Wait for main content to load first
    const timeout = setTimeout(() => {
      routes.forEach((route) => {
        prefetchRoute(route);
      });
    }, 2000);

    return () => clearTimeout(timeout);
  }, [routes]);
}

/**
 * Get prefetch handlers for a link
 */
export function getPrefetchHandlers(path: string) {
  let timeout: ReturnType<typeof setTimeout>;
  
  return {
    onMouseEnter: () => {
      timeout = setTimeout(() => prefetchRoute(path), 100);
    },
    onMouseLeave: () => {
      if (timeout) clearTimeout(timeout);
    },
    onFocus: () => {
      prefetchRoute(path);
    },
  };
}
