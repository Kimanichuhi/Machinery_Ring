import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FloatingActions } from './FloatingActions';
import { OfflineBanner } from './OfflineBanner';
import { RouteTransition } from './RouteTransition';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Role-based redirects on dashboard root access only
  useEffect(() => {
    if (!user) return;

    const currentPath = location.pathname;
    const isAtRootDashboard = currentPath === '/dashboard' || currentPath === '/dashboard/';

    if (isAtRootDashboard) {
      let redirectPath = '/dashboard/tot';

      switch (user.role) {
        case 'tot':
          redirectPath = '/dashboard/tot';
          break;
        case 'local_mr_coordinator':
          redirectPath = '/dashboard/local-mr';
          break;
        case 'manager':
          redirectPath = '/dashboard/manager';
          break;
        case 'admin':
          redirectPath = '/dashboard/admin';
          break;
      }

      navigate(redirectPath, { replace: true });
    }
  }, [user, location.pathname, navigate]);


  return (
    <div className="flex min-h-screen w-full bg-background">
      <OfflineBanner />
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:ml-0">
        <Header />

        <main
          className="flex-1 overflow-y-auto bg-muted/20"
          role="main"
          aria-label="Main content"
        >
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <RouteTransition>
              <Outlet />
            </RouteTransition>
          </div>

          <footer className="py-3 px-4 text-center text-xs text-muted-foreground border-t border-border bg-card/50">
            &copy; {new Date().getFullYear()} Machinery Ring Nyandarua. Built by{' '}
            <a href="https://qeemlabs.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">
              Qeem Labs Ltd.
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
