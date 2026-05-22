import React, { Suspense, lazy } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/errors/RouteErrorBoundary";

// Lazy load pages for code splitting
const Auth = lazy(() => import("@/pages/Auth").then(m => ({ default: m.Auth })));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const AdminDashboard = lazy(() => import("@/pages/dashboard/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const ManagerDashboard = lazy(() => import("@/pages/dashboard/ManagerDashboard").then(m => ({ default: m.ManagerDashboard })));
const CoordinatorDashboard = lazy(() => import("@/pages/dashboard/CoordinatorDashboard").then(m => ({ default: m.CoordinatorDashboard })));
const TotDashboard = lazy(() => import("@/pages/dashboard/TotDashboard").then(m => ({ default: m.TotDashboard })));
const Farmers = lazy(() => import("@/pages/Farmers").then(m => ({ default: m.Farmers })));
const FarmerProfile = lazy(() => import("@/pages/FarmerProfile").then(m => ({ default: m.FarmerProfile })));
const Sales = lazy(() => import("@/pages/Sales").then(m => ({ default: m.Sales })));
const Machinery = lazy(() => import("@/pages/Machinery").then(m => ({ default: m.Machinery })));
const Products = lazy(() => import("@/pages/Products").then(m => ({ default: m.Products })));
const Visits = lazy(() => import("@/pages/Visits").then(m => ({ default: m.Visits })));
const VisitDetails = lazy(() => import("@/pages/VisitDetails").then(m => ({ default: m.VisitDetails })));
const Trainings = lazy(() => import("@/pages/Trainings").then(m => ({ default: m.Trainings })));
const TrainingDetails = lazy(() => import("@/pages/TrainingDetails").then(m => ({ default: m.TrainingDetails })));
const Reports = lazy(() => import("@/pages/Reports").then(m => ({ default: m.Reports })));
const Settings = lazy(() => import("@/pages/Settings").then(m => ({ default: m.Settings })));
const Support = lazy(() => import("@/pages/Support").then(m => ({ default: m.Support })));
const Users = lazy(() => import("@/pages/admin/Users").then(m => ({ default: m.Users })));
const LocalMRs = lazy(() => import("@/pages/admin/LocalMRs").then(m => ({ default: m.LocalMRs })));
const LocalMRDetails = lazy(() => import("@/pages/admin/LocalMRDetails").then(m => ({ default: m.LocalMRDetails })));
const AuditLog = lazy(() => import("@/pages/admin/AuditLog").then(m => ({ default: m.AuditLog })));
const SystemLogs = lazy(() => import("@/pages/admin/SystemLogs").then(m => ({ default: m.SystemLogs })));

const Commission = lazy(() => import("@/pages/Commission").then(m => ({ default: m.Commission })));
const TOTManagement = lazy(() => import("@/pages/TOTManagement").then(m => ({ default: m.TOTManagement })));
const Notifications = lazy(() => import("@/pages/Notifications").then(m => ({ default: m.Notifications })));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Install = lazy(() => import("@/pages/Install"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background transition-opacity duration-200">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
  </div>
);

const withRouteBoundary = (section: string, element: React.ReactNode) => (
  <RouteErrorBoundary section={section}>{element}</RouteErrorBoundary>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NotificationProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={withRouteBoundary('Authentication', <Auth />)} />
                  <Route path="/login" element={<Navigate to="/auth" replace />} />
                  <Route path="/forgot-password" element={withRouteBoundary('Forgot password', <ForgotPassword />)} />
                  <Route path="/reset-password" element={withRouteBoundary('Reset password', <ResetPassword />)} />
                  <Route path="/install" element={withRouteBoundary('App installation', <Install />)} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Protected routes */}
                  <Route element={<ProtectedRoute>{withRouteBoundary('Application layout', <DashboardLayout />)}</ProtectedRoute>}>
                    <Route path="/dashboard" element={withRouteBoundary('Dashboard', <Dashboard />)} />
                    
                    {/* Role-specific dashboards */}
                    <Route path="/dashboard/admin" element={withRouteBoundary('Admin dashboard',
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    )} />
                    <Route path="/dashboard/manager" element={withRouteBoundary('Manager dashboard',
                      <ProtectedRoute allowedRoles={['manager', 'admin']}>
                        <ManagerDashboard />
                      </ProtectedRoute>
                    )} />
                    <Route path="/dashboard/local-mr" element={withRouteBoundary('Local MR dashboard',
                      <ProtectedRoute allowedRoles={['local_mr_coordinator', 'admin']}>
                        <CoordinatorDashboard />
                      </ProtectedRoute>
                    )} />
                    <Route path="/dashboard/tot" element={withRouteBoundary('TOT dashboard',
                      <ProtectedRoute allowedRoles={['tot', 'local_mr_coordinator', 'manager', 'admin']}>
                        <TotDashboard />
                      </ProtectedRoute>
                    )} />
                    
                    {/* Shared routes */}
                    <Route path="/farmers" element={withRouteBoundary('Farmers', <Farmers />)} />
                    <Route path="/farmers/:id" element={withRouteBoundary('Farmer profile', <FarmerProfile />)} />
                    <Route path="/sales" element={withRouteBoundary('Sales', <Sales />)} />
                    <Route path="/machinery" element={withRouteBoundary('Machinery', <Machinery />)} />
                    <Route path="/products" element={withRouteBoundary('Products', <Products />)} />
                    <Route path="/visits" element={withRouteBoundary('Visits', <Visits />)} />
                    <Route path="/visits/:id" element={withRouteBoundary('Visit details', <VisitDetails />)} />
                    <Route path="/trainings" element={withRouteBoundary('Trainings', <Trainings />)} />
                    <Route path="/trainings/:id" element={withRouteBoundary('Training details', <TrainingDetails />)} />
                    <Route path="/settings" element={withRouteBoundary('Settings', <Settings />)} />
                    <Route path="/support" element={withRouteBoundary('Support', <Support />)} />
                    <Route path="/commission" element={withRouteBoundary('Commission', <Commission />)} />
                    <Route path="/notifications" element={withRouteBoundary('Notifications', <Notifications />)} />
                    
                    {/* Reports - Admin, Manager, Coordinator only */}
                    <Route path="/reports" element={withRouteBoundary('Reports',
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'local_mr_coordinator']}>
                        <Reports />
                      </ProtectedRoute>
                    )} />
                    
                    {/* Coordinator, Manager & Admin routes */}
                    <Route path="/tots" element={withRouteBoundary('TOT management',
                      <ProtectedRoute allowedRoles={['local_mr_coordinator', 'manager', 'admin']}>
                        <TOTManagement />
                      </ProtectedRoute>
                    )} />
                    
                    {/* Admin & Manager routes */}
                    <Route path="/local-mrs" element={withRouteBoundary('Local MRs',
                      <ProtectedRoute allowedRoles={['manager', 'admin']}>
                        <LocalMRs />
                      </ProtectedRoute>
                    )} />
                    <Route path="/local-mrs/:id" element={withRouteBoundary('Local MR details',
                      <ProtectedRoute allowedRoles={['manager', 'admin']}>
                        <LocalMRDetails />
                      </ProtectedRoute>
                    )} />
                    
                    {/* Admin-only routes */}
                    <Route path="/users" element={withRouteBoundary('User management',
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Users />
                      </ProtectedRoute>
                    )} />
                    <Route path="/audit" element={withRouteBoundary('Audit trail',
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AuditLog />
                      </ProtectedRoute>
                    )} />
                    <Route path="/system-logs" element={withRouteBoundary('System logs',
                      <ProtectedRoute allowedRoles={['admin']}>
                        <SystemLogs />
                      </ProtectedRoute>
                    )} />
                  </Route>
                  
                  <Route path="*" element={withRouteBoundary('Not found page', <NotFound />)} />
                </Routes>
              </Suspense>
            </NotificationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
